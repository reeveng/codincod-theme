//! The water, on the wallpaper layer where nobody has to open it.
//!
//!   wall ink=#35c26d surface=#0e1712 seed=28
//!
//! A layer surface on the background layer, under every window, which is the
//! one place a desktop's ornament may be. One per screen, since a wallpaper is
//! something a screen has rather than something a desk has. What it draws is
//! `seascape`'s bed; what it knows about is Wayland, and the two do not meet
//! anywhere else.
use std::collections::HashMap;
use std::io::{Read, Write};
use std::ptr::NonNull;
use std::sync::Arc;

use raw_window_handle::{
    RawDisplayHandle, RawWindowHandle, WaylandDisplayHandle, WaylandWindowHandle,
};
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

use seascape::{arg, hue, paint::Paint, Scene};

/// How often the water is carried forward, which is the rate `Seascape.qml`
/// keeps: a wallpaper on a 60Hz panel has no business drawing sixty times a
/// second, and the sea does not move quickly enough for anybody to tell.
const TICK: f64 = 1.0 / 30.0;

/// How often the compositor is asked whether anybody can see the water. A
/// second is longer than a person notices and a great deal less often than a
/// frame, which is the whole point of asking rather than drawing.
const ASK: f64 = 1.0;

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

    let mut wall = Wall {
        compositor: CompositorState::bind(&globals, &qh).expect("no wl_compositor"),
        shell: LayerShell::bind(&globals, &qh).expect("no wlr layer shell"),
        outputs: OutputState::new(&globals, &qh),
        registry: RegistryState::new(&globals),
        instance: wgpu::Instance::default(),
        conn: conn.clone(),
        card: None,
        screens: Vec::new(),
        ink,
        surface_hue,
        seed,
        settle,
        tolerance,
        asked: None,
        wore: repainted(),
        hung: None,
        told,
        gone: false,
    };

    // The screens arrive on the first turn of the queue, and each of them is
    // given its own water there.
    queue.roundtrip(&mut wall).unwrap();

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

/// Which screens have a window over the water, asked of the compositor.
///
/// Wayland has no way to tell a surface that nothing can see it, and a
/// wallpaper that swims behind a full screen of windows is a third of a core
/// spent on a picture nobody is looking at. Hyprland's own socket knows, so it
/// is asked: gaps are zero on this desktop and no window is see-through, so a
/// single window on a screen's workspace means that whole wallpaper is covered.
/// `Background.qml` asks the same question of the same compositor through
/// Quickshell, and settles it the same way.
///
/// Screen by screen, because a desk can have a full screen of code on it and an
/// empty desktop beside that.
///
/// `None` when there is nothing to ask, which is any compositor that is not
/// this one. Then the water swims, because a sea that stopped on a machine it
/// could not interrogate would be a wallpaper that does nothing.
fn covered() -> Option<HashMap<String, bool>> {
    let (monitors, workspaces) = (asked("monitors")?, asked("workspaces")?);

    // Which workspace each screen is showing, and how many windows each
    // workspace is holding. A workspace with nothing on it is not always listed
    // at all, which reads as nothing on it, which is what it is.
    let mut showing: HashMap<String, String> = HashMap::new();
    let mut screen = None;
    for line in monitors.lines() {
        let line = line.trim();
        if let Some(said) = line.strip_prefix("Monitor ") {
            screen = said.split_whitespace().next().map(str::to_string);
        } else if let (Some(on), Some(name)) = (line.strip_prefix("active workspace: "), &screen) {
            if let Some(id) = on.split_whitespace().next() {
                showing.insert(name.clone(), id.to_string());
            }
        }
    }

    let mut held: HashMap<String, u32> = HashMap::new();
    let mut workspace = None;
    for line in workspaces.lines() {
        let line = line.trim();
        if let Some(said) = line.strip_prefix("workspace ID ") {
            workspace = said.split_whitespace().next().map(str::to_string);
        } else if let (Some(count), Some(id)) = (line.strip_prefix("windows: "), &workspace) {
            held.insert(id.clone(), count.trim().parse().unwrap_or(0));
        }
    }

    Some(
        showing
            .into_iter()
            .map(|(name, id)| (name, held.get(&id).copied().unwrap_or(0) > 0))
            .collect(),
    )
}

