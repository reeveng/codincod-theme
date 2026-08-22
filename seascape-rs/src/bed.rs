//! The bed, cut into triangles once and bent on the card after that.
//!
//! The wire is `js/scene.ts`, and the shapes are the ones `Seascape.qml` draws:
//! the ground at each distance, closed off under the box, and the plants
//! standing on it. Nothing here decides a colour. Every vertex carries the two
//! numbers the shader needs to work one out, which is what keeps the water's
//! own gradient a gradient rather than eight stops.
//!
//! ## The bed is cut once
//!
//! A plant is a short tree of limbs: a line rooted on the ground or somewhere up
//! another line, and the water's whole say in it is one amplitude and one clock.
//! So the shape goes over at rest, each vertex carrying which limb it belongs to
//! and how far up that limb it sits, and the bending is a few lines of the
//! vertex shader; see `paint.rs`. What a frame costs after that is two numbers a
//! plant.
//!
//! The anemone is the exception and it is the honest one. A crown is not a shape
//! with a bend put through it, it is a heading that keeps turning, so where it
//! has turned to is the drawing itself. It comes over as points and is cut again
//! whenever it has moved far enough to be worth it, which is what the whole bed
//! used to do.
use lyon_tessellation::geom::point;
use lyon_tessellation::path::{LineCap, Path};
use lyon_tessellation::{
    BuffersBuilder, FillOptions, FillTessellator, FillVertex, StrokeOptions, StrokeTessellator,
    StrokeVertex, VertexBuffers,
};

use crate::paint::{Limb, Vertex, STIFF, TONE_WALL};

/// A point of a line at rest, and how far up its limb it sits.
type Along = (f32, f32, f32);

/// A leaf as it comes off the wire: the limb it grows on, where up it, and the
/// shape it is in that limb's own frame.
type Leaf = (usize, f32, Vec<(f32, f32)>);

/// A line and the limb that bends it, for the tessellator.
type Bent<'a> = (u32, &'a Vec<Along>);

/// Mirrors of `Seascape.qml`: what each thing is worth in ink, and where a leaf
/// stops being drawn in its strand's own path.
const BLADE_GIRTH: f32 = 0.8;
const BLADE_SPLIT: f32 = 0.5;
const FLORA_INK: f32 = 0.33;
const HAZE_INK: f32 = 0.04;
const SAND_INK: f32 = 0.19;
const STONE_INK: f32 = 0.25;

/// The two kinds this has anything to say about. A kelp, a grass and a fan are
/// all a frame of limbs and are drawn without being named.
const ANEMONE: u8 = 2;
const CORAL: u8 = 4;

/// The one piece of ground that is not in the bed: the wall at the back, which
/// is drawn out of focus.
const CLIFF: u8 = 2;

/// How far the lens gives up on that wall, in pixels. `Seascape.qml` says the
/// same in a blur of 0.34 out of a `blurMax` of 24.
pub const WALL_BLUR: f32 = 0.34 * 24.0;

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

/// One thing's triangles, and where it stands in the water.
#[derive(Default)]
struct Cut {
    vertices: Vec<Vertex>,
    indices: Vec<u32>,
    /// Where it stands in the water, since that is what the order is by.
    depth: f32,
}

impl Cut {
    fn clear(&mut self) {
        self.vertices.clear();
        self.indices.clear();
    }
}

/// One line of a plant, as the standing scene described it.
struct Bough {
    beat: f32,
    give: f32,
    own: f32,
    seat: f32,
    shift: f32,
    slant: f32,
    span: f32,
    steps: usize,
    /// Which limb it leaves, in this plant's own numbering, or -1 for the ground.
    stem: i32,
}

/// The bed, standing.
pub struct Bed {
    /// The whole bed laid out, cut once and handed over once.
    standing: VertexBuffers<Vertex, u32>,
    ground: Vec<Cut>,
    /// The far wall, kept out of the bed because it is drawn out of focus and a
    /// blur is run over a layer rather than over a triangle; see `paint::Soft`.
    wall: VertexBuffers<Vertex, u32>,
    plants: Vec<Cut>,
    kinds: Vec<u8>,
    girths: Vec<f32>,
    /// Every limb of every plant, in one table the card reads by index.
    limbs: Vec<Limb>,
    order: Vec<usize>,
    height: f32,
    fill: FillTessellator,
    stroke: StrokeTessellator,
}

impl Default for Bed {
    fn default() -> Self {
        Bed {
            standing: VertexBuffers::new(),
            ground: Vec::new(),
            wall: VertexBuffers::new(),
            plants: Vec::new(),
            kinds: Vec::new(),
            girths: Vec::new(),
            limbs: Vec::new(),
            order: Vec::new(),
            height: 0.0,
            fill: FillTessellator::new(),
            stroke: StrokeTessellator::new(),
        }
    }
}

