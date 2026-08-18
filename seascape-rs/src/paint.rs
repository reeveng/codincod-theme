//! The GPU half: one pipeline, one buffer, one pass.
//!
//! Every colour in this scene is worked out from two numbers, so the shader
//! does that rather than the CPU. A vertex carries how much ink it is worth and
//! where in the water it is being lit from, and the fragment mixes the ink into
//! the water at that height. That is why the water's gradient is a gradient
//! here and eight stops in the QML.
use bytemuck::{Pod, Zeroable};
use wgpu::util::DeviceExt;

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

struct VsOut {
  @builtin(position) pos: vec4f,
  @location(0) weight: f32,
  @location(1) shade: f32,
  @location(2) world: vec2f,
};

@vertex
fn vs(@location(0) pos: vec2f, @location(1) weight: f32, @location(2) shade: f32) -> VsOut {
  var out: VsOut;
  out.pos = vec4f(pos.x / u.size.x * 2.0 - 1.0, 1.0 - pos.y / u.size.y * 2.0, 0.0, 1.0);
  out.weight = weight;
  out.shade = shade;
  out.world = pos;
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
    bind: wgpu::BindGroup,
    uniforms: wgpu::Buffer,
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

        let layout = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: None,
            entries: &[wgpu::BindGroupLayoutEntry {
                binding: 0,
                visibility: wgpu::ShaderStages::VERTEX_FRAGMENT,
                ty: wgpu::BindingType::Buffer {
                    ty: wgpu::BufferBindingType::Uniform,
                    has_dynamic_offset: false,
                    min_binding_size: None,
                },
                count: None,
            }],
        });
        let bind = device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: None,
            layout: &layout,
            entries: &[wgpu::BindGroupEntry {
                binding: 0,
                resource: uniforms.as_entire_binding(),
            }],
        });
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
                    attributes: &wgpu::vertex_attr_array![0 => Float32x2, 1 => Float32, 2 => Float32],
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
            multisample: wgpu::MultisampleState { count: SAMPLES, ..Default::default() },
            multiview: None,
            cache: None,
        });

        let size = wgpu::Extent3d { width, height, depth_or_array_layers: 1 };
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
            bind,
            uniforms,
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

    /// The frame this owns, for a run that has no compositor to hand it one.
    pub fn own_view(&self) -> wgpu::TextureView {
        self.target
            .as_ref()
            .expect("this paint draws into somebody else's frame")
            .create_view(&Default::default())
    }

    pub fn draw(&self, view: &wgpu::TextureView, vertices: &[Vertex], indices: &[u32]) {
        let mut vbuf = self.vertices.borrow_mut();
        let mut ibuf = self.indices.borrow_mut();
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
            pass.set_bind_group(0, &self.bind, &[]);
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
            wgpu::Extent3d { width: self.width, height: self.height, depth_or_array_layers: 1 },
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
