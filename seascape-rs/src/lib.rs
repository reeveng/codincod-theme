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
pub mod paint;
pub mod sim;

use lyon_tessellation::VertexBuffers;

/// The water, and everything needed to advance it and hand it over.
pub struct Scene {
    sim: sim::Sim,
    bed: bed::Bed,
    geo: VertexBuffers<paint::Vertex, u32>,
}

/// Where a frame's time went, in milliseconds.
#[derive(Default)]
pub struct Spent {
    pub step: f64,
    pub publish: f64,
    pub cut: f64,
}

impl Scene {
    pub fn new(width: u32, height: u32, seed: f64, tolerance: f64, settle: f64) -> Self {
        let mut sim = sim::Sim::new(include_str!("../js/scene.js"));
        sim.call("build", &[width as f64, height as f64, seed, tolerance]);
        sim.call("wind", &[settle]);

        Scene { sim, bed: bed::Bed::default(), geo: VertexBuffers::new() }
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
        self.bed.take(self.sim.frame(floats), &mut self.geo);
        Spent { step, publish, cut: ms(c) }
    }

    pub fn geometry(&self) -> (&[paint::Vertex], &[u32]) {
        (&self.geo.vertices, &self.geo.indices)
    }
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