/// One question put to Hyprland, over the socket it answers on.
fn asked(about: &str) -> Option<String> {
    let his = std::env::var("HYPRLAND_INSTANCE_SIGNATURE").ok()?;
    let run = std::env::var("XDG_RUNTIME_DIR").ok()?;
    let mut sock =
        std::os::unix::net::UnixStream::connect(format!("{run}/hypr/{his}/.socket.sock")).ok()?;

    sock.write_all(about.as_bytes()).ok()?;
    let mut said = String::new();
    sock.read_to_string(&mut said).ok()?;

    Some(said)
}

/// The card, once there is a surface to pick one for.
struct Card {
    adapter: wgpu::Adapter,
    device: Arc<wgpu::Device>,
    queue: Arc<wgpu::Queue>,
}

/// One screen's water: its own surface, its own sea, its own weather.
///
/// Two screens are two seas rather than one sea stretched over both. They are
/// different sizes and different shapes, a bed is cut to fit the box it grew in,
/// and there is nothing to be had from a fish swimming off one panel towards
/// another it cannot reach.
struct Screen {
    /// What the compositor calls it, which is what Hyprland calls it too, and
    /// therefore how a question about windows gets an answer about this screen.
    name: Option<String>,
    output: wl_output::WlOutput,
    layer: LayerSurface,
    target: wgpu::Surface<'static>,
    paint: Option<Paint>,
    scene: Option<Scene>,
    /// The size the water is drawn at, which is the screen's size in the units
    /// a desktop is laid out in.
    width: u32,
    height: u32,
    /// How many pixels the screen has to a point of that. A fish is the same
    /// size on a dense panel as on a coarse one and cut out of more pixels,
    /// which is the whole of what this number does.
    scale: u32,
    /// When the water was last carried forward.
    beat: Option<std::time::Instant>,
    hidden: bool,
    /// Whether a frame has ever been handed over. Until one has, the surface
    /// has no buffer and is not on the screen at all, so the water is drawn
    /// once however covered it is: what a rule about not advancing means is
    /// that the water waits, not that the wallpaper is a black rectangle.
    shown: bool,
}

impl Screen {
    /// The size of the buffer this is drawn into, which is the size of the
    /// screen rather than the size of the water.
    fn pixels(&self) -> (u32, u32) {
        (self.width * self.scale, self.height * self.scale)
    }
}

struct Wall {
    compositor: CompositorState,
    conn: Connection,
    instance: wgpu::Instance,
    outputs: OutputState,
    registry: RegistryState,
    shell: LayerShell,
    /// Picked once, off the first screen's surface, and shared by every screen
    /// after that.
    card: Option<Card>,
    screens: Vec<Screen>,
    ink: [f32; 4],
    surface_hue: [f32; 4],
    seed: f64,
    settle: f64,
    tolerance: f64,
    /// When the compositor was last asked who can see the water.
    asked: Option<std::time::Instant>,
    /// And when the desktop last changed what it is wearing.
    wore: Option<std::time::SystemTime>,
    /// The picture that is behind the water, so that a change of it is one
    /// comparison rather than a decode every second.
    hung: Option<std::path::PathBuf>,
    /// Whether the colours were named on the command line, in which case the
    /// theme is none of this water's business.
    told: (String, String),
    gone: bool,
}

impl Wall {
    /// A screen, as it arrives: a layer surface anchored over the whole of it.
    fn spawn(&mut self, output: wl_output::WlOutput, qh: &QueueHandle<Self>) {
        let wl = self.compositor.create_surface(qh);
        let layer = self.shell.create_layer_surface(
            qh,
            wl,
            Layer::Background,
            Some("seascape"),
            Some(&output),
        );
        layer.set_anchor(Anchor::TOP | Anchor::BOTTOM | Anchor::LEFT | Anchor::RIGHT);
        layer.set_keyboard_interactivity(KeyboardInteractivity::None);
        // Nothing is kept clear for a wallpaper, which is what a wallpaper is.
        layer.set_exclusive_zone(-1);

        let told = self.outputs.info(&output);
        let scale = told.as_ref().map_or(1, |info| info.scale_factor.max(1)) as u32;
        layer.wl_surface().set_buffer_scale(scale as i32);
        layer.commit();

        let display = RawDisplayHandle::Wayland(WaylandDisplayHandle::new(
            NonNull::new(self.conn.backend().display_ptr() as *mut _).unwrap(),
        ));
        let window = RawWindowHandle::Wayland(WaylandWindowHandle::new(
            NonNull::new(layer.wl_surface().id().as_ptr() as *mut _).unwrap(),
        ));
        let target = unsafe {
            self.instance
                .create_surface_unsafe(wgpu::SurfaceTargetUnsafe::RawHandle {
                    raw_display_handle: display,
                    raw_window_handle: window,
                })
                .expect("no surface on this compositor")
        };

        self.screens.push(Screen {
            name: told.and_then(|info| info.name),
            output,
            layer,
            target,
            paint: None,
            scene: None,
            width: 0,
            height: 0,
            scale,
            beat: None,
            hidden: false,
            shown: false,
        });
    }

