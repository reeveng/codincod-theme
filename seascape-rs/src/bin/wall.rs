//! The water, on the wallpaper layer where nobody has to open it.
//!
//!   wall ink=#35c26d surface=#0e1712 seed=28
//!
//! A layer surface on the background layer, under every window, which is the
//! one place a desktop's ornament may be. What it draws is `seascape`'s bed;
//! what it knows about is Wayland, and the two do not meet anywhere else.
use std::ptr::NonNull;

use raw_window_handle::{
    RawDisplayHandle, RawWindowHandle, WaylandDisplayHandle, WaylandWindowHandle,
};
use seascape::{arg, hue, paint::Paint, Scene};

/// How often the water is carried forward, which is the rate `Seascape.qml`
/// keeps: a wallpaper on a 60Hz panel has no business drawing sixty times a
/// second, and the sea does not move quickly enough for anybody to tell.
const TICK: f64 = 1.0 / 30.0;
use smithay_client_toolkit::{
    compositor::{CompositorHandler, CompositorState, FrameCallbackData},
    delegate_dispatch2, delegate_registry,
    output::{OutputHandler, OutputState},
    registry::{ProvidesRegistryState, RegistryState},
    registry_handlers,
    shell::{
        wlr_layer::{
            Anchor, KeyboardInteractivity, Layer, LayerShell, LayerShellHandler, LayerSurface,
            LayerSurfaceConfigure,
        },
        WaylandSurface,
    },
};
use wayland_client::{
    globals::registry_queue_init,
    protocol::{wl_output, wl_surface},
    Connection, Proxy, QueueHandle,
};

fn main() {
    let seed: f64 = arg("seed", "28").parse().unwrap();
    let settle: f64 = arg("settle", "40").parse().unwrap();
    let tolerance: f64 = arg("tolerance", "0.25").parse().unwrap();
    let ink = hue(&arg("ink", "#35c26d"));
    let surface_hue = hue(&arg("surface", "#0e1712"));

    let conn = Connection::connect_to_env().expect("no Wayland to draw on");
    let (globals, mut queue) = registry_queue_init(&conn).unwrap();
    let qh = queue.handle();

    let compositor = CompositorState::bind(&globals, &qh).expect("no wl_compositor");
    let shell = LayerShell::bind(&globals, &qh).expect("no wlr layer shell");

    let wl = compositor.create_surface(&qh);
    let layer = shell.create_layer_surface(&qh, wl, Layer::Background, Some("seascape"), None);
    layer.set_anchor(Anchor::TOP | Anchor::BOTTOM | Anchor::LEFT | Anchor::RIGHT);
    layer.set_keyboard_interactivity(KeyboardInteractivity::None);
    // Nothing is kept clear for a wallpaper, which is what a wallpaper is.
    layer.set_exclusive_zone(-1);
    layer.commit();

    let instance = wgpu::Instance::default();
    let display = RawDisplayHandle::Wayland(WaylandDisplayHandle::new(
        NonNull::new(conn.backend().display_ptr() as *mut _).unwrap(),
    ));
    let window = RawWindowHandle::Wayland(WaylandWindowHandle::new(
        NonNull::new(layer.wl_surface().id().as_ptr() as *mut _).unwrap(),
    ));
    let target = unsafe {
        instance
            .create_surface_unsafe(wgpu::SurfaceTargetUnsafe::RawHandle {
                raw_display_handle: display,
                raw_window_handle: window,
            })
            .expect("no surface on this compositor")
    };
    let adapter = pollster::block_on(instance.request_adapter(&wgpu::RequestAdapterOptions {
        compatible_surface: Some(&target),
        ..Default::default()
    }))
    .expect("no GPU adapter");
    let (device, queue_gpu) =
        pollster::block_on(adapter.request_device(&Default::default(), None)).expect("no GPU");

    let mut wall = Wall {
        registry: RegistryState::new(&globals),
        outputs: OutputState::new(&globals, &qh),
        layer,
        target,
        adapter,
        device: Some(device),
        queue: Some(queue_gpu),
        paint: None,
        scene: None,
        ink,
        surface_hue,
        seed,
        settle,
        tolerance,
        width: 0,
        height: 0,
        beat: None,
        gone: false,
    };

    while !wall.gone {
        queue.blocking_dispatch(&mut wall).unwrap();
    }
}

struct Wall {
    registry: RegistryState,
    outputs: OutputState,
    layer: LayerSurface,
    target: wgpu::Surface<'static>,
    adapter: wgpu::Adapter,
    /// Handed to the paint on the first configure, when the size is known.
    device: Option<wgpu::Device>,
    queue: Option<wgpu::Queue>,
    paint: Option<Paint>,
    scene: Option<Scene>,
    ink: [f32; 4],
    surface_hue: [f32; 4],
    seed: f64,
    settle: f64,
    tolerance: f64,
    width: u32,
    height: u32,
    /// When the water was last carried forward.
    beat: Option<std::time::Instant>,
    gone: bool,
}

