//! The GPU half: one pipeline, one buffer, one pass.
//!
//! Every colour in this scene is worked out from two numbers, so the shader
//! does that rather than the CPU. A vertex carries how much ink it is worth and
//! where in the water it is being lit from, and the fragment mixes the ink into
//! the water at that height. That is why the water's gradient is a gradient
//! here and eight stops in the QML.
use bytemuck::{Pod, Zeroable};
use wgpu::util::DeviceExt;

/// One black pixel, for the wall behind the water before anything hangs there.
fn blank(device: &wgpu::Device, queue: &wgpu::Queue) -> wgpu::TextureView {
    let size = wgpu::Extent3d {
        width: 1,
        height: 1,
        depth_or_array_layers: 1,
    };
    let texture = device.create_texture(&wgpu::TextureDescriptor {
        label: Some("blank"),
        size,
        mip_level_count: 1,
        sample_count: 1,
        dimension: wgpu::TextureDimension::D2,
        format: wgpu::TextureFormat::Rgba8Unorm,
        usage: wgpu::TextureUsages::TEXTURE_BINDING | wgpu::TextureUsages::COPY_DST,
        view_formats: &[],
    });
    queue.write_texture(
        wgpu::ImageCopyTexture {
            texture: &texture,
            mip_level: 0,
            origin: wgpu::Origin3d::ZERO,
            aspect: wgpu::TextureAspect::All,
        },
        &[0, 0, 0, 255],
        wgpu::ImageDataLayout {
            offset: 0,
            bytes_per_row: Some(4),
            rows_per_image: Some(1),
        },
        size,
    );
    texture.create_view(&Default::default())
}

/// The bind group, which has to be made again whenever a buffer in it is.
fn tied(
    device: &wgpu::Device,
    layout: &wgpu::BindGroupLayout,
    uniforms: &wgpu::Buffer,
    limbs: &wgpu::Buffer,
    swings: &wgpu::Buffer,
    behind: &wgpu::TextureView,
    pane: &wgpu::Sampler,
) -> wgpu::BindGroup {
    device.create_bind_group(&wgpu::BindGroupDescriptor {
        label: None,
        layout,
        entries: &[
            wgpu::BindGroupEntry {
                binding: 0,
                resource: uniforms.as_entire_binding(),
            },
            wgpu::BindGroupEntry {
                binding: 1,
                resource: limbs.as_entire_binding(),
            },
            wgpu::BindGroupEntry {
                binding: 2,
                resource: swings.as_entire_binding(),
            },
            wgpu::BindGroupEntry {
                binding: 3,
                resource: wgpu::BindingResource::TextureView(behind),
            },
            wgpu::BindGroupEntry {
                binding: 4,
                resource: wgpu::BindingResource::Sampler(pane),
            },
        ],
    })
}

/// A picture for one mass of rock, half the size of the box on each side.
///
/// Half, because a blur is most of the way to being one before it runs and the
/// picture is only ever seen through it. `Seascape.qml` asks for the same size
/// in `layer.textureSize`, for the same reason.
fn folded(
    device: &wgpu::Device,
    format: wgpu::TextureFormat,
    width: u32,
    height: u32,
) -> wgpu::TextureView {
    device
        .create_texture(&wgpu::TextureDescriptor {
            label: Some("soft"),
            size: wgpu::Extent3d {
                width: (width / 2).max(1),
                height: (height / 2).max(1),
                depth_or_array_layers: 1,
            },
            mip_level_count: 1,
            sample_count: 1,
            dimension: wgpu::TextureDimension::D2,
            format,
            usage: wgpu::TextureUsages::RENDER_ATTACHMENT | wgpu::TextureUsages::TEXTURE_BINDING,
            view_formats: &[],
        })
        .create_view(&Default::default())
}

/// A buffer with room to spare, so a frame that grows does not want a new one.
fn room(device: &wgpu::Device, bytes: usize, usage: wgpu::BufferUsages) -> wgpu::Buffer {
    device.create_buffer(&wgpu::BufferDescriptor {
        label: None,
        size: bytes as u64,
        usage: usage | wgpu::BufferUsages::COPY_DST,
        mapped_at_creation: false,
    })
}

#[repr(C)]
#[derive(Clone, Copy, Pod, Zeroable)]
pub struct Vertex {
    pub pos: [f32; 2],
    /// How much of the ink this is painted in, 0 water and 1 the accent itself.
    pub weight: f32,
    /// The height the colour is read at, or a negative to read the fragment's own.
    pub shade: f32,
    /// Which limb of which plant the water bends this by, or `STIFF`.
    pub limb: u32,
    /// How far up that limb it sits, 0 at the root and 1 at the tip.
    pub t: f32,
    /// Which colour this is mixed from, and whether the light in it is round;
    /// see `TONE_*` and `ROUND`.
    pub tone: u32,
    /// How much of it there is at its own start, before it fades.
    pub alpha: f32,
    /// Where in a round light this sits, from the middle to 1 at the edge.
    pub uv: [f32; 2],
    /// Where the fade starts, how far it runs, and how fast it gives up. A span
    /// of nothing is a shape that does not fade.
    pub fade: [f32; 3],
    /// How far back it stands, which is what the card sorts the water by rather
    /// than the order things happen to be handed over in. Last, because
    /// `vertex_attr_array!` lays the attributes out in the order they are
    /// written and a field put in the middle silently renames every one after
    /// it.
    pub lane: f32,
}

impl Default for Vertex {
    fn default() -> Self {
        Vertex {
            pos: [0.0, 0.0],
            weight: 0.0,
            shade: DOWN_THE_BOX,
            limb: STIFF,
            t: 0.0,
            tone: TONE_WATER,
            alpha: 1.0,
            uv: [0.0, 0.0],
            fade: [0.0, 0.0, 1.0],
            lane: 0.0,
        }
    }
}

/// The water is drawn with the fragment's own height rather than one handed to
/// it, which is what a gradient is.
pub const DOWN_THE_BOX: f32 = -1.0;

/// Which colour a shape is mixed from.
///
/// The first two are the water's own two questions, and they are the two the
/// QML renderer asks: `afloat` paints a weight towards the ink, which is
/// anything in the water lit from where you are looking; `shadowed` paints it
/// towards the surface colour, which is near rock with the light behind it.
/// The rest are the lights, which are the only colours in this scene that are
/// not the theme's.
pub const TONE_WATER: u32 = 0;
pub const TONE_SHADOW: u32 = 1;
pub const TONE_SUN: u32 = 2;
pub const TONE_MOON: u32 = 3;
pub const TONE_DUSK: u32 = 4;
pub const TONE_SURFACE: u32 = 5;
pub const TONE_INK: u32 = 6;
/// The water column itself, which the desktop's own picture shows through.
pub const TONE_WALL: u32 = 7;

/// A light that gives out from the middle rather than down the box.
pub const ROUND: u32 = 0x100;

/// A light that gives out the way a shaft of sunlight in water does.
///
/// `Ornament.fade`, which is not a curve a single exponent can draw: it holds
/// most of its strength for the first half and then goes quickly. The site and
/// the QML renderer both end their light on it, so this one does too rather
/// than on the nearest power it could find.
pub const SPENT: u32 = 0x200;

/// A vertex nothing bends: the ground, a coral, a crown already drawn where the
/// water left it.
pub const STIFF: u32 = 0xffff_ffff;

/**
One line of a plant, as the card needs it.

`beat` and `own` are how its clock runs against its plant's, and `give` is what
share of the plant's amplitude reaches it. `stem` is the limb it leaves and
`seat` where up that limb, which is what lets a fork ride the strand under it
without anybody working the strand out twice.
*/
#[repr(C)]
#[derive(Clone, Copy, Pod, Zeroable)]
pub struct Limb {
    /// Where it is rooted with the water still, and the way it runs from there.
    pub root: [f32; 2],
    pub axis: [f32; 2],
    pub beat: f32,
    pub give: f32,
    pub own: f32,
    pub seat: f32,
    /// How many pieces the bed cuts it into, since that is the line a leaf
    /// takes its direction from and a stroke is measured across.
    pub steps: f32,
    pub plant: u32,
    pub stem: i32,
    pub pad: f32,
}

