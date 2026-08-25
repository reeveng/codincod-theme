//! The water, on the wallpaper layer where nobody has to open it.
//!
//!   wall ink=#35c26d surface=#0e1712 seed=28 theme=codincod
//!
//! A layer surface on the bottom layer, over the desktop's own picture and
//! under every window, which is the one place a desktop's ornament may be. The
//! layer beneath this one is Omarchy's, and leaving it to Omarchy is what lets
//! a theme the water does not belong to still have a wallpaper of its own. One
//! per screen, since a wallpaper is something a screen has rather than
//! something a desk has. What it draws is `seascape`'s bed; what it knows about
//! is Wayland, and the two do not meet anywhere else.
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

/// How long the water takes to cross from one theme's colours to the next's, in
/// seconds. Long enough to read as the light changing over the sea, short
/// enough that nobody is left waiting for a desktop they have already changed.
const CROSS: f64 = 1.6;

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
    // The theme this water came with, and nothing at all if it came with none.
    // Named, the sea is that theme's and is off the screen while the desktop is
    // wearing anything else. Unnamed, it is the desk's own and always draws,
    // which is what somebody who installed the water on its own asked for.
    let mine = arg("theme", "");
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
        wearing: Wearing::new(ink, surface_hue),
        seed,
        settle,
        tolerance,
        asked: None,
        ours: ours(&mine, &worn()),
        mine,
        wore: repainted(),
        hung: None,
        told,
        gone: false,
    };

    // The screens arrive on the first turn of the queue, and each of them is
    // given its own water there.
    queue.roundtrip(&mut wall).unwrap();

    while !wall.gone {
        // A sea that is not this desktop's to draw has no surfaces, and a
        // process with no surfaces is sent no frames, so nothing would ever ask
        // again whether the theme had come back. The desk is put the question
        // on a clock instead, which is what a frame was doing anyway.
        if wall.screens.is_empty() {
            queue.roundtrip(&mut wall).unwrap();
            wall.ask(&qh);
            if wall.screens.is_empty() {
                std::thread::sleep(std::time::Duration::from_secs_f64(ASK));
            }
            continue;
        }

        queue.blocking_dispatch(&mut wall).unwrap();
    }
}

/// Whether this water is the one the desktop should be showing.
///
/// A wallpaper installed by a theme belongs to that theme and has no business
/// on the next one: it is recoloured to whatever comes after and still
/// unmistakably a sea, over a picture the new theme chose and nobody can see.
/// So the water is told at install time which theme it arrived with, and asks
/// the desktop what it is wearing.
///
/// Told nothing, it is the desk's rather than a theme's, which is the water
/// installed as a plugin on its own. Then every theme is its theme.
fn ours(mine: &str, worn: &str) -> bool {
    mine.is_empty() || mine == worn
}

