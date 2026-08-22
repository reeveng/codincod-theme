//! Planting a second sea in the same process.
//!
//! The water is planted again whenever a day turns over, a screen arrives or a
//! screen changes size, and each of those builds a scene beside the one it
//! replaces. V8's platform belongs to the process, so a host that started it
//! per scene aborted the wallpaper on the second one: the desktop's picture
//! went out at midnight and again on every change of theme. This is that
//! second scene, and the old one dropped after it.
use seascape::Scene;

#[test]
fn a_second_sea_is_planted_and_the_first_dropped() {
    let first = Scene::new(640, 360, 28.0, 0.25, 1.0);
    let second = Scene::new(640, 360, 29.0, 0.25, 1.0);

    assert_eq!(first.planted(), 28.0);
    assert_eq!(second.planted(), 29.0);

    drop(first);
    let third = Scene::new(640, 360, 30.0, 0.25, 1.0);
    assert_eq!(third.planted(), 30.0);
}

#[test]
fn two_screens_plant_and_replant_in_any_order() {
    // What a desk with two monitors does at midnight: each screen's water is
    // planted again beside the other's, and the old one goes after the new one
    // is standing.
    let left = Scene::new(320, 200, 1.0, 0.25, 1.0);
    let right = Scene::new(320, 200, 2.0, 0.25, 1.0);

    let planted = Scene::new(320, 200, 3.0, 0.25, 1.0);
    drop(left);
    drop(right);

    assert_eq!(planted.planted(), 3.0);
}