impl Wall {
    /// The water at the size the compositor has settled on.
    fn fit(&mut self) {
        let device = self.device.take().expect("the water was already fitted");
        let queue = self.queue.take().unwrap();

        let caps = self.target.get_capabilities(&self.adapter);
        // The scene is drawn in the colours a theme writes, which are sRGB the
        // way a stylesheet means them. A surface that takes them as linear
        // would light the whole sea differently to every other renderer.
        let format = caps
            .formats
            .iter()
            .copied()
            .find(|f| !f.is_srgb())
            .unwrap_or(caps.formats[0]);

        self.target.configure(
            &device,
            &wgpu::SurfaceConfiguration {
                usage: wgpu::TextureUsages::RENDER_ATTACHMENT,
                format,
                width: self.width,
                height: self.height,
                present_mode: wgpu::PresentMode::Fifo,
                desired_maximum_frame_latency: 2,
                alpha_mode: caps.alpha_modes[0],
                view_formats: vec![],
            },
        );

        let paint = Paint::new(device, queue, format, self.width, self.height, false);
        paint.water(self.ink, self.surface_hue, 0.13, 2.1);

        let scene = Scene::new(
            self.width,
            self.height,
            self.seed,
            self.tolerance,
            self.settle,
        );
        // The standing bed goes over once and stays there; see `bed.rs`.
        paint.plant(scene.limbs());
        let (standing, held) = scene.standing();
        paint.stand(standing, held);

        self.paint = Some(paint);
        self.scene = Some(scene);
    }

    fn draw(&mut self, qh: &QueueHandle<Self>) {
        let (Some(paint), Some(scene)) = (self.paint.as_ref(), self.scene.as_mut()) else {
            return;
        };

        // A frame is offered on every refresh and taken on every tick. What is
        // not taken is asked for again, which is cheaper than drawing it.
        let now = std::time::Instant::now();
        let since = self.beat.map_or(TICK, |was| (now - was).as_secs_f64());
        if since < TICK {
            self.layer
                .wl_surface()
                .frame(qh, FrameCallbackData(self.layer.wl_surface().clone()));
            self.layer.commit();
            return;
        }
        self.beat = Some(now);

        let spent = scene.advance(since.min(TICK * 3.0));
        paint.sway(scene.swings());
        let frame = match self.target.get_current_texture() {
            Ok(frame) => frame,
            Err(_) => return,
        };
        let view = frame.texture.create_view(&Default::default());
        let (vertices, indices) = scene.geometry();
        paint.draw(&view, vertices, indices, spent.redrawn);

        // Asked for before the frame is handed over, which is what keeps the
        // water going at the rate the screen actually refreshes rather than at
        // whatever this machine can manage.
        self.layer
            .wl_surface()
            .frame(qh, FrameCallbackData(self.layer.wl_surface().clone()));
        frame.present();
    }
}

impl CompositorHandler for Wall {
    fn scale_factor_changed(
        &mut self,
        _conn: &Connection,
        _qh: &QueueHandle<Self>,
        _surface: &wl_surface::WlSurface,
        _factor: i32,
    ) {
    }

    fn transform_changed(
        &mut self,
        _conn: &Connection,
        _qh: &QueueHandle<Self>,
        _surface: &wl_surface::WlSurface,
        _transform: wl_output::Transform,
    ) {
    }

    fn frame(
        &mut self,
        _conn: &Connection,
        qh: &QueueHandle<Self>,
        _surface: &wl_surface::WlSurface,
        _time: u32,
    ) {
        self.draw(qh);
    }

    fn surface_enter(
        &mut self,
        _conn: &Connection,
        _qh: &QueueHandle<Self>,
        _surface: &wl_surface::WlSurface,
        _output: &wl_output::WlOutput,
    ) {
    }

    fn surface_leave(
        &mut self,
        _conn: &Connection,
        _qh: &QueueHandle<Self>,
        _surface: &wl_surface::WlSurface,
        _output: &wl_output::WlOutput,
    ) {
    }
}

impl LayerShellHandler for Wall {
    fn closed(&mut self, _conn: &Connection, _qh: &QueueHandle<Self>, _layer: &LayerSurface) {
        self.gone = true;
    }

    fn configure(
        &mut self,
        _conn: &Connection,
        qh: &QueueHandle<Self>,
        _layer: &LayerSurface,
        configure: LayerSurfaceConfigure,
        _serial: u32,
    ) {
        let (width, height) = configure.new_size;
        if width == 0 || height == 0 {
            return;
        }
        if self.paint.is_some() && (width, height) == (self.width, self.height) {
            return;
        }

        self.width = width;
        self.height = height;
        if self.paint.is_none() {
            self.fit();
            self.draw(qh);
        }
    }
}

impl OutputHandler for Wall {
    fn output_state(&mut self) -> &mut OutputState {
        &mut self.outputs
    }

    fn new_output(
        &mut self,
        _conn: &Connection,
        _qh: &QueueHandle<Self>,
        _output: wl_output::WlOutput,
    ) {
    }

    fn update_output(
        &mut self,
        _conn: &Connection,
        _qh: &QueueHandle<Self>,
        _output: wl_output::WlOutput,
    ) {
    }

    fn output_destroyed(
        &mut self,
        _conn: &Connection,
        _qh: &QueueHandle<Self>,
        _output: wl_output::WlOutput,
    ) {
    }
}

impl ProvidesRegistryState for Wall {
    fn registry(&mut self) -> &mut RegistryState {
        &mut self.registry
    }

    registry_handlers![OutputState];
}

delegate_registry!(Wall);
delegate_dispatch2!(Wall);