/// Everything the whole picture is drawn from, rather than one shape of it.
#[repr(C)]
#[derive(Clone, Copy, Pod, Zeroable)]
pub struct Sky {
    pub size: [f32; 2],
    /// How far the light gets down the column, and how fast it gives up.
    pub lit: f32,
    pub sinkage: f32,
    pub ink: [f32; 4],
    pub surface: [f32; 4],
    pub sunlight: [f32; 4],
    pub moonlight: [f32; 4],
    pub dusklight: [f32; 4],
    /// Where the frame has wandered to, how far it has rolled, and how much
    /// bigger than its box it is drawn so that a wander never shows an edge.
    pub sway: [f32; 2],
    pub tilt: f32,
    pub overscan: f32,
    /// The film: how many crystals fit across the box and down it, how heavy
    /// one may be, and which frame of grain this is.
    ///
    /// The order is not taste. A shader lays a pair out on an eight byte line
    /// and this side lays it out where it happens to fall, so a pair put after
    /// an odd number of singles is read four bytes early and every field after
    /// it is somebody else's. What that looks like is a screen of vertical
    /// streaks, which is grain given a width and no height.
    pub grid: [f32; 2],
    pub grain: f32,
    pub turn: f32,
    /// How much of its light a corner gives up.
    pub vignette: f32,
    /// A shader puts a four wide field on a sixteen byte line and this side
    /// puts it where it falls, so `wall` needs the gap said out loud.
    pub pad: [f32; 3],
    /// How the wallpaper behind the water is fitted to the box: what a pixel of
    /// the frame is worth in the picture, and where the picture starts, so that
    /// one of another shape fills the screen by being cropped rather than
    /// stretched.
    ///
    /// Set by the paint rather than by the water, which knows nothing about a
    /// desktop having a picture on it.
    pub wall: [f32; 4],
    /// And how much of that picture the water lets through. Nothing, unless
    /// there is a picture: a wallpaper of pure water is what a still is.
    pub through: f32,
    pub tail: [f32; 3],
}

impl Default for Sky {
    fn default() -> Self {
        Sky {
            size: [1.0, 1.0],
            lit: 0.13,
            sinkage: 2.1,
            ink: [0.0; 4],
            surface: [0.0; 4],
            sunlight: [1.0, 0.93, 0.76, 1.0],
            moonlight: [0.95, 0.92, 0.85, 1.0],
            dusklight: [0.91, 0.64, 0.3, 1.0],
            sway: [0.0, 0.0],
            tilt: 0.0,
            overscan: 1.0,
            grid: [1.0, 1.0],
            grain: 0.0,
            turn: 0.0,
            vignette: 0.0,
            pad: [0.0; 3],
            wall: [1.0, 1.0, 0.0, 0.0],
            through: 0.0,
            tail: [0.0; 3],
        }
    }
}

const SHADER: &str = r#"
struct Sky {
  size: vec2f,
  lit: f32,
  sinkage: f32,
  ink: vec4f,
  surface: vec4f,
  sunlight: vec4f,
  moonlight: vec4f,
  dusklight: vec4f,
  sway: vec2f,
  tilt: f32,
  overscan: f32,
  grid: vec2f,
  grain: f32,
  turn: f32,
  vignette: f32,
  wall: vec4f,
  through: f32,
};
@group(0) @binding(0) var<uniform> u: Sky;

struct Limb {
  root: vec2f,
  axis: vec2f,
  beat: f32,
  give: f32,
  own: f32,
  seat: f32,
  steps: f32,
  plant: u32,
  stem: i32,
  pad: f32,
};
@group(0) @binding(1) var<storage, read> limbs: array<Limb>;
/// Where each plant's sway has got to: how far it is leaning, and its own clock.
@group(0) @binding(2) var<storage, read> swings: array<vec2f>;
/// The picture the desktop had on it before the water arrived.
@group(0) @binding(3) var behind: texture_2d<f32>;
@group(0) @binding(4) var pane: sampler;

const STIFF: u32 = 0xffffffffu;
const ROUND: u32 = 0x100u;
const SPENT: u32 = 0x200u;

/// How far along the box a limb has carried the point this far up it.
///
/// The site's own `Marks.strand`, and the `* t` is the whole of it: at the root
/// t is nothing and the sine cannot move it, so the base is planted and only the
/// tip travels.
fn borne(at: u32, t: f32) -> f32 {
  let limb = limbs[at];
  let swing = swings[limb.plant];
  return swing.x * limb.give * sin(swing.y * limb.beat + limb.own + 2.4 * t) * t;
}

/// And how far the point has gone once whatever it grows on has been carried too.
///
/// A plant is a short tree and nothing here is more than three deep: a twig off
/// a rib off a stem, a leaf on a fork off a strand. Walking it up is cheaper
/// than storing an answer that would have to be worked out anyway.
fn swayed(at: u32, t: f32) -> f32 {
  var gone = borne(at, t);
  var on = limbs[at].stem;

  for (var step = 0; step < 3; step = step + 1) {
    if (on < 0) { break; }
    let up = u32(on);
    gone = gone + borne(up, limbs[up].seat);
    on = limbs[up].stem;
  }

  return gone;
}

/// How far round the limb's own line has turned where the point sits.
///
/// The bend is a closed form, so its slope is one too, and the slope is what
/// everything hanging off the line is owed: a leaf takes the direction of the
/// limb where it sits, and the width of a stroke is measured across it. Turn
/// neither and a leaning plant is a plant drawn as a shear, with its leaves
/// dragged sideways and its stipe going thin.
fn turned(at: u32, t: f32) -> f32 {
  let limb = limbs[at];

  // The piece of the line the bed itself cut, rather than the slope of the
  // curve at a point. They are close and they are not the same, and it is the
  // cut piece a leaf was hung off, so a long leaf drawn to the other one leaves
  // its limb by several px at the tip.
  let step = 1.0 / max(limb.steps, 1.0);
  let under = max(0.0, t - step);
  let run = (step * limb.axis) + vec2f(swayed(at, under + step) - swayed(at, under), 0.0);

  return atan2(run.y, run.x) - atan2(limb.axis.y, limb.axis.x);
}

/// Where the frame is being held this moment.
///
/// Nobody holds a camera still, so the whole picture is drawn a little bigger
/// than its box and wanders inside it; the numbers are worked out where the
/// water is and this only applies them. It is one turn about the middle and one
/// step sideways, which is the same thing `Seascape.qml` does with a transform
/// on the item everything lives in.
fn held(at: vec2f) -> vec2f {
  let middle = u.size * 0.5;
  let out = (at - middle) * u.overscan;
  let spin = vec2f(cos(u.tilt), sin(u.tilt));

  return middle + vec2f(spin.x * out.x - spin.y * out.y, spin.y * out.x + spin.x * out.y) + u.sway;
}

struct VsOut {
  @builtin(position) pos: vec4f,
  @location(0) weight: f32,
  @location(1) shade: f32,
  @location(2) world: vec2f,
  @location(3) @interpolate(flat) tone: u32,
  @location(4) alpha: f32,
  @location(5) uv: vec2f,
  @location(6) fade: vec3f,
};

