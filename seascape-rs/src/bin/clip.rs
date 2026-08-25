//! A clip of the water, off the card, as raw frames on stdout.
//!
//!   clip seconds=8 width=1600 height=900 | ffmpeg -f rawvideo -pix_fmt rgba ...
//!
//! `clip.sh` beside this is the thing to run; this is the half of it that
//! draws. The clock is stepped by hand rather than read off the machine, so a
//! recording is the same water at the same rate whatever else the machine was
//! doing while it ran: a frame that takes a second and a frame that takes a
//! tenth advance the sea by exactly one frame either way. That is the whole
//! reason a clip is not a screen recording of the wallpaper.
//!
//! Frames go out raw and uncompressed, because a clip is thousands of stills
//! and writing them to disk first is minutes of waiting for something ffmpeg
//! reads in one pass anyway.
use std::io::Write;

use seascape::{arg, hue, paint, Scene};

fn main() {
    let width: u32 = arg("width", "1600").parse().unwrap();
    let height: u32 = arg("height", "900").parse().unwrap();
    let seed: f64 = arg("seed", "28").parse().unwrap();
    let settle: f64 = arg("settle", "40").parse().unwrap();
    let tolerance: f64 = arg("tolerance", "0.25").parse().unwrap();
    let fps: f64 = arg("fps", "30").parse().unwrap();
    let seconds: f64 = arg("seconds", "8").parse().unwrap();

    // The same hour the still harness takes, so a clip and a still can be held
    // against each other and against the QML renderer's.
    let daylight: f64 = arg("daylight", "-1").parse().unwrap();
    let hour = (daylight >= 0.0).then(|| {
        [
            daylight,
            arg("dusk", "0").parse().unwrap(),
            arg("march", "0.5").parse().unwrap(),
            arg("lit", "0.62").parse().unwrap(),
        ]
    });

    let mut scene = Scene::asked(width, height, seed, tolerance, settle, hour);
    let paint = paint::Paint::headless(width, height);
    let view = paint.own_view();
    let ink = hue(&arg("ink", "#35c26d"));
    let surface = hue(&arg("surface", "#0e1712"));

    let wall = arg("wall", "");
    if !wall.is_empty() {
        let through: f32 = arg("through", &seascape::THROUGH.to_string())
            .parse()
            .unwrap();
        if let Some((pixels, width, height)) = seascape::picture(std::path::Path::new(&wall)) {
            paint.hang(&pixels, width, height, through);
        }
    }

    paint.plant(scene.limbs());
    let (standing, held) = scene.standing();
    paint.stand(standing, held);

    // Opening on a still sea is opening on a scene nothing has entered yet. The
    // shoal is placed where it starts and swims in from there, so a clip that
    // records from the first frame is a clip of things arriving.
    let after: f64 = arg("after", "6").parse().unwrap();
    let step = 1.0 / fps;
    for _ in 0..(after * fps) as usize {
        scene.advance(step);
    }

    let mut out = std::io::BufWriter::with_capacity(1 << 22, std::io::stdout().lock());
    let laps = (seconds * fps) as usize;
    for _ in 0..laps {
        let spent = scene.advance(step);
        let (vertices, indices) = scene.geometry();
        let (over, glass) = scene.over();
        paint.sway(scene.swings());
        paint.sky(&scene.sky(ink, surface));
        paint.soften(&scene.soft());
        paint.draw(&view, vertices, indices, spent.redrawn, over, glass);
        paint.settle();
        out.write_all(&paint.read()).expect("the clip stopped early");
    }
    out.flush().unwrap();

    // Said on the error stream, since the picture is on the other one.
    eprintln!("{laps} frames of {width}x{height} at {fps} a second");
}
