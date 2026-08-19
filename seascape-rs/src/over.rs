//! Everything that is not the bed: the light, the sky, and what swims.
//!
//! The bed is cut once and bent on the card, because a plant standing where it
//! grew is the same triangles every frame. Nothing here is: a fish is somewhere
//! new, a mote has fallen, a shaft has breathed, and the moon is a different
//! shape tonight than it was last night. So this is cut again every frame, from
//! a list of drawings the simulation hands over.
//!
//! What a drawing is, is deliberately small. A shape, a colour to mix it from,
//! how heavy it is, how it gives out, and where it stands in the water. There
//! is no fish in this file and no moon either. `js/scene.ts` knows what the
//! things are and says only what they look like, which is what keeps the
//! ornament the one place any of it is decided.
use lyon_tessellation::geom::point;
use lyon_tessellation::path::{LineCap, Path};
use lyon_tessellation::{
    BuffersBuilder, FillOptions, FillRule, FillTessellator, FillVertex, StrokeOptions,
    StrokeTessellator, StrokeVertex, VertexBuffers,
};

use crate::paint::{Batch, Vertex, DOWN_THE_BOX, ROUND};

/// What a drawing is drawn as.
const FILL: u8 = 0;
const STROKE: u8 = 1;
/// A round light, which is one point and a reach rather than a shape.
const LIGHT: u8 = 2;
/// The whole box, which is what a wash over the water is.
const WASH: u8 = 3;

/// The water over the bed, cut this frame.
///
/// Two batches, because the water is drawn twice. Anything solid takes its turn
/// by how far back it stands and can be handed over in any order; anything the
/// water is seen through is laid over what is already there in the order it
/// arrives, since two lights over one another are a painting rather than a
/// stack of depths.
#[derive(Default)]
pub struct Over {
    solid: VertexBuffers<Vertex, u32>,
    glass: VertexBuffers<Vertex, u32>,
    fill: FillTessellator,
    stroke: StrokeTessellator,
    height: f32,
    width: f32,
}

/// One drawing, as it comes off the wire.
struct Drawing {
    form: u8,
    tone: u32,
    weight: f32,
    shade: f32,
    alpha: f32,
    lane: f32,
    width: f32,
    fall: f32,
    fade: [f32; 2],
    thin: f32,
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
}

impl Over {
    pub fn size(&mut self, width: f32, height: f32) {
        self.width = width;
        self.height = height;
    }

    /// Take a frame of drawings and cut every one of them.
    pub fn take(&mut self, floats: &[f32]) {
        self.solid.vertices.clear();
        self.solid.indices.clear();
        self.glass.vertices.clear();
        self.glass.indices.clear();
        if floats.is_empty() {
            return;
        }

        let mut cursor = Cursor { at: 0, floats };
        let count = cursor.next() as usize;

        for _ in 0..count {
            let drawing = Drawing {
                form: cursor.next() as u8,
                tone: cursor.next() as u32,
                weight: cursor.next(),
                shade: cursor.next(),
                alpha: cursor.next(),
                lane: cursor.next(),
                width: cursor.next(),
                fall: cursor.next(),
                fade: [cursor.next(), cursor.next()],
                thin: cursor.next(),
            };
            let n = cursor.next() as usize;
            let mut points = Vec::with_capacity(n);
            for _ in 0..n {
                let x = cursor.next();
                let y = cursor.next();
                points.push((x, y));
            }
            self.cut(&drawing, &points);
        }
    }

    pub fn solid(&self) -> Batch {
        Batch {
            vertices: &self.solid.vertices,
            indices: &self.solid.indices,
        }
    }

    pub fn glass(&self) -> Batch {
        Batch {
            vertices: &self.glass.vertices,
            indices: &self.glass.indices,
        }
    }

    fn cut(&mut self, drawing: &Drawing, points: &[(f32, f32)]) {
        match drawing.form {
            LIGHT => self.light(drawing, points),
            WASH => self.wash(drawing),
            STROKE => self.line(drawing, points),
            _ => self.shape(drawing, points),
        }
    }

    /// The vertex every point of one drawing carries but its position.
    fn seed(&self, drawing: &Drawing) -> Vertex {
        Vertex {
            weight: drawing.weight,
            shade: drawing.shade,
            tone: drawing.tone,
            alpha: drawing.alpha,
            fade: [drawing.fade[0], drawing.fade[1], drawing.fall],
            lane: drawing.lane,
            ..Default::default()
        }
    }