@vertex
fn vs(
  @location(0) pos: vec2f,
  @location(1) weight: f32,
  @location(2) shade: f32,
  @location(3) limb: u32,
  @location(4) t: f32,
  @location(5) tone: u32,
  @location(6) alpha: f32,
  @location(7) uv: vec2f,
  @location(8) fade: vec3f,
  @location(9) lane: f32,
) -> VsOut {
  var at = pos;
  if (limb != STIFF) {
    // Where the point sits on its limb with the water still, and how far off
    // that line it is: the one is carried and the other is turned, which
    // between them is the whole of a plant bending.
    let line = limbs[limb];
    let on = line.root + t * line.axis;
    let arm = pos - on;
    let turn = turned(limb, t);
    let spin = vec2f(cos(turn), sin(turn));

    at = on
      + vec2f(swayed(limb, t), 0.0)
      + vec2f(spin.x * arm.x - spin.y * arm.y, spin.y * arm.x + spin.x * arm.y);
  }

  // Near is a small depth and far a large one, so a nearer thing wins wherever
  // the two meet and nothing has to be handed over in order. The compare is
  // `less-equal`, so within one thing the later triangle is still the one on
  // top, which is the order a drawing is made in.
  let z = clamp((4.0 - lane) / 16.0, 0.0, 1.0);
  let frame = held(at);

  var out: VsOut;
  out.pos = vec4f(frame.x / u.size.x * 2.0 - 1.0, 1.0 - frame.y / u.size.y * 2.0, z, 1.0);
  out.weight = weight;
  out.shade = shade;
  out.world = at;
  out.tone = tone;
  out.alpha = alpha;
  out.uv = uv;
  out.fade = fade;
  return out;
}

fn tint(w: f32) -> vec3f {
  return mix(u.surface.rgb, u.ink.rgb, w);
}

/// The water at a height in the box, lit from above and giving up with depth.
fn water_at(y: f32) -> vec3f {
  let t = clamp(y / u.size.y, 0.0, 1.0);
  return mix(u.surface.rgb, tint(u.lit), pow(1.0 - t, u.sinkage));
}

/// What is left of a shape's own light where the fragment is.
///
/// Two shapes of falling off and no others. A round light gives out from its
/// middle, which is every halo, bloom and streak in the scene; everything else
/// gives out down the box, which is every shaft of light and the wash a sunset
/// puts over the top of the water. Both take the same exponent, because a light
/// in water does not thin in a straight line and a straight line is what two
/// ends of a gradient draw.
fn left(in: VsOut) -> f32 {
  if ((in.tone & ROUND) != 0u) {
    return in.alpha * pow(max(0.0, 1.0 - length(in.uv)), in.fade.z);
  }
  if (in.fade.y > 0.0) {
    let down = clamp((in.world.y - in.fade.x) / in.fade.y, 0.0, 1.0);
    if ((in.tone & SPENT) != 0u) {
      let held = 1.0 - down * down;
      return in.alpha * held * held;
    }
    return in.alpha * pow(1.0 - down, in.fade.z);
  }
  return in.alpha;
}

@fragment
fn fs(in: VsOut) -> @location(0) vec4f {
  let y = select(in.shade, in.world.y, in.shade < 0.0);
  let base = water_at(y);
  let w = clamp(in.weight, 0.0, 1.0);

  // Read before anything is decided, because a shader may only be asked for a
  // texture where every fragment nearby is asking too, and the tone below is
  // whatever this triangle happens to be.
  let seen = textureSample(behind, pane, in.pos.xy * u.wall.xy + u.wall.zw).rgb;

  var hue = mix(base, u.ink.rgb, w);
  switch (in.tone & 0xffu) {
    case 1u: { hue = mix(base, u.surface.rgb, w); }
    case 2u: { hue = u.sunlight.rgb; }
    case 3u: { hue = u.moonlight.rgb; }
    case 4u: { hue = u.dusklight.rgb; }
    case 5u: { hue = u.surface.rgb; }
    case 6u: { hue = u.ink.rgb; }
    // The water column, the one thing here you can see through, and what you
    // see through it is whatever the desktop had on it. Placed in the frame's
    // own coordinates rather than the water's, so the picture stays hung on
    // the screen while the camera wanders over it.
    case 7u: { hue = mix(base, seen, u.through); }
    default: {}
  }

  return vec4f(hue, left(in));
}

/// A layer of rock the lens has given up on: blurred, then laid back in.
///
/// `Seascape.qml` says this as a `MultiEffect` over a layer, which is the same
/// three steps: draw the mass on its own, run a blur over the picture of it,
/// and put the picture back where the mass was. It has to be a picture rather
/// than a triangle, because a blur is a thing done to pixels.
struct Fold {
  /// How far one tap is from the next, in the texture's own coordinates.
  step: vec2f,
  lane: f32,
  pad: f32,
};
@group(1) @binding(0) var<uniform> fold: Fold;
@group(1) @binding(1) var layer: texture_2d<f32>;
@group(1) @binding(2) var soften: sampler;

struct FoldOut {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,
};

@vertex
fn fold_vs(@builtin(vertex_index) at: u32) -> FoldOut {
  var corners = array<vec2f, 3>(vec2f(-1.0, -3.0), vec2f(-1.0, 1.0), vec2f(3.0, 1.0));
  let corner = corners[at];

  var out: FoldOut;
  out.pos = vec4f(corner, clamp((4.0 - fold.lane) / 16.0, 0.0, 1.0), 1.0);
  out.uv = vec2f((corner.x + 1.0) * 0.5, (1.0 - corner.y) * 0.5);
  return out;
}

/// Nine taps along one axis, run twice: a blur of a blur across is a blur, and
/// two passes of nine is a great deal less work than one pass of eighty-one.
@fragment
fn blur_fs(in: FoldOut) -> @location(0) vec4f {
  var weights = array<f32, 4>(0.1945946, 0.1216216, 0.0540541, 0.0162162);
  var sum = textureSample(layer, soften, in.uv) * 0.2270270;

  for (var i = 1; i < 5; i = i + 1) {
    let off = fold.step * f32(i);
    sum = sum
      + (textureSample(layer, soften, in.uv + off) + textureSample(layer, soften, in.uv - off))
        * weights[i - 1];
  }

  return sum;
}

/// And the picture back where the mass was, at the mass's own distance, so the
/// water in front of it is still in front of it.
@fragment
fn fold_fs(in: FoldOut) -> @location(0) vec4f {
  let held = textureSample(layer, soften, in.uv);

  // Nothing where the rock is not: a full-screen quad that wrote its depth
  // everywhere would be a pane of glass across the whole picture.
  if (held.a < 0.004) { discard; }

  return held;
}

/// The glass the water is looked at through, and the film it lands on.
///
/// `lens.frag` beside `Seascape.qml`, in the language this renderer speaks.
/// Neither half of it reads the frame underneath, which is the whole reason a
/// wallpaper can afford it: grain lands on light and dark alike, and a corner
/// falls off wherever it is pointed.
struct LensOut {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,
};

@vertex
fn lens_vs(@builtin(vertex_index) at: u32) -> LensOut {
  var corners = array<vec2f, 3>(vec2f(-1.0, -3.0), vec2f(-1.0, 1.0), vec2f(3.0, 1.0));
  let corner = corners[at];

  var out: LensOut;
  out.pos = vec4f(corner, 0.0, 1.0);
  out.uv = vec2f((corner.x + 1.0) * 0.5, (1.0 - corner.y) * 0.5);
  return out;
}

/// One value out of a cell and which frame of grain it is, evenly spread over 0
/// to 1. Hashed rather than sampled: a noise texture is a tile, and a tile laid
/// over a whole desktop is a pattern somebody will eventually see.
fn speck(cell: vec3f) -> f32 {
  var mixed = fract(cell * 0.1031);
  mixed = mixed + dot(mixed, mixed.yzx + 33.33);
  return fract((mixed.x + mixed.y) * mixed.z);
}

@fragment
fn lens_fs(in: LensOut) -> @location(0) vec4f {
  let cell = floor(in.uv * u.grid);

  // Two draws averaged rather than one, because an even spread reads as
  // television. Film grain is mostly nothing with the odd bright crystal in it,
  // and the average of two flat distributions is that shape: a peak in the
  // middle and thin tails.
  let lit = (speck(vec3f(cell, u.turn)) + speck(vec3f(cell.yx, u.turn + 17.0))) * 0.5;

  // A crystal is exposed or it is not, so the grain is white where it fell
  // above the middle and black where it fell below, and only its weight varies.
  let lift = (lit - 0.5) * 2.0;
  let weight = abs(lift) * u.grain;
  let crystal = vec3f(step(0.0, lift)) * weight;

  // Where the corners give out. Measured from the middle in the box's own
  // proportions, so it is an oval on a wide screen rather than a circle with
  // two untouched ends, and it starts past halfway out.
  let fall = smoothstep(0.55, 1.42, length((in.uv - 0.5) * 2.0)) * u.vignette;

  // The grain over the fall, both already premultiplied.
  return vec4f(crystal, weight + fall * (1.0 - weight));
}
"#;