    /// Which screen a surface belongs to.
    fn whose(&self, surface: &wl_surface::WlSurface) -> Option<usize> {
        self.screens
            .iter()
            .position(|screen| screen.layer.wl_surface() == surface)
    }

    /// The card, picked off this screen if nothing has picked one yet.
    ///
    /// A desk has one graphics card and every screen on it draws with that one,
    /// so the device is made once and handed round. Which screen it was asked
    /// for does not matter; it is asked for with a surface because an adapter
    /// that cannot present is no use to a wallpaper.
    fn ready(&mut self, at: usize) {
        if self.card.is_none() {
            let adapter =
                pollster::block_on(self.instance.request_adapter(&wgpu::RequestAdapterOptions {
                    compatible_surface: Some(&self.screens[at].target),
                    ..Default::default()
                }))
                .expect("no GPU adapter");
            let (device, queue) =
                pollster::block_on(adapter.request_device(&Default::default(), None))
                    .expect("no GPU");

            self.card = Some(Card {
                adapter,
                device: Arc::new(device),
                queue: Arc::new(queue),
            });
        }
    }

    /// One screen's water, at the size the compositor has settled on.
    fn fit(&mut self, at: usize) {
        self.ready(at);
        let card = self.card.as_ref().expect("no card to draw with");
        let (device, queue) = (card.device.clone(), card.queue.clone());
        let screen = &self.screens[at];
        let (width, height) = screen.pixels();

        let caps = screen.target.get_capabilities(&card.adapter);
        // The scene is drawn in the colours a theme writes, which are sRGB the
        // way a stylesheet means them. A surface that takes them as linear
        // would light the whole sea differently to every other renderer.
        let format = caps
            .formats
            .iter()
            .copied()
            .find(|f| !f.is_srgb())
            .unwrap_or(caps.formats[0]);

        screen.target.configure(
            &device,
            &wgpu::SurfaceConfiguration {
                usage: wgpu::TextureUsages::RENDER_ATTACHMENT,
                format,
                width,
                height,
                present_mode: wgpu::PresentMode::Fifo,
                desired_maximum_frame_latency: 2,
                alpha_mode: caps.alpha_modes[0],
                view_formats: vec![],
            },
        );

        // The card is given the buffer's size and the water is given its own,
        // which are the same size on a screen with one pixel to the point.
        let paint = Paint::new(device, queue, format, width, height, false);
        let scene = Scene::new(
            screen.width,
            screen.height,
            self.seed,
            self.tolerance,
            self.settle,
        );
        // The standing bed goes over once and stays there; see `bed.rs`.
        paint.plant(scene.limbs());
        let (standing, held) = scene.standing();
        paint.stand(standing, held);

        let screen = &mut self.screens[at];
        screen.paint = Some(paint);
        screen.scene = Some(scene);
        self.hung = None;
        self.hang();
    }

    /// Put the desktop's own picture behind the water, on every screen.
    ///
    /// The one thing here that is nobody's but the machine's: `Background.qml`
    /// has the wallpaper under the sea because the sea is not opaque, and a
    /// renderer that owns the whole background layer has to carry the picture
    /// itself or there is nothing under the water at all.
    ///
    /// Read once and hung on each screen, which fits it to its own box: one
    /// picture cropped two ways rather than one crop stretched twice.
    fn hang(&mut self) {
        let Some(path) = hung() else {
            return;
        };
        if self.hung.as_ref() == Some(&path) {
            return;
        }

        self.hung = Some(path.clone());
        let Some((pixels, width, height)) = seascape::picture(&path) else {
            return;
        };
        for screen in &self.screens {
            if let Some(paint) = screen.paint.as_ref() {
                paint.hang(&pixels, width, height, seascape::THROUGH);
            }
        }
    }

