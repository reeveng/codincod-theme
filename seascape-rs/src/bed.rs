//! A frame of the bed, read off the bridge's buffer and cut into triangles.
//!
//! The wire is `js/scene.ts`, and the shapes are the ones `Seascape.qml` draws:
//! the ground at each distance, closed off under the box, and the plants
//! standing on it. Nothing here decides a colour. Every vertex carries the two
//! numbers the shader needs to work one out, which is what keeps the water's
//! own gradient a gradient rather than eight stops.
//!
//! ## A plant is cut when it has moved and not before
//!
//! Most of the bed is standing still at any moment: a plant holds the drawing
//! it last made until the water has bent it far enough to be worth another, and
//! says so with a number that goes up. So this keeps what it cut for each plant
//! and cuts again only for the ones that said they had moved. What it costs to
//! keep is the triangles themselves; what it saves is tessellating a bed that
//! did not change, which was the whole of the frame.
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

/// Coral, on the wire.
const CORAL: u8 = 4;

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

/// One thing's triangles, and the drawing they were cut from.
#[derive(Default)]
struct Cut {
    vertices: Vec<Vertex>,
    indices: Vec<u32>,
    /// What the plant said it had cut when this was made, or -1 for never.
    stamp: f32,
    /// Where it stands in the water, since that is what the order is by.
    depth: f32,
}

impl Cut {
    fn clear(&mut self) {
        self.vertices.clear();
        self.indices.clear();
    }
}

/// The bed, kept between frames.
pub struct Bed {
    ground: Vec<Cut>,
    plants: Vec<Cut>,
    height: f32,
    fill: FillTessellator,
    stroke: StrokeTessellator,
}

impl Default for Bed {
    fn default() -> Self {
        Bed {
            ground: Vec::new(),
            plants: Vec::new(),
            height: 0.0,
            fill: FillTessellator::new(),
            stroke: StrokeTessellator::new(),
        }
    }
}

impl Bed {
    /// Take a published frame, cut whatever moved, and lay the whole bed out in
    /// the order the water sorts it.
    pub fn take(&mut self, floats: &[f32], geo: &mut VertexBuffers<Vertex, u32>) {
        assert_eq!(floats[0], 2.0, "the bridge speaks a version this does not");
        let width = floats[1];
        self.height = floats[2];

        let mut cursor = Cursor { at: 3, floats };
        let ground = cursor.next() as usize;
        let plants = cursor.next() as usize;

        if self.ground.is_empty() {
            // The water itself, which everything else is drawn into, and then
            // the ground. Neither is cut again while the scene stands.
            let mut sea = Cut { depth: -9.0, stamp: 0.0, ..Default::default() };
            let box_of = [
                (0.0, 0.0),
                (width, 0.0),
                (width, self.height),
                (0.0, self.height),
            ];
            self.fill_shape(&mut sea, &box_of, 0.0, false);
            self.ground.push(sea);
        }

        let fresh = self.ground.len() == 1;
        for at in 0..ground {
            let kind = cursor.next() as u8;
            let depth = cursor.next();
            let ridge = cursor.points();
            if !fresh {
                continue;
            }
            let weight = match kind {
                0 => SAND_INK,
                3 => haze(STONE_INK, depth),
                _ => haze(SAND_INK, depth),
            };
            let mut cut = Cut { depth: lane(kind, depth), stamp: 0.0, ..Default::default() };
            self.fill_shape(&mut cut, &ridge, weight, true);
            let _ = at;
            self.ground.push(cut);
        }
        self.ground
            .sort_by(|a, b| a.depth.partial_cmp(&b.depth).unwrap());

        if self.plants.len() != plants {
            self.plants = (0..plants)
                .map(|_| Cut { stamp: -1.0, ..Default::default() })
                .collect();
        }

        for at in 0..plants {
            let kind = cursor.next() as u8;
            let depth = cursor.next();
            let girth = cursor.next();
            let scale = cursor.next();
            let x = cursor.next();
            let y = cursor.next();
            let stamp = cursor.next();
            let again = cursor.next() > 0.5;

            if !again {
                self.plants[at].depth = depth;
                continue;
            }

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
                let mut carved = Vec::with_capacity(n);
                for _ in 0..n {
                    carved.push(cursor.next());
                }
                twigs.push(Twig { carved, width });
            }

            let plant = Plant { blades, depth, girth, kind, scale, strand, twigs, x, y };
            let mut held = std::mem::take(&mut self.plants[at]);
            held.clear();
            held.depth = depth;
            held.stamp = stamp;
            self.cut_plant(&mut held, &plant);
            self.plants[at] = held;
        }