pub struct Paint {
    /// Shared, because a desk with two screens on it is two of everything here
    /// and one card underneath them.
    pub device: std::sync::Arc<wgpu::Device>,
    pub queue: std::sync::Arc<wgpu::Queue>,
    format: wgpu::TextureFormat,
    pipeline: wgpu::RenderPipeline,
    /// The same shader again for anything the water is seen through, and the
    /// one pass over the top that is the camera rather than the sea.
    blended: wgpu::RenderPipeline,
    film: wgpu::RenderPipeline,
    /// A mass of rock on its own, the blur run over it, and the picture laid
    /// back in at the mass's own distance; see `Soft`.
    bake: wgpu::RenderPipeline,
    blur: wgpu::RenderPipeline,
    laid: wgpu::RenderPipeline,
    folds: wgpu::BindGroupLayout,
    /// One slot of a fold's own numbers per pass, at the spacing the card wants
    /// between two things it is handed by offset.
    folded: std::cell::RefCell<wgpu::Buffer>,
    soften: wgpu::Sampler,
    /// The picture the desktop had on it, which the water is drawn over, and
    /// how it is fitted to this screen. Nothing, on a run with no desktop.
    behind: std::cell::RefCell<wgpu::TextureView>,
    wall: std::cell::Cell<[f32; 4]>,
    through: std::cell::Cell<f32>,
    /// The picture a blur is read out of and written back into, since a blur is
    /// two passes and the second one cannot read what it is writing.
    scratch: wgpu::TextureView,
    /// One picture per mass, kept between frames because there are much the
    /// same number of masses every time.
    layers: std::cell::RefCell<Vec<Layer>>,
    layout: wgpu::BindGroupLayout,
    bind: std::cell::RefCell<wgpu::BindGroup>,
    uniforms: wgpu::Buffer,
    /// The standing bed: every limb of every plant, written once.
    limbs: std::cell::RefCell<wgpu::Buffer>,
    /// And where each plant's sway has got to, which is the whole of a frame.
    swings: std::cell::RefCell<wgpu::Buffer>,
    /// The standing bed, written once and drawn every frame.
    standing: std::cell::RefCell<(wgpu::Buffer, wgpu::Buffer, u32)>,
    /// And the crowns, which are the one thing here that is drawn again. Held
    /// rather than made every frame: a buffer a frame long is an allocation a
    /// frame long, and there are much the same number of them every time.
    vertices: std::cell::RefCell<wgpu::Buffer>,
    indices: std::cell::RefCell<wgpu::Buffer>,
    /// The water over the bed, cut again every frame: what is solid, and what
    /// the water is seen through.
    over: std::cell::RefCell<(wgpu::Buffer, wgpu::Buffer)>,
    glass: std::cell::RefCell<(wgpu::Buffer, wgpu::Buffer)>,
    msaa: wgpu::TextureView,
    /// How far back each pixel's water is, so nothing has to be drawn in order.
    sunk: wgpu::TextureView,
    /// Only a headless run owns what it draws into. On a desktop the frame
    /// belongs to the compositor and arrives one at a time.
    target: Option<wgpu::Texture>,
    width: u32,
    height: u32,
}

/// One frame's triangles, as they are handed to the card.
#[derive(Clone, Copy)]
pub struct Batch<'a> {
    pub vertices: &'a [Vertex],
    pub indices: &'a [u32],
}

/// A mass of rock the lens has given up on: what it is, how far out of focus,
/// and how far back it stands.
///
/// The near rock is softer than the far wall, which is how a lens behaves: what
/// is a hand from the glass is further outside the field than what is a long
/// way behind the subject. Each mass is drawn on its own, because a blur run
/// over two masses at once is one mass.
#[derive(Clone, Copy)]
pub struct Soft<'a> {
    pub batch: Batch<'a>,
    /// How far the blur runs, in pixels of the finished frame.
    pub blur: f32,
    pub lane: f32,
}

/// One mass, as the card holds it between frames.
struct Layer {
    view: wgpu::TextureView,
    /// The same picture bound to be read: the blur reads it, and so does the
    /// pass that lays it back in.
    own: wgpu::BindGroup,
    /// And the scratch picture bound to be read, which is the blur's way back.
    through: wgpu::BindGroup,
    vertices: wgpu::Buffer,
    indices: wgpu::Buffer,
    count: u32,
    lane: f32,
}

/// How far apart two sets of a fold's own numbers sit, which the card decides.
const SLOT: u64 = 256;

pub const SAMPLES: u32 = 4;
pub const DEPTH: wgpu::TextureFormat = wgpu::TextureFormat::Depth32Float;
pub const FORMAT: wgpu::TextureFormat = wgpu::TextureFormat::Rgba8Unorm;

impl Paint {
    /// A run with nobody watching, which is what a still is.
    pub fn headless(width: u32, height: u32) -> Self {
        let instance = wgpu::Instance::default();
        let adapter =
            pollster::block_on(instance.request_adapter(&wgpu::RequestAdapterOptions::default()))
                .expect("no GPU adapter");
        let (device, queue) = pollster::block_on(adapter.request_device(
            &wgpu::DeviceDescriptor {
                required_features: wgpu::Features::empty(),
                required_limits: wgpu::Limits::default(),
                ..Default::default()
            },
            None,
        ))
        .expect("no GPU device");

        Paint::new(
            std::sync::Arc::new(device),
            std::sync::Arc::new(queue),
            FORMAT,
            width,
            height,
            true,
        )
    }

