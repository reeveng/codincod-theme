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
use std::io::{Read, Write};

use seascape::{arg, hue, paint::Paint, Scene};

/// How often the water is carried forward, which is the rate `Seascape.qml`
/// keeps: a wallpaper on a 60Hz panel has no business drawing sixty times a
/// second, and the sea does not move quickly enough for anybody to tell.
const TICK: f64 = 1.0 / 30.0;

/// How often the compositor is asked whether anybody can see the water. A
/// second is longer than a person notices and a great deal less often than a
/// frame, which is the whole point of asking rather than drawing.
const ASK: f64 = 1.0;
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
    // Below nothing means the sea the calendar day picked, which is what a
    // wallpaper wants: a fixed seed is one sea for the life of the machine.
    let seed: f64 = arg("seed", "-1").parse().unwrap();
    let settle: f64 = arg("settle", "40").parse().unwrap();
    let tolerance: f64 = arg("tolerance", "0.25").parse().unwrap();
    // The theme's own two colours, unless somebody named them. Read rather than
    // written down, so that a desktop that changes theme changes the water with
    // it, which is what the plugin gets for free by binding to the shell's.
    let told = (arg("ink", ""), arg("surface", ""));
    let painted = paint_pot();
    let ink = hue(if told.0.is_empty() {
        &painted.0
    } else {
        &told.0
    });
    let surface_hue = hue(if told.1.is_empty() {
        &painted.1
    } else {
        &told.1
    });

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
        asked: None,
        wore: repainted(),
        hung: None,
        told,
        hidden: false,
        shown: false,
        gone: false,
    };

    while !wall.gone {
        queue.blocking_dispatch(&mut wall).unwrap();
    }
}

/// The colours the desktop is wearing: its accent, and what it is written on.
///
/// Omarchy keeps the theme it is on as a file rather than a broadcast, so this
/// is where the water gets its two colours and how it follows a theme being
/// changed under it. `Background.qml` binds to `Color.accent` and
/// `Color.background`, which are the same two lines read by the shell.
///
/// This theme's own pair when there is no file to read, since a wallpaper with
/// nothing to draw in is a black rectangle.
fn paint_pot() -> (String, String) {
    let mut pot = ("#35c26d".to_string(), "#0e1712".to_string());
    let Ok(said) = std::fs::read_to_string(painted()) else {
        return pot;
    };

    for line in said.lines() {
        let Some((key, value)) = line.split_once('=') else {
            continue;
        };
        let value = value.trim().trim_matches('"').to_string();
        match key.trim() {
            "accent" => pot.0 = value,
            "background" => pot.1 = value,
            _ => {}
        }
    }

    pot
}

/// Where that file is.
fn painted() -> std::path::PathBuf {
    kept().join("omarchy/current/theme/colors.toml")
}

/// And the picture it is wearing, which the water is drawn over.
///
/// A link the desktop moves rather than a file it rewrites, so it is followed
/// to whatever it points at: two themes' wallpapers are two files, and the name
/// of the one in use is how a change of picture is noticed at all.
fn hung() -> Option<std::path::PathBuf> {
    std::fs::canonicalize(kept().join("omarchy/current/background")).ok()
}

/// Where the desktop writes down what it is wearing.
fn kept() -> std::path::PathBuf {
    let state = std::env::var("XDG_STATE_HOME")
        .unwrap_or_else(|_| format!("{}/.local/state", std::env::var("HOME").unwrap_or_default()));

    std::path::PathBuf::from(state)
}

/// When the desktop last changed what it is wearing.
fn repainted() -> Option<std::time::SystemTime> {
    std::fs::metadata(painted()).ok()?.modified().ok()
}

/// Whether a window is over the water, asked of the compositor.
///
/// Wayland has no way to tell a surface that nothing can see it, and a
/// wallpaper that swims behind a full screen of windows is a third of a core
/// spent on a picture nobody is looking at. Hyprland's own socket knows, so it
/// is asked: gaps are zero on this desktop and no window is see-through, so a
/// single window anywhere on the active workspace means the whole wallpaper is
/// covered. `Background.qml` asks the same question of the same compositor
/// through Quickshell, and settles it the same way.
///
/// `None` when there is nothing to ask, which is any compositor that is not
/// this one. Then the water swims, because a sea that stopped on a machine it
/// could not interrogate would be a wallpaper that does nothing.
fn covered() -> Option<bool> {
    let his = std::env::var("HYPRLAND_INSTANCE_SIGNATURE").ok()?;
    let run = std::env::var("XDG_RUNTIME_DIR").ok()?;
    let mut sock =
        std::os::unix::net::UnixStream::connect(format!("{run}/hypr/{his}/.socket.sock")).ok()?;

    sock.write_all(b"activeworkspace").ok()?;
    let mut said = String::new();
    sock.read_to_string(&mut said).ok()?;

    let count = said
        .lines()
        .find_map(|line| line.trim().strip_prefix("windows: "))?;

    Some(count.trim().parse::<u32>().ok()? > 0)
}