    /// Today's water, in place of the day the desktop was started on.
    ///
    /// The whole scene rather than the seabed: what grows is a share of the
    /// day's own weather, and where a wreck is lying is a roll of the day's own
    /// dice. It costs the best part of a second and it is spent behind whatever
    /// window is covering the water.
    fn replant(&mut self, at: usize) {
        let screen = &mut self.screens[at];
        let Some(paint) = screen.paint.as_ref() else {
            return;
        };

        let scene = Scene::new(
            screen.width,
            screen.height,
            -1.0,
            self.tolerance,
            self.settle,
        );
        paint.plant(scene.limbs());
        let (standing, held) = scene.standing();
        paint.stand(standing, held);
        screen.scene = Some(scene);
    }

    /// What the desk has changed while nobody was drawing: who can see the
    /// water, what the desktop is wearing, and whether it is a different day.
    ///
    /// Asked for the whole desk rather than for one screen, since it is one
    /// theme and one compositor however many panels are plugged into it.
    fn ask(&mut self) {
        let now = std::time::Instant::now();
        let stale = self
            .asked
            .is_none_or(|was| (now - was).as_secs_f64() >= ASK);
        if !stale {
            return;
        }
        self.asked = Some(now);

        // Whether the desktop changed what it is wearing, which costs a look at
        // one file's date and recolours the whole sea when it did. Only if
        // nobody named the colours: an argument is somebody having decided, and
        // a decision does not want overruling every second.
        let wore = repainted();
        if wore != self.wore && self.told.0.is_empty() && self.told.1.is_empty() {
            self.wore = wore;
            let pot = paint_pot();
            self.ink = hue(&pot.0);
            self.surface_hue = hue(&pot.1);
        }

        // A picture is changed about as often as a theme is, and by the same
        // hand, so it is looked at on the same second.
        self.hang();

        let seen = covered();
        for at in 0..self.screens.len() {
            let hidden = seen
                .as_ref()
                .zip(self.screens[at].name.as_ref())
                .and_then(|(seen, name)| seen.get(name).copied())
                .unwrap_or(false);

            // A day is a different sea, and the change of one is a seabed
            // rearranging itself, so it happens behind whatever window is
            // covering the water rather than in front of somebody.
            let screen = &mut self.screens[at];
            let over = screen
                .scene
                .as_mut()
                .is_some_and(|scene| scene.today() != scene.planted());
            let was = screen.hidden;
            if hidden && !was && over {
                self.replant(at);
            }
            self.screens[at].hidden = hidden;
        }
    }

    fn draw(&mut self, at: usize, qh: &QueueHandle<Self>) {
        self.ask();

        let (ink, surface_hue) = (self.ink, self.surface_hue);
        let screen = &mut self.screens[at];
        if screen.paint.is_none() || screen.scene.is_none() {
            return;
        }

        // A frame is offered on every refresh and taken on every tick. What is
        // not taken is asked for again, which is cheaper than drawing it.
        let now = std::time::Instant::now();
        let since = screen.beat.map_or(TICK, |was| (now - was).as_secs_f64());

        // Nothing advances while the wallpaper is covered, which is a rule of
        // this scene rather than a saving: a boat owed at four in the morning
        // crosses the next time somebody is actually looking at the water. The
        // frame is still asked for, so the moment a window closes the water is
        // there rather than a second behind.
        if (screen.hidden && screen.shown) || since < TICK {
            if screen.hidden {
                screen.beat = Some(now);
            }
            screen
                .layer
                .wl_surface()
                .frame(qh, FrameCallbackData(screen.layer.wl_surface().clone()));
            screen.layer.commit();
            return;
        }
        screen.beat = Some(now);

        let (Some(paint), Some(scene)) = (screen.paint.as_ref(), screen.scene.as_mut()) else {
            return;
        };
        let spent = scene.advance(since.min(TICK * 3.0));
        paint.sway(scene.swings());
        let frame = match screen.target.get_current_texture() {
            Ok(frame) => frame,
            Err(_) => return,
        };
        let view = frame.texture.create_view(&Default::default());
        let (vertices, indices) = scene.geometry();
        let (over, glass) = scene.over();
        paint.sky(&scene.sky(ink, surface_hue));

        // After the sky, because the rock is drawn into a picture of its own
        // and a picture drawn under last frame's sky is last frame's rock.
        paint.soften(&scene.soft());
        paint.draw(&view, vertices, indices, spent.redrawn, over, glass);

        // Asked for before the frame is handed over, which is what keeps the
        // water going at the rate the screen actually refreshes rather than at
        // whatever this machine can manage.
        screen
            .layer
            .wl_surface()
            .frame(qh, FrameCallbackData(screen.layer.wl_surface().clone()));
        frame.present();
        screen.shown = true;
    }

