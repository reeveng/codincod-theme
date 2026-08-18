//! A frame of the bed, read off the bridge's buffer and cut into triangles.
//!
//! The wire is `js/scene.ts`, and the shapes are the ones `Seascape.qml` draws:
//! the ground at each distance, closed off under the box, and the plants
//! standing on it. Nothing here decides a colour. Every vertex carries the two
//! numbers the shader needs to work one out, which is what keeps the water's
//! own gradient a gradient rather than eight stops.
use lyon_tessellation::geom::point;
use lyon_tessellation::path::{LineCap, Path};
use lyon_tessellation::{
    BuffersBuilder, FillOptions, FillTessellator, FillVertex, StrokeOptions, StrokeTessellator,
    StrokeVertex, VertexBuffers,
};

use crate::paint::Vertex;

/// Mirrors of `Seascape.qml`: what each thing is worth in ink, and where a leaf
/// stops being drawn in its strand's own path.
const BLADE_GIRTH: f32 = 0.8;
const BLADE_SPLIT: f32 = 0.5;
const FLORA_INK: f32 = 0.33;
const HAZE_INK: f32 = 0.04;
const SAND_INK: f32 = 0.19;
const STONE_INK: f32 = 0.25;

/// The water is drawn with the fragment's own height rather than one handed to
/// it, which is what a gradient is.
const DOWN_THE_BOX: f32 = -1.0;

pub struct Frame<'a> {
    floats: &'a [f32],
    pub width: f32,
    pub height: f32,
}

struct Cursor<'a> {
    at: usize,
    floats: &'a [f32],
}

impl<'a> Cursor<'a> {
    fn next(&mut self) -> f32 {
        let v = self.floats[self.at];
        self.at += 1;
        v
    }

    fn points(&mut self) -> Vec<(f32, f32)> {
        let n = self.next() as usize;
        let mut out = Vec::with_capacity(n);
        for _ in 0..n {
            let x = self.next();
            let y = self.next();
            out.push((x, y));
        }
        out
    }
}

fn haze(full: f32, depth: f32) -> f32 {
    HAZE_INK + (full - HAZE_INK) * depth.clamp(0.0, 1.0)
}

impl<'a> Frame<'a> {
    pub fn new(floats: &'a [f32]) -> Self {
        assert_eq!(floats[0], 1.0, "the bridge speaks a version this does not");
        Frame { floats, width: floats[1], height: floats[2] }
    }

    /// The whole bed as triangles, in the order the scene sorts them.
    pub fn tessellate(&self, geo: &mut VertexBuffers<Vertex, u32>) {
        geo.vertices.clear();
        geo.indices.clear();

        let mut fill = FillTessellator::new();
        let mut stroke = StrokeTessellator::new();

        // The water itself, which everything else is drawn into.
        let sea = [
            (0.0, 0.0),
            (self.width, 0.0),
            (self.width, self.height),
            (0.0, self.height),
        ];
        self.fill_shape(&mut fill, geo, &sea, 0.0, false);

        let mut cursor = Cursor { at: 3, floats: self.floats };
        let ground = cursor.next() as usize;
        let plants = cursor.next() as usize;

        // Ground, furthest back first: the cliffs standing in the murk, then the
        // hills in front of them, then the sand everything is rooted on.
        let mut beds: Vec<(u8, f32, Vec<(f32, f32)>)> = Vec::with_capacity(ground);
        for _ in 0..ground {
            let kind = cursor.next() as u8;
            let depth = cursor.next();
            beds.push((kind, depth, cursor.points()));
        }
        beds.sort_by(|a, b| lane(a.0, a.1).partial_cmp(&lane(b.0, b.1)).unwrap());

        for (kind, depth, ridge) in &beds {
            let weight = match kind {
                0 => SAND_INK,
                3 => haze(STONE_INK, *depth),
                _ => haze(SAND_INK, *depth),
            };
            self.fill_shape(&mut fill, geo, ridge, weight, true);
        }

        // The plants, sorted into the water by distance the way everything in
        // this scene is, so a near one is drawn over a far one.
        let mut standing: Vec<Plant> = Vec::with_capacity(plants);
        for _ in 0..plants {
            let kind = cursor.next() as u8;
            let depth = cursor.next();
            let girth = cursor.next();
            let _scale = cursor.next();
            let _x = cursor.next();
            let y = cursor.next();
            let _cut = cursor.next();
            let strand = cursor.points();
            let count = cursor.next() as usize;
            let mut blades = Vec::with_capacity(count);
            for _ in 0..count {
                blades.push(cursor.points());
            }
            let grown = cursor.next() as usize;
            let mut twigs = Vec::with_capacity(grown);
            for _ in 0..grown {
                let width = cursor.next();
                let n = cursor.next() as usize;
                let mut cut = Vec::with_capacity(n);
                for _ in 0..n {
                    cut.push(cursor.next());
                }
                twigs.push(Twig { cut, width });
            }
            standing.push(Plant { blades, depth, girth, kind, scale: _scale, strand, twigs, x: _x, y });
        }
        standing.sort_by(|a, b| a.depth.partial_cmp(&b.depth).unwrap());

        for plant in &standing {
            let weight = haze(FLORA_INK, plant.depth);
            if plant.kind == 4 {
                self.stroke_coral(&mut stroke, geo, plant, weight);
                continue;
            }
            let parted = plant.girth * (1.0 - BLADE_GIRTH) >= BLADE_SPLIT;

            let mut lines: Vec<&Vec<(f32, f32)>> = vec![&plant.strand];
            if !parted {
                lines.extend(plant.blades.iter());
            }
            self.stroke_lines(&mut stroke, geo, &lines, plant.girth, weight, plant.y);

            if parted {
                let leaves: Vec<&Vec<(f32, f32)>> = plant.blades.iter().collect();
                let fine = plant.girth * BLADE_GIRTH;
                self.stroke_lines(&mut stroke, geo, &leaves, fine, weight, plant.y);
            }
        }
    }

