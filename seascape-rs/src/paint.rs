//! The GPU half: one pipeline, one buffer, one pass.
//!
//! Every colour in this scene is worked out from two numbers, so the shader
//! does that rather than the CPU. A vertex carries how much ink it is worth and
//! where in the water it is being lit from, and the fragment mixes the ink into
//! the water at that height. That is why the water's gradient is a gradient
//! here and eight stops in the QML.
use bytemuck::{Pod, Zeroable};
use wgpu::util::DeviceExt;

/// The bind group, which has to be made again whenever a buffer in it is.
fn tied(
    device: &wgpu::Device,
    layout: &wgpu::BindGroupLayout,
    uniforms: &wgpu::Buffer,
    limbs: &wgpu::Buffer,
    swings: &wgpu::Buffer,
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
        ],
    })
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
}

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

#[repr(C)]
#[derive(Clone, Copy, Pod, Zeroable)]
struct Uniforms {
    size: [f32; 2],
    /// How far the light gets down the column, and how fast it gives up.
    lit: f32,
    sinkage: f32,
    ink: [f32; 4],
    surface: [f32; 4],
}

const SHADER: &str = r#"
struct Uniforms {
  size: vec2f,
  lit: f32,
  sinkage: f32,
  ink: vec4f,
  surface: vec4f,
};
@group(0) @binding(0) var<uniform> u: Uniforms;

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

const STIFF: u32 = 0xffffffffu;

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

struct VsOut {
  @builtin(position) pos: vec4f,
  @location(0) weight: f32,
  @location(1) shade: f32,
  @location(2) world: vec2f,
};

@vertex
fn vs(
  @location(0) pos: vec2f,
  @location(1) weight: f32,
  @location(2) shade: f32,
  @location(3) limb: u32,
  @location(4) t: f32,
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

  var out: VsOut;
  out.pos = vec4f(at.x / u.size.x * 2.0 - 1.0, 1.0 - at.y / u.size.y * 2.0, 0.0, 1.0);
  out.weight = weight;
  out.shade = shade;
  out.world = at;
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

@fragment
fn fs(in: VsOut) -> @location(0) vec4f {
  let y = select(in.shade, in.world.y, in.shade < 0.0);
  let base = water_at(y);
  return vec4f(mix(base, u.ink.rgb, clamp(in.weight, 0.0, 1.0)), 1.0);
}
"#;

pub struct Paint {
    pub device: wgpu::Device,
    pub queue: wgpu::Queue,
    format: wgpu::TextureFormat,
    pipeline: wgpu::RenderPipeline,
    layout: wgpu::BindGroupLayout,
    bind: std::cell::RefCell<wgpu::BindGroup>,
    uniforms: wgpu::Buffer,
    /// The standing bed: every limb of every plant, written once.
    limbs: std::cell::RefCell<wgpu::Buffer>,
    /// And where each plant's sway has got to, which is the whole of a frame.
    swings: std::cell::RefCell<wgpu::Buffer>,
    /// Held rather than made every frame: a buffer a frame long is an
    /// allocation a frame long, and the bed is much the same size every time.
    vertices: std::cell::RefCell<wgpu::Buffer>,
    indices: std::cell::RefCell<wgpu::Buffer>,
    msaa: wgpu::TextureView,
    /// Only a headless run owns what it draws into. On a desktop the frame
    /// belongs to the compositor and arrives one at a time.
    target: Option<wgpu::Texture>,
    width: u32,
    height: u32,
}

pub const SAMPLES: u32 = 4;
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

        Paint::new(device, queue, FORMAT, width, height, true)
    }

    pub fn new(
        device: wgpu::Device,
        queue: wgpu::Queue,
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
            label: Some("water"),
            contents: bytemuck::bytes_of(&Uniforms {
                size: [width as f32, height as f32],
                lit: 0.0,
                sinkage: 0.0,
                ink: [0.0; 4],
                surface: [0.0; 4],
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
            ],
        });

        let limbs = room(&device, 1 << 16, wgpu::BufferUsages::STORAGE);
        let swings = room(&device, 1 << 13, wgpu::BufferUsages::STORAGE);
        let bind = std::cell::RefCell::new(tied(&device, &layout, &uniforms, &limbs, &swings));
        let limbs = std::cell::RefCell::new(limbs);
        let swings = std::cell::RefCell::new(swings);
        let pipeline_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: None,
            bind_group_layouts: &[&layout],
            push_constant_ranges: &[],
        });

        let pipeline = device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
            label: Some("seascape"),
            layout: Some(&pipeline_layout),
            vertex: wgpu::VertexState {
                module: &shader,
                entry_point: Some("vs"),
                compilation_options: Default::default(),
                buffers: &[wgpu::VertexBufferLayout {
                    array_stride: std::mem::size_of::<Vertex>() as u64,
                    step_mode: wgpu::VertexStepMode::Vertex,
                    attributes: &wgpu::vertex_attr_array![
                        0 => Float32x2, 1 => Float32, 2 => Float32, 3 => Uint32, 4 => Float32
                    ],
                }],
            },
            fragment: Some(wgpu::FragmentState {
                module: &shader,
                entry_point: Some("fs"),
                compilation_options: Default::default(),
                targets: &[Some(wgpu::ColorTargetState {
                    format,
                    blend: None,
                    write_mask: wgpu::ColorWrites::ALL,
                })],
            }),
            primitive: wgpu::PrimitiveState::default(),
            depth_stencil: None,
            multisample: wgpu::MultisampleState {
                count: SAMPLES,
                ..Default::default()
            },
            multiview: None,
            cache: None,
        });

        let size = wgpu::Extent3d {
            width,
            height,
            depth_or_array_layers: 1,
        };
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

        Paint {
            device,
            queue,
            format,
            pipeline,
            layout,
            bind,
            uniforms,
            limbs,
            swings,
            vertices,
            indices,
            msaa,
            target,
            width,
            height,
        }
    }

    pub fn format(&self) -> wgpu::TextureFormat {
        self.format
    }

    /// The water's own colours, which are the theme's rather than this file's.
    pub fn water(&self, ink: [f32; 4], surface: [f32; 4], lit: f32, sinkage: f32) {
        self.queue.write_buffer(
            &self.uniforms,
            0,
            bytemuck::bytes_of(&Uniforms {
                size: [self.width as f32, self.height as f32],
                lit,
                sinkage,
                ink,
                surface,
            }),
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

    /// Draw the bed. `fresh` says the triangles have changed since the last
    /// frame; where they have not, the card already has them and the only thing
    /// crossing the bus this frame is the sway.
    pub fn draw(
        &self,
        view: &wgpu::TextureView,
        vertices: &[Vertex],
        indices: &[u32],
        fresh: bool,
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
                depth_stencil_attachment: None,
                timestamp_writes: None,
                occlusion_query_set: None,
            });
            pass.set_pipeline(&self.pipeline);
            pass.set_bind_group(0, &*self.bind.borrow(), &[]);
            pass.set_vertex_buffer(0, vbuf.slice(..));
            pass.set_index_buffer(ibuf.slice(..), wgpu::IndexFormat::Uint32);
            pass.draw_indexed(0..indices.len() as u32, 0, 0..1);
        }
        self.queue.submit(Some(enc.finish()));
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