/// What the desktop says it is wearing, by the slug Omarchy names a theme with.
///
/// Written on the way through a theme change, before the shell is handed the
/// new colours, so it is the earliest anybody finds out. Nothing when there is
/// no file, which reads as no theme and leaves a sea that belongs to one off
/// the screen.
fn worn() -> String {
    std::fs::read_to_string(kept().join("omarchy/current/theme.name"))
        .map(|said| said.trim().to_string())
        .unwrap_or_default()
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
    /// The card's side of the surface, before the compositor's, because a
    /// screen is dropped whole when the water is put away and a swapchain
    /// outliving the surface it was made from is the driver's business.
    target: wgpu::Surface<'static>,
    layer: LayerSurface,
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

/// The colours a theme wrote, on their way into the water.
///
/// A desktop is changed in an instant and a sea is not: the two colours the
/// whole picture is lit by, swapped between one frame and the next, are a flash
/// on a wallpaper. So a new theme is somewhere to get to, and every frame until
/// it arrives is a mix of where the water was and where it is going. A change
/// made half way through another one starts from the mix on the screen rather
/// than from the theme before it, which is what keeps two changes in a row from
/// jumping back.
struct Wearing {
    /// Where the water was when the theme last changed.
    was: ([f32; 4], [f32; 4]),
    /// And what it is on its way to, which is what the theme says now.
    to: ([f32; 4], [f32; 4]),
    /// When it set off, or nothing at all if it has never been anywhere.
    since: Option<std::time::Instant>,
}

impl Wearing {
    fn new(ink: [f32; 4], surface: [f32; 4]) -> Self {
        Wearing {
            was: (ink, surface),
            to: (ink, surface),
            since: None,
        }
    }

    /// The colours this frame is drawn in.
    fn now(&self) -> ([f32; 4], [f32; 4]) {
        let over = self
            .since
            .map_or(1.0, |since| since.elapsed().as_secs_f64() / CROSS)
            .clamp(0.0, 1.0);
        // Eased at both ends, so that a change of theme starts and stops the
        // way light does rather than the way a slider does.
        let over = (over * over * (3.0 - 2.0 * over)) as f32;

        (
            mix(self.was.0, self.to.0, over),
            mix(self.was.1, self.to.1, over),
        )
    }

    /// What the desktop is wearing now, from wherever the water has got to.
    fn told(&mut self, ink: [f32; 4], surface: [f32; 4]) {
        if self.to == (ink, surface) {
            return;
        }

        self.was = self.now();
        self.to = (ink, surface);
        self.since = Some(std::time::Instant::now());
    }
}

/// One colour part of the way to another.
fn mix(from: [f32; 4], to: [f32; 4], over: f32) -> [f32; 4] {
    std::array::from_fn(|at| from[at] + (to[at] - from[at]) * over)
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
    /// The two colours the water is drawn in, and the two it is on its way to.
    wearing: Wearing,
    seed: f64,
    settle: f64,
    tolerance: f64,
    /// When the compositor was last asked who can see the water.
    asked: Option<std::time::Instant>,
    /// The theme this water arrived with, and whether the desktop is wearing
    /// it. Empty is water that arrived with no theme, which is every theme's.
    mine: String,
    ours: bool,
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
            Layer::Bottom,
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
            target,
            layer,
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

    /// The water on every screen, or off all of them, as the desktop changes
    /// out of the theme it came with and back into it.
    ///
    /// Off is the surfaces destroyed rather than a transparent frame drawn over
    /// and over: the layer under this one is Omarchy's own background, and what
    /// a theme the sea does not belong to is owed is that picture with nothing
    /// whatever in front of it.
    fn dress(&mut self, qh: &QueueHandle<Self>) {
        if !self.ours {
            self.screens.clear();
            self.hung = None;
            return;
        }

        for output in self.outputs.outputs().collect::<Vec<_>>() {
            self.spawn(output, qh);
        }
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
    /// has the wallpaper under the sea because the sea is not opaque, and the
    /// water carries the picture itself rather than trusting the layer below to
    /// be holding one. Omarchy's own background is usually down there drawing
    /// the same file, and this copy is what is actually seen; the one below
    /// matters on the frames this sea is not on the screen for, and on a desk
    /// that has switched the shell's wallpaper off for its own reasons.
    ///
    /// Read once and hung on each screen, which fits it to its own box: one
    /// picture cropped two ways rather than one crop stretched twice.
    fn hang(&mut self) {
        if self.screens.is_empty() {
            return;
        }

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
    fn ask(&mut self, qh: &QueueHandle<Self>) {
        let now = std::time::Instant::now();
        let stale = self
            .asked
            .is_none_or(|was| (now - was).as_secs_f64() >= ASK);
        if !stale {
            return;
        }
        self.asked = Some(now);

        // Whether the desktop is still wearing the theme this water came with,
        // which costs a look at one short file and takes the sea off every
        // screen when it is not. Asked before the colours, since a sea nobody
        // is going to see is not worth recolouring.
        let ours = ours(&self.mine, &worn());
        if ours != self.ours {
            self.ours = ours;
            self.dress(qh);
        }
        if !self.ours {
            return;
        }

        // Whether the desktop changed what it is wearing, which costs a look at
        // one file's date and recolours the whole sea when it did. Only if
        // nobody named the colours: an argument is somebody having decided, and
        // a decision does not want overruling every second.
        let wore = repainted();
        if wore != self.wore && self.told.0.is_empty() && self.told.1.is_empty() {
            self.wore = wore;
            let pot = paint_pot();
            self.wearing.told(hue(&pot.0), hue(&pot.1));
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
            // covering the water rather than in front of somebody. Whenever the
            // water is covered and owed a day rather than on the moment it is
            // covered: a desk left under a full screen of windows at midnight
            // is covered on every second of the new day and on none of them is
            // it the second the covering happened.
            self.screens[at].hidden = hidden;
            let over = self.screens[at]
                .scene
                .as_mut()
                .is_some_and(|scene| scene.today() != scene.planted());
            if hidden && over {
                self.replant(at);
            }
        }
    }

    fn draw(&mut self, at: usize, qh: &QueueHandle<Self>) {
        self.ask(qh);

        // Asking may have put the water away, and a screen that has just been
        // destroyed is not one to draw on.
        if at >= self.screens.len() {
            return;
        }

        let (ink, surface_hue) = self.wearing.now();
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
        self.gone = self.ours && self.screens.is_empty();
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
        if self.ours {
            self.spawn(output, qh);
        }
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
        // Only while the water is this desktop's. A sea that is off the screen
        // because another theme is being worn has no screens by design, and a
        // monitor unplugged under it is not the end of the run.
        self.gone = self.ours && self.screens.is_empty();
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

#[cfg(test)]
mod tests {
    use super::*;

    const GREEN: [f32; 4] = [0.0, 1.0, 0.0, 1.0];
    const BLUE: [f32; 4] = [0.0, 0.0, 1.0, 1.0];
    const BLACK: [f32; 4] = [0.0, 0.0, 0.0, 1.0];

    #[test]
    fn water_that_came_with_a_theme_is_that_theme_s() {
        assert!(ours("codincod", "codincod"));
        assert!(!ours("codincod", "tokyo-night"));

        // And a desktop that says it is wearing nothing is wearing something
        // else, which is the state a machine with no Omarchy on it is in.
        assert!(!ours("codincod", ""));
    }

    #[test]
    fn water_that_came_with_no_theme_is_the_desk_s() {
        // The plugin installed on its own, which is not a theme's to take away.
        assert!(ours("", "codincod"));
        assert!(ours("", "tokyo-night"));
        assert!(ours("", ""));
    }

    #[test]
    fn a_theme_nobody_changed_is_the_theme_it_is() {
        let wearing = Wearing::new(GREEN, BLACK);

        assert_eq!(wearing.now(), (GREEN, BLACK));
    }

    #[test]
    fn a_new_theme_is_somewhere_to_get_to() {
        let mut wearing = Wearing::new(GREEN, BLACK);
        wearing.told(BLUE, BLACK);

        // The frame the theme changed on is still the old colours, and the
        // water is on its way rather than there.
        let (ink, _) = wearing.now();
        assert!(ink[2] < 0.5, "the sea flashed instead of crossing: {ink:?}");

        wearing.since = Some(std::time::Instant::now() - std::time::Duration::from_secs(9));
        assert_eq!(wearing.now(), (BLUE, BLACK));
    }

    #[test]
    fn a_theme_changed_mid_crossing_starts_from_the_screen() {
        let mut wearing = Wearing::new(GREEN, BLACK);
        wearing.told(BLUE, BLACK);
        wearing.since =
            Some(std::time::Instant::now() - std::time::Duration::from_secs_f64(CROSS / 2.0));

        let (midway, _) = wearing.now();
        wearing.told(GREEN, BLACK);

        // Half a crossing is half of each colour, and that half-and-half is
        // where the next one sets off from rather than the theme before it.
        let (was, _) = wearing.was;
        assert!(
            midway[1] > 0.4 && midway[1] < 0.6,
            "not half way: {midway:?}"
        );
        assert!(
            (was[1] - midway[1]).abs() < 0.01,
            "a second change jumped back: {was:?} against {midway:?}"
        );
    }
}
