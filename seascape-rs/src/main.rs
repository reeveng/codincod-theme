//! One still of the bed, so the picture can be held against the QML renderer's.
//!
//!   seascape width=2560 height=1440 seed=28 out=bed.png
//!   seascape frames=120                      # and what a frame costs
use seascape::{arg, hue, paint, Scene};

fn main() {
    let width: u32 = arg("width", "2560").parse().unwrap();
    let height: u32 = arg("height", "1440").parse().unwrap();
    let seed: f64 = arg("seed", "28").parse().unwrap();
    let settle: f64 = arg("settle", "40").parse().unwrap();
    let tolerance: f64 = arg("tolerance", "0.25").parse().unwrap();
    let out = arg("out", "bed.png");

    let mut scene = Scene::new(width, height, seed, tolerance, settle);
    let paint = paint::Paint::headless(width, height);
    let view = paint.own_view();
    let ink = hue(&arg("ink", "#35c26d"));
    let surface = hue(&arg("surface", "#0e1712"));

    // The standing bed goes over once; a frame is the sway after that.
    paint.plant(scene.limbs());
    let (standing, held) = scene.standing();
    paint.stand(standing, held);

    let spent = scene.advance(0.0);
    paint.sway(scene.swings());
    paint.sky(&scene.sky(ink, surface));
    let (vertices, indices) = scene.geometry();
    let (over, glass) = scene.over();
    let t = std::time::Instant::now();
    paint.draw(&view, vertices, indices, true, over, glass);
    paint.settle();
    let drawn = t.elapsed().as_secs_f64() * 1000.0;
    println!(
        "{} vertices, {} indices: publish {:.2}ms, cut {:.2}ms, draw {:.2}ms -> {out}",
        vertices.len(),
        indices.len(),
        spent.publish,
        spent.cut,
        drawn,
    );

    // What a frame costs once the scene is standing, which is the number this
    // whole exercise is about.
    let laps: usize = arg("frames", "0").parse().unwrap();
    if laps > 0 {
        for _ in 0..20 {
            let spent = scene.advance(0.033);
            paint.sway(scene.swings());
            paint.sky(&scene.sky(ink, surface));
            let (vertices, indices) = scene.geometry();
            let (over, glass) = scene.over();
            paint.draw(&view, vertices, indices, spent.redrawn, over, glass);
        }
        let (mut step, mut publish, mut cut, mut drawn) = (0.0, 0.0, 0.0, 0.0);
        for _ in 0..laps {
            let spent = scene.advance(0.033);
            let (vertices, indices) = scene.geometry();
            let (over, glass) = scene.over();
            let t = std::time::Instant::now();
            paint.sway(scene.swings());
            paint.sky(&scene.sky(ink, surface));
            paint.draw(&view, vertices, indices, spent.redrawn, over, glass);
            paint.settle();
            drawn += t.elapsed().as_secs_f64() * 1000.0;
            step += spent.step;
            publish += spent.publish;
            cut += spent.cut;
        }
        let each = 1.0 / laps as f64;
        let frame = (step + publish + cut + drawn) * each;
        println!(
            "a frame: step {:.2}ms  publish {:.2}ms  cut {:.2}ms  draw {:.2}ms  = {:.2}ms, {:.0} a second",
            step * each,
            publish * each,
            cut * each,
            drawn * each,
            frame,
            1000.0 / frame,
        );
    }

    let (vertices, indices) = scene.geometry();
    let (over, glass) = scene.over();
    paint.draw(&view, vertices, indices, true, over, glass);
    let pixels = paint.read();
    let file = std::fs::File::create(&out).expect("cannot write the still");
    let mut png = png::Encoder::new(std::io::BufWriter::new(file), width, height);
    png.set_color(png::ColorType::Rgba);
    png.set_depth(png::BitDepth::Eight);
    png.write_header()
        .unwrap()
        .write_image_data(&pixels)
        .unwrap();
}