impl Bed {
    /// Take the standing scene: the ground, the corals, and every plant the
    /// water only bends, cut where they stand and never cut again.
    pub fn stand(&mut self, floats: &[f32]) {
        self.wall.vertices.clear();
        self.wall.indices.clear();
        assert_eq!(floats[0], 3.0, "the bridge speaks a version this does not");
        let width = floats[1];
        self.height = floats[2];

        let mut cursor = Cursor { at: 3, floats };
        let grounds = cursor.next() as usize;
        let plants = cursor.next() as usize;

        // The water itself, which everything else is drawn into.
        let mut sea = Cut {
            depth: -9.0,
            ..Default::default()
        };
        let box_of = [
            (0.0, 0.0),
            (width, 0.0),
            (width, self.height),
            (0.0, self.height),
        ];
        self.fill_shape(&mut sea, &box_of, 0.0, false);
        for vertex in &mut sea.vertices {
            vertex.tone = TONE_WALL;
        }
        self.ground = vec![sea];

        for _ in 0..grounds {
            let kind = cursor.next() as u8;
            let depth = cursor.next();
            let ridge = cursor.points();
            let weight = match kind {
                0 => SAND_INK,
                3 => haze(STONE_INK, depth),
                _ => haze(SAND_INK, depth),
            };
            let mut cut = Cut {
                depth: lane(kind, depth),
                ..Default::default()
            };
            self.fill_shape(&mut cut, &ridge, weight, true);
            if kind == CLIFF {
                lay(&cut, &mut self.wall);
            } else {
                self.ground.push(cut);
            }
        }
        self.ground
            .sort_by(|a, b| a.depth.partial_cmp(&b.depth).unwrap());

        self.plants = Vec::with_capacity(plants);
        self.kinds = Vec::with_capacity(plants);
        self.girths = Vec::with_capacity(plants);
        self.limbs.clear();

        for at in 0..plants {
            let kind = cursor.next() as u8;
            let depth = cursor.next();
            let girth = cursor.next();
            let scale = cursor.next();
            let x = cursor.next();
            let y = cursor.next();

            self.kinds.push(kind);
            self.girths.push(girth);

            let mut cut = Cut {
                depth,
                ..Default::default()
            };
            let weight = haze(FLORA_INK, depth);

            if kind == CORAL {
                let grown = cursor.next() as usize;
                for _ in 0..grown {
                    let width = cursor.next();
                    let n = cursor.next() as usize;
                    let mut carved = Vec::with_capacity(n);
                    for _ in 0..n {
                        carved.push(cursor.next());
                    }
                    self.stroke_coral(&mut cut, &carved, width * scale, scale, x, y, weight);
                }
                self.plants.push(cut);
                continue;
            }

            if kind == ANEMONE {
                self.plants.push(cut);
                continue;
            }

            let boughs = self.boughs(&mut cursor);
            let leaves = self.leafage(&mut cursor);
            self.cut_frame(&mut cut, &boughs, &leaves, at as u32, girth, x, y, weight);
            self.plants.push(cut);
        }

        self.order = (0..self.plants.len())
            .filter(|at| self.kinds[*at] != ANEMONE)
            .collect();
        let depths: Vec<f32> = self.plants.iter().map(|c| c.depth).collect();
        self.order
            .sort_by(|a, b| depths[*a].partial_cmp(&depths[*b]).unwrap());

        self.standing.vertices.clear();
        self.standing.indices.clear();
        for cut in &self.ground {
            lay(cut, &mut self.standing);
        }
        for at in &self.order {
            lay(&self.plants[*at], &mut self.standing);
        }
    }

    /// The bed as it stands, which the card is handed once.
    pub fn standing(&self) -> (&[Vertex], &[u32]) {
        (&self.standing.vertices, &self.standing.indices)
    }

    /// And the wall behind it, which is handed over on its own to be softened.
    pub fn wall(&self) -> (&[Vertex], &[u32]) {
        (&self.wall.vertices, &self.wall.indices)
    }

    /// The limbs of one plant, read off the wire.
    fn boughs(&mut self, cursor: &mut Cursor) -> Vec<Bough> {
        let count = cursor.next() as usize;
        let mut boughs = Vec::with_capacity(count);

        for _ in 0..count {
            boughs.push(Bough {
                beat: cursor.next(),
                give: cursor.next(),
                own: cursor.next(),
                seat: cursor.next(),
                shift: cursor.next(),
                slant: cursor.next(),
                span: cursor.next(),
                steps: cursor.next() as usize,
                stem: cursor.next() as i32,
            });
        }

        boughs
    }