    /// A screen that has changed how dense it is: the same water out of a
    /// different number of pixels.
    fn rescale(&mut self, at: usize, factor: i32, qh: &QueueHandle<Self>) {
        let scale = factor.max(1) as u32;
        if self.screens[at].scale == scale {
            return;
        }

        self.screens[at].scale = scale;
        self.screens[at].shown = false;
        self.screens[at].layer.wl_surface().set_buffer_scale(factor);
        if self.screens[at].width > 0 {
            self.fit(at);
            self.draw(at, qh);
        }
    }
}

impl CompositorHandler for Wall {
    fn scale_factor_changed(
        &mut self,
        _conn: &Connection,
        qh: &QueueHandle<Self>,
        surface: &wl_surface::WlSurface,
        factor: i32,
    ) {
        if let Some(at) = self.whose(surface) {
            self.rescale(at, factor, qh);
        }
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
        surface: &wl_surface::WlSurface,
        _time: u32,
    ) {
        if let Some(at) = self.whose(surface) {
            self.draw(at, qh);
        }
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
    fn closed(&mut self, _conn: &Connection, _qh: &QueueHandle<Self>, layer: &LayerSurface) {
        self.screens
            .retain(|screen| screen.layer.wl_surface() != layer.wl_surface());
        self.gone = self.screens.is_empty();
    }

    fn configure(
        &mut self,
        _conn: &Connection,
        qh: &QueueHandle<Self>,
        layer: &LayerSurface,
        configure: LayerSurfaceConfigure,
        _serial: u32,
    ) {
        let Some(at) = self.whose(layer.wl_surface()) else {
            return;
        };
        let (width, height) = configure.new_size;
        if width == 0 || height == 0 {
            return;
        }

        let screen = &mut self.screens[at];
        if screen.paint.is_some() && (width, height) == (screen.width, screen.height) {
            return;
        }

        // A screen that changes size is a different picture: the bed is cut to
        // fit the box it grew in and every texture the card holds is that size.
        // So the whole thing is fitted again rather than stretched, and the sea
        // is a new sea, which is what a monitor changing mode looks like anyway.
        screen.width = width;
        screen.height = height;
        screen.shown = false;
        self.fit(at);
        self.draw(at, qh);
    }
}

impl OutputHandler for Wall {
    fn output_state(&mut self) -> &mut OutputState {
        &mut self.outputs
    }

    fn new_output(
        &mut self,
        _conn: &Connection,
        qh: &QueueHandle<Self>,
        output: wl_output::WlOutput,
    ) {
        self.spawn(output, qh);
    }

    fn update_output(
        &mut self,
        _conn: &Connection,
        qh: &QueueHandle<Self>,
        output: wl_output::WlOutput,
    ) {
        let Some(at) = self
            .screens
            .iter()
            .position(|screen| screen.output == output)
        else {
            return;
        };
        let Some(told) = self.outputs.info(&output) else {
            return;
        };

        self.screens[at].name = told.name;
        self.rescale(at, told.scale_factor, qh);
    }

    fn output_destroyed(
        &mut self,
        _conn: &Connection,
        _qh: &QueueHandle<Self>,
        output: wl_output::WlOutput,
    ) {
        // A screen that is unplugged takes its water with it, and the last one
        // going is the end of the run: a wallpaper with nothing to hang on is a
        // process with nothing to do.
        self.screens.retain(|screen| screen.output != output);
        self.gone = self.screens.is_empty();
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