    /// Which batch a drawing belongs in. Anything you can see the water through
    /// goes in the one that is painted in order; everything else takes its turn
    /// by depth.
    fn into(&mut self, drawing: &Drawing) -> bool {
        drawing.alpha < 0.999 || drawing.form == LIGHT || drawing.form == WASH
    }

    fn shape(&mut self, drawing: &Drawing, points: &[(f32, f32)]) {
        if points.len() < 3 {
            return;
        }
        let mut builder = Path::builder();
        builder.begin(point(points[0].0, points[0].1));
        for p in &points[1..] {
            builder.line_to(point(p.0, p.1));
        }
        builder.close();
        let path = builder.build();

        let seed = self.seed(drawing);
        let mut geo = VertexBuffers::<Vertex, u32>::new();
        let _ = self.fill.tessellate_path(
            &path,
            // Winding, because an animal is several closed shapes meant to
            // overlap: a body, a tail swung off its joint, a fin rooted inside
            // the back. Counting crossings instead cancels every overlap and
            // leaves the thing looking unstitched.
            &FillOptions::tolerance(0.1).with_fill_rule(FillRule::NonZero),
            &mut BuffersBuilder::new(&mut geo, |v: FillVertex| Vertex {
                pos: v.position().to_array(),
                ..seed
            }),
        );
        let glass = self.into(drawing);
        join(&mut geo, if glass { &mut self.glass } else { &mut self.solid });
    }

    fn line(&mut self, drawing: &Drawing, points: &[(f32, f32)]) {
        if points.len() < 2 {
            return;
        }
        let mut builder = Path::builder();
        builder.begin(point(points[0].0, points[0].1));
        for p in &points[1..] {
            builder.line_to(point(p.0, p.1));
        }
        builder.end(false);
        let path = builder.build();

        let seed = self.seed(drawing);
        let mut geo = VertexBuffers::<Vertex, u32>::new();
        let _ = self.stroke.tessellate_path(
            &path,
            &StrokeOptions::tolerance(0.1)
                .with_line_width(drawing.width.max(0.1))
                .with_line_cap(LineCap::Round),
            &mut BuffersBuilder::new(&mut geo, |v: StrokeVertex| Vertex {
                pos: v.position().to_array(),
                ..seed
            }),
        );
        let glass = self.into(drawing);
        join(&mut geo, if glass { &mut self.glass } else { &mut self.solid });
    }

    /// A round light: one quad, with the falling off done in the shader.
    ///
    /// Not a fan of triangles around a middle, which is what a radial gradient
    /// is usually cut into. The card is already reading a distance from the
    /// middle for every pixel it fills, so the light is a box with the middle
    /// marked and the shader does the rest, and there is no ring of facets
    /// where a fan's outer edge cuts the curve.
    fn light(&mut self, drawing: &Drawing, points: &[(f32, f32)]) {
        let Some((cx, cy)) = points.first().copied() else {
            return;
        };
        if drawing.width <= 0.0 || drawing.alpha <= 0.0 {
            return;
        }

        let across = drawing.width;
        let down = drawing.width * drawing.thin.max(0.001);
        let seed = Vertex {
            tone: drawing.tone | ROUND,
            shade: DOWN_THE_BOX,
            ..self.seed(drawing)
        };
        let corners = [(-1.0f32, -1.0f32), (1.0, -1.0), (1.0, 1.0), (-1.0, 1.0)];
        let base = self.glass.vertices.len() as u32;

        for (ux, uy) in corners {
            self.glass.vertices.push(Vertex {
                pos: [cx + ux * across, cy + uy * down],
                uv: [ux, uy],
                ..seed
            });
        }
        self.glass
            .indices
            .extend([base, base + 1, base + 2, base, base + 2, base + 3]);
    }

    /// A wash over the whole box, which is what a night is.
    fn wash(&mut self, drawing: &Drawing) {
        let box_of = [
            (0.0, 0.0),
            (self.width, 0.0),
            (self.width, self.height),
            (0.0, self.height),
        ];
        let seed = self.seed(drawing);
        let base = self.glass.vertices.len() as u32;

        for (x, y) in box_of {
            self.glass.vertices.push(Vertex { pos: [x, y], ..seed });
        }
        self.glass
            .indices
            .extend([base, base + 1, base + 2, base, base + 2, base + 3]);
    }
}

/// Add one tessellation to the batch it belongs in.
fn join(geo: &mut VertexBuffers<Vertex, u32>, into: &mut VertexBuffers<Vertex, u32>) {
    let base = into.vertices.len() as u32;
    into.vertices.append(&mut geo.vertices);
    into.indices.extend(geo.indices.iter().map(|i| i + base));
}
