//! The seascape, drawn natively.
//!
//! One still for now, so the picture can be held against the QML renderer's
//! own: `compare/reference.qml` draws the same bed and `compare/against.sh`
//! puts the two side by side.
mod bed;
mod paint;
mod sim;

use lyon_tessellation::VertexBuffers;

fn arg(key: &str, fallback: &str) -> String {
    std::env::args()
        .find(|a| a.starts_with(&format!("{key}=")))
        .map(|a| a[key.len() + 1..].to_string())
        .unwrap_or_else(|| fallback.to_string())
}

fn hue(text: &str) -> [f32; 4] {
    let raw = u32::from_str_radix(text.trim_start_matches('#'), 16).unwrap_or(0);
    [
        ((raw >> 16) & 255) as f32 / 255.0,
        ((raw >> 8) & 255) as f32 / 255.0,
        (raw & 255) as f32 / 255.0,
        1.0,
    ]
}

fn main() {
    let width: u32 = arg("width", "2560").parse().unwrap();
    let height: u32 = arg("height", "1440").parse().unwrap();
    let seed: f64 = arg("seed", "28").parse().unwrap();
    let settle: f64 = arg("settle", "40").parse().unwrap();
    let tolerance: f64 = arg("tolerance", "0.25").parse().unwrap();
    let out = arg("out", "bed.png");

    let mut sim = sim::Sim::new(include_str!("../js/scene.js"));
    sim.call("build", &[width as f64, height as f64, seed, tolerance]);
    sim.call("wind", &[settle]);

    let mut geo: VertexBuffers<paint::Vertex, u32> = VertexBuffers::new();
    let t0 = std::time::Instant::now();
    let floats = sim.call("publish", &[]) as usize;
    let published = t0.elapsed();

    let t1 = std::time::Instant::now();
    bed::Frame::new(sim.frame(floats)).tessellate(&mut geo);
    let cut = t1.elapsed();

    let paint = paint::Paint::new(width, height);
    // The lid on the water, out of `Seascape.qml`: how much light the surface
    // holds and how fast the column gives it up.
    paint.water(hue("#35c26d"), hue("#0e1712"), 0.13, 2.1);

    let t2 = std::time::Instant::now();
    paint.draw(&geo.vertices, &geo.indices);
    let drawn = t2.elapsed();

    // What a frame costs once the scene is standing, which is the number this
    // whole exercise is about. The still above is one frame; these are the rest.
    let laps: usize = arg("frames", "0").parse().unwrap();
    if laps > 0 {
        let mut stepped = 0.0;
        let mut published = 0.0;
        let mut cut = 0.0;
        let mut drawn = 0.0;
        for _ in 0..20 {
            sim.call("step", &[0.033]);
            let floats = sim.call("publish", &[]) as usize;
            bed::Frame::new(sim.frame(floats)).tessellate(&mut geo);
            paint.draw(&geo.vertices, &geo.indices);
        }
        for _ in 0..laps {
            let a = std::time::Instant::now();
            sim.call("step", &[0.033]);
            let b = std::time::Instant::now();
            let floats = sim.call("publish", &[]) as usize;
            let c = std::time::Instant::now();
            bed::Frame::new(sim.frame(floats)).tessellate(&mut geo);
            let d = std::time::Instant::now();
            paint.draw(&geo.vertices, &geo.indices);
            let e = std::time::Instant::now();
            stepped += (b - a).as_secs_f64();
            published += (c - b).as_secs_f64();
            cut += (d - c).as_secs_f64();
            drawn += (e - d).as_secs_f64();
        }
        let each = 1000.0 / laps as f64;
        let frame = (stepped + published + cut + drawn) * each;
        println!(
            "a frame: step {:.2}ms  publish {:.2}ms  cut {:.2}ms  draw {:.2}ms  = {:.2}ms, {:.0} a second",
            stepped * each,
            published * each,
            cut * each,
            drawn * each,
            frame,
            1000.0 / frame,
        );
    }

    let pixels = paint.read();
    let file = std::fs::File::create(&out).expect("cannot write the still");
    let mut png = png::Encoder::new(std::io::BufWriter::new(file), width, height);
    png.set_color(png::ColorType::Rgba);
    png.set_depth(png::BitDepth::Eight);
    png.write_header()
        .unwrap()
        .write_image_data(&pixels)
        .unwrap();

    let ms = |d: std::time::Duration| d.as_secs_f64() * 1000.0;
    println!(
        "{} vertices, {} indices: publish {:.2}ms, cut {:.2}ms, draw {:.2}ms -> {out}",
        geo.vertices.len(),
        geo.indices.len(),
        ms(published),
        ms(cut),
        ms(drawn),
    );
}
