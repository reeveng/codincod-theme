#version 440

// The lens the water is seen through.
//
// Two things happen to a picture between the water and the eye and neither of
// them happens in the water: film takes grain, and a lens gives up light at the
// corners it cannot gather at the middle. Both belong to the camera, so both are
// one pass over the finished frame rather than a property of anything in it.
//
// `Lens.qml` is what mounts this and what the numbers mean is written there.
// Compiled by `build-shaders.sh`; `lens.frag.qsb` beside it is the output and is
// committed, for the reason `Ornament.js` is.
//
// The frame underneath is never read. A pass that sampled it would need the
// whole scene rendered to a texture first, which on a desktop is a screen's
// worth of memory and a screen's worth of copy every frame, and neither of these
// two effects needs to know what it is over: grain lands on light and dark
// alike, and a corner falls off wherever it is pointed. So this draws over what
// is there, in premultiplied alpha, and the scene graph blends it.

layout(location = 0) in vec2 qt_TexCoord0;
layout(location = 0) out vec4 fragColor;

layout(std140, binding = 0) uniform buf {
  mat4 qt_Matrix;
  float qt_Opacity;
  float grain;
  float vignette;
  float turn;
  vec2 grid;
  vec4 shade;
};

// One value out of a cell and which frame of grain it is, evenly spread over 0
// to 1. Hashed rather than sampled: a noise texture is a tile, and a tile laid
// over a whole desktop is a pattern somebody will eventually see.
float speck(vec3 cell) {
  vec3 mixed = fract(cell * 0.1031);
  mixed += dot(mixed, mixed.yzx + 33.33);
  return fract((mixed.x + mixed.y) * mixed.z);
}

void main() {
  vec2 cell = floor(qt_TexCoord0 * grid);

  // Two draws averaged rather than one, because an even spread reads as
  // television. Film grain is mostly nothing with the odd bright crystal in it,
  // and the average of two flat distributions is that shape: a peak in the
  // middle and thin tails.
  float lit = (speck(vec3(cell, turn)) + speck(vec3(cell.yx, turn + 17.0))) * 0.5;

  // A crystal is exposed or it is not, so the grain is white where it fell above
  // the middle and black where it fell below, and only its weight varies. Grain
  // that greyed towards the middle instead would be a haze over the picture.
  float lift = (lit - 0.5) * 2.0;
  float weight = abs(lift) * grain;
  vec3 crystal = vec3(step(0.0, lift)) * weight;

  // Where the corners give out. Measured from the middle in the box's own
  // proportions, so it is an oval on a wide screen rather than a circle with two
  // untouched ends, and it starts past halfway out: a fall that began at the
  // middle would be a spotlight.
  float fall = smoothstep(0.55, 1.42, length((qt_TexCoord0 - 0.5) * 2.0)) * vignette;

  // The grain over the fall, both already premultiplied.
  fragColor = vec4(crystal + shade.rgb * fall * (1.0 - weight),
                   weight + fall * (1.0 - weight)) * qt_Opacity;
}