    pub fn new(
        device: std::sync::Arc<wgpu::Device>,
        queue: std::sync::Arc<wgpu::Queue>,
        format: wgpu::TextureFormat,
        width: u32,
        height: u32,
        owned: bool,
    ) -> Self {
        let shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("seascape"),
            source: wgpu::ShaderSource::Wgsl(SHADER.into()),
        });

        let uniforms = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("sky"),
            contents: bytemuck::bytes_of(&Sky {
                size: [width as f32, height as f32],
                ..Default::default()
            }),
            usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
        });

        let told = |binding: u32| wgpu::BindGroupLayoutEntry {
            binding,
            visibility: wgpu::ShaderStages::VERTEX,
            ty: wgpu::BindingType::Buffer {
                ty: wgpu::BufferBindingType::Storage { read_only: true },
                has_dynamic_offset: false,
                min_binding_size: None,
            },
            count: None,
        };
        let layout = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: None,
            entries: &[
                wgpu::BindGroupLayoutEntry {
                    binding: 0,
                    visibility: wgpu::ShaderStages::VERTEX_FRAGMENT,
                    ty: wgpu::BindingType::Buffer {
                        ty: wgpu::BufferBindingType::Uniform,
                        has_dynamic_offset: false,
                        min_binding_size: None,
                    },
                    count: None,
                },
                told(1),
                told(2),
                wgpu::BindGroupLayoutEntry {
                    binding: 3,
                    visibility: wgpu::ShaderStages::FRAGMENT,
                    ty: wgpu::BindingType::Texture {
                        sample_type: wgpu::TextureSampleType::Float { filterable: true },
                        view_dimension: wgpu::TextureViewDimension::D2,
                        multisampled: false,
                    },
                    count: None,
                },
                wgpu::BindGroupLayoutEntry {
                    binding: 4,
                    visibility: wgpu::ShaderStages::FRAGMENT,
                    ty: wgpu::BindingType::Sampler(wgpu::SamplerBindingType::Filtering),
                    count: None,
                },
            ],
        });

        let limbs = room(&device, 1 << 16, wgpu::BufferUsages::STORAGE);
        let swings = room(&device, 1 << 13, wgpu::BufferUsages::STORAGE);
        let soften = device.create_sampler(&wgpu::SamplerDescriptor {
            label: Some("soften"),
            address_mode_u: wgpu::AddressMode::ClampToEdge,
            address_mode_v: wgpu::AddressMode::ClampToEdge,
            address_mode_w: wgpu::AddressMode::ClampToEdge,
            mag_filter: wgpu::FilterMode::Linear,
            min_filter: wgpu::FilterMode::Linear,
            ..Default::default()
        });

        // Nothing behind the water until somebody hangs something there, and a
        // shader may not be handed nothing: one pixel of black, never read,
        // because `through` is zero until there is a picture to let through.
        let behind = blank(&device, &queue);
        let bind = std::cell::RefCell::new(tied(
            &device, &layout, &uniforms, &limbs, &swings, &behind, &soften,
        ));
        let limbs = std::cell::RefCell::new(limbs);
        let swings = std::cell::RefCell::new(swings);
        let pipeline_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: None,
            bind_group_layouts: &[&layout],
            push_constant_ranges: &[],
        });

        let attributes = wgpu::vertex_attr_array![
            0 => Float32x2,
            1 => Float32,
            2 => Float32,
            3 => Uint32,
            4 => Float32,
            5 => Uint32,
            6 => Float32,
            7 => Float32x2,
            8 => Float32x3,
            9 => Float32
        ];
        let laid = wgpu::VertexBufferLayout {
            array_stride: std::mem::size_of::<Vertex>() as u64,
            step_mode: wgpu::VertexStepMode::Vertex,
            attributes: &attributes,
        };

        // The bed and the water over it, which are the same shader drawn twice.
        //
        // The bed is opaque and writes how far back each pixel is, which is what
        // lets it be handed over in any order at all. Nothing over it may write
        // that: a light is a thing you see the water through, so a shaft that
        // wrote its own depth would hide every fish that swam into it. So the
        // second pass tests against the bed's depth and leaves it alone, and
        // what settles the order between two lights is the order they are drawn
        // in, which is the order a picture is painted in.
        let solid = |blended: bool| {
            device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
                label: Some("seascape"),
                layout: Some(&pipeline_layout),
                vertex: wgpu::VertexState {
                    module: &shader,
                    entry_point: Some("vs"),
                    compilation_options: Default::default(),
                    buffers: std::slice::from_ref(&laid),
                },
                fragment: Some(wgpu::FragmentState {
                    module: &shader,
                    entry_point: Some("fs"),
                    compilation_options: Default::default(),
                    targets: &[Some(wgpu::ColorTargetState {
                        format,
                        blend: blended.then_some(wgpu::BlendState::ALPHA_BLENDING),
                        write_mask: wgpu::ColorWrites::ALL,
                    })],
                }),
                primitive: wgpu::PrimitiveState::default(),
                depth_stencil: Some(wgpu::DepthStencilState {
                    format: DEPTH,
                    depth_write_enabled: !blended,
                    depth_compare: wgpu::CompareFunction::LessEqual,
                    stencil: Default::default(),
                    bias: Default::default(),
                }),
                multisample: wgpu::MultisampleState {
                    count: SAMPLES,
                    ..Default::default()
                },
                multiview: None,
                cache: None,
            })
        };

        let pipeline = solid(false);
        let blended = solid(true);

        // The lens, which draws neither water nor light: one pass over the
        // finished frame, in premultiplied alpha because a crystal is added and
        // a corner is taken away.
        let film = device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
            label: Some("lens"),
            layout: Some(&pipeline_layout),
            vertex: wgpu::VertexState {
                module: &shader,
                entry_point: Some("lens_vs"),
                compilation_options: Default::default(),
                buffers: &[],
            },
            fragment: Some(wgpu::FragmentState {
                module: &shader,
                entry_point: Some("lens_fs"),
                compilation_options: Default::default(),
                targets: &[Some(wgpu::ColorTargetState {
                    format,
                    blend: Some(wgpu::BlendState::PREMULTIPLIED_ALPHA_BLENDING),
                    write_mask: wgpu::ColorWrites::ALL,
                })],
            }),
            primitive: wgpu::PrimitiveState::default(),
            // It draws over the whole frame whatever is under it, and it is in
            // the same pass, so it carries the depth attachment and ignores it.
            depth_stencil: Some(wgpu::DepthStencilState {
                format: DEPTH,
                depth_write_enabled: false,
                depth_compare: wgpu::CompareFunction::Always,
                stencil: Default::default(),
                bias: Default::default(),
            }),
            multisample: wgpu::MultisampleState {
                count: SAMPLES,
                ..Default::default()
            },
            multiview: None,
            cache: None,
        });

        // The rock the lens has given up on: the same shader onto a picture of
        // its own, a blur along one axis run twice, and the picture laid back
        // in where the rock was.
        //
        // The picture is half the size of the box on each side, which is a
        // quarter of the memory and most of the way to the blur before the blur
        // runs. `Seascape.qml` says the same in `layer.textureSize`.
        let folds = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: Some("fold"),
            entries: &[
                wgpu::BindGroupLayoutEntry {
                    binding: 0,
                    visibility: wgpu::ShaderStages::VERTEX_FRAGMENT,
                    ty: wgpu::BindingType::Buffer {
                        ty: wgpu::BufferBindingType::Uniform,
                        has_dynamic_offset: true,
                        min_binding_size: wgpu::BufferSize::new(16),
                    },
                    count: None,
                },
                wgpu::BindGroupLayoutEntry {
                    binding: 1,
                    visibility: wgpu::ShaderStages::FRAGMENT,
                    ty: wgpu::BindingType::Texture {
                        sample_type: wgpu::TextureSampleType::Float { filterable: true },
                        view_dimension: wgpu::TextureViewDimension::D2,
                        multisampled: false,
                    },
                    count: None,
                },
                wgpu::BindGroupLayoutEntry {
                    binding: 2,
                    visibility: wgpu::ShaderStages::FRAGMENT,
                    ty: wgpu::BindingType::Sampler(wgpu::SamplerBindingType::Filtering),
                    count: None,
                },
            ],
        });
        let folding = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("fold"),
            bind_group_layouts: &[&layout, &folds],
            push_constant_ranges: &[],
        });

        // Onto nothing rather than onto the water, so what the blur spreads at
        // the edge of the mass is the mass giving out rather than the water
        // creeping in. Written already multiplied by how much of it there is,
        // which is the only way a blur of an edge is not a dark rim.
        let bake = device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
            label: Some("bake"),
            layout: Some(&pipeline_layout),
            vertex: wgpu::VertexState {
                module: &shader,
                entry_point: Some("vs"),
                compilation_options: Default::default(),
                buffers: std::slice::from_ref(&laid),
            },
            fragment: Some(wgpu::FragmentState {
                module: &shader,
                entry_point: Some("fs"),
                compilation_options: Default::default(),
                targets: &[Some(wgpu::ColorTargetState {
                    format,
                    blend: Some(wgpu::BlendState {
                        color: wgpu::BlendComponent {
                            src_factor: wgpu::BlendFactor::SrcAlpha,
                            dst_factor: wgpu::BlendFactor::OneMinusSrcAlpha,
                            operation: wgpu::BlendOperation::Add,
                        },
                        alpha: wgpu::BlendComponent {
                            src_factor: wgpu::BlendFactor::One,
                            dst_factor: wgpu::BlendFactor::OneMinusSrcAlpha,
                            operation: wgpu::BlendOperation::Add,
                        },
                    }),
                    write_mask: wgpu::ColorWrites::ALL,
                })],
            }),
            primitive: wgpu::PrimitiveState::default(),
            depth_stencil: None,
            multisample: wgpu::MultisampleState::default(),
            multiview: None,
            cache: None,
        });

        let blur = device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
            label: Some("blur"),
            layout: Some(&folding),
            vertex: wgpu::VertexState {
                module: &shader,
                entry_point: Some("fold_vs"),
                compilation_options: Default::default(),
                buffers: &[],
            },
            fragment: Some(wgpu::FragmentState {
                module: &shader,
                entry_point: Some("blur_fs"),
                compilation_options: Default::default(),
                targets: &[Some(wgpu::ColorTargetState {
                    format,
                    blend: None,
                    write_mask: wgpu::ColorWrites::ALL,
                })],
            }),
            primitive: wgpu::PrimitiveState::default(),
            depth_stencil: None,
            multisample: wgpu::MultisampleState::default(),
            multiview: None,
            cache: None,
        });

        // Back into the picture at the mass's own distance, so the water in
        // front of it is still in front of it and the sunset over the top of
        // the whole box still falls on it.
        let laid_back = device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
            label: Some("fold"),
            layout: Some(&folding),
            vertex: wgpu::VertexState {
                module: &shader,
                entry_point: Some("fold_vs"),
                compilation_options: Default::default(),
                buffers: &[],
            },
            fragment: Some(wgpu::FragmentState {
                module: &shader,
                entry_point: Some("fold_fs"),
                compilation_options: Default::default(),
                targets: &[Some(wgpu::ColorTargetState {
                    format,
                    blend: Some(wgpu::BlendState::PREMULTIPLIED_ALPHA_BLENDING),
                    write_mask: wgpu::ColorWrites::ALL,
                })],
            }),
            primitive: wgpu::PrimitiveState::default(),
            depth_stencil: Some(wgpu::DepthStencilState {
                format: DEPTH,
                depth_write_enabled: true,
                depth_compare: wgpu::CompareFunction::LessEqual,
                stencil: Default::default(),
                bias: Default::default(),
            }),
            multisample: wgpu::MultisampleState {
                count: SAMPLES,
                ..Default::default()
            },
            multiview: None,
            cache: None,
        });

        let scratch = folded(&device, format, width, height);
        let folded = std::cell::RefCell::new(room(
            &device,
            SLOT as usize * 3 * 8,
            wgpu::BufferUsages::UNIFORM,
        ));

        let size = wgpu::Extent3d {
            width,
            height,
            depth_or_array_layers: 1,
        };
        let sunk = device
            .create_texture(&wgpu::TextureDescriptor {
                label: Some("lanes"),
                size,
                mip_level_count: 1,
                sample_count: SAMPLES,
                dimension: wgpu::TextureDimension::D2,
                format: DEPTH,
                usage: wgpu::TextureUsages::RENDER_ATTACHMENT,
                view_formats: &[],
            })
            .create_view(&Default::default());
        let msaa = device
            .create_texture(&wgpu::TextureDescriptor {
                label: Some("msaa"),
                size,
                mip_level_count: 1,
                sample_count: SAMPLES,
                dimension: wgpu::TextureDimension::D2,
                format,
                usage: wgpu::TextureUsages::RENDER_ATTACHMENT,
                view_formats: &[],
            })
            .create_view(&Default::default());
        let target = owned.then(|| {
            device.create_texture(&wgpu::TextureDescriptor {
                label: Some("frame"),
                size,
                mip_level_count: 1,
                sample_count: 1,
                dimension: wgpu::TextureDimension::D2,
                format,
                usage: wgpu::TextureUsages::RENDER_ATTACHMENT | wgpu::TextureUsages::COPY_SRC,
                view_formats: &[],
            })
        });

        let vertices = std::cell::RefCell::new(room(&device, 1 << 20, wgpu::BufferUsages::VERTEX));
        let indices = std::cell::RefCell::new(room(&device, 1 << 20, wgpu::BufferUsages::INDEX));
        let pair = || {
            std::cell::RefCell::new((
                room(&device, 1 << 20, wgpu::BufferUsages::VERTEX),
                room(&device, 1 << 20, wgpu::BufferUsages::INDEX),
            ))
        };
        let over = pair();
        let glass = pair();
        let standing = std::cell::RefCell::new((
            room(&device, 1 << 12, wgpu::BufferUsages::VERTEX),
            room(&device, 1 << 12, wgpu::BufferUsages::INDEX),
            0,
        ));

        Paint {
            device,
            queue,
            format,
            pipeline,
            blended,
            film,
            bake,
            blur,
            laid: laid_back,
            folds,
            folded,
            soften,
            behind: std::cell::RefCell::new(behind),
            wall: std::cell::Cell::new([1.0, 1.0, 0.0, 0.0]),
            through: std::cell::Cell::new(0.0),
            scratch,
            layers: std::cell::RefCell::new(Vec::new()),
            layout,
            bind,
            uniforms,
            limbs,
            swings,
            standing,
            vertices,
            indices,
            over,
            glass,
            msaa,
            sunk,
            target,
            width,
            height,
        }
    }

    pub fn format(&self) -> wgpu::TextureFormat {
        self.format
    }

    /// The sky the whole picture is drawn under: the water's own colours, the
    /// lights that are not the theme's, where the frame is being held, and the
    /// film it lands on. Written once a frame, and it is one buffer.
    pub fn sky(&self, sky: &Sky) {
        self.queue.write_buffer(
            &self.uniforms,
            0,
            bytemuck::bytes_of(&Sky {
                wall: self.wall.get(),
                through: self.through.get(),
                ..*sky
            }),
        );
    }

    /// Hang the desktop's own picture behind the water.
    ///
    /// `Background.qml` draws the wallpaper and puts the sea over it at most of
    /// an alpha, so what is under the water is the picture the machine was
    /// wearing rather than a flat colour. A service outside the shell has to
    /// load the file itself, and this is where it lands.
    ///
    /// Fitted by cropping rather than by stretching, which is what every
    /// desktop does with a wallpaper of the wrong shape, and `through` is how
    /// much of it the water lets past: the plugin's water column at the alpha
    /// it is drawn with.
    pub fn hang(&self, pixels: &[u8], width: u32, height: u32, through: f32) {
        if width == 0 || height == 0 || pixels.len() < (width * height * 4) as usize {
            return;
        }

        let size = wgpu::Extent3d {
            width,
            height,
            depth_or_array_layers: 1,
        };
        let texture = self.device.create_texture(&wgpu::TextureDescriptor {
            label: Some("behind"),
            size,
            mip_level_count: 1,
            sample_count: 1,
            dimension: wgpu::TextureDimension::D2,
            // Taken as written rather than as sRGB to be decoded: every colour
            // in this shader is one a stylesheet named, and a picture that
            // arrived in light rather than in ink would be the only thing here
            // drawn a stop darker than it is.
            format: wgpu::TextureFormat::Rgba8Unorm,
            usage: wgpu::TextureUsages::TEXTURE_BINDING | wgpu::TextureUsages::COPY_DST,
            view_formats: &[],
        });
        self.queue.write_texture(
            wgpu::ImageCopyTexture {
                texture: &texture,
                mip_level: 0,
                origin: wgpu::Origin3d::ZERO,
                aspect: wgpu::TextureAspect::All,
            },
            pixels,
            wgpu::ImageDataLayout {
                offset: 0,
                bytes_per_row: Some(width * 4),
                rows_per_image: Some(height),
            },
            size,
        );

        // The short side fills and the long one is cropped, about the middle.
        let (box_of, picture) = (
            self.width as f32 / self.height as f32,
            width as f32 / height as f32,
        );
        let across = (picture / box_of).max(1.0);
        let down = (box_of / picture).max(1.0);

        *self.behind.borrow_mut() = texture.create_view(&Default::default());
        self.wall.set([
            1.0 / across,
            1.0 / down,
            0.5 - 0.5 / across,
            0.5 - 0.5 / down,
        ]);
        self.through.set(through.clamp(0.0, 1.0));
        self.retie();
    }

    /// The one bind group everything in the water is drawn with, made again
    /// because something it points at was replaced.
    fn retie(&self) {
        *self.bind.borrow_mut() = tied(
            &self.device,
            &self.layout,
            &self.uniforms,
            &self.limbs.borrow(),
            &self.swings.borrow(),
            &self.behind.borrow(),
            &self.soften,
        );
    }

    /// The standing bed, handed over once. Nothing here is sent again.
    pub fn plant(&self, limbs: &[Limb]) {
        let want = bytemuck::cast_slice::<Limb, u8>(limbs);
        if want.is_empty() {
            return;
        }

        let mut held = self.limbs.borrow_mut();
        if (held.size() as usize) < want.len() {
            *held = room(&self.device, want.len(), wgpu::BufferUsages::STORAGE);
            *self.bind.borrow_mut() = tied(
                &self.device,
                &self.layout,
                &self.uniforms,
                &held,
                &self.swings.borrow(),
                &self.behind.borrow(),
                &self.soften,
            );
        }
        self.queue.write_buffer(&held, 0, want);
    }

    /// Where every plant's sway has got to, which is what a frame costs.
    pub fn sway(&self, swings: &[[f32; 2]]) {
        let want = bytemuck::cast_slice::<[f32; 2], u8>(swings);
        if want.is_empty() {
            return;
        }

        let mut held = self.swings.borrow_mut();
        if (held.size() as usize) < want.len() {
            *held = room(&self.device, want.len() * 2, wgpu::BufferUsages::STORAGE);
            *self.bind.borrow_mut() = tied(
                &self.device,
                &self.layout,
                &self.uniforms,
                &self.limbs.borrow(),
                &held,
                &self.behind.borrow(),
                &self.soften,
            );
        }
        self.queue.write_buffer(&held, 0, want);
    }

    /// The frame this owns, for a run that has no compositor to hand it one.
    pub fn own_view(&self) -> wgpu::TextureView {
        self.target
            .as_ref()
            .expect("this paint draws into somebody else's frame")
            .create_view(&Default::default())
    }

    /// The standing bed, handed over once. Nothing here is sent again.
    /// Draw every mass of rock the lens has given up on, run the blur over each
    /// of them, and keep the pictures for `draw` to lay back in.
    ///
    /// Every frame rather than once, because the camera never holds still and
    /// the picture is taken through it. What is saved by doing it here is the
    /// blur itself, which is run over a quarter of the pixels of the frame and
    /// only over the rock.
    pub fn soften(&self, layers: &[Soft]) {
        // What each of the three passes over a mass is told: how far one tap is
        // from the next, and how far back the mass stands. A run of water with
        // more rock in it than the last one wants more room, and every picture
        // is then tied to the new numbers rather than the old ones.
        let slots = (layers.len() * 3).max(1);
        let mut fresh = false;
        {
            let mut folded = self.folded.borrow_mut();
            if (folded.size() as usize) < slots * SLOT as usize {
                *folded = room(
                    &self.device,
                    slots * SLOT as usize,
                    wgpu::BufferUsages::UNIFORM,
                );
                fresh = true;
            }
        }

        let mut held = self.layers.borrow_mut();
        if fresh {
            for at in 0..held.len() {
                held[at] = self.layer();
            }
        }
        while held.len() < layers.len() {
            held.push(self.layer());
        }
        let folded = self.folded.borrow();

        let across = 1.0 / (self.width / 2).max(1) as f32;
        let down = 1.0 / (self.height / 2).max(1) as f32;
        let mut enc = self.device.create_command_encoder(&Default::default());

        for (at, soft) in layers.iter().enumerate() {
            let layer = &mut held[at];
            layer.lane = soft.lane;
            layer.count = soft.batch.indices.len() as u32;

            let want = bytemuck::cast_slice::<Vertex, u8>(soft.batch.vertices);
            let holds = bytemuck::cast_slice::<u32, u8>(soft.batch.indices);
            if (layer.vertices.size() as usize) < want.len() {
                layer.vertices = room(&self.device, want.len() * 2, wgpu::BufferUsages::VERTEX);
            }
            if (layer.indices.size() as usize) < holds.len() {
                layer.indices = room(&self.device, holds.len() * 2, wgpu::BufferUsages::INDEX);
            }
            self.queue.write_buffer(&layer.vertices, 0, want);
            self.queue.write_buffer(&layer.indices, 0, holds);

            // A tap a quarter of the blur apart, four of them either side of
            // the middle, which is the width the weights the shader carries
            // were made for. In the picture's own pixels, which are half the
            // box's, so what is asked for in pixels lands twice as wide: the
            // same thing `MultiEffect` does with a blur over a half-size layer.
            let reach = soft.blur * 0.25;
            let steps = [
                [reach * across, 0.0, soft.lane, 0.0],
                [0.0, reach * down, soft.lane, 0.0],
                [0.0, 0.0, soft.lane, 0.0],
            ];
            for (turn, step) in steps.iter().enumerate() {
                self.queue.write_buffer(
                    &folded,
                    (at * 3 + turn) as u64 * SLOT,
                    bytemuck::cast_slice(step),
                );
            }

            if layer.count == 0 {
                continue;
            }

            self.over_picture(&mut enc, &layer.view, |pass| {
                pass.set_pipeline(&self.bake);
                pass.set_bind_group(0, &*self.bind.borrow(), &[]);
                pass.set_vertex_buffer(0, layer.vertices.slice(..));
                pass.set_index_buffer(layer.indices.slice(..), wgpu::IndexFormat::Uint32);
                pass.draw_indexed(0..layer.count, 0, 0..1);
            });

            for (turn, into, from) in [
                (0, &self.scratch, &layer.own),
                (1, &layer.view, &layer.through),
            ] {
                self.over_picture(&mut enc, into, |pass| {
                    pass.set_pipeline(&self.blur);
                    pass.set_bind_group(0, &*self.bind.borrow(), &[]);
                    pass.set_bind_group(1, from, &[(at * 3 + turn) as u32 * SLOT as u32]);
                    pass.draw(0..3, 0..1);
                });
            }
        }

        for layer in held.iter_mut().skip(layers.len()) {
            layer.count = 0;
        }
        self.queue.submit(Some(enc.finish()));
    }

    /// One pass over one picture and nothing else, since a blur is three of
    /// them and they differ only in what they draw.
    fn over_picture(
        &self,
        enc: &mut wgpu::CommandEncoder,
        into: &wgpu::TextureView,
        draw: impl FnOnce(&mut wgpu::RenderPass),
    ) {
        let mut pass = enc.begin_render_pass(&wgpu::RenderPassDescriptor {
            label: Some("soft"),
            color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                view: into,
                resolve_target: None,
                ops: wgpu::Operations {
                    load: wgpu::LoadOp::Clear(wgpu::Color::TRANSPARENT),
                    store: wgpu::StoreOp::Store,
                },
            })],
            depth_stencil_attachment: None,
            timestamp_writes: None,
            occlusion_query_set: None,
        });
        draw(&mut pass);
    }

    /// A picture for one more mass than there were last frame.
    fn layer(&self) -> Layer {
        let view = folded(&self.device, self.format, self.width, self.height);
        let folded = self.folded.borrow();
        let tied = |of: &wgpu::TextureView| {
            self.device.create_bind_group(&wgpu::BindGroupDescriptor {
                label: Some("fold"),
                layout: &self.folds,
                entries: &[
                    wgpu::BindGroupEntry {
                        binding: 0,
                        resource: wgpu::BindingResource::Buffer(wgpu::BufferBinding {
                            buffer: &folded,
                            offset: 0,
                            size: wgpu::BufferSize::new(16),
                        }),
                    },
                    wgpu::BindGroupEntry {
                        binding: 1,
                        resource: wgpu::BindingResource::TextureView(of),
                    },
                    wgpu::BindGroupEntry {
                        binding: 2,
                        resource: wgpu::BindingResource::Sampler(&self.soften),
                    },
                ],
            })
        };

        Layer {
            own: tied(&view),
            through: tied(&self.scratch),
            view,
            vertices: room(&self.device, 1 << 12, wgpu::BufferUsages::VERTEX),
            indices: room(&self.device, 1 << 12, wgpu::BufferUsages::INDEX),
            count: 0,
            lane: 0.0,
        }
    }

    pub fn stand(&self, vertices: &[Vertex], indices: &[u32]) {
        let want = bytemuck::cast_slice::<Vertex, u8>(vertices);
        let holds = bytemuck::cast_slice::<u32, u8>(indices);
        let mut held = self.standing.borrow_mut();

        if (held.0.size() as usize) < want.len() {
            held.0 = room(&self.device, want.len(), wgpu::BufferUsages::VERTEX);
        }
        if (held.1.size() as usize) < holds.len() {
            held.1 = room(&self.device, holds.len(), wgpu::BufferUsages::INDEX);
        }
        self.queue.write_buffer(&held.0, 0, want);
        self.queue.write_buffer(&held.1, 0, holds);
        held.2 = indices.len() as u32;
    }

    /// Draw the water: the bed that stands there, and the crowns over it.
    ///
    /// `fresh` says a crown has been redrawn since the last frame. Where none
    /// has, the card already has every triangle in the picture and the only
    /// thing crossing the bus is the sway.
    ///
    /// Then everything that is not the bed. It arrives as two batches because
    /// the water is drawn twice: an animal is solid and takes its turn by how
    /// far back it is, and a light is not, so it is laid over what is already
    /// there in the order it was handed over. Last is the lens, which is the
    /// camera rather than the sea.
    pub fn draw(
        &self,
        view: &wgpu::TextureView,
        vertices: &[Vertex],
        indices: &[u32],
        fresh: bool,
        over: Batch,
        glass: Batch,
    ) {
        let mut vbuf = self.vertices.borrow_mut();
        let mut ibuf = self.indices.borrow_mut();

        if fresh {
            let want = bytemuck::cast_slice::<Vertex, u8>(vertices);
            if (vbuf.size() as usize) < want.len() {
                *vbuf = room(&self.device, want.len() * 2, wgpu::BufferUsages::VERTEX);
            }
            let holds = bytemuck::cast_slice::<u32, u8>(indices);
            if (ibuf.size() as usize) < holds.len() {
                *ibuf = room(&self.device, holds.len() * 2, wgpu::BufferUsages::INDEX);
            }
            self.queue.write_buffer(&vbuf, 0, want);
            self.queue.write_buffer(&ibuf, 0, holds);
        }

        self.hand(&self.over, over);
        self.hand(&self.glass, glass);

        let standing = self.standing.borrow();
        let held = self.over.borrow();
        let seen = self.glass.borrow();
        let mut enc = self.device.create_command_encoder(&Default::default());
        {
            let mut pass = enc.begin_render_pass(&wgpu::RenderPassDescriptor {
                label: Some("bed"),
                color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                    view: &self.msaa,
                    resolve_target: Some(view),
                    ops: wgpu::Operations {
                        load: wgpu::LoadOp::Clear(wgpu::Color::BLACK),
                        store: wgpu::StoreOp::Discard,
                    },
                })],
                depth_stencil_attachment: Some(wgpu::RenderPassDepthStencilAttachment {
                    view: &self.sunk,
                    depth_ops: Some(wgpu::Operations {
                        load: wgpu::LoadOp::Clear(1.0),
                        store: wgpu::StoreOp::Discard,
                    }),
                    stencil_ops: None,
                }),
                timestamp_writes: None,
                occlusion_query_set: None,
            });
            pass.set_pipeline(&self.pipeline);
            pass.set_bind_group(0, &*self.bind.borrow(), &[]);

            pass.set_vertex_buffer(0, standing.0.slice(..));
            pass.set_index_buffer(standing.1.slice(..), wgpu::IndexFormat::Uint32);
            pass.draw_indexed(0..standing.2, 0, 0..1);

            if !indices.is_empty() {
                pass.set_vertex_buffer(0, vbuf.slice(..));
                pass.set_index_buffer(ibuf.slice(..), wgpu::IndexFormat::Uint32);
                pass.draw_indexed(0..indices.len() as u32, 0, 0..1);
            }

            if !over.indices.is_empty() {
                pass.set_vertex_buffer(0, held.0.slice(..));
                pass.set_index_buffer(held.1.slice(..), wgpu::IndexFormat::Uint32);
                pass.draw_indexed(0..over.indices.len() as u32, 0, 0..1);
            }

            // The rock the lens gave up on, back at its own distance: after the
            // water that is solid, because the depth it writes is what keeps a
            // fish behind it behind it, and before the light, because a shaft
            // falls on rock as well as on water.
            let held = self.layers.borrow();
            for (at, layer) in held.iter().enumerate() {
                if layer.count == 0 {
                    continue;
                }
                pass.set_pipeline(&self.laid);
                pass.set_bind_group(0, &*self.bind.borrow(), &[]);
                pass.set_bind_group(1, &layer.own, &[(at * 3 + 2) as u32 * SLOT as u32]);
                pass.draw(0..3, 0..1);
            }

            if !glass.indices.is_empty() {
                pass.set_pipeline(&self.blended);
                pass.set_vertex_buffer(0, seen.0.slice(..));
                pass.set_index_buffer(seen.1.slice(..), wgpu::IndexFormat::Uint32);
                pass.draw_indexed(0..glass.indices.len() as u32, 0, 0..1);
            }

            pass.set_pipeline(&self.film);
            pass.draw(0..3, 0..1);
        }
        self.queue.submit(Some(enc.finish()));
    }

    /// One frame's batch into a buffer that is kept, since the next frame is
    /// much the same size as this one and an allocation a frame is a leak with
    /// a tidy conscience.
    fn hand(&self, into: &std::cell::RefCell<(wgpu::Buffer, wgpu::Buffer)>, batch: Batch) {
        if batch.indices.is_empty() {
            return;
        }

        let want = bytemuck::cast_slice::<Vertex, u8>(batch.vertices);
        let holds = bytemuck::cast_slice::<u32, u8>(batch.indices);
        let mut held = into.borrow_mut();

        if (held.0.size() as usize) < want.len() {
            held.0 = room(&self.device, want.len() * 2, wgpu::BufferUsages::VERTEX);
        }
        if (held.1.size() as usize) < holds.len() {
            held.1 = room(&self.device, holds.len() * 2, wgpu::BufferUsages::INDEX);
        }
        self.queue.write_buffer(&held.0, 0, want);
        self.queue.write_buffer(&held.1, 0, holds);
    }

    /// Wait for the GPU to be done, which only a run with a stopwatch on it or
    /// a frame about to be read back has any reason to do.
    pub fn settle(&self) {
        self.device.poll(wgpu::Maintain::Wait);
    }

    /// The finished frame, row by row, with the padding a copy needs taken out.
    pub fn read(&self) -> Vec<u8> {
        let row = (self.width * 4).div_ceil(256) * 256;
        let buffer = self.device.create_buffer(&wgpu::BufferDescriptor {
            label: None,
            size: (row * self.height) as u64,
            usage: wgpu::BufferUsages::COPY_DST | wgpu::BufferUsages::MAP_READ,
            mapped_at_creation: false,
        });
        let target = self
            .target
            .as_ref()
            .expect("nothing was drawn into a frame this owns");
        let mut enc = self.device.create_command_encoder(&Default::default());
        enc.copy_texture_to_buffer(
            wgpu::ImageCopyTexture {
                texture: target,
                mip_level: 0,
                origin: wgpu::Origin3d::ZERO,
                aspect: wgpu::TextureAspect::All,
            },
            wgpu::ImageCopyBuffer {
                buffer: &buffer,
                layout: wgpu::ImageDataLayout {
                    offset: 0,
                    bytes_per_row: Some(row),
                    rows_per_image: Some(self.height),
                },
            },
            wgpu::Extent3d {
                width: self.width,
                height: self.height,
                depth_or_array_layers: 1,
            },
        );
        self.queue.submit(Some(enc.finish()));

        let slice = buffer.slice(..);
        slice.map_async(wgpu::MapMode::Read, |_| {});
        self.device.poll(wgpu::Maintain::Wait);

        let padded = slice.get_mapped_range();
        let mut out = Vec::with_capacity((self.width * self.height * 4) as usize);
        for y in 0..self.height {
            let from = (y * row) as usize;
            out.extend_from_slice(&padded[from..from + (self.width * 4) as usize]);
        }
        drop(padded);
        buffer.unmap();
        out
    }
}