    /// A ridge as the ground, closed off under the bottom of the box.
    fn fill_shape(
        &self,
        fill: &mut FillTessellator,
        geo: &mut VertexBuffers<Vertex, u32>,
        points: &[(f32, f32)],
        weight: f32,
        floored: bool,
    ) {
        if points.len() < 2 {
            return;
        }
        let mut builder = Path::builder();
        builder.begin(point(points[0].0, points[0].1));
        for p in &points[1..] {
            builder.line_to(point(p.0, p.1));
        }
        if floored {
            let under = self.height + 2.0;
            builder.line_to(point(points[points.len() - 1].0, under));
            builder.line_to(point(points[0].0, under));
        }
        builder.close();
        let path = builder.build();

        fill.tessellate_path(
            &path,
            &FillOptions::tolerance(0.1),
            &mut BuffersBuilder::new(geo, |v: FillVertex| Vertex {
                pos: v.position().to_array(),
                weight,
                shade: DOWN_THE_BOX,
            }),
        )
        .unwrap();
    }

    /// A coral, which is drawn rather than swayed: the site's own strokes,
    /// scaled to this one's size and stood where it grows.
    fn stroke_coral(
        &self,
        stroke: &mut StrokeTessellator,
        geo: &mut VertexBuffers<Vertex, u32>,
        plant: &Plant,
        weight: f32,
    ) {
        for twig in &plant.twigs {
            if twig.cut.len() < 8 {
                continue;
            }
            let at = |i: usize| {
                point(
                    plant.x + twig.cut[i] * plant.scale,
                    plant.y + twig.cut[i + 1] * plant.scale,
                )
            };
            // A twig is a move and a curve, and several of them can share one
            // width: the bushier corals are written as one drawing with a
            // stroke apiece rather than as one branch each.
            let mut builder = Path::builder();
            for branch in (0..twig.cut.len() - 7).step_by(8) {
                builder.begin(at(branch));
                builder.cubic_bezier_to(at(branch + 2), at(branch + 4), at(branch + 6));
                builder.end(false);
            }
            let path = builder.build();

            stroke
                .tessellate_path(
                    &path,
                    &StrokeOptions::tolerance(0.1)
                        .with_line_width(twig.width * plant.scale)
                        .with_line_cap(LineCap::Round),
                    &mut BuffersBuilder::new(geo, |v: StrokeVertex| Vertex {
                        pos: v.position().to_array(),
                        weight,
                        shade: plant.y,
                    }),
                )
                .unwrap();
        }
    }

    /// Several lines at one weight in one ink, which is what a plant is.
    fn stroke_lines(
        &self,
        stroke: &mut StrokeTessellator,
        geo: &mut VertexBuffers<Vertex, u32>,
        lines: &[&Vec<(f32, f32)>],
        width: f32,
        weight: f32,
        shade: f32,
    ) {
        let mut builder = Path::builder();
        let mut any = false;
        for line in lines {
            if line.len() < 2 {
                continue;
            }
            any = true;
            builder.begin(point(line[0].0, line[0].1));
            for p in &line[1..] {
                builder.line_to(point(p.0, p.1));
            }
            builder.end(false);
        }
        if !any {
            return;
        }
        let path = builder.build();

        stroke
            .tessellate_path(
                &path,
                &StrokeOptions::tolerance(0.1)
                    .with_line_width(width)
                    .with_line_cap(LineCap::Round),
                &mut BuffersBuilder::new(geo, |v: StrokeVertex| Vertex {
                    pos: v.position().to_array(),
                    weight,
                    shade,
                }),
            )
            .unwrap();
    }
}

struct Plant {
    blades: Vec<Vec<(f32, f32)>>,
    depth: f32,
    girth: f32,
    kind: u8,
    scale: f32,
    strand: Vec<(f32, f32)>,
    twigs: Vec<Twig>,
    x: f32,
    y: f32,
}

/// One stroke of a coral: a move and a curve, at its own width.
struct Twig {
    cut: Vec<f32>,
    width: f32,
}

/// Where a piece of ground sorts, in the lanes `Seascape.qml` gives them.
fn lane(kind: u8, depth: f32) -> f32 {
    match kind {
        2 => -3.4 + depth,
        1 => -3.0 + depth,
        3 => -2.6 + depth,
        _ => -2.0,
    }
}
