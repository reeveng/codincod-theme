import QtQuick

/**
 * The glass the water is looked at through, and the film it lands on.
 *
 * Everything else in this directory draws the sea. This draws neither: it is one
 * pass over the finished frame, and what it adds is what a camera would have
 * added. Grain, because film has crystals in it and the water does not, and a
 * corner that gives up some of its light, because a lens gathers less there than
 * it does at the middle.
 *
 * The shader is `lens.frag`, and it never reads the frame underneath. That is
 * the whole reason this is affordable on a wallpaper: reading it would mean the
 * scene rendered to a texture the size of the screen and copied every frame,
 * which is what a game's post-processing costs and what a background may not.
 * Grain lands on light and dark alike and a corner falls off wherever it is
 * pointed, so neither of these two has to know what it is over.
 *
 * ## Why grain earns its place on a picture like this one
 *
 * It is not nostalgia. The scene is a handful of flat fills in one hue over a
 * gradient, and eight bits of alpha spread down a whole screen leaves too few
 * distinct values to get there smoothly: the water above the hills comes out as
 * a stack of bands with findable seams, and so does every long shaft of light.
 * Grain is a dither. It puts a value either side of the one the band wanted and
 * lets the eye average them, and the seams stop being lines.
 *
 * So this is a fix that happens to be a look, which is the right way round. A
 * scene with more colours in it would want less of it.
 */
ShaderEffect {
  id: lens

  /**
   * The heaviest a single crystal is drawn at, and 0 for no film at all.
   *
   * Heaviest rather than typical: most of the grain lands near nothing, and the
   * few that land at this weight are what makes it grain rather than a haze. A
   * twentieth is about where a still of this scene stops looking drawn, and past
   * about a tenth the water is being watched through a snowstorm.
   */
  property real grain: 0.05

  /**
   * How many px across one crystal is.
   *
   * Not one px. A single device pixel of grain on a dense screen is a thing
   * nobody can see and everybody's GPU pays for, and film grain is not pixel
   * sized anyway: it is a clump. Under about 1.2 it disappears at arm's length;
   * over about 3 the picture is visibly made of squares.
   */
  property real grainSpan: 1.6

  /**
   * What a corner falls towards, and it is the one thing here that is not the
   * theme's.
   *
   * No light. Every other darkening in this scene is a wash of the water's own
   * surface colour and this one may not be, which took a render to learn: a
   * corner washed in the surface lifts everything painted darker than the
   * surface, so the near rock at the edges of the frame, which is the darkest
   * thing in the picture, came out as the lightest. A lens does not add a colour
   * at its edges. It fails to gather one.
   */
  property color shade: "#000000"

  /** How much of its light a corner gives up. */
  property real vignette: 0.3

  /**
   * Which frame of grain this is, handed in rather than counted here.
   *
   * No clock of its own, and that is not tidiness. A second clock ticking at
   * some rate of its own is a whole window redrawn on two rates instead of one,
   * so a wallpaper that changes thirty times a second would be repainted
   * fifty-odd. Whoever mounts this already has a number that goes up once a
   * frame and stops when the scene stops, and handing that over means the grain
   * turns over exactly when the water does: on a desktop, on the tick; in a
   * recorded clip, once per grabbed frame, with no wall clock in it at all.
   *
   * It has to turn over at all. Grain that held still would be dirt on the lens
   * rather than film, and it would stop working as a dither the moment the eye
   * learned where the specks were.
   */
  property real turn: 0

  /**
   * The other two uniforms the shader reads by name, which is why they are
   * spelled the way they are. `grid` is how many crystals fit across the box and
   * down it, worked out here because the shader has no idea how big it is.
   */
  property vector2d grid: Qt.vector2d(Math.max(1, lens.width / lens.grainSpan),
                                      Math.max(1, lens.height / lens.grainSpan))

  fragmentShader: "lens.frag.qsb"

  // Nothing to draw with no film and no falloff, and an invisible item is a pass
  // the scene graph skips rather than one that costs a screen and adds zero.
  visible: lens.grain > 0 || lens.vignette > 0
}
