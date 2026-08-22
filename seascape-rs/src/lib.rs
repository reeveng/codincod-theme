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
    /// Which sea this is, so that a desktop left running can tell the day it
    /// was planted on from the day it is.
    planted: f64,
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
    /// How light it is above the water, which is what the column's own lid is
    /// a function of.
    pub daylight: f32,
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
    /// The water as a desktop gets it: whatever hour it is outside, and the
    /// rare things left waiting for the day to bring them round.
    pub fn new(width: u32, height: u32, seed: f64, tolerance: f64, settle: f64) -> Self {
        Scene::open(width, height, seed, tolerance, settle, None, false)
    }

    /// The same scene, for the harness that takes stills of it.
    ///
    /// Two differences from the background, both of them the harness's: the
    /// rare things are wound on rather than left waiting, so a still has a boat
    /// and a shark in it, and the sky can be asked for rather than read off the
    /// clock, since the sky is a function of the minute the still was taken in
    /// and two stills taken in different minutes cannot be compared at all.
    /// `preview.qml` next to `Seascape.qml` has both, under the same names.
    pub fn asked(
        width: u32,
        height: u32,
        seed: f64,
        tolerance: f64,
        settle: f64,
        hour: Option<[f64; 4]>,
    ) -> Self {
        Scene::open(width, height, seed, tolerance, settle, hour, true)
    }

    fn open(
        width: u32,
        height: u32,
        seed: f64,
        tolerance: f64,
        settle: f64,
        hour: Option<[f64; 4]>,
        rushed: bool,
    ) -> Self {
        let mut sim = sim::Sim::new(include_str!("../js/scene.js"));
        if rushed {
            sim.call("rush", &[1.0]);
        }
        if let Some([daylight, dusk, march, lit]) = hour {
            sim.call("pretend", &[daylight, dusk, march, lit]);
        }

        // A seed nobody chose is the one the calendar day chose. Asked of the
        // ornament rather than worked out here, since which sea today is, is
        // the same question the site's own shoal answers.
        let seed = if seed < 0.0 {
            sim.call("today", &[])
        } else {
            seed
        };
        sim.call("build", &[width as f64, height as f64, seed, tolerance]);
        sim.call("open", &[settle]);

        let mut scene = Scene {
            sim,
            bed: bed::Bed::default(),
            over: over::Over::default(),
            geo: VertexBuffers::new(),
            swings: Vec::new(),
            frame: Frame::default(),
            planted: seed,
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

    /// Which sea this is, and which sea today is. A desktop left running past
    /// midnight is looking at yesterday's water until the two agree again.
    pub fn planted(&self) -> f64 {
        self.planted
    }

    pub fn today(&mut self) -> f64 {
        self.sim.call("today", &[])
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
            daylight: told[5],
        };
        self.over.take(&told[6..]);

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

    /// And the rock the lens has given up on, a mass to a layer: the wall at
    /// the back of the water, and whatever near rock the frame is hanging off.
    pub fn soft(&self) -> Vec<paint::Soft<'_>> {
        let mut layers = Vec::new();
        let (vertices, indices) = self.bed.wall();

        if !indices.is_empty() {
            layers.push(paint::Soft {
                batch: paint::Batch { vertices, indices },
                blur: bed::WALL_BLUR,
                // One distance for the whole wall rather than one a cliff, the
                // way `Seascape.qml` hangs every cliff off one item: a blur run
                // over two pieces of the same wall separately shows the join.
                lane: WALL_LANE,
            });
        }

        for mass in self.over.soft() {
            layers.push(paint::Soft {
                batch: paint::Batch {
                    vertices: &mass.geo.vertices,
                    indices: &mass.geo.indices,
                },
                blur: mass.blur,
                lane: mass.lane,
            });
        }

        layers
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
            // Not the day's strength at midnight. A night sea is not a black
            // rectangle: there is a moon on it for half the month and a sky
            // behind that, and what reaches this far down is little rather than
            // nothing.
            lit: LIT * (NIGHT_LID + (1.0 - NIGHT_LID) * self.frame.daylight),
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
            ..Default::default()
        }
    }

    pub fn geometry(&self) -> (&[paint::Vertex], &[u32]) {
        (&self.geo.vertices, &self.geo.indices)
    }
}

/// The lid on the water, out of `Seascape.qml`: how much light the surface
/// holds and how fast the column gives it up.
const LIT: f32 = 0.13;
const NIGHT_LID: f32 = 0.24;
const SINKAGE: f32 = 2.1;

/// How far back the wall at the back stands, which is one distance for all of
/// it: the item every cliff hangs off in `Seascape.qml` carries this z.
const WALL_LANE: f32 = -3.3;

/// The film the water lands on, and how much light a corner gives up.
const GRAIN: f32 = 0.03;
const GRAIN_SPAN: f32 = 1.6;
const VIGNETTE: f32 = 0.3;

/// How much of the desktop's own picture the water lets through.
///
/// `Seascape.qml` draws the sea over the wallpaper at `waterInk`, and this is
/// what is left: enough of somebody's picture to read as the murk having a
/// texture, and not enough of it to still be a picture.
pub const THROUGH: f32 = 0.12;

/// A picture off the disk, as the rows a card takes.
pub fn picture(path: &std::path::Path) -> Option<(Vec<u8>, u32, u32)> {
    let read = image::open(path).ok()?.to_rgba8();
    let (width, height) = read.dimensions();

    Some((read.into_raw(), width, height))
}

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