struct Wall {
    registry: RegistryState,
    outputs: OutputState,
    layer: LayerSurface,
    target: wgpu::Surface<'static>,
    adapter: wgpu::Adapter,
    /// Handed to the paint on the first configure, when the size is known, and
    /// taken back off it whenever the screen changes size.
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
    /// When the compositor was last asked whether anybody can see it, and what
    /// it said.
    asked: Option<std::time::Instant>,
    /// And when the desktop last changed what it is wearing.
    wore: Option<std::time::SystemTime>,
    /// The picture that is behind the water, so that a change of it is one
    /// comparison rather than a decode every second.
    hung: Option<std::path::PathBuf>,
    /// Whether the colours were named on the command line, in which case the
    /// theme is none of this water's business.
    told: (String, String),
    hidden: bool,
    /// Whether a frame has ever been handed over. Until one has, the surface
    /// has no buffer and is not on the screen at all, so the water is drawn
    /// once however covered it is: what a rule about not advancing means is
    /// that the water waits, not that the wallpaper is a black rectangle.
    shown: bool,
    gone: bool,
}

impl Wall {
    /// The water at the size the compositor has settled on.
    fn fit(&mut self) {
        // The card back off whatever was drawing with it, since a screen that
        // changes size wants everything held at the old size thrown away.
        let (device, queue) = match self.paint.take() {
            Some(paint) => (paint.device, paint.queue),
            None => (
                self.device.take().expect("no card to draw with"),
                self.queue.take().unwrap(),
            ),
        };

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
        self.hung = None;
        self.hang();
    }

    /// Put the desktop's own picture behind the water.
    ///
    /// The one thing here that is nobody's but the machine's: `Background.qml`
    /// has the wallpaper under the sea because the sea is not opaque, and a
    /// renderer that owns the whole background layer has to carry the picture
    /// itself or there is nothing under the water at all.
    fn hang(&mut self) {
        let (Some(paint), Some(path)) = (self.paint.as_ref(), hung()) else {
            return;
        };
        if self.hung.as_ref() == Some(&path) {
            return;
        }

        self.hung = Some(path.clone());
        if let Some((pixels, width, height)) = seascape::picture(&path) {
            paint.hang(&pixels, width, height, seascape::THROUGH);
        }
    }

    /// Today's water, in place of the day the desktop was started on.
    ///
    /// The whole scene rather than the seabed: what grows is a share of the
    /// day's own weather, and where a wreck is lying is a roll of the day's own
    /// dice. It costs the best part of a second and it is spent behind whatever
    /// window is covering the water.
    fn replant(&mut self) {
        let Some(paint) = self.paint.as_ref() else {
            return;
        };

        let scene = Scene::new(self.width, self.height, -1.0, self.tolerance, self.settle);
        paint.plant(scene.limbs());
        let (standing, held) = scene.standing();
        paint.stand(standing, held);
        self.scene = Some(scene);
    }

    fn draw(&mut self, qh: &QueueHandle<Self>) {
        if self.paint.is_none() || self.scene.is_none() {
            return;
        }

        // A frame is offered on every refresh and taken on every tick. What is
        // not taken is asked for again, which is cheaper than drawing it.
        let now = std::time::Instant::now();
        let since = self.beat.map_or(TICK, |was| (now - was).as_secs_f64());

        // Nothing advances while the wallpaper is covered, which is a rule of
        // this scene rather than a saving: a boat owed at four in the morning
        // crosses the next time somebody is actually looking at the water. The
        // frame is still asked for, so the moment a window closes the water is
        // there rather than a second behind.
        let stale = self
            .asked
            .map_or(true, |was| (now - was).as_secs_f64() >= ASK);
        if stale {
            self.asked = Some(now);
            let hidden = covered().unwrap_or(false);

            // And whether the desktop changed what it is wearing, which costs a
            // look at one file's date and recolours the whole sea when it did.
            // Only if nobody named the colours: an argument is somebody having
            // decided, and a decision does not want overruling every second.
            let wore = repainted();
            if wore != self.wore && self.told.0.is_empty() && self.told.1.is_empty() {
                self.wore = wore;
                let pot = paint_pot();
                self.ink = hue(&pot.0);
                self.surface_hue = hue(&pot.1);
            }

            // A day is a different sea, and the change of one is a seabed
            // rearranging itself, so it happens behind whatever window is
            // covering the water rather than in front of somebody.
            // A picture is changed about as often as a theme is, and by the
            // same hand, so it is looked at on the same second.
            self.hang();

            let scene = self.scene.as_mut().unwrap();
            if hidden && !self.hidden && scene.today() != scene.planted() {
                self.replant();
            }
            self.hidden = hidden;
        }

        if self.hidden && self.shown {
            self.beat = Some(now);
            self.layer
                .wl_surface()
                .frame(qh, FrameCallbackData(self.layer.wl_surface().clone()));
            self.layer.commit();
            return;
        }

        let (Some(paint), Some(scene)) = (self.paint.as_ref(), self.scene.as_mut()) else {
            return;
        };

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
        let (over, glass) = scene.over();
        paint.sky(&scene.sky(self.ink, self.surface_hue));

        // After the sky, because the rock is drawn into a picture of its own
        // and a picture drawn under last frame's sky is last frame's rock.
        paint.soften(&scene.soft());
        paint.draw(&view, vertices, indices, spent.redrawn, over, glass);

        // Asked for before the frame is handed over, which is what keeps the
        // water going at the rate the screen actually refreshes rather than at
        // whatever this machine can manage.
        self.layer
            .wl_surface()
            .frame(qh, FrameCallbackData(self.layer.wl_surface().clone()));
        frame.present();
        self.shown = true;
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

        // A screen that changes size is a different picture: the bed is cut to
        // fit the box it grew in and every texture the card holds is that size.
        // So the whole thing is fitted again rather than stretched, and the sea
        // is a new sea, which is what a monitor changing mode looks like anyway.
        self.width = width;
        self.height = height;
        self.shown = false;
        self.fit();
        self.draw(qh);
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