    fn leafage(&mut self, cursor: &mut Cursor) -> Vec<Leaf> {
        let count = cursor.next() as usize;
        let mut leaves: Vec<Leaf> = Vec::with_capacity(count);
        for _ in 0..count {
            let limb = cursor.next() as usize;
            let seat = cursor.next();
            leaves.push((limb, seat, cursor.points()));
        }
        leaves
    }

    /// A plant at rest, with every vertex told which limb bends it and how far
    /// up that limb it sits.
    #[allow(clippy::too_many_arguments)]
    fn cut_frame(
        &mut self,
        into: &mut Cut,
        boughs: &[Bough],
        leaves: &[Leaf],
        plant: u32,
        girth: f32,
        x: f32,
        y: f32,
        weight: f32,
    ) {
        let base = self.limbs.len() as u32;

        // Every limb at rest, which is a straight line from a root somewhere up
        // the limb it leaves. That root and that line are the whole of what the
        // card needs to put the plant back where the water has it.
        let mut lines: Vec<Vec<Along>> = Vec::with_capacity(boughs.len());
        for bough in boughs {
            let root = if bough.stem < 0 {
                [x + bough.shift, y]
            } else {
                let on = &self.limbs[base as usize + bough.stem as usize];
                [
                    on.root[0] + bough.seat * on.axis[0],
                    on.root[1] + bough.seat * on.axis[1],
                ]
            };
            let axis = [
                bough.span * bough.slant.sin(),
                -bough.span * bough.slant.cos(),
            ];

            self.limbs.push(Limb {
                root,
                axis,
                beat: bough.beat,
                give: bough.give,
                own: bough.own,
                seat: bough.seat,
                steps: bough.steps as f32,
                plant,
                stem: if bough.stem < 0 {
                    -1
                } else {
                    base as i32 + bough.stem
                },
                pad: 0.0,
            });

            let mut line = Vec::with_capacity(bough.steps + 1);
            for step in 0..=bough.steps {
                let t = step as f32 / bough.steps as f32;
                line.push((root[0] + t * axis[0], root[1] + t * axis[1], t));
            }
            lines.push(line);
        }

        // A leaf is a shape in the frame of the limb it grows on, so every one
        // of its points carries the seat rather than a place of its own: the
        // card turns the whole leaf by however far the limb has turned there,
        // which is what keeps it from crossing what it grows from.
        let mut leafed: Vec<(usize, Vec<Along>)> = Vec::with_capacity(leaves.len());
        for (limb, seat, shape) in leaves {
            let bough = &boughs[*limb];
            let on = &lines[*limb];
            let up = (seat * (on.len() - 1) as f32).round() as usize;
            let held = on[up.min(on.len() - 1)];

            // A leaf seated on the root itself has no line under it to take a
            // direction from, and the bed draws it as the point it stands on.
            let lean = if up == 0 { 0.0 } else { bough.slant.sin() };
            let rise = if up == 0 { 0.0 } else { bough.slant.cos() };

            let mut line = Vec::with_capacity(shape.len());
            for (sx, sy) in shape {
                line.push((
                    held.0 - lean * sx + rise * sy,
                    held.1 + rise * sx + lean * sy,
                    *seat,
                ));
            }
            leafed.push((*limb, line));
        }

        // The strand and its limbs at the plant's own weight, and the leaves at
        // a share of it where the plant is stout enough for the two to read
        // apart. The rule is `Seascape.qml`'s and the numbers are its own.
        let parted = girth * (1.0 - BLADE_GIRTH) >= BLADE_SPLIT;
        let mut thick: Vec<Bent> = Vec::new();
        let mut thin: Vec<Bent> = Vec::new();

        for (at, line) in lines.iter().enumerate() {
            thick.push((base + at as u32, line));
        }
        for (limb, line) in &leafed {
            if parted {
                thin.push((base + *limb as u32, line));
            } else {
                thick.push((base + *limb as u32, line));
            }
        }

        self.stroke_lines(into, &thick, girth, weight, y);
        if parted {
            self.stroke_lines(into, &thin, girth * BLADE_GIRTH, weight, y);
        }
    }