        // Sorted into the water by distance the way everything in this scene is,
        // so a near plant is drawn over a far one.
        let mut order: Vec<usize> = (0..self.plants.len()).collect();
        order.sort_by(|a, b| {
            self.plants[*a]
                .depth
                .partial_cmp(&self.plants[*b].depth)
                .unwrap()
        });

        geo.vertices.clear();
        geo.indices.clear();
        for cut in &self.ground {
            lay(cut, geo);
        }
        for at in order {
            lay(&self.plants[at], geo);
        }
    }

    fn cut_plant(&mut self, into: &mut Cut, plant: &Plant) {
        let weight = haze(FLORA_INK, plant.depth);
        if plant.kind == CORAL {
            self.stroke_coral(into, plant, weight);
            return;
        }

        let parted = plant.girth * (1.0 - BLADE_GIRTH) >= BLADE_SPLIT;
        let mut lines: Vec<&Vec<(f32, f32)>> = vec![&plant.strand];
        if !parted {
            lines.extend(plant.blades.iter());
        }
        self.stroke_lines(into, &lines, plant.girth, weight, plant.y);

        if parted {
            let leaves: Vec<&Vec<(f32, f32)>> = plant.blades.iter().collect();
            self.stroke_lines(into, &leaves, plant.girth * BLADE_GIRTH, weight, plant.y);
        }
    }

    /// A ridge as the ground, closed off under the bottom of the box.
    fn fill_shape(&mut self, into: &mut Cut, points: &[(f32, f32)], weight: f32, floored: bool) {
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

        let mut geo = VertexBuffers::<Vertex, u32>::new();
        self.fill
            .tessellate_path(
                &path,
                &FillOptions::tolerance(0.1),
                &mut BuffersBuilder::new(&mut geo, |v: FillVertex| Vertex {
                    pos: v.position().to_array(),
                    weight,
                    shade: DOWN_THE_BOX,
                }),
            )
            .unwrap();
        join(into, &geo);
    }

    /// Several lines at one weight in one ink, which is what a plant is.
    fn stroke_lines(
        &mut self,
        into: &mut Cut,
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

        let mut geo = VertexBuffers::<Vertex, u32>::new();
        self.stroke
            .tessellate_path(
                &path,
                &StrokeOptions::tolerance(0.1)
                    .with_line_width(width)
                    .with_line_cap(LineCap::Round),
                &mut BuffersBuilder::new(&mut geo, |v: StrokeVertex| Vertex {
                    pos: v.position().to_array(),
                    weight,
                    shade,
                }),
            )
            .unwrap();
        join(into, &geo);
    }

    /// A coral, which is drawn rather than swayed: the site's own strokes,
    /// scaled to this one's size and stood where it grows.
    fn stroke_coral(&mut self, into: &mut Cut, plant: &Plant, weight: f32) {
        for twig in &plant.twigs {
            if twig.carved.len() < 8 {
                continue;
            }
            let at = |i: usize| {
                point(
                    plant.x + twig.carved[i] * plant.scale,
                    plant.y + twig.carved[i + 1] * plant.scale,
                )
            };
            // A twig is a move and a curve, and several of them can share one
            // width: the bushier corals are written as one drawing with a
            // stroke apiece rather than as one branch each.
            let mut builder = Path::builder();
            for branch in (0..twig.carved.len() - 7).step_by(8) {
                builder.begin(at(branch));
                builder.cubic_bezier_to(at(branch + 2), at(branch + 4), at(branch + 6));
                builder.end(false);
            }
            let path = builder.build();

            let mut geo = VertexBuffers::<Vertex, u32>::new();
            self.stroke
                .tessellate_path(
                    &path,
                    &StrokeOptions::tolerance(0.1)
                        .with_line_width(twig.width * plant.scale)
                        .with_line_cap(LineCap::Round),
                    &mut BuffersBuilder::new(&mut geo, |v: StrokeVertex| Vertex {
                        pos: v.position().to_array(),
                        weight,
                        shade: plant.y,
                    }),
                )
                .unwrap();
            join(into, &geo);
        }
    }
}

/// Add one tessellation to what a thing has already been cut into.
fn join(into: &mut Cut, geo: &VertexBuffers<Vertex, u32>) {
    let base = into.vertices.len() as u32;
    into.vertices.extend_from_slice(&geo.vertices);
    into.indices.extend(geo.indices.iter().map(|i| i + base));
}

/// Lay a thing's triangles into the frame being handed to the GPU.
fn lay(cut: &Cut, geo: &mut VertexBuffers<Vertex, u32>) {
    let base = geo.vertices.len() as u32;
    geo.vertices.extend_from_slice(&cut.vertices);
    geo.indices.extend(cut.indices.iter().map(|i| i + base));
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
    carved: Vec<f32>,
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
