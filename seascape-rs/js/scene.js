var Sea = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // scene.ts
  var scene_exports = {};
  __export(scene_exports, {
    build: () => build,
    geometry: () => geometry,
    publish: () => publish,
    step: () => step,
    wind: () => wind
  });

  // ../../../codincodv2/assets/js/ornament/biome.ts
  var REACH = 0.36;
  function abreast(depth, other) {
    return Math.max(0, 1 - Math.abs(depth - other) / REACH);
  }

  // ../../../codincodv2/assets/js/ornament/perlin.ts
  var SIZE = 256;
  var MASK = SIZE - 1;
  var NORMALISE = Math.SQRT2;
  function makeRandom(seed) {
    let state = seed | 0 || 1;
    return () => {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      return (state >>> 0) / 4294967296;
    };
  }
  function stir(from) {
    let seed = from >>> 0;
    seed = Math.imul(seed ^ seed >>> 16, 73244475) >>> 0;
    return (seed ^ seed >>> 16) >>> 0;
  }
  function makeNoise2(seed) {
    const random = makeRandom(seed);
    const permutation = new Int32Array(SIZE + SIZE + 2);
    const gradientX = new Float64Array(SIZE + SIZE + 2);
    const gradientY = new Float64Array(SIZE + SIZE + 2);
    for (let i = 0; i < SIZE; i++) {
      permutation[i] = i;
      const angle = random() * Math.PI * 2;
      gradientX[i] = Math.cos(angle);
      gradientY[i] = Math.sin(angle);
    }
    for (let i = SIZE - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      const held = permutation[i];
      permutation[i] = permutation[j];
      permutation[j] = held;
    }
    for (let i = 0; i < SIZE + 2; i++) {
      permutation[SIZE + i] = permutation[i];
      gradientX[SIZE + i] = gradientX[i];
      gradientY[SIZE + i] = gradientY[i];
    }
    const dot = (gradient, x, y) => gradientX[gradient] * x + gradientY[gradient] * y;
    return (x, y) => {
      const cellX = Math.floor(x);
      const cellY = Math.floor(y);
      const dx0 = x - cellX;
      const dy0 = y - cellY;
      const dx1 = dx0 - 1;
      const dy1 = dy0 - 1;
      const bx0 = cellX & MASK;
      const by0 = cellY & MASK;
      const bx1 = bx0 + 1 & MASK;
      const by1 = by0 + 1 & MASK;
      const i = permutation[bx0];
      const j = permutation[bx1];
      const g00 = permutation[i + by0];
      const g10 = permutation[j + by0];
      const g01 = permutation[i + by1];
      const g11 = permutation[j + by1];
      const sx = sCurve(dx0);
      const sy = sCurve(dy0);
      const top = lerp(sx, dot(g00, dx0, dy0), dot(g10, dx1, dy0));
      const bottom = lerp(sx, dot(g01, dx0, dy1), dot(g11, dx1, dy1));
      return lerp(sy, top, bottom) * NORMALISE;
    };
  }
  function sCurve(t) {
    return t * t * (3 - 2 * t);
  }
  function lerp(t, a, b) {
    return a + t * (b - a);
  }

  // ../../../codincodv2/assets/js/ornament/flora.ts
  var gatherings = [];
  function gathered(twigs) {
    for (const held of gatherings) {
      if (held.drawn === twigs) return held.gathered;
    }
    const made = [];
    for (const twig of twigs) {
      const same = made.find((one) => one.width === twig.width);
      if (same) same.d += ` ${twig.d}`;
      else made.push({ d: twig.d, width: twig.width });
    }
    gatherings.push({ drawn: twigs, gathered: made });
    return made;
  }
  var CORAL = [
    { d: "M0 0 C-2 -14 -10 -18 -16 -26", width: 5 },
    { d: "M0 0 C0 -16 2 -24 0 -34", width: 6 },
    { d: "M0 0 C2 -12 10 -16 18 -22", width: 4.5 },
    { d: "M-8 -14 C-12 -20 -16 -22 -22 -24", width: 3 },
    { d: "M8 -12 C12 -18 18 -20 24 -20", width: 3 }
  ];
  var BUSH = [
    { d: "M0 0 C-4 -8 -14 -10 -24 -12", width: 4 },
    { d: "M0 0 C-2 -10 -6 -15 -10 -22", width: 4.5 },
    { d: "M0 0 C1 -9 3 -14 4 -20", width: 5 },
    { d: "M0 0 C4 -8 12 -11 22 -14", width: 4 },
    { d: "M-12 -9 C-16 -14 -18 -16 -20 -22", width: 2.5 },
    { d: "M10 -10 C14 -14 18 -15 22 -20", width: 2.5 }
  ];
  var STAGHORN = [
    { d: "M0 0 C0 -12 -2 -22 -6 -34", width: 5.5 },
    { d: "M0 0 C3 -10 6 -18 8 -30", width: 4.5 },
    { d: "M-3 -20 C-8 -26 -12 -28 -16 -36", width: 3 },
    { d: "M6 -20 C10 -26 14 -27 18 -32", width: 3 },
    { d: "M0 -6 C-6 -10 -10 -12 -14 -14", width: 2.5 }
  ];
  var BOULDER = [
    { d: "M0 0 C-9 -4 -13 -9 -12 -15", width: 7 },
    { d: "M0 0 C-4 -6 -5 -12 -4 -18", width: 7 },
    { d: "M0 0 C3 -6 5 -12 5 -17", width: 7 },
    { d: "M0 0 C9 -4 13 -9 11 -15", width: 7 }
  ];
  var REEF = [BOULDER, BOULDER, BUSH, BUSH, CORAL, STAGHORN];
  var FIELD_CELLS = 3.6;
  var DRIFT = 0.06;
  var KELP_LEAST = 0.22;
  var KELP_SPAN = 0.3;
  var GRASS_LEAST = 0.05;
  var GRASS_SPAN = 0.085;
  var TUFT_CROWDED = 46;
  var TUFT_FEWEST = 2;
  var TUFT_LEAST = 3;
  var TUFT_MOST = 7;
  var TUFT_SPLAY = 0.34;
  var TUFT_ROOT = 0.16;
  var GRASS_RUNT = 0.5;
  var KELP_GIRTH = 5.2;
  var GRASS_GIRTH = 2;
  var KELP_STEPS = 12;
  var GRASS_STEPS = 6;
  var KELP_LEAN = 0.34;
  var GRASS_LEAN = 0.14;
  var SWAY_SLOWEST = 0.22;
  var SWAY_FASTEST = 0.44;
  var CURRENT_SHARE = 0.68;
  var FRILL = {
    blades: 7,
    flare: 0.3,
    forks: [],
    girth: 1,
    seat: 0.14,
    span: 0.44,
    stature: 1,
    taper: 0.45,
    trail: 0.95
  };
  var STRAP = {
    blades: 4,
    flare: 0.42,
    forks: [],
    girth: 1.35,
    seat: 0.55,
    span: 0.95,
    stature: 0.74,
    taper: 0.08,
    trail: 0.8
  };
  var WRACK = {
    blades: 24,
    flare: 0.28,
    forks: [0.3, 0.48, 0.66],
    girth: 0.8,
    seat: 0.2,
    span: 0.34,
    stature: 0.78,
    taper: 0.3,
    trail: 0.85
  };
  var LETTUCE = {
    blades: 15,
    flare: 0.95,
    forks: [],
    girth: 0.62,
    seat: 0.06,
    span: 0.33,
    stature: 0.44,
    taper: 0.05,
    trail: 0.2
  };
  var WEEDS = [FRILL, FRILL, LETTUCE, STRAP, WRACK];
  var LEAF_CROWDED = 210;
  var LEAF_FEWEST = 3;
  var BLADE_STEPS = 5;
  var STEP_SPAN = 8;
  var FEWEST_STEPS = 2;
  function cuts(most, drawn) {
    return Math.max(FEWEST_STEPS, Math.min(most, Math.round(drawn / STEP_SPAN)));
  }
  function crowded(most, fewest, drawn, roomy) {
    const room = Math.min(1, Math.max(0, drawn / roomy));
    return Math.max(Math.min(most, fewest), Math.round(most * room));
  }
  var FORK_REACH = 0.58;
  var FORK_SPLAY = 0.5;
  var CORAL_SMALLEST = 0.9;
  var CORAL_LARGEST = 2.4;
  var ANEMONE_LEAST = 0.03;
  var ANEMONE_SPAN = 0.028;
  var ANEMONE_GIRTH = 0.15;
  var ANEMONE_LEAN = 0.08;
  var ANEMONE_STEPS = 3;
  var CROWN_LEAST = 12;
  var CROWN_MOST = 20;
  var CROWN_OPEN = 0.92;
  var CROWN_CURL = 0.36;
  var CROWN_REACH = 0.95;
  var CROWN_WAVE = 0.22;
  var CROWN_WAVES = 2.2;
  var CROWN_STEPS = 5;
  var CROWN_CROWDED = 30;
  var CROWN_FEWEST = 6;
  var CROWN_MINDS = 2.4;
  var CROWN_NOTICE = 0.9;
  var CROWN_PULL = 0.62;
  var COLUMN_SQUAT = 0.22;
  var PULL_FADE = 6;
  var FAN_LEAST = 0.055;
  var FAN_SPAN = 0.05;
  var FAN_GIRTH = 0.07;
  var FAN_STEM = 0.34;
  var FAN_LEAN = 0.06;
  var FAN_STEPS = 4;
  var RIB_GIVE = 0.5;
  var RIB_LEAST = 6;
  var RIB_MOST = 10;
  var RIB_CROWDED = 44;
  var RIB_FEWEST = 3;
  var RIB_TWIGGED = 14;
  var RIB_OPEN = 1.25;
  var RIB_SEAT = 0.12;
  var RIB_REACH = 0.95;
  var RIB_TWIG = 0.38;
  var RIB_SPLAY = 1.35;
  var MEADOW_EVERY = 620;
  var MEADOW_SPREAD = 0.13;
  var MEADOW_DEEP = 0.16;
  var MEADOW_STRAY = 0.14;
  var DEPTH_FAR = 0.12;
  var DEPTH_NEAR = 1;
  var PLANT_SHRINK = 0.78;
  var shrunk = (depth) => 1 - PLANT_SHRINK + PLANT_SHRINK * depth;
  var CROWN_BACK = 1.7;
  var MIN_SPAN = 1;
  var LEANS = {
    anemone: ANEMONE_LEAN,
    coral: 0,
    fan: FAN_LEAN,
    grass: GRASS_LEAN,
    kelp: KELP_LEAN
  };
  var STEMS = {
    anemone: 1,
    coral: 0,
    fan: FAN_STEM,
    grass: 1,
    kelp: 1
  };
  var TOLERANCE = 0.25;
  var SWING = {
    anemone: 2,
    coral: 0,
    fan: 2,
    grass: 2,
    kelp: 2
  };
  var SWEEP = {
    anemone: 0.25,
    coral: 0,
    fan: 0,
    grass: 0,
    kelp: 0
  };
  var STEPS = {
    anemone: ANEMONE_STEPS,
    coral: 0,
    fan: FAN_STEPS,
    grass: GRASS_STEPS,
    kelp: KELP_STEPS
  };
  function girthOf(kind, weed, span, depth) {
    if (kind === "anemone") return span * ANEMONE_GIRTH;
    if (kind === "fan") return span * FAN_GIRTH;
    if (kind === "kelp") return KELP_GIRTH * (weed?.girth ?? 1) * shrunk(depth);
    return GRASS_GIRTH * shrunk(depth);
  }
  function feeler(x, y, span, open, phase, steps) {
    const points = [{ x, y }];
    const pace = span / steps;
    let atX = x;
    let atY = y;
    for (let step2 = 1; step2 <= steps; step2++) {
      const u = step2 / steps;
      const heading = open * (1 + CROWN_CURL * u) + Math.sin(phase + u * CROWN_WAVES) * CROWN_WAVE * u;
      atX += pace * Math.sin(heading);
      atY -= pace * Math.cos(heading);
      points.push({ x: atX, y: atY });
    }
    return points;
  }
  function crown(seed, drawn) {
    const random = makeRandom(seed);
    const most = CROWN_LEAST + Math.floor(random() * (CROWN_MOST - CROWN_LEAST + 1));
    const count = crowded(most, CROWN_FEWEST, drawn, CROWN_CROWDED);
    const tentacles = [];
    for (let made = 0; made < count; made++) {
      const across = count < 2 ? 0 : made / (count - 1) * 2 - 1;
      const span = CROWN_REACH * (0.75 + random() * 0.55);
      tentacles.push({
        beat: 0.7 + random() * 0.7,
        own: random() * Math.PI * 2,
        shift: across * ANEMONE_GIRTH * 0.5,
        slant: across * CROWN_OPEN * (0.72 + random() * 0.56),
        span,
        steps: cuts(CROWN_STEPS, span * drawn)
      });
    }
    return tentacles;
  }
  function crownSwept(span, turned) {
    return span * SWEEP.anemone * turned;
  }
  function crownAt(mouth, tentacles, span, phase) {
    return tentacles.map(
      (one) => feeler(
        mouth.x + one.shift * span,
        mouth.y,
        one.span * span,
        one.slant,
        phase * one.beat + one.own,
        one.steps
      )
    );
  }
  function createFlora(options) {
    const noise = makeNoise2(options.seed ^ 20240);
    const random = makeRandom(options.seed ^ 27452);
    let width = Math.max(MIN_SPAN, options.width);
    let height = Math.max(MIN_SPAN, options.height);
    let floor = options.floor;
    let drift = 0;
    const plants = [];
    const sways = [];
    const tolerance = Math.max(0, options.tolerance ?? TOLERANCE);
    const drawn = [];
    const beds = [];
    const heights = /* @__PURE__ */ new Map();
    function plant(kind) {
      const { depth, x } = where(kind);
      if (kind === "coral") {
        plants.push({
          blades: [],
          cut: 0,
          depth,
          girth: 0,
          kind,
          points: [],
          scale: (CORAL_SMALLEST + random() * (CORAL_LARGEST - CORAL_SMALLEST)) * shrunk(depth),
          twigs: gathered(REEF[Math.floor(random() * REEF.length)] ?? CORAL),
          x,
          y: floor(x, depth)
        });
        sways.push({
          fright: 0,
          lean: 0,
          mates: [],
          own: random() * Math.PI * 2,
          rate: 0,
          steps: 0,
          tentacles: [],
          weed: null
        });
        drawn.push(null);
        return;
      }
      const weed = kind === "kelp" ? WEEDS[Math.floor(random() * WEEDS.length)] ?? FRILL : null;
      const span = height * stature(kind, weed) * shrunk(depth);
      plants.push({
        blades: [],
        cut: 0,
        depth,
        girth: girthOf(kind, weed, span, depth),
        kind,
        points: [],
        scale: 1,
        twigs: [],
        x,
        y: floor(x, depth)
      });
      sways.push({
        fright: 0,
        lean: span * LEANS[kind],
        mates: crop(kind, span),
        own: random() * Math.PI * 2,
        rate: SWAY_SLOWEST + random() * (SWAY_FASTEST - SWAY_SLOWEST),
        steps: cuts(STEPS[kind], span * STEMS[kind]),
        tentacles: kind === "anemone" ? crown(random() * 65535 | 0, span) : [],
        weed
      });
      drawn.push(null);
      heights.set(plants.length - 1, span);
    }
    function stature(kind, weed) {
      if (kind === "anemone") return ANEMONE_LEAST + random() * ANEMONE_SPAN;
      if (kind === "fan") return FAN_LEAST + random() * FAN_SPAN;
      if (kind === "kelp") return (KELP_LEAST + random() * KELP_SPAN) * (weed?.stature ?? 1);
      return GRASS_LEAST + random() * GRASS_SPAN;
    }
    function crop(kind, span) {
      if (kind === "fan") return ribs(span);
      if (kind === "grass") return clump(span);
      return [];
    }
    function where(kind) {
      if (kind === "anemone") {
        return {
          depth: DEPTH_FAR + random() ** CROWN_BACK * (DEPTH_NEAR - DEPTH_FAR),
          x: random() * width
        };
      }
      return kind === "grass" ? sprig() : anywhere();
    }
    function anywhere() {
      return { depth: DEPTH_FAR + random() * (DEPTH_NEAR - DEPTH_FAR), x: random() * width };
    }
    function sprig() {
      const bed = beds[Math.floor(random() * beds.length)];
      if (!bed || random() < MEADOW_STRAY) return anywhere();
      const depth = bed.depth + (random() + random() - 1) * MEADOW_DEEP;
      return {
        depth: Math.min(DEPTH_NEAR, Math.max(DEPTH_FAR, depth)),
        x: bed.x + (random() + random() - 1) * MEADOW_SPREAD * width
      };
    }
    function clump(span) {
      const mates = [];
      const most = TUFT_LEAST + Math.floor(random() * (TUFT_MOST - TUFT_LEAST + 1));
      const count = crowded(most, TUFT_FEWEST, span, TUFT_CROWDED);
      for (let made = 0; made < count; made++) {
        const side = made % 2 === 0 ? 1 : -1;
        const out = (Math.floor(made / 2) + 1) / Math.ceil(count / 2);
        mates.push({
          beat: 0.82 + random() * 0.4,
          own: random() * Math.PI * 2,
          seat: 0,
          shift: side * out * span * TUFT_ROOT * (0.4 + random() * 0.6),
          slant: side * out * TUFT_SPLAY * (0.5 + random() * 0.5),
          span: span * (GRASS_RUNT + random() * (1 - GRASS_RUNT))
        });
      }
      return mates;
    }
    function ribs(span) {
      const mates = [];
      const most = RIB_LEAST + Math.floor(random() * (RIB_MOST - RIB_LEAST + 1));
      const count = crowded(most, RIB_FEWEST, span, RIB_CROWDED);
      for (let made = 0; made < count; made++) {
        const side = made % 2 === 0 ? 1 : -1;
        const up = (Math.floor(made / 2) + 1) / Math.ceil(count / 2);
        mates.push({
          beat: 0.9 + random() * 0.25,
          own: random() * Math.PI * 2,
          seat: Math.min(1, RIB_SEAT + up * (1 - RIB_SEAT) * (0.75 + random() * 0.35)),
          shift: 0,
          slant: side * RIB_OPEN * (1 - up * 0.55),
          span: span * RIB_REACH * (1 - up * 0.18)
        });
      }
      return mates;
    }
    function sow() {
      plants.length = 0;
      sways.length = 0;
      beds.length = 0;
      drawn.length = 0;
      heights.clear();
      for (let made = 0; made < Math.max(1, Math.round(width / MEADOW_EVERY)); made++) {
        beds.push(anywhere());
      }
      for (let made = 0; made < Math.max(0, options.anemones ?? 0); made++) plant("anemone");
      for (let made = 0; made < Math.max(0, options.corals ?? 0); made++) plant("coral");
      for (let made = 0; made < Math.max(0, options.fans ?? 0); made++) plant("fan");
      for (let made = 0; made < Math.max(0, options.grasses ?? 0); made++) plant("grass");
      for (let made = 0; made < Math.max(0, options.kelps ?? 0); made++) plant("kelp");
    }
    function bend(at2, field) {
      const one = plants[at2];
      const sway = sways[at2];
      const span = heights.get(at2);
      if (!one || !sway || span == null || one.kind === "coral") return;
      const current = field(one.x / width * FIELD_CELLS + drift, drift);
      const own = Math.sin(sway.own);
      const amp = sway.lean * (current * CURRENT_SHARE + own * (1 - CURRENT_SHARE));
      const shy = one.kind === "anemone" ? 1 - sway.fright * COLUMN_SQUAT : 1;
      const stem = span * STEMS[one.kind] * shy;
      const was = drawn[at2];
      if (was && stir2(one.kind, span, was, amp, sway.fright, sway.own, stem) < tolerance) return;
      drawn[at2] = { amp, fright: sway.fright, own: sway.own, stem };
      one.cut++;
      const points = strand(one.x, one.y, stem, sway.own, amp, 0, sway.steps);
      one.points = points;
      if (one.kind === "anemone") {
        const mouth = points[points.length - 1];
        const out = span * (1 - sway.fright * CROWN_PULL);
        one.blades = mouth ? crownAt(mouth, sway.tentacles, out, sway.own) : [];
        return;
      }
      if (one.kind === "fan") {
        one.blades = ribsOf(sway, amp, points);
        return;
      }
      if (one.kind === "grass") {
        one.blades = sway.mates.map(
          (mate) => strand(
            one.x + mate.shift,
            one.y,
            mate.span,
            sway.own * mate.beat + mate.own,
            amp,
            mate.slant,
            cuts(sway.steps, mate.span)
          )
        );
        return;
      }
      one.blades = leaves(sway, span, amp, points);
    }
    function leaves(sway, span, amp, points) {
      const weed = sway.weed ?? FRILL;
      const limbs = [points];
      weed.forks.forEach((up, made) => {
        const on = points[Math.min(points.length - 1, Math.round(up * sway.steps))];
        if (!on) return;
        limbs.push(
          strand(
            on.x,
            on.y,
            span * (1 - up) * FORK_REACH,
            sway.own + up * Math.PI,
            amp * (1 - up),
            (made % 2 === 0 ? 1 : -1) * FORK_SPLAY,
            Math.max(2, Math.round(sway.steps * (1 - up)))
          )
        );
      });
      const blades = limbs.slice(1);
      const leafy = crowded(weed.blades, LEAF_FEWEST, span, LEAF_CROWDED);
      const each = Math.max(1, Math.round(leafy / limbs.length));
      const bends = cuts(BLADE_STEPS, span * weed.span);
      for (const limb of limbs) {
        const foot = limb[0];
        const tip = limb[limb.length - 1];
        if (!foot || !tip) continue;
        const reach = Math.hypot(tip.x - foot.x, tip.y - foot.y);
        for (let made = 0; made < each; made++) {
          const seat = weed.seat + made / each * (1 - weed.seat);
          const up = Math.round(seat * (limb.length - 1));
          const on = limb[Math.min(limb.length - 1, up)];
          const under = limb[Math.max(0, up - 1)];
          if (!on || !under) continue;
          const runX = on.x - under.x;
          const runY = on.y - under.y;
          const run = Math.hypot(runX, runY) || 1;
          const side = made % 2 === 0 ? 1 : -1;
          const long = reach * weed.span * (1 - weed.taper * seat);
          const trailX = -runX / run;
          const trailY = -runY / run;
          const flareX = -runY / run * side;
          const flareY = runX / run * side;
          const blade = [];
          for (let step2 = 0; step2 <= bends; step2++) {
            const u = step2 / bends;
            const out = Math.sin(u * Math.PI * 0.62) * (1 - u * 0.72) * weed.flare;
            const down = u * weed.trail;
            blade.push({
              x: on.x + (trailX * down + flareX * out) * long,
              y: on.y + (trailY * down + flareY * out) * long
            });
          }
          blades.push(blade);
        }
      }
      return blades;
    }
    function ribsOf(sway, amp, points) {
      const blades = [];
      for (const mate of sway.mates) {
        const on = points[Math.min(points.length - 1, Math.round(mate.seat * sway.steps))];
        if (!on) continue;
        const rib = strand(
          on.x,
          on.y,
          mate.span,
          sway.own * mate.beat + mate.own,
          amp * RIB_GIVE,
          mate.slant,
          cuts(FAN_STEPS, mate.span)
        );
        blades.push(rib);
        const half = rib[Math.floor(rib.length / 2)];
        if (!half || mate.span < RIB_TWIGGED) continue;
        blades.push(
          strand(
            half.x,
            half.y,
            mate.span * RIB_TWIG,
            sway.own + mate.own,
            amp * RIB_GIVE,
            mate.slant * RIB_SPLAY,
            2
          )
        );
      }
      return blades;
    }
    function strand(x, y, span, phase, amp, slant, steps) {
      const lean = Math.sin(slant);
      const rise = Math.cos(slant);
      const points = [];
      for (let step2 = 0; step2 <= steps; step2++) {
        const t = step2 / steps;
        points.push({
          x: x + span * t * lean + amp * Math.sin(phase + t * 2.4) * t,
          y: y - span * t * rise
        });
      }
      return points;
    }
    function scared(one, span, water) {
      let worst = 0;
      for (const thing of water) {
        if (thing.size < span * CROWN_MINDS) continue;
        const reach = thing.size * CROWN_NOTICE;
        const away = Math.hypot(one.x - thing.x, one.y - thing.y);
        if (away >= reach) continue;
        worst = Math.max(worst, (1 - away / reach) * abreast(one.depth, thing.depth));
      }
      return worst;
    }
    function carry(seconds, water) {
      drift += DRIFT * seconds;
      for (let at2 = 0; at2 < sways.length; at2++) {
        const sway = sways[at2];
        const one = plants[at2];
        if (!sway || !one) continue;
        const shy = one.kind === "anemone" ? scared(one, heights.get(at2) ?? 0, water) : 0;
        const fright = Math.max(0, Math.max(sway.fright - seconds / PULL_FADE, shy));
        if (sway.rate > 0 || fright !== sway.fright) {
          sways[at2] = { ...sway, fright, own: sway.own + sway.rate * seconds };
        }
      }
    }
    function stir2(kind, span, was, amp, fright, own, stem) {
      const reach = Math.max(Math.abs(amp), Math.abs(was.amp));
      const turned = Math.abs(own - was.own);
      return (Math.abs(amp - was.amp) + reach * turned) * SWING[kind] + span * SWEEP[kind] * turned + Math.abs(stem - was.stem) + Math.abs(fright - was.fright) * span * CROWN_PULL;
    }
    function recut() {
      for (let at2 = 0; at2 < plants.length; at2++) bend(at2, noise);
    }
    function advance(seconds) {
      carry(Math.min(Math.max(seconds, 0), 0.1), options.about?.() ?? []);
      recut();
    }
    sow();
    advance(0);
    return {
      plants,
      resize(nextWidth, nextHeight, nextFloor) {
        width = Math.max(MIN_SPAN, nextWidth);
        height = Math.max(MIN_SPAN, nextHeight);
        floor = nextFloor;
        sow();
        advance(0);
      },
      step: advance,
      wind(seconds) {
        carry(Math.max(seconds, 0), []);
        recut();
      }
    };
  }

  // ../../../codincodv2/assets/js/ornament/reef.ts
  var SORTS = {
    /** Soft, sheltered, and the only thing here anything lives inside. */
    anemone: {
      cling: 0.3,
      flow: [0, 0.78],
      perch: [0.15, 0.9],
      room: 1.6,
      size: [1, 1.5],
      sway: 0.07,
      weight: 3,
      width: 28
    },
    /** A dome that holds anywhere, and the one shape here with a body. */
    brain: {
      cling: 0.15,
      flow: [0, 1],
      perch: [0.1, 1],
      room: 1.1,
      size: [0.6, 1.5],
      sway: 0,
      weight: 5,
      width: 30
    },
    /** Broad blades into the surge, which is the one place it beats anything. */
    elkhorn: {
      cling: 0,
      flow: [0.55, 1],
      perch: [0.6, 1],
      room: 1.4,
      size: [0.7, 1.2],
      sway: 0,
      weight: 3,
      width: 42
    },
    /** A mesh held across the current, so it stands where the current runs. */
    fan: {
      cling: 0.55,
      flow: [0.45, 1],
      perch: [0.3, 0.95],
      room: 1.3,
      size: [0.6, 1.3],
      sway: 0.1,
      weight: 4,
      width: 34
    },
    /** Soft and lobed, down at the foot where nothing is pulling at it. */
    leather: {
      cling: 0.4,
      flow: [0, 0.45],
      perch: [0, 0.5],
      room: 1.2,
      size: [0.7, 1.2],
      sway: 0.07,
      weight: 3,
      width: 26
    },
    /** Spread flat to catch what light gets down there. */
    plate: {
      cling: 0.35,
      flow: [0, 0.55],
      perch: [0, 0.55],
      room: 1.5,
      size: [0.7, 1.3],
      sway: 0,
      weight: 3,
      width: 46
    },
    /** Fine branches, which snap in surge, so never at the crest. */
    staghorn: {
      cling: 0.1,
      flow: [0, 0.6],
      perch: [0.35, 0.9],
      room: 1.3,
      size: [0.6, 1.1],
      sway: 0,
      weight: 4,
      width: 36
    },
    /** A floor of its own, held up into the light at the top of the mound. */
    table: {
      cling: 0,
      flow: [0.2, 0.9],
      perch: [0.7, 1],
      room: 1.7,
      size: [0.7, 1.2],
      sway: 0,
      weight: 2,
      width: 46
    },
    /** Sponge, not coral, and it takes the shaded foot nothing else wants. */
    tube: {
      cling: 0.5,
      flow: [0, 0.4],
      perch: [0, 0.45],
      room: 1.2,
      size: [0.5, 0.9],
      sway: 0.05,
      weight: 3,
      width: 24
    },
    /** One line into the flow, and the thing on this reef that moves most. */
    whip: {
      cling: 0.25,
      flow: [0.5, 1],
      perch: [0.4, 1],
      room: 0.9,
      size: [0.7, 1.4],
      sway: 0.22,
      weight: 3,
      width: 12
    }
  };
  var KINDS = Object.keys(SORTS);
  var SHAPES = {
    /** None. It is the one animal on the rock, and an animal is not a stamp. */
    anemone: [],
    brain: [
      { d: "M-13 0 C-13 -8 -8 -13 -1 -14", width: 7 },
      { d: "M-6 0 C-7 -7 -4 -11 0 -12", width: 7 },
      { d: "M6 0 C7 -7 5 -11 1 -13", width: 7 },
      { d: "M13 -1 C13 -8 8 -13 1 -14", width: 7 }
    ],
    elkhorn: [
      { d: "M0 0 C0 -5 -1 -9 -2 -12", width: 7 },
      { d: "M0 0 C-1 -10 -6 -16 -14 -24", width: 6 },
      { d: "M0 0 C1 -12 4 -20 10 -30", width: 5.5 },
      { d: "M-8 -14 C-14 -18 -20 -20 -26 -22", width: 5 },
      { d: "M5 -16 C11 -21 17 -23 24 -25", width: 4.5 }
    ],
    fan: [
      { d: "M0 0 C0 -8 -2 -12 -3 -16", width: 3.5 },
      { d: "M-3 -16 C-9 -20 -13 -24 -15 -30", width: 2 },
      { d: "M-3 -16 C-6 -22 -7 -27 -8 -32", width: 2 },
      { d: "M-3 -16 C0 -22 1 -27 1 -33", width: 2 },
      { d: "M-3 -16 C3 -21 7 -25 10 -30", width: 2 },
      { d: "M-3 -16 C6 -19 11 -21 15 -25", width: 2 }
    ],
    leather: [
      { d: "M0 0 C-2 -6 -6 -9 -9 -15", width: 8 },
      { d: "M0 0 C0 -7 1 -12 2 -18", width: 8 },
      { d: "M0 0 C3 -6 7 -9 10 -14", width: 7 }
    ],
    plate: [
      { d: "M0 0 C0 -2 0 -3 0 -4", width: 6 },
      { d: "M0 0 C-6 -2 -14 -4 -22 -5", width: 5 },
      { d: "M0 0 C6 -2 14 -4 21 -6", width: 5 },
      { d: "M-14 -4 C-15 -7 -14 -8 -12 -10", width: 3 },
      { d: "M15 -5 C17 -7 17 -9 16 -11", width: 3 }
    ],
    staghorn: [
      { d: "M0 0 C-1 -11 -3 -20 -7 -31", width: 4 },
      { d: "M0 0 C2 -9 5 -17 7 -28", width: 3.5 },
      { d: "M-4 -19 C-9 -24 -13 -26 -18 -33", width: 2.4 },
      { d: "M5 -18 C9 -24 13 -25 17 -30", width: 2.4 },
      { d: "M-2 -8 C-7 -11 -11 -12 -15 -13", width: 2.2 },
      { d: "M3 -10 C8 -13 11 -15 15 -17", width: 2.2 }
    ],
    table: [
      { d: "M0 0 C-1 -6 -1 -10 0 -13", width: 6 },
      { d: "M0 -13 C-8 -14 -16 -15 -23 -15", width: 4 },
      { d: "M0 -13 C8 -14 16 -15 23 -16", width: 4 },
      { d: "M-12 -15 C-13 -17 -13 -19 -12 -20", width: 2.4 },
      { d: "M11 -15 C12 -17 12 -19 11 -21", width: 2.4 }
    ],
    tube: [
      { d: "M-8 0 C-9 -8 -9 -14 -8 -19", width: 6 },
      { d: "M0 0 C-1 -9 -1 -18 0 -25", width: 6.5 },
      { d: "M8 -1 C9 -7 9 -12 8 -16", width: 5.5 }
    ],
    whip: [
      { d: "M0 0 C-2 -9 -4 -16 -4 -24", width: 2.2 },
      { d: "M0 0 C1 -12 -1 -24 2 -38", width: 2.6 }
    ]
  };
  var SEAT_LEAST = 0.26;
  var SEAT_SPAN = 0.48;
  var HALF_LEAST = 0.15;
  var HALF_SPAN = 0.12;
  var RISE_LEAST = 0.1;
  var RISE_SPAN = 0.08;
  var TALLEST = 0.62;
  var DEPTH_FAR2 = 0.5;
  var DEPTH_NEAR2 = 0.82;
  var BROW = 2.6;
  var BULGE = 0.5;
  var LIST = 0.22;
  var LUMP_CELLS = 3.4;
  var LUMP_SHARE = 0.24;
  var CREST_STEPS = 96;
  var HEADS = 52;
  var APRON = 1.28;
  var TRIES = 40;
  var REACH2 = 0.34;
  var TIER = 0.55;
  var HEADROOM = 0.9;
  var LEAN = 0.22;
  var GROWTH = 72e-4;
  var COLUMN = 16;
  var GIRTH = 0.15;
  var CROWN_RATE = 1.1;
  var SWELL_RATE = 0.55;
  var SWELL_CELLS = 1.8;
  var SWELL_SHARE = 0.6;
  var ROOT = { x: 0, y: 0 };
  var MOUTH = { x: 0, y: -COLUMN };
  var TOLERANCE2 = 0.25;
  var REACHES = (() => {
    const reaches = {};
    for (const kind of KINDS) reaches[kind] = furthest(SHAPES[kind]);
    return reaches;
  })();
  function furthest(twigs) {
    let worst = 0;
    for (const twig of twigs) {
      const numbers = twig.d.match(/-?\d+(?:\.\d+)?/g) ?? [];
      for (let at2 = 0; at2 + 1 < numbers.length; at2 += 2) {
        worst = Math.max(worst, Math.hypot(Number(numbers[at2]), Number(numbers[at2 + 1])));
      }
    }
    return worst;
  }
  var MIN_SPAN2 = 1;
  function createReef(options) {
    const noise = makeNoise2(options.seed ^ 11153);
    const gust = makeNoise2(options.seed ^ 23779);
    let width = Math.max(MIN_SPAN2, options.width);
    let height = Math.max(MIN_SPAN2, options.height);
    let floor = options.floor;
    let clock = 0;
    let middle = width / 2;
    let half = width * HALF_LEAST;
    let rise = height * RISE_LEAST;
    let depth = DEPTH_FAR2;
    const heads = [];
    const crowns = [];
    const tolerance = Math.max(0, options.tolerance ?? TOLERANCE2);
    const reaches = [];
    const held = [];
    let bounds = [0, 0];
    let health = 0;
    function climb(t) {
      if (Math.abs(t) >= 1) return 0;
      const arch = (1 - Math.abs(t) ** BROW) ** BULGE;
      const lump = 1 + noise(t * LUMP_CELLS, 0) * LUMP_SHARE;
      return Math.min(1, Math.max(0, arch * (1 + LIST * t) * lump));
    }
    function swept(t) {
      return Math.min(1, climb(t) * 0.62 + (t + 1) / 2 * 0.38);
    }
    const standing = (stand) => {
      if (stand <= depth) return 1;
      return 1 - Math.min(1, (stand - depth) / Math.max(1 - depth, 1e-6));
    };
    const surfaceAt = (x, stand = depth) => {
      const t = (x - middle) / Math.max(MIN_SPAN2, half);
      return floor(x, stand) - rise * climb(t) * standing(stand);
    };
    function grow(kind, roll) {
      const sort = SORTS[kind];
      for (let tries = 0; tries < TRIES; tries++) {
        const t = (-1 + roll() * 2) * APRON;
        const perch = climb(t);
        const flow = swept(t);
        if (perch < sort.perch[0] || perch > sort.perch[1]) continue;
        if (flow < sort.flow[0] || flow > sort.flow[1]) continue;
        const x = middle + t * half;
        const face = sort.cling * perch;
        const stand = depth + face * (1 - depth) * roll();
        const grown = sort.size[0] + roll() * (sort.size[1] - sort.size[0]);
        const scale = grown * rise * GROWTH * stand;
        const span = sort.width * scale;
        const y = surfaceAt(x, stand);
        if (!room(x, y, span * sort.room)) continue;
        const tentacles = kind === "anemone" ? crown(stir(roll() * 16777215), COLUMN * scale) : null;
        const head = {
          bend: 0,
          blades: [],
          cut: 0,
          depth: stand,
          girth: tentacles ? COLUMN * GIRTH : 0,
          kind,
          lane: roll() * Math.PI * 2,
          lean: (roll() - 0.5) * LEAN * 2,
          points: tentacles ? [ROOT, MOUTH] : [],
          scale,
          span,
          twigs: gathered(SHAPES[kind]),
          x,
          y
        };
        heads.push(head);
        crowns.push(tentacles);
        held.push(null);
        reaches.push(
          tentacles ? COLUMN * scale * (1 + Math.max(...tentacles.map((one) => one.span))) : REACHES[kind] * scale
        );
        return head;
      }
      return null;
    }
    function room(x, y, want) {
      for (const other of heads) {
        const near = (want + other.span) / 2;
        if (Math.abs(other.y - y) > near * TIER) continue;
        if (Math.abs(other.x - x) < near) return false;
      }
      return true;
    }
    function raise() {
      const roll = makeRandom(options.seed ^ 37295);
      middle = width * (SEAT_LEAST + roll() * SEAT_SPAN);
      half = width * (HALF_LEAST + roll() * HALF_SPAN);
      rise = Math.min(height * (RISE_LEAST + roll() * RISE_SPAN), half * TALLEST);
      depth = DEPTH_FAR2 + roll() * (DEPTH_NEAR2 - DEPTH_FAR2);
      heads.length = 0;
      crowns.length = 0;
      held.length = 0;
      reaches.length = 0;
      crest.length = 0;
      bounds = [middle - half, middle + half];
      for (let step2 = 0; step2 <= CREST_STEPS; step2++) {
        const x = middle - half + half * 2 / CREST_STEPS * step2;
        crest.push({ x, y: surfaceAt(x) });
      }
      for (const kind of dealt(roll)) grow(kind, roll);
      const rest = spread2();
      for (let made = 0; made < Math.max(0, options.heads ?? HEADS); made++) {
        grow(rest[Math.floor(roll() * rest.length)] ?? "brain", roll);
      }
      health = new Set(heads.map((one) => one.kind)).size / KINDS.length;
    }
    function dealt(roll) {
      const order = [...KINDS];
      for (let at2 = order.length - 1; at2 > 0; at2--) {
        const swap = Math.floor(roll() * (at2 + 1));
        const held2 = order[at2];
        order[at2] = order[swap];
        order[swap] = held2;
      }
      return order;
    }
    function spread2() {
      const bag = [];
      for (const kind of KINDS) {
        for (let each = 0; each < SORTS[kind].weight; each++) bag.push(kind);
      }
      return bag;
    }
    function lean(one) {
      const sway = SORTS[one.kind].sway;
      if (sway === 0) return 0;
      const passing = gust(
        (one.x - middle) / Math.max(MIN_SPAN2, half) * SWELL_CELLS,
        clock * SWELL_RATE
      );
      const own = Math.sin(clock * Math.PI * 2 * SWELL_RATE + one.lane);
      return sway * (passing * SWELL_SHARE + own * (1 - SWELL_SHARE));
    }
    function wander(at2, bend, phase) {
      const one = heads[at2];
      const was = held[at2];
      if (!one || !was) return Number.POSITIVE_INFINITY;
      return (reaches[at2] ?? 0) * Math.abs(bend - was.bend) + crownSwept(COLUMN * one.scale, Math.abs(phase - was.phase));
    }
    function breathe() {
      for (const [at2, one] of heads.entries()) {
        const tentacles = crowns[at2];
        const bend = lean(one);
        const phase = tentacles ? clock * CROWN_RATE + one.lane : 0;
        if (wander(at2, bend, phase) < tolerance) continue;
        one.bend = bend;
        if (tentacles) one.blades = crownAt(MOUTH, tentacles, COLUMN, phase);
        one.cut++;
        held[at2] = { bend, phase };
      }
    }
    const crest = [];
    raise();
    breathe();
    return {
      crest,
      get depth() {
        return depth;
      },
      heads,
      get health() {
        return health;
      },
      holds(x, y, stand = depth) {
        const reach = half * (1 + REACH2);
        if (x < middle - reach || x > middle + reach) return false;
        const rock = surfaceAt(x, stand);
        return y >= rock - rise * HEADROOM && y <= rock;
      },
      resize(nextWidth, nextHeight, nextFloor) {
        width = Math.max(MIN_SPAN2, nextWidth);
        height = Math.max(MIN_SPAN2, nextHeight);
        floor = nextFloor;
        raise();
        breathe();
      },
      get span() {
        return bounds;
      },
      step(seconds) {
        clock += Math.min(Math.max(seconds, 0), 0.1);
        breathe();
      },
      surfaceAt,
      wind(seconds) {
        clock += Math.max(0, seconds);
        breathe();
      }
    };
  }

  // ../../../codincodv2/assets/js/ornament/seabed.ts
  var FLOOR_SEAT = 0.01;
  var FLOOR_ROLL = 0.085;
  var HORIZON_SEAT = 0.36;
  var HORIZON_ROLL = 0.12;
  var SWELL_CELLS2 = 1.3;
  var LUMP_CELLS2 = 5.5;
  var HORIZON_SWELL_CELLS = 0.8;
  var HORIZON_LUMP_CELLS = 2.1;
  var DEPTH_FALL = 1.6;
  var DISTANCE_LANES = 3.1;
  var LUMP_SHARE2 = 0.34;
  var RIDGE_STEPS = 96;
  var OVERHANG = 40;
  var STONE_SMALLEST = 9;
  var STONE_LARGEST = 38;
  var STONE_SQUAT = 0.62;
  var STONE_LEAN = 0.5;
  var STONE_FAR = 0.3;
  var STONE_NEAR = 1;
  var STONE_SHRINK = 0.55;
  var RANGE_FAR = 0.08;
  var RANGE_NEAR = 0.75;
  var CLIFF_RISE_LEAST = 0.06;
  var CLIFF_RISE_SPAN = 0.16;
  var CLIFF_SPAN_LEAST = 0.12;
  var CLIFF_SPAN_SPAN = 0.26;
  var CLIFF_STEPS = 280;
  var FRINGE_RISE = 0.038;
  var FRINGE_PATCHES = 3.4;
  var FRINGE_BARE = 0.12;
  var CLIFF_DEEP = 0.05;
  var CLIFF_NEAR = 0.16;
  var CLIFF_RANGES = 3;
  var STRAND_SPAN = 26;
  var MIN_SPAN3 = 1;
  var mix = (far, near, at2) => far + (near - far) * at2;
  function createSeabed(options) {
    const colonies = makeNoise2(options.seed ^ 49168);
    const sprigs = makeNoise2(options.seed ^ 20887);
    const swell = makeNoise2(options.seed ^ 24235);
    const lumps = makeNoise2(options.seed ^ 4293);
    const random = makeRandom(options.seed ^ 11534);
    let width = Math.max(MIN_SPAN3, options.width);
    let height = Math.max(MIN_SPAN3, options.height);
    function floorAt(x, depth = 1) {
      const near = Math.max(0, Math.min(1, depth));
      const lane = (1 - near) * DISTANCE_LANES;
      const up = near ** DEPTH_FALL;
      const seat = height * (1 - mix(HORIZON_SEAT, FLOOR_SEAT, up));
      const roll = height * mix(HORIZON_ROLL, FLOOR_ROLL, up);
      const long = swell(x / width * mix(HORIZON_SWELL_CELLS, SWELL_CELLS2, near), lane);
      const short = lumps(x / width * mix(HORIZON_LUMP_CELLS, LUMP_CELLS2, near), lane + 4.7);
      return seat - (long * (1 - LUMP_SHARE2) + short * LUMP_SHARE2) * roll;
    }
    function cutRidge(depth) {
      const points = [];
      for (let at2 = 0; at2 <= RIDGE_STEPS; at2++) {
        const x = -OVERHANG + at2 / RIDGE_STEPS * (width + OVERHANG * 2);
        points.push({ x, y: floorAt(x, depth) });
      }
      return points;
    }
    function cutRanges(count) {
      const bands = [];
      for (let at2 = 0; at2 < count; at2++) {
        const depth = count < 2 ? RANGE_FAR : RANGE_FAR + at2 / (count - 1) * (RANGE_NEAR - RANGE_FAR);
        bands.push({ depth, ridge: cutRidge(depth) });
      }
      return bands;
    }
    function fringe(x, depth, at2) {
      if (at2 % 2 === 0) return 0;
      const patch = colonies(x / width * FRINGE_PATCHES, depth * 7.3);
      if (patch < FRINGE_BARE) return 0;
      const thick = (patch - FRINGE_BARE) / (1 - FRINGE_BARE);
      const stand = Math.abs(sprigs(x / STRAND_SPAN, depth * 11.7));
      return height * FRINGE_RISE * thick * (0.4 + stand * 0.6);
    }
    function raise(depth, peaks) {
      const domes = Array.from({ length: Math.max(1, peaks) }, () => {
        const bulk = random();
        return {
          middle: random() * width,
          rise: height * (CLIFF_RISE_LEAST + bulk * CLIFF_RISE_SPAN),
          rough: makeNoise2(random() * 65535 | 0),
          span: width * (CLIFF_SPAN_LEAST + bulk * CLIFF_SPAN_SPAN)
        };
      });
      const ridge2 = [];
      for (let at2 = 0; at2 <= CLIFF_STEPS; at2++) {
        const x = -OVERHANG + at2 / CLIFF_STEPS * (width + OVERHANG * 2);
        let lift = 0;
        for (const dome of domes) {
          const t = (x - (dome.middle - dome.span / 2)) / dome.span;
          if (t <= 0 || t >= 1) continue;
          const swell2 = (1 - Math.cos(t * Math.PI * 2)) / 2;
          lift = Math.max(lift, dome.rise * swell2 * (1 + dome.rough(t * 3.1, 0) * 0.34));
        }
        ridge2.push({ x, y: floorAt(x, depth) - lift - fringe(x, depth, at2) });
      }
      return { depth, ridge: ridge2 };
    }
    function settle() {
      const x = random() * width;
      const depth = STONE_FAR + random() * (STONE_NEAR - STONE_FAR);
      const shrink = 1 - STONE_SHRINK + STONE_SHRINK * depth;
      const span = (STONE_SMALLEST + random() ** 1.5 * (STONE_LARGEST - STONE_SMALLEST)) * shrink;
      return {
        depth,
        lean: (random() - 0.5) * STONE_LEAN * 2,
        rise: span * STONE_SQUAT * (0.7 + random() * 0.6),
        span,
        x,
        y: floorAt(x, depth)
      };
    }
    let ridge = cutRidge(1);
    let ranges = cutRanges(Math.max(0, options.ranges ?? 0));
    function skylines() {
      const summits = Math.max(0, options.cliffs ?? 0);
      if (summits === 0) return [];
      return Array.from({ length: CLIFF_RANGES }, (_, at2) => {
        const step2 = CLIFF_RANGES > 1 ? at2 / (CLIFF_RANGES - 1) : 0;
        const share = Math.round(summits * (at2 + 1) / CLIFF_RANGES) - Math.round(summits * at2 / CLIFF_RANGES);
        return raise(CLIFF_DEEP + step2 * (CLIFF_NEAR - CLIFF_DEEP), share);
      });
    }
    let cliffs = skylines();
    let stones = Array.from({ length: Math.max(0, options.stones ?? 0) }, settle);
    return {
      get cliffs() {
        return cliffs;
      },
      floorAt,
      get ranges() {
        return ranges;
      },
      /**
       * A resized box is rebuilt rather than scaled.
       *
       * Everything here is a pure function of the seed and the box, so rebuilding
       * gives the same bed the same box would have had from the start. Scaling
       * would stretch the sand's own grain, and a seabed that got wider when a
       * window did would be the one thing on screen admitting it is a drawing.
       */
      resize(nextWidth, nextHeight) {
        width = Math.max(MIN_SPAN3, nextWidth);
        height = Math.max(MIN_SPAN3, nextHeight);
        ridge = cutRidge(1);
        ranges = cutRanges(ranges.length);
        cliffs = skylines();
        stones = stones.map(settle);
      },
      get ridge() {
        return ridge;
      },
      get stones() {
        return stones;
      }
    };
  }

  // scene.ts
  var PER_K = {
    anemones: 34,
    cliffs: 5.5,
    corals: 46,
    fans: 19,
    grasses: 124,
    kelps: 24,
    stones: 40
  };
  var MOST = {
    anemones: 92,
    cliffs: 16,
    corals: 108,
    fans: 50,
    grasses: 320,
    kelps: 74,
    stones: 108
  };
  var LEAST = 2;
  var REEF_HEADS = 34;
  var RANGES = 6;
  var carved = /* @__PURE__ */ new Map();
  function twigOf(d) {
    const held = carved.get(d);
    if (held) return held;
    const numbers = d.match(/-?\d+(\.\d+)?/g);
    const cut = numbers ? numbers.map(Number) : [];
    carved.set(d, cut);
    return cut;
  }
  var KINDS2 = { anemone: 2, coral: 4, fan: 3, grass: 1, kelp: 0 };
  var GROUND = { cliff: 2, hill: 1, mound: 3, sand: 0 };
  var geometry = new Float32Array(1 << 23);
  var flora = null;
  var reef = null;
  var seabed = null;
  var box = { height: 0, width: 0 };
  function spread(perThousand, most, width) {
    return Math.max(LEAST, Math.min(most, Math.round(width * perThousand / 1e3)));
  }
  function build(width, height, seed, tolerance) {
    box = { height, width };
    seabed = createSeabed({
      cliffs: spread(PER_K.cliffs, MOST.cliffs, width),
      height,
      ranges: RANGES,
      seed,
      stones: spread(PER_K.stones, MOST.stones, width),
      width
    });
    reef = createReef({
      floor: seabed.floorAt,
      heads: REEF_HEADS,
      height,
      seed,
      tolerance,
      width
    });
    flora = createFlora({
      anemones: spread(PER_K.anemones, MOST.anemones, width),
      corals: spread(PER_K.corals, MOST.corals, width),
      fans: spread(PER_K.fans, MOST.fans, width),
      floor: seabed.floorAt,
      grasses: spread(PER_K.grasses, MOST.grasses, width),
      height,
      kelps: spread(PER_K.kelps, MOST.kelps, width),
      seed,
      tolerance,
      width
    });
  }
  function wind(seconds) {
    flora?.wind(seconds);
  }
  function step(seconds) {
    flora?.step(seconds);
  }
  var at = 0;
  function put(value) {
    geometry[at++] = value;
  }
  function putPoints(points) {
    put(points.length);
    for (let i = 0; i < points.length; i++) {
      put(points[i].x);
      put(points[i].y);
    }
  }
  function putPlant(plant) {
    put(KINDS2[plant.kind] ?? 0);
    put(plant.depth);
    put(plant.girth);
    put(plant.scale);
    put(plant.x);
    put(plant.y);
    put(plant.cut);
    putPoints(plant.points);
    put(plant.blades.length);
    for (let b = 0; b < plant.blades.length; b++) putPoints(plant.blades[b]);
    put(plant.twigs.length);
    for (let t = 0; t < plant.twigs.length; t++) {
      const twig = plant.twigs[t];
      const cut = twigOf(twig.d);
      put(twig.width);
      put(cut.length);
      for (let n = 0; n < cut.length; n++) put(cut[n]);
    }
  }
  function publish() {
    at = 0;
    if (!flora || !seabed) return 0;
    put(1);
    put(box.width);
    put(box.height);
    const groundAt = at;
    put(0);
    const plantAt = at;
    put(0);
    let ground = 0;
    put(GROUND.sand);
    put(1);
    putPoints(seabed.ridge);
    ground++;
    for (const band of seabed.ranges) {
      put(GROUND.hill);
      put(band.depth);
      putPoints(band.ridge);
      ground++;
    }
    if (reef) {
      put(GROUND.mound);
      put(reef.depth);
      putPoints(reef.crest);
      ground++;
    }
    for (const cliff of seabed.cliffs) {
      put(GROUND.cliff);
      put(cliff.depth);
      putPoints(cliff.ridge);
      ground++;
    }
    for (const plant of flora.plants) putPlant(plant);
    geometry[groundAt] = ground;
    geometry[plantAt] = flora.plants.length;
    return at;
  }
  return __toCommonJS(scene_exports);
})();