    /// Take a frame of the water and say whether the triangles moved, which
    /// only a crown redrawing itself can do: everything else is bent on the
    /// card, and a buffer nothing has changed is a buffer nobody has to send.
    pub fn take(
        &mut self,
        floats: &[f32],
        geo: &mut VertexBuffers<Vertex, u32>,
        swings: &mut Vec<[f32; 2]>,
    ) -> bool {
        let mut cursor = Cursor { at: 0, floats };
        let plants = cursor.next() as usize;

        swings.clear();
        swings.reserve(plants);
        let mut redrawn = false;

        for at in 0..plants {
            let amp = cursor.next();
            let own = cursor.next();
            swings.push([amp, own]);

            if cursor.next() < 0.5 {
                continue;
            }
            redrawn = true;

            let strand = cursor.points();
            let count = cursor.next() as usize;
            let mut blades = Vec::with_capacity(count);
            for _ in 0..count {
                blades.push(cursor.points());
            }

            let mut held = std::mem::take(&mut self.plants[at]);
            held.clear();
            let weight = haze(FLORA_INK, held.depth);
            let girth = self.girths[at];
            self.cut_anemone(&mut held, &strand, &blades, girth, weight);
            self.plants[at] = held;
        }

        if !redrawn {
            return false;
        }

        geo.vertices.clear();
        geo.indices.clear();
        for (at, cut) in self.plants.iter().enumerate() {
            if self.kinds[at] == ANEMONE {
                lay(cut, geo);
            }
        }
        true
    }

    /// Every limb of every plant, for the card to bend the bed by.
    pub fn limbs(&self) -> &[Limb] {
        &self.limbs
    }

    /// A crown and the column under it, as they were drawn this frame.
    fn cut_anemone(
        &mut self,
        into: &mut Cut,
        strand: &[(f32, f32)],
        blades: &[Vec<(f32, f32)>],
        girth: f32,
        weight: f32,
    ) {
        let shade = strand.first().map(|p| p.1).unwrap_or(0.0);
        let held: Vec<(u32, Vec<Along>)> = std::iter::once(strand.to_vec())
            .chain(blades.iter().cloned())
            .map(|line| (STIFF, line.into_iter().map(|(x, y)| (x, y, 0.0)).collect()))
            .collect();
        let lines: Vec<Bent> = held.iter().map(|(limb, line)| (*limb, line)).collect();

        self.stroke_lines(into, &lines, girth, weight, shade);
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
                    ..Default::default()
                }),
            )
            .unwrap();
        join(into, &geo);
    }

    /// Several lines at one weight in one ink, which is what a plant is. Each
    /// carries the limb that bends it, and each point how far up that limb it is.
    fn stroke_lines(
        &mut self,
        into: &mut Cut,
        lines: &[Bent],
        width: f32,
        weight: f32,
        shade: f32,
    ) {
        for (limb, line) in lines {
            if line.len() < 2 {
                continue;
            }
            let mut builder = Path::builder_with_attributes(1);
            builder.begin(point(line[0].0, line[0].1), &[line[0].2]);
            for p in &line[1..] {
                builder.line_to(point(p.0, p.1), &[p.2]);
            }
            builder.end(false);
            let path = builder.build();

            let mut geo = VertexBuffers::<Vertex, u32>::new();
            self.stroke
                .tessellate_path(
                    &path,
                    &StrokeOptions::tolerance(0.1)
                        .with_line_width(width)
                        .with_line_cap(LineCap::Round),
                    &mut BuffersBuilder::new(&mut geo, |mut v: StrokeVertex| {
                        let pos = v.position().to_array();
                        let t = v.interpolated_attributes()[0];
                        Vertex {
                            pos,
                            weight,
                            shade,
                            limb: *limb,
                            t,
                            ..Default::default()
                        }
                    }),
                )
                .unwrap();
            join(into, &geo);
        }
    }

    /// A coral, which is drawn rather than swayed: the site's own strokes,
    /// scaled to this one's size and stood where it grows.
    #[allow(clippy::too_many_arguments)]
    fn stroke_coral(
        &mut self,
        into: &mut Cut,
        carved: &[f32],
        width: f32,
        scale: f32,
        x: f32,
        y: f32,
        weight: f32,
    ) {
        if carved.len() < 8 {
            return;
        }
        let at = |i: usize| point(x + carved[i] * scale, y + carved[i + 1] * scale);

        // A twig is a move and a curve, and several of them can share one
        // width: the bushier corals are written as one drawing with a stroke
        // apiece rather than as one branch each.
        let mut builder = Path::builder();
        for branch in (0..carved.len() - 7).step_by(8) {
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
                    .with_line_width(width)
                    .with_line_cap(LineCap::Round),
                &mut BuffersBuilder::new(&mut geo, |v: StrokeVertex| Vertex {
                    pos: v.position().to_array(),
                    weight,
                    shade: y,
                    ..Default::default()
                }),
            )
            .unwrap();
        join(into, &geo);
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
    geo.vertices.extend(cut.vertices.iter().map(|v| Vertex {
        lane: cut.depth,
        ..*v
    }));
    geo.indices.extend(cut.indices.iter().map(|i| i + base));
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
