//! The seascape, drawn natively.
//!
//! The simulations are CodinCod's own TypeScript, hosted in V8 and read back as
//! one buffer of numbers; see `sim.rs`. What is written here is the drawing: how
//! the bed is cut into triangles, and how the water's colour is worked out for
//! every pixel of it.
//!
//! Two things run this. `bin/wall.rs` is the wallpaper, and `main.rs` grabs a
//! still so the picture can be held against the QML renderer's own.
pub mod bed;
pub mod over;
pub mod paint;
pub mod sim;

use lyon_tessellation::VertexBuffers;

/// The water, and everything needed to advance it and hand it over.
pub struct Scene {
    sim: sim::Sim,
    bed: bed::Bed,
    over: over::Over,
    geo: VertexBuffers<paint::Vertex, u32>,
    swings: Vec<[f32; 2]>,
    /// Where the camera has wandered to, and which frame of grain it is.
    frame: Frame,
    width: f32,
    height: f32,
}

/// Where the frame is being held this moment, which is not a property of the
/// water and is a property of whoever is looking at it.
#[derive(Clone, Copy, Default)]
pub struct Frame {
    pub sway: [f32; 2],
    pub tilt: f32,
    pub overscan: f32,
    pub turn: f32,
}

/// Where a frame's time went, in milliseconds.
#[derive(Default)]
pub struct Spent {
    pub step: f64,
    pub publish: f64,
    pub cut: f64,
    /// Whether the triangles moved, which only a crown redrawing itself does.
    pub redrawn: bool,
}

impl Scene {
    pub fn new(width: u32, height: u32, seed: f64, tolerance: f64, settle: f64) -> Self {
        let mut sim = sim::Sim::new(include_str!("../js/scene.js"));
        sim.call("build", &[width as f64, height as f64, seed, tolerance]);
        sim.call("wind", &[settle]);

        let mut scene = Scene {
            sim,
            bed: bed::Bed::default(),
            over: over::Over::default(),
            geo: VertexBuffers::new(),
            swings: Vec::new(),
            frame: Frame::default(),
            width: width as f32,
            height: height as f32,
        };
        scene.over.size(width as f32, height as f32);

        // The scene as it stands, which is everything that will not change
        // today. After this a frame is two numbers a plant.
        let floats = scene.sim.call("layout", &[]) as usize;
        scene.bed.stand(scene.sim.frame(floats));
        scene
    }

    /// The bed as it stands, which the card is handed once.
    pub fn standing(&self) -> (&[paint::Vertex], &[u32]) {
        self.bed.standing()
    }

    /// Every limb of every plant, for the card to bend the bed by.
    pub fn limbs(&self) -> &[paint::Limb] {
        self.bed.limbs()
    }

    /// Where every plant's sway has got to, this frame.
    pub fn swings(&self) -> &[[f32; 2]] {
        &self.swings
    }

    /// Carry the water forward and cut whatever moved.
    pub fn advance(&mut self, seconds: f64) -> Spent {
        let ms = |from: std::time::Instant| from.elapsed().as_secs_f64() * 1000.0;

        let a = std::time::Instant::now();
        self.sim.call("step", &[seconds]);
        let step = ms(a);

        let b = std::time::Instant::now();
        let floats = self.sim.call("publish", &[]) as usize;
        let publish = ms(b);

        let c = std::time::Instant::now();
        let redrawn = self
            .bed
            .take(self.sim.frame(floats), &mut self.geo, &mut self.swings);

        // And everything that is not the bed, which is cut again whatever
        // happened: a fish is somewhere new every frame there is.
        let floats = self.sim.call("over", &[]) as usize;
        let told = self.sim.frame(floats);
        self.frame = Frame {
            sway: [told[0], told[1]],
            tilt: told[2],
            overscan: told[3],
            turn: told[4],
        };
        self.over.take(&told[5..]);

        Spent {
            step,
            publish,
            cut: ms(c),
            redrawn,
        }
    }

    /// Everything over the bed, cut this frame: what is solid, and what the
    /// water is seen through.
    pub fn over(&self) -> (paint::Batch, paint::Batch) {
        (self.over.solid(), self.over.glass())
    }

    /// Where the camera is holding the picture this frame.
    pub fn frame(&self) -> Frame {
        self.frame
    }

    /// The whole picture's own numbers, for the card to draw every shape under.
    ///
    /// The theme decides two colours and the rest are `Seascape.qml`'s: how far
    /// the light gets down the column, the three lights that cannot be the
    /// theme's because a green moon is not a moon, and the film the water lands
    /// on.
    pub fn sky(&self, ink: [f32; 4], surface: [f32; 4]) -> paint::Sky {
        paint::Sky {
            size: [self.width, self.height],
            lit: LIT,
            sinkage: SINKAGE,
            ink,
            surface,
            sunlight: hue("#ffeec2"),
            moonlight: hue("#f2ebd9"),
            dusklight: hue("#e8a34d"),
            sway: self.frame.sway,
            tilt: self.frame.tilt,
            overscan: self.frame.overscan.max(1.0),
            grid: [
                (self.width / GRAIN_SPAN).max(1.0),
                (self.height / GRAIN_SPAN).max(1.0),
            ],
            grain: GRAIN,
            turn: self.frame.turn,
            vignette: VIGNETTE,
            pad: [0.0; 3],
        }
    }

    pub fn geometry(&self) -> (&[paint::Vertex], &[u32]) {
        (&self.geo.vertices, &self.geo.indices)
    }
}

/// The lid on the water, out of `Seascape.qml`: how much light the surface
/// holds and how fast the column gives it up.
const LIT: f32 = 0.13;
const SINKAGE: f32 = 2.1;

/// The film the water lands on, and how much light a corner gives up.
const GRAIN: f32 = 0.03;
const GRAIN_SPAN: f32 = 1.6;
const VIGNETTE: f32 = 0.3;

/// A colour written the way a theme writes one.
pub fn hue(text: &str) -> [f32; 4] {
    let raw = u32::from_str_radix(text.trim_start_matches('#'), 16).unwrap_or(0);
    [
        ((raw >> 16) & 255) as f32 / 255.0,
        ((raw >> 8) & 255) as f32 / 255.0,
        (raw & 255) as f32 / 255.0,
        1.0,
    ]
}

/// One `key=value` off the command line.
pub fn arg(key: &str, fallback: &str) -> String {
    std::env::args()
        .find(|a| a.starts_with(&format!("{key}=")))
        .map(|a| a[key.len() + 1..].to_string())
        .unwrap_or_else(|| fallback.to_string())
}
