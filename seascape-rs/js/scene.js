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
    build: () => build2,
    geometry: () => geometry,
    layout: () => layout,
    open: () => open,
    over: () => over,
    pretend: () => pretend2,
    publish: () => publish,
    rush: () => rush,
    step: () => step,
    today: () => today,
    wind: () => wind
  });

  // ../../../codincodv2/assets/js/ornament/biome.ts
  var REACH = 0.36;
  function abreast(depth, other) {
    return Math.max(0, 1 - Math.abs(depth - other) / REACH);
  }
  function createBiome() {
    const sources = /* @__PURE__ */ new Set();
    const gathered2 = [];
    return {
      about() {
        gathered2.length = 0;
        for (const source of sources) {
          for (const one of source()) gathered2.push(one);
        }
        return gathered2;
      },
      enter(source) {
        sources.add(source);
        return () => {
          sources.delete(source);
        };
      }
    };
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
      const held2 = permutation[i];
      permutation[i] = permutation[j];
      permutation[j] = held2;
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

  // ../../../codincodv2/assets/js/ornament/shoal.ts
  var SPECIES = {
    /** The one that was here first. Everything else is described against it. */
    cruiser: {
      bill: 0,
      deep: 0.52,
      girth: 1,
      hold: 1,
      nerve: 1,
      pace: 1,
      pitch: 1,
      stride: 1,
      verve: 0
    },
    /** Small, quick, and never going anywhere for long. */
    darter: {
      bill: 0,
      deep: 0.58,
      girth: 0.42,
      hold: 0.3,
      nerve: 1.7,
      pace: 1.5,
      pitch: 1.4,
      stride: 0.58,
      verve: 1
    },
    /**
     * Long, slow and far back, crossing the murk on one heading.
     *
     * The one that does nothing about anything. It is already the largest thing
     * in this water and it is already at the back of it, and an animal that size
     * has no business hurrying out of the way of a shape, so a shark goes through
     * and the drifter carries on exactly as it was. It is the most useful animal
     * in the shoal for that: without it every crossing makes the whole picture
     * flinch at once, which is a picture of one animal rather than of a sea.
     */
    drifter: {
      bill: 0,
      deep: 0.2,
      girth: 2.1,
      hold: 4.5,
      nerve: 0,
      pace: 0.6,
      pitch: 0.45,
      stride: 1.7,
      verve: 0
    },
    /** Comes in twos and holds station with the other. See `Fish.mate`. */
    escort: {
      bill: 0,
      deep: 0.62,
      girth: 0.72,
      hold: 1.4,
      nerve: 1.25,
      pace: 1.1,
      pitch: 0.9,
      stride: 0.85,
      verve: 0
    },
    /**
     * Big, quick, near the front of the water, and holding one line for a long
     * time. The bill is most of it, but the rest has to agree with the bill: an
     * animal built like that and pottering about would read as a drawing error.
     *
     * A long stride with real bursts in it, which is what a thunniform swimmer
     * does. It hardly bends: everything happens at the tail, so the pitch is held
     * shallow and the body reads as a rigid thing being driven.
     */
    swordfish: {
      bill: 1,
      deep: 0.72,
      girth: 1.85,
      hold: 3.2,
      nerve: 0.25,
      pace: 1.55,
      pitch: 0.55,
      stride: 1.5,
      verve: 0.45
    }
  };
  var WILD = {
    cruiser: 5,
    darter: 4,
    drifter: 1,
    escort: 2,
    swordfish: 1
  };
  function felt(depth, startle) {
    return startle.depth == null ? 1 : abreast(depth, startle.depth);
  }
  var MIN_SHOAL = 1;
  var FILL_EVERY = 2.5;
  var FIELD_CELLS = 3.6;
  var DRIFT = 0.06;
  var CRUISE = 1.05;
  var STRIDE = 0.7;
  var DART = 3.4;
  var WARY = 0.9;
  var WARY_REACH = 6;
  var TURN = 0.85;
  var TURN_STARTLED = 3.4;
  var HASTE = 2.2;
  var MAX_PITCH = 0.6;
  var EDGE_REACH = 0.18;
  var EDGE_PUSH = 0.9;
  var SWEEP = 1.1;
  var HOMING = 0.34;
  var HOLD_LEAST = 1.6;
  var HOLD_SPAN = 6.5;
  var BEND = 0.85;
  var WOBBLE = 0.18;
  var MARGIN = 0.8;
  var JOIN_REACH = 5;
  var NEIGHBOUR_REACH = 70;
  var NEIGHBOUR_PUSH = 0.8;
  var FLEE_REACH = 340;
  var FLEE_PUSH = 3.6;
  var PANIC = 0.62;
  var LOOK_DELAY = 1.1;
  var LOOK_REACH = 320;
  var LOOK_PUSH = 2.2;
  var LEAN_PUSH = 0.5;
  var LOOK_SPAN = 13;
  var LOOK_REST = 5;
  var STANDOFF = 70;
  var HOVER = 0.45;
  var LOSE_INTEREST = 1.8;
  var DEPTH_SWING = 0.46;
  var DEPTH_DRIFT = 0.035;
  var DEPTH_NEAR = 1;
  var DEPTH_FAR = 0.06;
  var DEPTH_EASE = 0.5;
  var DEPTH_DIVE = 1.4;
  var DIVE = 0.35;
  var RISE = 0.94;
  var DEPTH_SIZE = 0.6;
  var SURGE = 0.26;
  var SPURT_SLOWEST = 0.9;
  var SPURT_FASTEST = 1.9;
  var SPURT_SHARE = 0.32;
  var SPURT_PUSH = 2.4;
  var SPURT_COAST = 0.22;
  var STATION_BACK = 1.3;
  var STATION_SIDE = 0.55;
  var STATION_PUSH = 1.6;
  var STATION_CATCH = 0.55;
  var STATION_SLOWEST = 0.35;
  var STATION_BRISKEST = 2.1;
  var SLOWEST = 0.45;
  var FASTEST = 1.9;
  var LEISURE = 2;
  var SHORTEST = 34;
  var LONGEST = 58;
  function daySeed(now = /* @__PURE__ */ new Date(), from = 0) {
    const day = now.getFullYear() * 1e4 + (now.getMonth() + 1) * 100 + now.getDate();
    return stir(day ^ from) | 0;
  }
  function createShoal(options) {
    const noise = makeNoise2(options.seed);
    const depths = makeNoise2(options.seed ^ 40503);
    const random = makeRandom(options.seed ^ 24381);
    let width = Math.max(1, options.width);
    let height = Math.max(1, options.height);
    let drift2 = 0;
    let sank = 0;
    let still = 0;
    let attentive = null;
    let visit = 0;
    let rest = 0;
    let last = null;
    const cruise = options.cruise ?? CRUISE;
    const shortest = options.shortest ?? SHORTEST;
    const longest = options.longest ?? LONGEST;
    const mix2 = weigh(options.species);
    const born = () => spawn(random, draw(mix2, random), { cruise, height, longest, shortest, width });
    const fish = Array.from({ length: Math.max(MIN_SHOAL, options.count) }, born);
    pair(fish);
    let asked2 = fish.length;
    let filled = 0;
    function entering() {
      const made = born();
      made.x = made.facing > 0 ? -made.size * MARGIN : width + made.size * MARGIN;
      return made;
    }
    function drop(at2) {
      const going = fish[at2];
      if (!going) return;
      fish.splice(at2, 1);
      if (attentive === going) attentive = null;
      if (last === going) last = null;
      for (const one of fish) if (one.mate === going) one.mate = null;
    }
    function renew(at2) {
      const going = fish[at2];
      if (!going) return;
      const lead = going.mate;
      if (lead && fish.includes(lead)) {
        const x = lead.x - lead.facing * lead.size * STATION_BACK;
        if (gone(x, width, going.size)) {
          going.x = x;
          going.y = lead.y + lead.size * STATION_SIDE;
          return;
        }
      }
      fish[at2] = entering();
      if (attentive === going) attentive = null;
      if (last === going) last = null;
      for (const one of fish) if (one.mate === going) one.mate = null;
    }
    return {
      get attentive() {
        return attentive;
      },
      fish,
      hold(count) {
        asked2 = Math.max(MIN_SHOAL, Math.round(count));
      },
      resize(nextWidth, nextHeight, count) {
        const scaleX = Math.max(1, nextWidth) / width;
        const scaleY = Math.max(1, nextHeight) / height;
        width = Math.max(1, nextWidth);
        height = Math.max(1, nextHeight);
        for (const one of fish) {
          one.x *= scaleX;
          one.y *= scaleY;
        }
        if (count == null) return;
        asked2 = Math.max(MIN_SHOAL, Math.round(count));
        while (fish.length > count && fish.length > MIN_SHOAL) {
          const going = fish.at(-1);
          if (going === attentive) attentive = null;
          for (const one of fish) if (one.mate === going) one.mate = null;
          fish.pop();
        }
        while (fish.length < count) fish.push(born());
        pair(fish);
      },
      step(seconds, pointer, startle = null) {
        const dt = Math.min(Math.max(seconds, 0), 0.1);
        const water = options.about?.() ?? [];
        drift2 += DRIFT * dt;
        sank += DEPTH_DRIFT * dt;
        still = pointer && !pointer.moving ? still + dt : 0;
        const looking = still > LOOK_DELAY;
        const fleeing = pointer?.moving === true;
        if (!looking || !pointer) {
          attentive = null;
          last = null;
          rest = 0;
          visit = 0;
        } else if (attentive) {
          visit += dt;
          const strayed = away(attentive, pointer) > LOOK_REACH * LOSE_INTEREST || away(attentive, pointer) > STANDOFF && !ahead(attentive, pointer);
          if (visit > LOOK_SPAN || strayed) {
            last = attentive;
            attentive = null;
            visit = 0;
            rest = LOOK_REST;
          }
        } else if (rest > 0) {
          rest -= dt;
        } else {
          attentive = nearest(fish, pointer, LOOK_REACH, last);
        }
        let arrived = false;
        for (let at2 = 0; at2 < fish.length; at2++) {
          const one = fish[at2];
          if (!one) continue;
          const sort = SPECIES[one.kind];
          one.hold -= dt;
          if (one.hold <= 0) decide(one, random, height, sort);
          one.lean = ease(one.lean, one.aim, BEND * dt);
          const startled = fleeing && pointer != null && away(one, pointer) < FLEE_REACH * PANIC || startle != null && startle.force * felt(one.depth, startle) > 0 && away(one, startle) < startle.reach * PANIC;
          const [wantX, wantY] = want(
            one,
            fish,
            noise,
            drift2,
            looking ? pointer : null,
            fleeing ? pointer : null,
            startle,
            one === attentive,
            width,
            height
          );
          one.heading = toward(
            one.heading,
            steady(one.facing, Math.atan2(wantY, wantX), MAX_PITCH * sort.pitch),
            startled ? AGILITY_BOLT : AGILITY,
            startled ? TURN_STARTLED : TURN,
            dt
          );
          one.tilt = drawnTilt(one.heading, one.facing);
          const ambient = one.mate ? one.mate.depth : clamp(sort.deep + DEPTH_SWING * depths(one.lane, sank), DEPTH_FAR, DEPTH_NEAR);
          const wanted = startled ? ambient * DIVE : one === attentive ? RISE : ambient;
          one.depth = ease(one.depth, wanted, (startled ? DEPTH_DIVE : DEPTH_EASE) * dt);
          one.size = one.length * (1 - DEPTH_SIZE + DEPTH_SIZE * one.depth);
          const hovering = one === attentive && pointer && away(one, pointer) < STANDOFF;
          const gear = burst(one, sort, dt);
          const own = cruise * one.pace * one.size * gear;
          const quick = 1 + wary(one, water) * sort.nerve * WARY;
          const wants = station(one, own) * quick * (startled ? DART : hovering ? HOVER : 1);
          one.speed = ease(one.speed, wants, HASTE * dt);
          one.tail += 2 * Math.PI * one.speed / (STRIDE * sort.stride * one.size) * dt;
          const stroke = one.speed * (1 + SURGE * Math.cos(2 * one.tail));
          one.x += Math.cos(one.heading) * stroke * dt;
          one.y = clamp(one.y + Math.sin(one.heading) * stroke * dt, -EDGE_HOLD, height + EDGE_HOLD);
          if (gone(one.x, width, one.size)) {
            if (fish.length > asked2 && fish.length > MIN_SHOAL) drop(at2);
            else renew(at2);
            arrived = true;
          }
        }
        filled += dt;
        if (fish.length < asked2 && filled >= FILL_EVERY) {
          filled = 0;
          fish.push(entering());
          arrived = true;
        }
        if (arrived) pair(fish, JOIN_REACH, false);
      }
    };
  }
  function want(one, shoal2, noise, drift2, looking, fleeing, startle, attentive, width, height) {
    const scale = FIELD_CELLS / width;
    const nx = one.x * scale + drift2 * 0.3;
    const ny = one.y * scale + drift2;
    const pitched = one.lean + noise(nx + one.lane, ny + one.lane) * WOBBLE;
    let x = one.facing * Math.cos(pitched);
    let y = Math.sin(pitched);
    const reach2 = height * EDGE_REACH;
    y += edge(one.y, reach2) - edge(height - one.y, reach2);
    if (one.mate) {
      const spot = {
        moving: false,
        x: one.mate.x - one.mate.facing * one.mate.size * STATION_BACK,
        y: one.mate.y + one.mate.size * STATION_SIDE
      };
      const [awayX, awayY, distance] = separation(one, spot);
      x -= awayX / Math.max(distance, 0.5) * STATION_PUSH;
      y -= awayY / Math.max(distance, 0.5) * STATION_PUSH;
    }
    for (const other of shoal2) {
      if (other === one || other === one.mate || other.mate === one) continue;
      const [awayX, awayY, distance] = separation(one, other);
      if (distance >= NEIGHBOUR_REACH) continue;
      const t = 1 - distance / NEIGHBOUR_REACH;
      const push = t * t * (3 - 2 * t) * NEIGHBOUR_PUSH / Math.max(distance, 0.5);
      x += awayX * push;
      y += awayY * push;
    }
    if (fleeing) {
      const [awayX, awayY, distance] = separation(one, fleeing);
      if (distance < FLEE_REACH) {
        const push = (FLEE_REACH - distance) / FLEE_REACH * FLEE_PUSH / Math.max(distance, 0.5);
        x += awayX * push;
        y += awayY * push;
      }
    }
    const force = startle ? startle.force * felt(one.depth, startle) : 0;
    if (startle && force > 0) {
      const [awayX, awayY, distance] = separation(one, startle);
      if (distance < startle.reach) {
        const fall = (startle.reach - distance) / startle.reach;
        const push = fall * FLEE_PUSH * force / Math.max(distance, 0.5);
        x += awayX * push;
        y += awayY * push;
      }
    }
    if (looking) {
      const [awayX, awayY, distance] = separation(one, looking);
      const push = attentive ? LOOK_PUSH : distance < LOOK_REACH ? LEAN_PUSH : 0;
      if (push > 0) {
        x -= awayX / Math.max(distance, 0.5) * push;
        y -= awayY / Math.max(distance, 0.5) * push;
      }
    }
    return [x, y];
  }
  function weigh(shares) {
    const wanted = shares ?? { cruiser: 1 };
    const run = [];
    let total = 0;
    for (const kind of ["cruiser", "darter", "drifter", "escort", "swordfish"]) {
      const share = Math.max(0, wanted[kind] ?? 0);
      if (share <= 0) continue;
      total += share;
      run.push([kind, total]);
    }
    if (run.length === 0) return [["cruiser", 1]];
    return run.map(([kind, upto]) => [kind, upto / total]);
  }
  function draw(mix2, random) {
    if (mix2.length <= 1) return mix2[0]?.[0] ?? "cruiser";
    const roll = random();
    return mix2.find(([, upto]) => roll < upto)?.[0] ?? mix2[mix2.length - 1][0];
  }
  function pair(shoal2, reach2 = Number.POSITIVE_INFINITY, place = true) {
    const spare = shoal2.filter((one) => one.kind === "escort" && !one.mate);
    for (const one of spare) {
      if (one.mate) continue;
      const led = shoal2.some((other) => other.mate === one);
      if (led) continue;
      const leader = spare.find(
        (other) => other !== one && !other.mate && other.facing === one.facing && // Ahead of it, in its own direction of travel. A leader astern is a
        // follower that has to hold back for the rest of the crossing, and the
        // station rule will not let it slow down that far.
        (other.x - one.x) * one.facing > 0 && Math.hypot(other.x - one.x, other.y - one.y) < one.size * reach2
      );
      if (!leader) continue;
      if (shoal2.some((other) => other.mate === leader)) continue;
      one.mate = leader;
      if (!place) continue;
      one.x = leader.x - leader.facing * leader.size * STATION_BACK;
      one.y = leader.y + leader.size * STATION_SIDE;
    }
  }
  function burst(one, sort, dt) {
    if (sort.verve <= 0) return 1;
    const rate = SPURT_SLOWEST + one.lane % 1 * (SPURT_FASTEST - SPURT_SLOWEST);
    one.spurt += dt * rate;
    if (one.spurt >= 1) one.spurt -= 1;
    const gear = one.spurt < SPURT_SHARE ? SPURT_PUSH : SPURT_COAST;
    return 1 + (gear - 1) * sort.verve;
  }
  function station(one, own) {
    if (!one.mate) return own;
    const behind = (one.mate.x - one.x) * one.facing;
    const slip = (behind - one.mate.size * STATION_BACK) / Math.max(one.mate.size, 1);
    return one.mate.speed * clamp(1 + slip * STATION_CATCH, STATION_SLOWEST, STATION_BRISKEST);
  }
  function spawn(random, kind, box2) {
    const sort = SPECIES[kind];
    const facing = random() < 0.5 ? -1 : 1;
    const aim = (random() - 0.5) * SWEEP * sort.pitch;
    const depth = DEPTH_FAR + random() * (DEPTH_NEAR - DEPTH_FAR);
    const length = (box2.shortest + random() * (box2.longest - box2.shortest)) * sort.girth;
    const pace = (SLOWEST + random() ** LEISURE * (FASTEST - SLOWEST)) * sort.pace;
    const size = length * (1 - DEPTH_SIZE + DEPTH_SIZE * depth);
    return {
      aim,
      depth,
      facing,
      heading: steady(facing, aim, MAX_PITCH * sort.pitch),
      hold: random() * (HOLD_LEAST + HOLD_SPAN) * sort.hold,
      kind,
      lane: random() * 200,
      lean: aim,
      length,
      mate: null,
      pace,
      size,
      speed: box2.cruise * pace * size,
      // Only a kind that bursts spends a draw on where in the burst it starts,
      // for the reason `draw` gives: a shoal that asked for none of this has to
      // come out of the seeded stream exactly as it did before there was any.
      spurt: sort.verve > 0 ? random() : 0,
      tail: random() * Math.PI * 2,
      tilt: drawnTilt(steady(facing, aim, MAX_PITCH * sort.pitch), facing),
      x: random() * box2.width,
      y: random() * box2.height
    };
  }
  function nearest(shoal2, to, reach2, over2) {
    let closest = null;
    let best = reach2;
    let spare = null;
    for (const one of shoal2) {
      const distance = away(one, to);
      if (distance >= best || !ahead(one, to)) continue;
      if (one === over2) {
        spare = one;
        continue;
      }
      best = distance;
      closest = one;
    }
    return closest ?? spare;
  }
  function ahead(one, to) {
    return (to.x - one.x) * Math.cos(one.heading) + (to.y - one.y) * Math.sin(one.heading) > 0;
  }
  var away = (one, to) => Math.hypot(one.x - to.x, one.y - to.y);
  function separation(one, to) {
    const x = one.x - to.x;
    const y = one.y - to.y;
    return [x, y, Math.hypot(x, y)];
  }
  function wary(one, water) {
    let worst = 0;
    for (const thing of water) {
      const menace = thing.menace ?? 0;
      if (menace <= 0) continue;
      const reach2 = thing.size * WARY_REACH;
      const distance = Math.hypot(one.x - thing.x, one.y - thing.y);
      if (distance >= reach2) continue;
      worst = Math.max(worst, (1 - distance / reach2) * menace * abreast(one.depth, thing.depth));
    }
    return worst;
  }
  function decide(one, random, height, sort) {
    const roll = random() * 2 - 1;
    const homing = -((one.y / Math.max(height, 1) - 0.5) * 2) * HOMING;
    const most = MAX_PITCH * sort.pitch;
    one.aim = clamp(homing + roll * Math.abs(roll) * SWEEP * sort.pitch, -most, most);
    one.hold = (HOLD_LEAST + random() * HOLD_SPAN) * sort.hold;
  }
  function toward(from, to, gain, most, dt) {
    let by = (to - from) % (Math.PI * 2);
    if (by > Math.PI) by -= Math.PI * 2;
    if (by < -Math.PI) by += Math.PI * 2;
    const rate = Math.max(-most, Math.min(most, by * gain));
    return from + rate * dt;
  }
  var AGILITY = 1.5;
  var AGILITY_BOLT = 4.2;
  function drawnTilt(heading, facing) {
    return Math.asin(clamp(Math.sin(heading), -1, 1)) * facing;
  }
  function steady(facing, want2, pitch) {
    const asked2 = Math.atan2(Math.sin(want2), facing * Math.cos(want2));
    const rel = pitch * Math.tanh(asked2 / pitch);
    return facing > 0 ? rel : Math.PI - rel;
  }
  var ease = (from, to, rate) => from + (to - from) * Math.min(1, Math.max(0, rate));
  function edge(distance, reach2) {
    if (reach2 <= 0 || distance >= reach2) return 0;
    return (reach2 - distance) / reach2 * EDGE_PUSH;
  }
  var clamp = (value, low, high) => Math.min(Math.max(value, low), high);
  function gone(x, span, body) {
    const margin = body * MARGIN;
    return x > span + margin || x < -margin;
  }
  var EDGE_HOLD = 8;

  // ../../../codincodv2/assets/js/ornament/cephalopods.ts
  var CYCLE_SLOWEST = 3.4;
  var CYCLE_FASTEST = 6.8;
  var JET_SHARE = 0.16;
  var JET_PEAK = 4.2;
  var GLIDE = 0.07;
  var DRAG = 2.1;
  var SQUID_SHORTEST = 46;
  var SQUID_LONGEST = 78;
  var SQUID_PITCH = 0.42;
  var WANDER = 0.5;
  var RETHINK_LEAST = 2.5;
  var RETHINK_SPAN = 5;
  var ROOF = 0.72;
  var MARGIN2 = 1.1;
  var SHY_BAND = 2.4;
  var SHY_PULL = 1.4;
  var OCTOPUS_SMALLEST = 26;
  var OCTOPUS_LARGEST = 44;
  var DOINGS = {
    /** Into the sand and out of sight, which is its first answer to anything. */
    bury: { least: 7, share: 9.65, span: 13 },
    crawl: { least: 2.5, share: 41.29, span: 4.5 },
    /** Hunched over whatever it caught, arms knotted underneath it. */
    handle: { least: 3, share: 0.85, span: 4 },
    jet: { least: 1.2, share: 4.79, span: 0.8 },
    /** The parachute: arms opened into a bell and dropped over a stone. */
    pounce: { least: 0.9, share: 0.65, span: 0.6 },
    /** Body still, arms into the crevices without it. The one it lives on. */
    probe: { least: 3, share: 21.82, span: 6 },
    rest: { least: 5, share: 17.41, span: 11 },
    /** Walking on the back pair, with the rest coiled up over it. */
    stilt: { least: 1.5, share: 0.8, span: 2.5 }
  };
  var UNPROVOKED = 0.2;
  var BOLT = 0.45;
  var STILL = /* @__PURE__ */ new Set(["bury", "handle", "probe", "rest"]);
  var TURN_ODDS = 0.35;
  var CRAWL_REACH = 0.62;
  var CRAWL_RISE = 0.06;
  var GAIT = 0.55;
  var STILT_PACE = 0.48;
  var STILT_RISE = 0.42;
  var BURY_DEPTH = 0.62;
  var JET_RUSH = 1.6;
  var JET_HEIGHT = 2.2;
  var BREATH_CALM = 0.42;
  var BREATH_WORKED = 1.6;
  var TRAIL_HELD = 0.22;
  var TRAIL_DRIVEN = 1.15;
  var DEPTH_FAR2 = 0.15;
  var DEPTH_NEAR2 = 0.85;
  var DEPTH_SIZE2 = 0.6;
  var MIN_SPAN = 1;
  function createCephalopods(options) {
    const random = makeRandom(options.seed ^ 3184);
    let width = Math.max(MIN_SPAN, options.width);
    let height = Math.max(MIN_SPAN, options.height);
    let floor = options.floor;
    const squids = [];
    const octopuses = [];
    const beats = [];
    const bouts = [];
    function bornSquid() {
      const depth = DEPTH_FAR2 + random() * (DEPTH_NEAR2 - DEPTH_FAR2);
      const facing = random() < 0.5 ? -1 : 1;
      const length = SQUID_SHORTEST + random() * (SQUID_LONGEST - SQUID_SHORTEST);
      const aim = (random() - 0.5) * WANDER;
      const x = random() * width;
      const size = length * (1 - DEPTH_SIZE2 + DEPTH_SIZE2 * depth);
      const top = size * MARGIN2;
      const bed = Math.max(top, Math.min(floor(x) - size * 0.4, height * ROOF));
      beats.push({
        aim,
        at: random() * CYCLE_SLOWEST,
        hold: RETHINK_LEAST + random() * RETHINK_SPAN,
        span: CYCLE_SLOWEST + random() * (CYCLE_FASTEST - CYCLE_SLOWEST)
      });
      return {
        depth,
        facing,
        heading: point(facing, aim),
        size,
        speed: 0,
        squeeze: 0,
        tilt: drawnTilt(point(facing, aim), facing),
        x,
        y: top + random() * (bed - top)
      };
    }
    function span(doing) {
      const row = DOINGS[doing];
      return row.least + random() * row.span;
    }
    function take(one, bout, doing) {
      if (STILL.has(one.doing) && random() < TURN_ODDS) one.facing = -one.facing;
      one.doing = doing;
      bout.at = 0;
      bout.span = span(doing);
    }
    function bornOctopus() {
      const depth = DEPTH_FAR2 + random() * (DEPTH_NEAR2 - DEPTH_FAR2);
      const doing = pick(random);
      const head = OCTOPUS_SMALLEST + random() * (OCTOPUS_LARGEST - OCTOPUS_SMALLEST);
      const run = span(doing);
      const x = random() * width;
      bouts.push({ at: random() * run, puff: random(), span: run });
      return {
        breath: 0,
        crawl: random() * Math.PI * 2,
        depth,
        doing,
        facing: random() < 0.5 ? -1 : 1,
        haul: 0,
        lift: 0,
        reach: 1,
        size: head * (1 - DEPTH_SIZE2 + DEPTH_SIZE2 * depth),
        x,
        y: floor(x)
      };
    }
    function stock() {
      squids.length = 0;
      octopuses.length = 0;
      beats.length = 0;
      bouts.length = 0;
      for (let made = 0; made < Math.max(0, options.squids ?? 0); made++) squids.push(bornSquid());
      for (let made = 0; made < Math.max(0, options.octopuses ?? 0); made++) {
        octopuses.push(bornOctopus());
      }
    }
    stock();
    return {
      octopuses,
      resize(nextWidth, nextHeight, nextFloor) {
        const scaleX = Math.max(MIN_SPAN, nextWidth) / width;
        const scaleY = Math.max(MIN_SPAN, nextHeight) / height;
        width = Math.max(MIN_SPAN, nextWidth);
        height = Math.max(MIN_SPAN, nextHeight);
        floor = nextFloor;
        for (const one of squids) {
          one.x *= scaleX;
          one.y *= scaleY;
        }
        for (const one of octopuses) {
          one.x *= scaleX;
          one.y = floor(one.x) - one.lift * one.size;
        }
      },
      squids,
      step(seconds, startle) {
        const dt = Math.min(Math.max(seconds, 0), 0.1);
        for (let at2 = 0; at2 < squids.length; at2++) {
          const one = squids[at2];
          const beat = beats[at2];
          if (!one || !beat) continue;
          beat.at += dt;
          if (beat.at >= beat.span) {
            beat.at -= beat.span;
            beat.span = CYCLE_SLOWEST + random() * (CYCLE_FASTEST - CYCLE_SLOWEST);
          }
          const through = beat.at / beat.span;
          one.squeeze = through < JET_SHARE ? Math.sin(through / JET_SHARE * Math.PI) : 0;
          const push = one.squeeze * JET_PEAK * one.size;
          const glide = GLIDE * JET_PEAK * one.size;
          one.speed = push > one.speed ? push : glide + (one.speed - glide) * Math.max(0, 1 - DRAG * dt);
          beat.hold -= dt;
          if (beat.hold <= 0) {
            beat.aim = (random() - 0.5) * WANDER;
            beat.hold = RETHINK_LEAST + random() * RETHINK_SPAN;
          }
          const edge2 = one.size * MARGIN2;
          const bed = floor(one.x) - one.size * 0.4;
          one.heading = ease2(
            one.heading,
            point(one.facing, beat.aim + shy(one.y, edge2, bed, one.size)),
            TURN2 * dt
          );
          one.tilt = drawnTilt(one.heading, one.facing);
          one.x += Math.cos(one.heading) * one.speed * dt;
          one.y += Math.sin(one.heading) * one.speed * dt;
          if (one.x > width + edge2) one.x = -edge2;
          if (one.x < -edge2) one.x = width + edge2;
          one.y = Math.min(Math.max(one.y, edge2), bed);
        }
        for (let at2 = 0; at2 < octopuses.length; at2++) {
          const one = octopuses[at2];
          const bout = bouts[at2];
          if (!one || !bout) continue;
          bout.puff = (bout.puff + (BREATH_CALM + one.haul * BREATH_WORKED) * dt) % 1;
          one.breath = (1 - Math.cos(bout.puff * Math.PI * 2)) / 2;
          const felt3 = pressure(startle, one);
          if (felt3 > BOLT) {
            if (one.doing !== "jet") take(one, bout, "jet");
          } else if (felt3 > 0 && one.doing !== "jet" && one.doing !== "bury") {
            take(one, bout, "bury");
          }
          bout.at += dt;
          if (bout.at >= bout.span) take(one, bout, pick(random));
          const through = Math.min(1, bout.at / bout.span);
          advance(one, through, dt);
          const edge2 = one.size * MARGIN2;
          if (one.x > width + edge2) one.x = -edge2;
          if (one.x < -edge2) one.x = width + edge2;
          one.y = floor(one.x) - one.lift * one.size;
        }
      }
    };
  }
  var ODDS = weigh2();
  function weigh2() {
    const rungs = [];
    let total = 0;
    for (const doing of Object.keys(DOINGS).sort()) {
      const row = DOINGS[doing];
      const share = doing === "jet" ? row.share * UNPROVOKED : row.share;
      total += share / (row.least + row.span / 2);
      rungs.push({ doing, upto: total });
    }
    for (const rung of rungs) rung.upto /= total;
    return rungs;
  }
  function pick(random) {
    const roll = random();
    for (const rung of ODDS) if (roll <= rung.upto) return rung.doing;
    return "crawl";
  }
  function pressure(startle, one) {
    if (!startle || startle.force <= 0 || startle.reach <= 0) return 0;
    const gap = Math.hypot(one.x - startle.x, one.y - startle.y);
    if (gap >= startle.reach) return 0;
    return startle.force * (1 - gap / startle.reach) * felt(one.depth, startle);
  }
  function advance(one, through, dt) {
    switch (one.doing) {
      case "bury": {
        const under = Math.min(1, Math.min(through, 1 - through) * 6);
        one.haul = 0;
        one.lift = -BURY_DEPTH * under;
        one.reach = 1 - under * 0.55;
        break;
      }
      case "crawl": {
        one.crawl += GAIT * dt * Math.PI * 2;
        one.haul = Math.max(0, Math.sin(one.crawl)) ** 1.4;
        one.lift = one.haul * CRAWL_RISE;
        one.reach = 1;
        one.x += one.facing * CRAWL_REACH * one.haul * one.size * dt;
        break;
      }
      case "handle": {
        one.crawl += GAIT * 0.6 * dt * Math.PI * 2;
        one.haul = 0;
        one.lift = 0;
        one.reach = 0.5 + Math.sin(one.crawl) * 0.08;
        break;
      }
      case "jet": {
        one.haul = Math.sin(through * Math.PI) ** 0.6;
        one.lift = Math.sin(through * Math.PI) * JET_HEIGHT;
        one.reach = 1;
        one.x += one.facing * JET_RUSH * one.size * one.haul * dt;
        break;
      }
      case "pounce": {
        one.crawl += GAIT * dt * Math.PI * 2;
        one.haul = 0;
        one.lift = Math.sin(Math.min(1, through * 1.6) * Math.PI) * 0.3;
        one.reach = through < 0.55 ? 0.5 + Math.min(1, through * 2.2) * 0.6 : Math.max(0.25, 1.1 - (through - 0.55) * 6);
        break;
      }
      case "probe": {
        one.crawl += GAIT * 0.45 * dt * Math.PI * 2;
        one.haul = 0;
        one.lift = 0;
        one.reach = 0.72 + Math.sin(one.crawl * 0.6) * 0.28;
        break;
      }
      case "rest": {
        one.crawl += GAIT * 0.2 * dt * Math.PI * 2;
        one.haul = 0;
        one.lift = 0;
        one.reach = 0.45 + Math.sin(one.crawl) * 0.05;
        break;
      }
      case "stilt": {
        one.crawl += GAIT * 1.7 * dt * Math.PI * 2;
        const up = Math.min(1, Math.min(through, 1 - through) * 5);
        one.haul = 0.25;
        one.lift = STILT_RISE * up;
        one.reach = 1;
        one.x += one.facing * STILT_PACE * one.size * up * dt;
        break;
      }
    }
  }
  function shy(y, top, bed, size) {
    const band = Math.max(1, Math.min(size * SHY_BAND, (bed - top) * 0.4));
    const under = Math.max(0, top + band - y);
    const over2 = Math.max(0, y - (bed - band));
    return (under - over2) / band * SHY_PULL;
  }
  var TURN2 = 0.9;
  function ease2(from, to, step2) {
    const gap = to - from;
    return Math.abs(gap) <= step2 ? to : from + Math.sign(gap) * step2;
  }
  function point(facing, want2) {
    const asked2 = Math.atan2(Math.sin(want2), facing * Math.cos(want2));
    const rel = SQUID_PITCH * Math.tanh(asked2 / SQUID_PITCH);
    return facing > 0 ? rel : Math.PI - rel;
  }
  function squidBody(squeeze) {
    const fat = 0.19 - squeeze * 0.07;
    const long = 0.62 + squeeze * 0.1;
    const fin2 = 0.2 - squeeze * 0.05;
    return [
      `M${long.toFixed(3)} 0`,
      `Q${(long * 0.55).toFixed(3)} ${(-fat).toFixed(3)} 0 ${(-fat * 0.72).toFixed(3)}`,
      `L0 ${(fat * 0.72).toFixed(3)}`,
      `Q${(long * 0.55).toFixed(3)} ${fat.toFixed(3)} ${long.toFixed(3)} 0`,
      "Z",
      // The fins, one either side, back where the mantle is widest.
      `M${(long * 0.52).toFixed(3)} ${(-fat * 0.86).toFixed(3)}`,
      `Q${(long * 0.86).toFixed(3)} ${(-fat - fin2).toFixed(3)} ${(long * 0.97).toFixed(3)} ${(-fat * 0.2).toFixed(3)}`,
      "Z",
      `M${(long * 0.52).toFixed(3)} ${(fat * 0.86).toFixed(3)}`,
      `Q${(long * 0.86).toFixed(3)} ${(fat + fin2).toFixed(3)} ${(long * 0.97).toFixed(3)} ${(fat * 0.2).toFixed(3)}`,
      "Z"
    ].join(" ");
  }
  function squidArms(squeeze, count = 8) {
    const arms = [];
    const spread2 = (1 - squeeze) * 0.44 + 0.2;
    for (let made = 0; made < count; made++) {
      const side = made / (count - 1) - 0.5;
      const lean = side * spread2;
      const reach2 = 0.34 + Math.abs(side) * 0.16;
      const points = [];
      for (let step2 = 0; step2 <= 5; step2++) {
        const t = step2 / 5;
        points.push({
          x: -t * reach2,
          y: lean * t * (0.5 + t) + Math.sin(t * 2.6 + side * 5) * 0.03 * (1 - squeeze) * t
        });
      }
      arms.push(points);
    }
    return arms;
  }
  function octopusHead(breath) {
    const full = Math.min(Math.max(breath, 0), 1);
    const wide = 1 + full * 0.08;
    const tall = 1 - full * 0.05;
    const w = (at2) => (at2 * wide).toFixed(3);
    const h = (at2) => (at2 * tall).toFixed(3);
    return [
      `M${w(-0.3)} ${h(0.14)}`,
      `Q${w(-0.5)} ${h(-0.06)} ${w(-0.44)} ${h(-0.4)}`,
      `Q${w(-0.36)} ${h(-0.78)} 0 ${h(-0.8)}`,
      `Q${w(0.36)} ${h(-0.78)} ${w(0.44)} ${h(-0.4)}`,
      `Q${w(0.5)} ${h(-0.06)} ${w(0.3)} ${h(0.14)}`,
      "Z"
    ].join(" ");
  }
  var OCTOPUS_HEAD = octopusHead(0);
  var POSTURES = {
    bury: { curl: 0.05, drop: 0.08, fan: 3.4, lead: 0, reach: 0.75, work: 0.12 },
    crawl: { curl: 0, drop: 0.34, fan: 2.5, lead: 0.25, reach: 1, work: 1 },
    handle: { curl: 0.32, drop: 0.26, fan: 1.3, lead: 0, reach: 0.66, work: 0.4 },
    jet: { curl: 0, drop: 0.06, fan: 0.7, lead: 0, reach: 1.1, work: 0.15 },
    pounce: { curl: 0, drop: 0.1, fan: 3.2, lead: 0, reach: 1, work: 0.25 },
    probe: { curl: 0.22, drop: 0.3, fan: 2.6, lead: 1, reach: 1, work: 0.7 },
    rest: { curl: 0.3, drop: 0.3, fan: 1.9, lead: 0, reach: 0.68, work: 0.25 },
    stilt: { curl: 0.62, drop: 0.55, fan: 1.5, lead: -1.6, reach: 0.95, work: 0.9 }
  };
  function octopusArms(pose, count = 8) {
    const arms = [];
    const drive = Math.min(Math.max(pose.haul, 0), 1);
    const held2 = POSTURES[pose.doing] ?? POSTURES.crawl;
    const open2 = Math.min(Math.max(pose.reach, 0), 1.2);
    for (let made = 0; made < count; made++) {
      const side = made / (count - 1) - 0.5;
      const phase2 = pose.crawl + (side > 0 ? 0 : Math.PI) + made * 0.12;
      const work = Math.sin(phase2) * held2.work;
      const ahead2 = Math.sign(side * pose.facing) || 1;
      const grown = held2.reach * open2 * (1 + ahead2 * held2.lead * 0.35);
      const reach2 = grown * (0.9 + Math.abs(side) * 0.5) * (0.88 + work * 0.12);
      const curl = held2.curl * (1 - ahead2 * held2.lead * 0.8);
      const stream = -pose.facing * (TRAIL_HELD + drive * TRAIL_DRIVEN);
      const fan = held2.fan * (1 - drive * 0.62) * open2;
      const points = [];
      for (let step2 = 0; step2 <= 6; step2++) {
        const t = step2 / 6;
        const along2 = side * fan * reach2 * t;
        const wave2 = Math.sin(phase2 + t * 2.2) * 0.14 * t * (1 - t) * 4 * held2.work;
        points.push({
          x: along2 + stream * t * reach2 - ahead2 * curl * t * t * 0.28,
          y: (t * t * held2.drop + t * 0.1) * (1 - drive * 0.7) - wave2 * 0.22 - curl * t * t * 0.5
        });
      }
      arms.push(points);
    }
    return arms;
  }

  // ../../../codincodv2/assets/js/ornament/flora.ts
  var gatherings = [];
  function gathered(twigs) {
    for (const held2 of gatherings) {
      if (held2.drawn === twigs) return held2.gathered;
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
  var FIELD_CELLS2 = 3.6;
  var DRIFT2 = 0.06;
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
  function cuts(most, drawn2) {
    return Math.max(FEWEST_STEPS, Math.min(most, Math.round(drawn2 / STEP_SPAN)));
  }
  function crowded(most, fewest, drawn2, roomy) {
    const room = Math.min(1, Math.max(0, drawn2 / roomy));
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
  var DEPTH_FAR3 = 0.12;
  var DEPTH_NEAR3 = 1;
  var PLANT_SHRINK = 0.78;
  var shrunk = (depth) => 1 - PLANT_SHRINK + PLANT_SHRINK * depth;
  var CROWN_BACK = 1.7;
  var MIN_SPAN2 = 1;
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
  var SWEEP2 = {
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
  function feeler(x, y, span, open2, phase2, steps) {
    const points = [{ x, y }];
    const pace = span / steps;
    let atX = x;
    let atY = y;
    for (let step2 = 1; step2 <= steps; step2++) {
      const u = step2 / steps;
      const heading = open2 * (1 + CROWN_CURL * u) + Math.sin(phase2 + u * CROWN_WAVES) * CROWN_WAVE * u;
      atX += pace * Math.sin(heading);
      atY -= pace * Math.cos(heading);
      points.push({ x: atX, y: atY });
    }
    return points;
  }
  function crown(seed, drawn2) {
    const random = makeRandom(seed);
    const most = CROWN_LEAST + Math.floor(random() * (CROWN_MOST - CROWN_LEAST + 1));
    const count = crowded(most, CROWN_FEWEST, drawn2, CROWN_CROWDED);
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
        steps: cuts(CROWN_STEPS, span * drawn2)
      });
    }
    return tentacles;
  }
  function crownSwept(span, turned) {
    return span * SWEEP2.anemone * turned;
  }
  function crownAt(mouth, tentacles, span, phase2) {
    return tentacles.map(
      (one) => feeler(
        mouth.x + one.shift * span,
        mouth.y,
        one.span * span,
        one.slant,
        phase2 * one.beat + one.own,
        one.steps
      )
    );
  }
  function createFlora(options) {
    const noise = makeNoise2(options.seed ^ 20240);
    const random = makeRandom(options.seed ^ 27452);
    let width = Math.max(MIN_SPAN2, options.width);
    let height = Math.max(MIN_SPAN2, options.height);
    let floor = options.floor;
    let drift2 = 0;
    const plants = [];
    const sways = [];
    const tolerance = Math.max(0, options.tolerance ?? TOLERANCE);
    const cutting = new Set(options.cutting ?? ["anemone", "coral", "fan", "grass", "kelp"]);
    const drawn2 = [];
    const frames = [];
    const swinging = [];
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
        drawn2.push(null);
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
      drawn2.push(null);
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
          depth: DEPTH_FAR3 + random() ** CROWN_BACK * (DEPTH_NEAR3 - DEPTH_FAR3),
          x: random() * width
        };
      }
      return kind === "grass" ? sprig() : anywhere();
    }
    function anywhere() {
      return { depth: DEPTH_FAR3 + random() * (DEPTH_NEAR3 - DEPTH_FAR3), x: random() * width };
    }
    function sprig() {
      const bed = beds[Math.floor(random() * beds.length)];
      if (!bed || random() < MEADOW_STRAY) return anywhere();
      const depth = bed.depth + (random() + random() - 1) * MEADOW_DEEP;
      return {
        depth: Math.min(DEPTH_NEAR3, Math.max(DEPTH_FAR3, depth)),
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
      drawn2.length = 0;
      frames.length = 0;
      swinging.length = 0;
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
    function bend2(at3, field) {
      const one = plants[at3];
      const sway = sways[at3];
      const span = heights.get(at3);
      if (!one || !sway || span == null || one.kind === "coral") return;
      const current = field(one.x / width * FIELD_CELLS2 + drift2, drift2);
      const own = Math.sin(sway.own);
      const amp = sway.lean * (current * CURRENT_SHARE + own * (1 - CURRENT_SHARE));
      const swing = swinging[at3];
      if (swing) {
        swing.amp = amp;
        swing.own = sway.own;
      } else {
        swinging[at3] = { amp, own: sway.own };
      }
      if (!cutting.has(one.kind)) return;
      const shy2 = one.kind === "anemone" ? 1 - sway.fright * COLUMN_SQUAT : 1;
      const stem = span * STEMS[one.kind] * shy2;
      const was = drawn2[at3];
      if (was && stir2(one.kind, span, was, amp, sway.fright, sway.own, stem) < tolerance) return;
      drawn2[at3] = { amp, fright: sway.fright, own: sway.own, stem };
      one.cut++;
      if (one.kind === "anemone") {
        const points = strand(one.x, one.y, stem, sway.own, amp, 0, sway.steps);
        const mouth = points[points.length - 1];
        const out = span * (1 - sway.fright * CROWN_PULL);
        one.points = points;
        one.blades = mouth ? crownAt(mouth, sway.tentacles, out, sway.own) : [];
        return;
      }
      cutFrom(one, framed(at3), amp, sway.own);
    }
    function framed(at3) {
      const held2 = frames[at3];
      if (held2) return held2;
      const made = grown(at3);
      frames[at3] = made;
      return made;
    }
    const seated = (seat, steps) => Math.min(steps, Math.max(0, Math.round(seat * steps))) / steps;
    function grown(at3) {
      const one = plants[at3];
      const sway = sways[at3];
      const span = heights.get(at3);
      if (!one || !sway || span == null) return { leaves: [], limbs: [] };
      const limbs = [
        {
          beat: 1,
          give: 1,
          own: 0,
          seat: 0,
          shift: 0,
          slant: 0,
          span: span * STEMS[one.kind],
          steps: sway.steps,
          stem: -1
        }
      ];
      if (one.kind === "grass") {
        for (const mate of sway.mates) {
          limbs.push({
            beat: mate.beat,
            give: 1,
            own: mate.own,
            seat: 0,
            shift: mate.shift,
            slant: mate.slant,
            span: mate.span,
            steps: cuts(sway.steps, mate.span),
            stem: -1
          });
        }
        return { leaves: [], limbs };
      }
      if (one.kind === "fan") {
        for (const mate of sway.mates) {
          const rib = limbs.length;
          const steps = cuts(FAN_STEPS, mate.span);
          limbs.push({
            beat: mate.beat,
            give: RIB_GIVE,
            own: mate.own,
            seat: seated(mate.seat, sway.steps),
            shift: 0,
            slant: mate.slant,
            span: mate.span,
            steps,
            stem: 0
          });
          if (mate.span < RIB_TWIGGED) continue;
          limbs.push({
            beat: 1,
            give: RIB_GIVE,
            own: mate.own,
            seat: Math.floor((steps + 1) / 2) / steps,
            shift: 0,
            slant: mate.slant * RIB_SPLAY,
            span: mate.span * RIB_TWIG,
            steps: 2,
            stem: rib
          });
        }
        return { leaves: [], limbs };
      }
      const weed = sway.weed ?? FRILL;
      weed.forks.forEach((up, made) => {
        limbs.push({
          beat: 1,
          give: 1 - up,
          own: up * Math.PI,
          seat: seated(up, sway.steps),
          shift: 0,
          slant: (made % 2 === 0 ? 1 : -1) * FORK_SPLAY,
          span: span * (1 - up) * FORK_REACH,
          steps: Math.max(FEWEST_STEPS, Math.round(sway.steps * (1 - up))),
          stem: 0
        });
      });
      return { leaves: leafage(weed, limbs, span), limbs };
    }
    function leafage(weed, limbs, span) {
      const leaves = [];
      const leafy = crowded(weed.blades, LEAF_FEWEST, span, LEAF_CROWDED);
      const each = Math.max(1, Math.round(leafy / limbs.length));
      const bends = cuts(BLADE_STEPS, span * weed.span);
      limbs.forEach((limb, on) => {
        for (let made = 0; made < each; made++) {
          const seat = weed.seat + made / each * (1 - weed.seat);
          const side = made % 2 === 0 ? 1 : -1;
          const long = limb.span * weed.span * (1 - weed.taper * seat);
          const shape = [];
          for (let step2 = 0; step2 <= bends; step2++) {
            const u = step2 / bends;
            const out = Math.sin(u * Math.PI * 0.62) * (1 - u * 0.72) * weed.flare;
            shape.push({ x: u * weed.trail * long, y: out * long * side });
          }
          leaves.push({ limb: on, seat: seated(seat, limb.steps), shape });
        }
      });
      return leaves;
    }
    function cutFrom(one, frame, amp, own) {
      const lines = [];
      for (const limb of frame.limbs) {
        const root = limb.stem < 0 ? { x: one.x + limb.shift, y: one.y } : at2(lines[limb.stem], limb.seat);
        lines.push(
          strand(
            root.x,
            root.y,
            limb.span,
            own * limb.beat + limb.own,
            amp * limb.give,
            limb.slant,
            limb.steps
          )
        );
      }
      const blades = lines.slice(1);
      for (const leaf of frame.leaves) {
        const line = lines[leaf.limb];
        if (!line) continue;
        const up = Math.round(leaf.seat * (line.length - 1));
        const on = line[Math.min(line.length - 1, up)];
        const under = line[Math.max(0, up - 1)];
        if (!on || !under) continue;
        const runX = on.x - under.x;
        const runY = on.y - under.y;
        const run = Math.hypot(runX, runY) || 1;
        const trailX = -runX / run;
        const trailY = -runY / run;
        const blade2 = [];
        for (const step2 of leaf.shape) {
          blade2.push({
            x: on.x + trailX * step2.x + trailY * step2.y,
            y: on.y + trailY * step2.x - trailX * step2.y
          });
        }
        blades.push(blade2);
      }
      one.points = lines[0] ?? [];
      one.blades = blades;
    }
    function at2(line, seat) {
      if (!line || line.length === 0) return { x: 0, y: 0 };
      const up = Math.round(seat * (line.length - 1));
      return line[Math.min(line.length - 1, Math.max(0, up))] ?? { x: 0, y: 0 };
    }
    function strand(x, y, span, phase2, amp, slant, steps) {
      const lean = Math.sin(slant);
      const rise = Math.cos(slant);
      const points = [];
      for (let step2 = 0; step2 <= steps; step2++) {
        const t = step2 / steps;
        points.push({
          x: x + span * t * lean + amp * Math.sin(phase2 + t * 2.4) * t,
          y: y - span * t * rise
        });
      }
      return points;
    }
    function scared(one, span, water) {
      let worst = 0;
      for (const thing of water) {
        if (thing.size < span * CROWN_MINDS) continue;
        const reach2 = thing.size * CROWN_NOTICE;
        const away2 = Math.hypot(one.x - thing.x, one.y - thing.y);
        if (away2 >= reach2) continue;
        worst = Math.max(worst, (1 - away2 / reach2) * abreast(one.depth, thing.depth));
      }
      return worst;
    }
    function carry(seconds, water) {
      drift2 += DRIFT2 * seconds;
      for (let at3 = 0; at3 < sways.length; at3++) {
        const sway = sways[at3];
        const one = plants[at3];
        if (!sway || !one) continue;
        const shy2 = one.kind === "anemone" ? scared(one, heights.get(at3) ?? 0, water) : 0;
        const fright = Math.max(0, Math.max(sway.fright - seconds / PULL_FADE, shy2));
        if (sway.rate > 0 || fright !== sway.fright) {
          sways[at3] = { ...sway, fright, own: sway.own + sway.rate * seconds };
        }
      }
    }
    function stir2(kind, span, was, amp, fright, own, stem) {
      const reach2 = Math.max(Math.abs(amp), Math.abs(was.amp));
      const turned = Math.abs(own - was.own);
      return (Math.abs(amp - was.amp) + reach2 * turned) * SWING[kind] + span * SWEEP2[kind] * turned + Math.abs(stem - was.stem) + Math.abs(fright - was.fright) * span * CROWN_PULL;
    }
    function recut() {
      for (let at3 = 0; at3 < plants.length; at3++) bend2(at3, noise);
    }
    function advance2(seconds) {
      carry(Math.min(Math.max(seconds, 0), 0.1), options.about?.() ?? []);
      recut();
    }
    sow();
    advance2(0);
    return {
      madeOf(at3) {
        const one = plants[at3];
        if (!one || one.kind === "coral" || one.kind === "anemone") return null;
        return framed(at3);
      },
      plants,
      resize(nextWidth, nextHeight, nextFloor) {
        width = Math.max(MIN_SPAN2, nextWidth);
        height = Math.max(MIN_SPAN2, nextHeight);
        floor = nextFloor;
        sow();
        advance2(0);
      },
      step: advance2,
      swinging,
      wind(seconds) {
        carry(Math.max(seconds, 0), []);
        recut();
      }
    };
  }

  // ../../../codincodv2/assets/js/ornament/crags.ts
  var FRAMINGS = {
    cave: 1,
    hills: 2,
    open: 6,
    shoulder: 3
  };
  var ISLE_ODDS = 0.22;
  var REACHES = {
    cave: 0.12,
    hills: 0.15,
    open: 0,
    shoulder: 0.12
  };
  var LEAN_MOST = Math.PI * 0.44;
  var HILL_PEAK = 1.22;
  var ROOF_DROP = 0.1;
  var OVERHANG = 40;
  var FACE_STEPS = 64;
  var ROUGH = 0.55;
  var ROUGH_CELLS = 3.4;
  var BITE = 0.18;
  var BITE_CELLS = 11;
  var LEDGE = 0.26;
  var LEDGE_CELLS = 1.5;
  var LEDGE_STEPS = 4;
  var OUTCROPS_LEAST = 2;
  var OUTCROPS_SPAN = 4;
  var OUTCROP_SPAN_LEAST = 0.08;
  var OUTCROP_SPAN_SPAN = 0.2;
  var OUTCROP_RISE_LEAST = 0.15;
  var OUTCROP_RISE_SPAN = 0.34;
  var LAYERS_LEAST = 1;
  var LAYERS_MOST = 4;
  var FURTHEST = 0.28;
  var BACKING_WIDER = 1.3;
  var NEAR = 1;
  var BEHIND = 0.86;
  var GROWTHS = {
    fan: 3,
    frond: 3,
    sponge: 2,
    tuft: 4
  };
  var SPRIGS = {
    fan: gathered([
      { d: "M0 0 C1 -6 0 -10 -1 -15", width: 2.6 },
      { d: "M-1 -15 C-5 -19 -9 -21 -13 -27", width: 1.8 },
      { d: "M-1 -15 C-1 -21 -1 -25 -2 -31", width: 1.8 },
      { d: "M-1 -15 C3 -19 7 -21 10 -26", width: 1.8 },
      { d: "M-6 -19 C-9 -23 -12 -24 -16 -24", width: 1.2 },
      { d: "M4 -18 C7 -22 11 -23 14 -22", width: 1.2 },
      { d: "M-2 -22 C-4 -26 -5 -29 -6 -33", width: 1.2 },
      { d: "M0 -22 C2 -26 4 -29 6 -32", width: 1.2 }
    ]),
    frond: gathered([
      { d: "M0 0 C4 -8 3 -16 6 -25 C7 -29 6 -31 4 -33", width: 2.2 },
      { d: "M0 0 C-3 -7 -4 -14 -3 -21 C-3 -25 -4 -27 -6 -29", width: 1.8 },
      { d: "M1 -6 C-4 -10 -7 -15 -8 -21", width: 1.4 }
    ]),
    sponge: gathered([
      { d: "M-3 -4 C-4 -9 -3 -12 -2 -14", width: 9 },
      { d: "M4 -3 C5 -7 5 -10 4 -12", width: 7 }
    ]),
    tuft: gathered([
      { d: "M0 0 L-8 -11", width: 1.6 },
      { d: "M0 0 L-4 -15", width: 1.6 },
      { d: "M0 0 L1 -17", width: 1.6 },
      { d: "M0 0 L6 -14", width: 1.6 },
      { d: "M0 0 L10 -9", width: 1.6 }
    ])
  };
  var COLONIES_PER_K = 11;
  var COLONY_LEAST = 3;
  var COLONY_MOST = 9;
  var COLONY_SPREAD = 0.055;
  var PERCH_SMALLEST = 0.35;
  var PERCH_LARGEST = 1.9;
  var PERCH_WANDER = 0.6;
  var ISLE_DEEP = 0.04;
  var ISLE_SPAN_LEAST = 0.3;
  var ISLE_SPAN_SPAN = 0.36;
  var ISLE_RISE_LEAST = 0.78;
  var ISLE_RISE_SPAN = 0.45;
  var ISLE_STEPS = 90;
  var MIN_SPAN3 = 1;
  function createCrags(options) {
    const random = makeRandom(stir(options.seed ^ 15529) | 0);
    const rough = makeNoise2(options.seed ^ 39441);
    const bite = makeNoise2(options.seed ^ 2839);
    const bedding = makeNoise2(options.seed ^ 32307);
    let width = Math.max(MIN_SPAN3, options.width);
    let height = Math.max(MIN_SPAN3, options.height);
    let floor = options.floor;
    const framing = options.framing ?? draw2();
    const hasIsle = options.isle ?? (isleAllowed(framing) && random() < ISLE_ODDS);
    function draw2() {
      const kinds = Object.keys(FRAMINGS);
      let total = 0;
      for (const kind of kinds) total += FRAMINGS[kind];
      let at2 = random() * total;
      for (const kind of kinds) {
        at2 -= FRAMINGS[kind];
        if (at2 <= 0) return kind;
      }
      return "open";
    }
    function lumps() {
      const count = OUTCROPS_LEAST + Math.floor(random() * (OUTCROPS_SPAN + 1));
      return Array.from({ length: count }, () => ({
        at: random(),
        rise: OUTCROP_RISE_LEAST + random() * OUTCROP_RISE_SPAN,
        span: OUTCROP_SPAN_LEAST + random() * OUTCROP_SPAN_SPAN
      }));
    }
    function face(along2, lane, shape, outcrops) {
      const swell = rough(along2 * ROUGH_CELLS, lane);
      const nibble = bite(along2 * BITE_CELLS, lane + 3.3);
      const shelf = Math.round(bedding(along2 * LEDGE_CELLS, lane + 8.1) * LEDGE_STEPS) / LEDGE_STEPS;
      const grain = 1 + swell * ROUGH + nibble * BITE + shelf * LEDGE;
      let stood = 0;
      for (const lump of outcrops) {
        const t = (along2 - (lump.at - lump.span / 2)) / lump.span;
        if (t <= 0 || t >= 1) continue;
        stood = Math.max(stood, lump.rise * ((1 - Math.cos(t * Math.PI * 2)) / 2));
      }
      return Math.max(0, shape(along2) * grain + stood);
    }
    function profile(at2, sway) {
      if (framing === "hills") {
        const foot = 0.44 + sway * 0.1;
        return Math.max(0, (at2 - foot) / (1 - foot)) ** (1.5 + sway * 0.4) * HILL_PEAK;
      }
      if (framing === "cave") return 0.62 + 0.38 * Math.cos(at2 * Math.PI * 2 - 0.6 + sway * 1.2);
      return 0.55 + 0.45 * Math.sin(at2 * Math.PI * 0.9 + 0.5 + sway * 1.4);
    }
    function sort() {
      const kinds = Object.keys(GROWTHS);
      let total = 0;
      for (const kind of kinds) total += GROWTHS[kind];
      let at2 = random() * total;
      for (const kind of kinds) {
        at2 -= GROWTHS[kind];
        if (at2 <= 0) return kind;
      }
      return "tuft";
    }
    function root(outline2, at2, out, away2) {
      const steps = outline2.length;
      const on = Math.max(1, Math.min(steps - 2, at2));
      const here = outline2[on];
      const back = outline2[on - 1];
      const next = outline2[on + 1];
      if (!here || !back || !next) return null;
      const runX = next.x - back.x;
      const runY = next.y - back.y;
      const square = Math.atan2(-runX * out, runY * out) + (random() - 0.5) * PERCH_WANDER * 2;
      const off = Math.atan2(Math.sin(square - away2), Math.cos(square - away2));
      return {
        kind: sort(),
        lean: away2 + Math.max(-LEAN_MOST, Math.min(LEAN_MOST, off)),
        size: PERCH_SMALLEST + random() ** 1.6 * (PERCH_LARGEST - PERCH_SMALLEST),
        x: here.x,
        y: here.y
      };
    }
    function settle(outline2, out, away2, share) {
      const steps = outline2.length;
      if (steps < 3 || share <= 0) return [];
      let along2 = 0;
      for (let at2 = 1; at2 < steps; at2++) {
        const here = outline2[at2];
        const back = outline2[at2 - 1];
        if (here && back) along2 += Math.hypot(here.x - back.x, here.y - back.y);
      }
      const colonies = Math.round(along2 * COLONIES_PER_K * share / 1e3);
      const spread2 = Math.max(1, Math.round(steps * COLONY_SPREAD));
      const perches = [];
      for (let made = 0; made < colonies; made++) {
        const middle = Math.floor(random() * steps);
        const many = COLONY_LEAST + Math.floor(random() * (COLONY_MOST - COLONY_LEAST + 1));
        for (let one = 0; one < many; one++) {
          const grown = root(outline2, middle + Math.round((random() * 2 - 1) * spread2), out, away2);
          if (grown) perches.push(grown);
        }
      }
      return perches;
    }
    function wall(side2, reach2, lane, depth, near) {
      const outcrops = lumps();
      const outline2 = [];
      const sway = random() * 2 - 1;
      const shape = (at2) => profile(at2, sway);
      for (let at2 = 0; at2 <= FACE_STEPS; at2++) {
        const along2 = at2 / FACE_STEPS;
        const y = -OVERHANG + along2 * (height + OVERHANG * 2);
        const out = face(along2, lane, shape, outcrops) * reach2 * width;
        outline2.push({ x: side2 < 0 ? out : width - out, y });
      }
      return {
        depth,
        edge: side2 < 0 ? "left" : "right",
        outline: outline2,
        perches: settle(outline2, side2 < 0 ? 1 : -1, side2 < 0 ? 0 : Math.PI, near ** 3)
      };
    }
    function roof(lane) {
      const outcrops = lumps();
      const outline2 = [];
      const shape = (at2) => 0.4 + 0.6 * Math.cos((at2 - 0.5) * Math.PI * 2) ** 2;
      for (let at2 = 0; at2 <= FACE_STEPS; at2++) {
        const along2 = at2 / FACE_STEPS;
        const x = -OVERHANG + along2 * (width + OVERHANG * 2);
        outline2.push({ x, y: face(along2, lane, shape, outcrops) * ROOF_DROP * height });
      }
      return { depth: NEAR, edge: "top", outline: outline2, perches: settle(outline2, -1, Math.PI / 2, 1) };
    }
    function raise() {
      const middle = width * (0.15 + random() * 0.7);
      const span = width * (ISLE_SPAN_LEAST + random() * ISLE_SPAN_SPAN);
      const rise = height * (ISLE_RISE_LEAST + random() * ISLE_RISE_SPAN);
      const grain = makeNoise2(random() * 65535 | 0);
      const outline2 = [];
      for (let at2 = 0; at2 <= ISLE_STEPS; at2++) {
        const x = -OVERHANG + at2 / ISLE_STEPS * (width + OVERHANG * 2);
        const t = (x - (middle - span / 2)) / span;
        const lift = t <= 0 || t >= 1 ? 0 : rise * ((1 - Math.cos(t * Math.PI * 2)) / 2) * (1 + grain(t * 3.4, 0) * 0.3);
        outline2.push({ x, y: floor(x, ISLE_DEEP) - lift });
      }
      return { depth: ISLE_DEEP, outline: outline2 };
    }
    function side(which, reach2) {
      const layers = LAYERS_LEAST + Math.floor(random() * (LAYERS_MOST - LAYERS_LEAST + 1));
      const front = which < 0 ? NEAR : BEHIND;
      const stack = [];
      for (let at2 = 0; at2 < layers; at2++) {
        const near = layers < 2 ? 1 : at2 / (layers - 1);
        stack.push(
          wall(
            which,
            reach2 * (1 + (1 - near) * (BACKING_WIDER - 1)),
            random() * 7,
            FURTHEST + (front - FURTHEST) * near,
            near
          )
        );
      }
      return stack;
    }
    function build3() {
      const reach2 = REACHES[framing];
      if (reach2 <= 0) return [];
      if (framing === "shoulder") return side(random() < 0.5 ? -1 : 1, reach2);
      const rocks2 = [...side(-1, reach2), ...side(1, reach2 * (0.7 + random() * 0.5))];
      if (framing === "cave") rocks2.push(roof(random() * 7));
      return rocks2;
    }
    let rocks = build3();
    let isle = hasIsle ? raise() : null;
    return {
      framing,
      get isle() {
        return isle;
      },
      /**
       * A resized box is rebuilt rather than scaled, for the reason `seabed.ts`
       * gives: everything here is a pure function of the seed and the box, and
       * rock that stretched with a window would be the one thing on screen
       * admitting it is a drawing. The framing itself is kept, because it is the
       * day's rather than the box's.
       */
      resize(nextWidth, nextHeight, nextFloor) {
        width = Math.max(MIN_SPAN3, nextWidth);
        height = Math.max(MIN_SPAN3, nextHeight);
        floor = nextFloor;
        rocks = build3();
        isle = hasIsle ? raise() : null;
      },
      get rocks() {
        return rocks;
      }
    };
  }
  var isleAllowed = (framing) => framing === "hills" || framing === "open";

  // ../../../codincodv2/assets/js/ornament/drift.ts
  var FIELD_CELLS3 = 2.2;
  var DRIFT3 = 0.04;
  var SWAY = 13;
  var FALL_SLOWEST = 4;
  var FALL_FASTEST = 13;
  var MOTE_SMALLEST = 0.4;
  var MOTE_LARGEST = 1.9;
  var MOTE_BIAS = 2.6;
  var TOLERANCE2 = 0.25;
  var DEPTH_SIZE3 = 0.75;
  var DEPTH_NEAR4 = 1;
  var DEPTH_FAR4 = 0.08;
  var RISE_SLOWEST = 38;
  var RISE_FASTEST = 66;
  var BUBBLE_SMALLEST = 1.1;
  var BUBBLE_LARGEST = 2.9;
  var SWELL = 0.6;
  var WOBBLE2 = 9;
  var WOBBLE_RATE = 1.9;
  var VENT_RUN_LEAST = 0.7;
  var VENT_RUN_SPAN = 1.6;
  var VENT_REST_LEAST = 5;
  var VENT_REST_SPAN = 14;
  var VENT_GAP_LEAST = 0.07;
  var VENT_GAP_SPAN = 0.5;
  var MIN_SPAN4 = 1;
  function createDrift(options) {
    const noise = makeNoise2(options.seed ^ 7487);
    const random = makeRandom(options.seed ^ 31265);
    let width = Math.max(MIN_SPAN4, options.width);
    let height = Math.max(MIN_SPAN4, options.height);
    let slide = 0;
    const floor = options.floor ?? (() => height);
    const tolerance = Math.max(0, options.tolerance ?? TOLERANCE2);
    const mote = () => {
      const depth = DEPTH_FAR4 + random() * (DEPTH_NEAR4 - DEPTH_FAR4);
      const shrink = 1 - DEPTH_SIZE3 + DEPTH_SIZE3 * depth;
      return {
        cut: 0,
        depth,
        lane: random() * 200,
        r: (MOTE_SMALLEST + random() ** MOTE_BIAS * (MOTE_LARGEST - MOTE_SMALLEST)) * shrink,
        rate: (FALL_SLOWEST + random() * (FALL_FASTEST - FALL_SLOWEST)) * shrink,
        x: random() * width,
        y: random() * height
      };
    };
    const motes = [];
    const held2 = [];
    function sow() {
      const one = mote();
      motes.push(one);
      held2.push({ x: one.x, y: one.y });
    }
    function draw2(at2) {
      const one = motes[at2];
      const was = held2[at2];
      if (!one || !was) return;
      was.x = one.x;
      was.y = one.y;
      one.cut++;
    }
    for (let made = 0; made < Math.max(0, options.motes); made++) sow();
    const vent = () => {
      const x = random() * width;
      return {
        next: 0,
        running: false,
        until: random() * (VENT_REST_LEAST + VENT_REST_SPAN),
        x,
        y: floor(x)
      };
    };
    const vents = Array.from({ length: Math.max(0, options.vents ?? 0) }, vent);
    const bubbles = [];
    function release(from) {
      const depth = DEPTH_FAR4 + random() * (DEPTH_NEAR4 - DEPTH_FAR4);
      bubbles.push({
        depth,
        lane: random() * 200,
        r: (BUBBLE_SMALLEST + random() * (BUBBLE_LARGEST - BUBBLE_SMALLEST)) * depth,
        rose: 0,
        x: from.x + (random() - 0.5) * WOBBLE2,
        y: from.y
      });
    }
    return {
      bubbles,
      motes,
      resize(nextWidth, nextHeight, count) {
        const scaleX = Math.max(MIN_SPAN4, nextWidth) / width;
        const scaleY = Math.max(MIN_SPAN4, nextHeight) / height;
        width = Math.max(MIN_SPAN4, nextWidth);
        height = Math.max(MIN_SPAN4, nextHeight);
        for (let at2 = 0; at2 < motes.length; at2++) {
          const one = motes[at2];
          if (!one) continue;
          one.x *= scaleX;
          one.y *= scaleY;
          draw2(at2);
        }
        for (const one of bubbles) {
          one.x *= scaleX;
          one.y *= scaleY;
        }
        if (count == null) return;
        while (motes.length > count) {
          motes.pop();
          held2.pop();
        }
        while (motes.length < count) sow();
      },
      step(seconds) {
        const dt = Math.min(Math.max(seconds, 0), 0.1);
        slide += DRIFT3 * dt;
        const scale = FIELD_CELLS3 / width;
        for (let at2 = 0; at2 < motes.length; at2++) {
          const one = motes[at2];
          const was = held2[at2];
          if (!one || !was) continue;
          const push = noise(one.x * scale + one.lane, one.y * scale + one.lane + slide);
          one.x += push * SWAY * one.depth * dt;
          one.y += one.rate * dt;
          if (one.y > height + one.r) {
            one.y = -one.r;
            one.x = random() * width;
          }
          one.x = around(one.x, width, one.r);
          if (Math.hypot(one.x - was.x, one.y - was.y) >= tolerance) draw2(at2);
        }
        for (const from of vents) {
          from.until -= dt;
          if (from.until <= 0) {
            from.running = !from.running;
            from.until = from.running ? VENT_RUN_LEAST + random() * VENT_RUN_SPAN : VENT_REST_LEAST + random() * VENT_REST_SPAN;
            from.next = 0;
          }
          if (!from.running) continue;
          from.next -= dt;
          if (from.next > 0) continue;
          from.next = VENT_GAP_LEAST + random() * VENT_GAP_SPAN;
          release(from);
        }
        for (let at2 = bubbles.length - 1; at2 >= 0; at2--) {
          const one = bubbles[at2];
          if (!one) continue;
          const climb = (RISE_SLOWEST + one.depth * (RISE_FASTEST - RISE_SLOWEST)) * one.depth;
          one.rose += dt;
          one.y -= climb * dt;
          one.r += one.r * SWELL * (climb / Math.max(height, MIN_SPAN4)) * dt;
          one.x += Math.cos(one.rose * WOBBLE_RATE + one.lane) * WOBBLE2 * dt;
          if (one.y + one.r < 0) bubbles.splice(at2, 1);
        }
      }
    };
  }
  function around(value, span, margin) {
    if (value > span + margin) return -margin;
    if (value < -margin) return span + margin;
    return value;
  }

  // ../../../codincodv2/assets/js/ornament/nemos.ts
  var GROUP_LEAST = 2;
  var GROUP_SPAN = 3;
  var RANK_STEP = 0.16;
  var RANK_LEAST = 0.45;
  var NERVE_BOLD = 0.34;
  var NERVE_RUNG = 0.3;
  var NERVE_JUMPY = 1.2;
  var BODY = 0.4;
  var BODY_SPAN = 0.3;
  var PACE = 2.6;
  var HOVER2 = 0.35;
  var BOLT2 = 2.2;
  var HOLD_LEAST2 = 0.6;
  var HOLD_SPAN2 = 1.9;
  var RANGE = 9;
  var ARRIVE = 0.6;
  var CLEAR = 0.9;
  var EASE = 4.5;
  var WAGGLE = 1.4;
  var STRIDE2 = 0.42;
  var FLIP = 7;
  var FLIP_BELOW = 0.9;
  var FRIGHT_FADE = 4.5;
  var NOTICE = 7;
  var MINDS = 1.6;
  var BULK = 0.4;
  var FRIGHT_HOME = 0.55;
  var COVER_IN = 2.4;
  var COVER_OUT = 0.7;
  var COVER_NEAR = 1.2;
  var CHARGE_AT = 0.3;
  var CHARGE_FADE = 2.4;
  var TRIES = 12;
  function createNemos(options) {
    const reef2 = options.reef;
    const random = makeRandom(options.seed ^ 28461);
    const nemos2 = [];
    const anemones = () => reef2.heads.filter((one) => one.kind === "anemone");
    function station3(one) {
      const reach2 = RANGE * one.length;
      for (let tries = 0; tries < TRIES; tries++) {
        const angle = random() * Math.PI * 2;
        const out = Math.sqrt(random()) * reach2;
        const x = one.host.x + Math.cos(angle) * out;
        const y = one.host.y + Math.sin(angle) * out;
        if (!reef2.holds(x, y, one.host.depth)) continue;
        if (y > reef2.surfaceAt(x, one.host.depth) - CLEAR * one.length) continue;
        return { x, y };
      }
      return { x: one.host.x, y: one.host.y - CLEAR * one.length };
    }
    function settle(host, rank) {
      const queue = Math.max(RANK_LEAST, 1 - rank * RANK_STEP);
      const length = host.span * BODY * queue * (1 - BODY_SPAN / 2 + random() * BODY_SPAN);
      const x = host.x + (random() - 0.5) * host.span;
      const y = Math.min(host.y, reef2.surfaceAt(x, host.depth)) - CLEAR * length;
      return {
        aim: { x, y },
        beat: random() * Math.PI * 2,
        charge: 0,
        cover: 0,
        face: random() < 0.5 ? -1 : 1,
        fright: 0,
        hold: random() * HOLD_SPAN2,
        host,
        lane: random() * Math.PI * 2,
        length,
        nerve: Math.min(NERVE_JUMPY, NERVE_BOLD + rank * NERVE_RUNG),
        rank,
        tilt: 0,
        vx: 0,
        vy: 0,
        x,
        y
      };
    }
    function populate() {
      const most = Math.max(0, options.count ?? Number.POSITIVE_INFINITY);
      nemos2.length = 0;
      for (const host of anemones()) {
        const group = GROUP_LEAST + Math.floor(random() * (GROUP_SPAN + 1));
        for (let made = 0; made < group && nemos2.length < most; made++) {
          nemos2.push(settle(host, made));
        }
      }
    }
    function swim(one, dt) {
      const toX = one.aim.x - one.x;
      const toY = one.aim.y - one.y;
      const away2 = Math.hypot(toX, toY);
      const near = away2 < ARRIVE * one.length;
      const stirred = Math.max(one.fright, one.charge);
      const pace = (near ? HOVER2 : 1) * PACE * (1 + stirred * BOLT2) * one.length;
      const wantX = away2 > 0 ? toX / away2 * pace : 0;
      const wantY = away2 > 0 ? toY / away2 * pace : 0;
      const rate = Math.min(1, EASE * dt);
      one.vx += (wantX - one.vx) * rate;
      one.vy += (wantY - one.vy) * rate;
      const speed = Math.hypot(one.vx, one.vy);
      one.beat += speed / Math.max(1, STRIDE2 * one.length) * dt * Math.PI * 2;
      const roll = Math.sin(one.beat + one.lane) * WAGGLE * one.length;
      const sideX = speed > 0 ? -(one.vy / speed) * roll : 0;
      const sideY = speed > 0 ? one.vx / speed * roll : 0;
      one.x += (one.vx + sideX) * dt;
      one.y += (one.vy + sideY) * dt;
    }
    function keep(one, fromX, fromY) {
      const top = reef2.surfaceAt(one.x, one.host.depth) - CLEAR * one.length;
      if (one.y > top && reef2.holds(one.x, top, one.host.depth)) {
        one.y = top;
        one.vy = Math.min(one.vy, 0);
      }
      if (reef2.holds(one.x, one.y, one.host.depth)) return;
      one.x = fromX;
      one.y = fromY;
      one.vx = 0;
      one.vy = 0;
      one.hold = 0;
      one.aim = { x: one.host.x, y: one.host.y - CLEAR * one.length };
    }
    function turn2(one, dt) {
      const speed = Math.hypot(one.vx, one.vy);
      const slow = speed < FLIP_BELOW * one.length;
      const want2 = slow && Math.abs(one.vx) > 0 ? Math.sign(one.vx) : Math.sign(one.face) || 1;
      const step2 = FLIP * dt;
      one.face += Math.min(Math.max(want2 - one.face, -step2), step2);
      one.tilt = drawnTilt(Math.atan2(one.vy, Math.abs(one.vx)), Math.sign(one.face) || 1);
    }
    function minded(one, water) {
      let alarm = 0;
      let at2 = null;
      for (const thing of water) {
        if (thing.size < one.length * MINDS) continue;
        const reach2 = thing.size * NOTICE;
        const away2 = Math.hypot(one.x - thing.x, one.y - thing.y);
        if (away2 >= reach2) continue;
        const near = (1 - away2 / reach2) * abreast(one.host.depth, thing.depth);
        const worry = near * (BULK + (thing.menace ?? 0) * (1 - BULK));
        if (worry <= alarm) continue;
        alarm = worry;
        at2 = thing;
      }
      return { alarm, at: at2 };
    }
    function meet(one, at2) {
      const home = { x: one.host.x, y: one.host.y - CLEAR * one.length };
      const toX = at2.x - one.host.x;
      const toY = at2.y - one.host.y;
      const away2 = Math.hypot(toX, toY);
      if (away2 < 1) return home;
      const out = Math.min(away2, RANGE * one.length);
      for (let back = TRIES; back >= 1; back--) {
        const reach2 = out * (back / TRIES);
        const x = one.host.x + toX / away2 * reach2;
        const y = one.host.y + toY / away2 * reach2;
        if (!reef2.holds(x, y, one.host.depth)) continue;
        if (y > reef2.surfaceAt(x, one.host.depth) - CLEAR * one.length) continue;
        return { x, y };
      }
      return home;
    }
    function hide(one, dt) {
      const home = Math.hypot(one.x - one.host.x, one.y - one.host.y) < COVER_NEAR * one.length;
      const want2 = one.fright > FRIGHT_HOME && home ? 1 : 0;
      const rate = (want2 > one.cover ? COVER_IN : COVER_OUT) * dt;
      one.cover += Math.min(Math.max(want2 - one.cover, -rate), rate);
    }
    populate();
    return {
      nemos: nemos2,
      resettle() {
        populate();
      },
      step(seconds) {
        const dt = Math.min(Math.max(seconds, 0), 0.1);
        const water = options.about?.() ?? [];
        for (const one of nemos2) {
          const seen = minded(one, water);
          const goes = one.rank === 0 && seen.at != null && seen.alarm > CHARGE_AT;
          one.fright = Math.max(0, Math.max(one.fright - dt / FRIGHT_FADE, seen.alarm * one.nerve));
          one.charge = Math.max(0, Math.max(one.charge - dt / CHARGE_FADE, goes ? seen.alarm : 0));
          one.hold -= dt;
          if (goes && seen.at != null) {
            one.aim = meet(one, seen.at);
          } else if (one.fright > FRIGHT_HOME) {
            one.aim = { x: one.host.x, y: one.host.y - CLEAR * one.length };
          } else if (one.hold <= 0) {
            one.hold = HOLD_LEAST2 + random() * HOLD_SPAN2;
            one.aim = station3(one);
          }
          const fromX = one.x;
          const fromY = one.y;
          swim(one, dt);
          keep(one, fromX, fromY);
          turn2(one, dt);
          hide(one, dt);
        }
      }
    };
  }

  // ../../../codincodv2/assets/js/ornament/sizes.ts
  var AT_ARM = 0.15;
  var SWIMMING_OFF = 8;
  function drawnAt(metres, off) {
    return AT_ARM * Math.sqrt(Math.max(metres, 0) / Math.max(off, 1e-3));
  }

  // ../../../codincodv2/assets/js/ornament/passers.ts
  var BOAT_OFF = 30;
  var SUB_OFF = 150;
  var FADE = 0.16;
  var WATERLINE = 0.035;
  var OFFING = 0.2;
  var PING_EDGE = 0.18;
  var HABITS = {
    boat: {
      chance: 1,
      deepLeast: WATERLINE,
      deepSpan: 0,
      sizeLeast: drawnAt(6, BOAT_OFF),
      sizeSpan: drawnAt(11, BOAT_OFF) - drawnAt(6, BOAT_OFF),
      takeLeast: 26,
      takeSpan: 18
    },
    sonar: {
      chance: 1,
      deepLeast: 0.12,
      deepSpan: 0.43,
      sizeLeast: 0.4,
      sizeSpan: 0.3,
      takeLeast: 4.5,
      takeSpan: 2.5
    },
    submarine: {
      chance: 0.15,
      deepLeast: 0.17,
      deepSpan: 0.19,
      sizeLeast: drawnAt(55, SUB_OFF),
      sizeSpan: drawnAt(90, SUB_OFF) - drawnAt(55, SUB_OFF),
      takeLeast: 38,
      takeSpan: 22
    }
  };
  var CHURN = {
    boat: { force: 1, x: -1, y: 0.19 },
    sonar: { force: 0, x: 0, y: 0 },
    submarine: { force: 0.5, x: -1.12, y: 0 }
  };
  var FROTH_GAP = 0.04;
  var FROTH_LIFE = 4.4;
  var FROTH_MOST = 112;
  var FROTH_SEED = 0.07;
  var FROTH_SWELL = 0.04;
  var FROTH_OPEN = 0.2;
  var HULL_FELT = 2.6;
  var PING_FELT = 0.55;
  var DAY = 24 * 60 * 60;
  var WAIT_LEAST = 35;
  var WAIT_SPAN = 130;
  var APART = 90;
  var MIN_SPAN5 = 1;
  function createPassers(options) {
    const random = makeRandom(options.seed ^ 12471);
    const kinds = options.kinds ?? ["boat", "sonar", "submarine"];
    const eager = options.eager ?? false;
    let width = Math.max(MIN_SPAN5, options.width);
    let height = Math.max(MIN_SPAN5, options.height);
    const passing = [];
    const takes = /* @__PURE__ */ new Map();
    const wake = [];
    let since = 0;
    let arm = 1;
    let felt3 = null;
    let planned = 0;
    const due = /* @__PURE__ */ new Map();
    const waits = /* @__PURE__ */ new Map();
    const gone2 = /* @__PURE__ */ new Set();
    let apart = APART;
    function plan(day) {
      planned = day;
      gone2.clear();
      const dice = makeRandom(stir(options.seed ^ day ^ 20973) | 0);
      for (const kind of kinds) {
        const happens = dice() < HABITS[kind].chance;
        const at2 = Math.floor(dice() * DAY);
        due.set(kind, happens ? at2 : null);
        waits.set(kind, WAIT_LEAST + dice() * WAIT_SPAN);
      }
    }
    function launch(kind) {
      const habit = HABITS[kind];
      const facing = random() < 0.5 ? -1 : 1;
      const scale = width * (habit.sizeLeast + random() * habit.sizeSpan);
      const deep = habit.deepLeast + random() * habit.deepSpan;
      takes.set(kind, habit.takeLeast + random() * habit.takeSpan);
      gone2.add(kind);
      since = FROTH_GAP;
      const side = kind === "sonar" ? facing > 0 ? 1 - PING_EDGE : PING_EDGE : 0;
      passing.push({
        along: 0,
        facing,
        kind,
        scale,
        weight: 0,
        x: width * side,
        y: height * deep
      });
    }
    function owed(dt, clock) {
      if (passing.length > 0 || apart > 0) return null;
      let next = null;
      let oldest = Number.POSITIVE_INFINITY;
      for (const kind of kinds) {
        if (gone2.has(kind)) continue;
        const at2 = due.get(kind);
        if (at2 == null || clock < at2 || at2 >= oldest) continue;
        oldest = at2;
        next = kind;
      }
      if (!next) return null;
      const left = (waits.get(next) ?? 0) - dt;
      waits.set(next, left);
      return left <= 0 ? next : null;
    }
    function shed(one, churn, dt) {
      since += dt;
      if (since < FROTH_GAP) return;
      since = 0;
      arm = -arm;
      if (wake.length >= FROTH_MOST) wake.shift();
      wake.push({
        age: 0,
        r: one.scale * churn.force * FROTH_SEED * (0.6 + random() * 0.8),
        scale: one.scale * churn.force,
        side: arm * (0.3 + random() * 0.7),
        x: one.x + one.facing * one.scale * churn.x + (random() - 0.5) * one.scale * 0.09,
        y: one.y + one.scale * churn.y + (random() - 0.5) * one.scale * 0.05
      });
    }
    function heard(one) {
      const front = ringAt(one.along, PING_RINGS[0] ?? 0);
      if (!front) return null;
      return {
        force: PING_FELT * front.weight * one.weight,
        reach: front.reach * one.scale,
        x: one.x,
        y: one.y
      };
    }
    function settle(dt) {
      for (let at2 = wake.length - 1; at2 >= 0; at2--) {
        const puff = wake[at2];
        if (!puff) continue;
        puff.age += dt / FROTH_LIFE;
        if (puff.age >= 1) {
          wake.splice(at2, 1);
          continue;
        }
        puff.r += puff.scale * FROTH_SWELL * dt;
        puff.y += puff.side * puff.scale * FROTH_OPEN * (1 - puff.age) * dt;
      }
    }
    return {
      passing,
      resize(nextWidth, nextHeight) {
        width = Math.max(MIN_SPAN5, nextWidth);
        height = Math.max(MIN_SPAN5, nextHeight);
        passing.length = 0;
        wake.length = 0;
        felt3 = null;
      },
      get startle() {
        return felt3;
      },
      step(seconds, now = /* @__PURE__ */ new Date()) {
        const dt = Math.min(Math.max(seconds, 0), 0.1);
        const day = now.getFullYear() * 1e4 + (now.getMonth() + 1) * 100 + now.getDate();
        if (day !== planned) plan(day);
        apart = Math.max(0, apart - dt);
        if (eager) {
          if (passing.length === 0) {
            gone2.clear();
            launch(kinds[Math.floor(random() * kinds.length)] ?? "boat");
          }
        } else {
          const next = owed(dt, now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds());
          if (next) launch(next);
        }
        for (let at2 = passing.length - 1; at2 >= 0; at2--) {
          const one = passing[at2];
          if (!one) continue;
          one.along += dt / Math.max(takes.get(one.kind) ?? 1, 1e-3);
          if (one.along >= 1) {
            passing.splice(at2, 1);
            apart = APART;
            continue;
          }
          one.weight = Math.min(1, one.along / FADE, (1 - one.along) / FADE);
          if (one.kind === "sonar") continue;
          const from = -OFFING * width;
          const to = width * (1 + OFFING);
          one.x = one.facing > 0 ? from + one.along * (to - from) : to - one.along * (to - from);
        }
        felt3 = null;
        for (const one of passing) {
          const churn = CHURN[one.kind];
          if (churn.force <= 0) {
            felt3 = heard(one);
            continue;
          }
          shed(one, churn, dt);
          felt3 = {
            force: churn.force * one.weight,
            reach: one.scale * HULL_FELT,
            x: one.x,
            y: one.y
          };
        }
        settle(dt);
      },
      wake
    };
  }
  var HULL = "M-1 0 L1 0 L0.82 0.2 Q0.1 0.34 -0.72 0.28 Q-0.94 0.24 -1 0 Z";
  var SCREWS = "M-0.78 0.15 A0.07 0.07 0 1 1 -0.78 0.29 A0.07 0.07 0 1 1 -0.78 0.15 Z M-0.62 0.19 A0.07 0.07 0 1 1 -0.62 0.33 A0.07 0.07 0 1 1 -0.62 0.19 Z";
  var SUBMARINE = "M-0.92 -0.15 L0.4 -0.17 Q0.86 -0.16 1 0 Q0.86 0.16 0.4 0.17 L-0.92 0.15 Q-1 0.1 -1 0 Q-1 -0.1 -0.92 -0.15 Z M0.02 -0.16 L0.08 -0.44 L0.3 -0.44 L0.34 -0.16 Z M0.16 -0.44 L0.16 -0.62 L0.2 -0.62 L0.2 -0.44 Z M-0.02 -0.38 L0.42 -0.38 L0.42 -0.33 L-0.02 -0.33 Z M-0.74 -0.14 L-0.96 -0.4 L-0.84 -0.4 L-0.62 -0.14 Z M-0.62 0.14 L-0.84 0.4 L-0.96 0.4 L-0.74 0.14 Z";
  var SUB_SCREW = "M-1 -0.02 L-1.14 -0.14 L-1.18 -0.06 L-1.04 0 L-1.18 0.06 L-1.14 0.14 L-1 0.02 Z";
  var PING_RINGS = [0, 0.16, 0.32];
  function ringAt(along2, offset) {
    const t = (along2 - offset) / (1 - offset);
    if (t <= 0 || t >= 1) return null;
    return { reach: 1 - (1 - t) ** 2, weight: (1 - t) ** 1.6 };
  }

  // ../../../codincodv2/assets/js/ornament/plenty.ts
  var LEAN = 0.55;
  var RANGE2 = 1.75;
  var BIAS = 2;
  function thriving(seed, at2 = 0) {
    const random = makeRandom((seed ^ 24301) + at2 * 40503);
    random();
    random();
    return LEAN + RANGE2 * random() ** BIAS;
  }

  // ../../../codincodv2/assets/js/ornament/rays.ts
  var SPREAD = 2.4;
  var SPAN_LEAST = 0.018;
  var SPAN_SPAN = 0.055;
  var REACH_LEAST = 0.34;
  var REACH_SPAN = 0.28;
  var TILT = 0.16;
  var TILT_SPREAD = 0.07;
  var GLOW_LEAST = 0.25;
  var GLOW_MOST = 1;
  var BREATH_SLOWEST = 0.045;
  var BREATH_FASTEST = 0.11;
  var WANDER2 = 26;
  var WANDER_RATE = 0.06;
  var MIN_SPAN6 = 1;
  function createRays(options) {
    const random = makeRandom(options.seed ^ 13239);
    let width = Math.max(MIN_SPAN6, options.width);
    let height = Math.max(MIN_SPAN6, options.height);
    let clock = 0;
    const breaths = [];
    const rays = [];
    function born() {
      breaths.push({
        at: random() * Math.PI * 2,
        rate: BREATH_SLOWEST + random() * (BREATH_FASTEST - BREATH_SLOWEST),
        seat: random() * Math.PI * 2
      });
      return {
        glow: GLOW_LEAST,
        reach: height * (REACH_LEAST + random() * REACH_SPAN),
        span: width * (SPAN_LEAST + random() * SPAN_SPAN),
        tilt: TILT + (random() - 0.5) * TILT_SPREAD,
        x: random() * width
      };
    }
    for (let made = 0; made < Math.max(0, options.count); made++) rays.push(born());
    return {
      rays,
      resize(nextWidth, nextHeight, count) {
        const scaleX = Math.max(MIN_SPAN6, nextWidth) / width;
        width = Math.max(MIN_SPAN6, nextWidth);
        height = Math.max(MIN_SPAN6, nextHeight);
        for (const one of rays) one.x *= scaleX;
        if (count == null) return;
        while (rays.length > count) {
          rays.pop();
          breaths.pop();
        }
        while (rays.length < count) rays.push(born());
      },
      step(seconds) {
        clock += Math.min(Math.max(seconds, 0), 0.1);
        for (let at2 = 0; at2 < rays.length; at2++) {
          const one = rays[at2];
          const breath = breaths[at2];
          if (!one || !breath) continue;
          const swell = (Math.sin(breath.at + clock * breath.rate * Math.PI * 2) + 1) / 2;
          one.glow = GLOW_LEAST + swell * (GLOW_MOST - GLOW_LEAST);
          one.x += Math.cos(breath.seat + clock * WANDER_RATE * Math.PI * 2) * WANDER2 * seconds;
        }
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
  var DEPTH_FAR5 = 0.5;
  var DEPTH_NEAR5 = 0.82;
  var BROW = 2.6;
  var BULGE = 0.5;
  var LIST = 0.22;
  var LUMP_CELLS = 3.4;
  var LUMP_SHARE = 0.24;
  var CREST_STEPS = 96;
  var HEADS = 52;
  var APRON = 1.28;
  var TRIES2 = 40;
  var REACH2 = 0.34;
  var TIER = 0.55;
  var HEADROOM = 0.9;
  var LEAN2 = 0.22;
  var GROWTH = 72e-4;
  var COLUMN = 16;
  var GIRTH = 0.15;
  var CROWN_RATE = 1.1;
  var SWELL_RATE = 0.55;
  var SWELL_CELLS = 1.8;
  var SWELL_SHARE = 0.6;
  var ROOT = { x: 0, y: 0 };
  var MOUTH = { x: 0, y: -COLUMN };
  var TOLERANCE3 = 0.25;
  var REACHES2 = (() => {
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
  var MIN_SPAN7 = 1;
  function createReef(options) {
    const noise = makeNoise2(options.seed ^ 11153);
    const gust = makeNoise2(options.seed ^ 23779);
    let width = Math.max(MIN_SPAN7, options.width);
    let height = Math.max(MIN_SPAN7, options.height);
    let floor = options.floor;
    let clock = 0;
    let middle = width / 2;
    let half2 = width * HALF_LEAST;
    let rise = height * RISE_LEAST;
    let depth = DEPTH_FAR5;
    const heads = [];
    const crowns = [];
    const tolerance = Math.max(0, options.tolerance ?? TOLERANCE3);
    const reaches = [];
    const held2 = [];
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
      const t = (x - middle) / Math.max(MIN_SPAN7, half2);
      return floor(x, stand) - rise * climb(t) * standing(stand);
    };
    function grow(kind, roll) {
      const sort = SORTS[kind];
      for (let tries = 0; tries < TRIES2; tries++) {
        const t = (-1 + roll() * 2) * APRON;
        const perch = climb(t);
        const flow = swept(t);
        if (perch < sort.perch[0] || perch > sort.perch[1]) continue;
        if (flow < sort.flow[0] || flow > sort.flow[1]) continue;
        const x = middle + t * half2;
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
          lean: (roll() - 0.5) * LEAN2 * 2,
          points: tentacles ? [ROOT, MOUTH] : [],
          scale,
          span,
          twigs: gathered(SHAPES[kind]),
          x,
          y
        };
        heads.push(head);
        crowns.push(tentacles);
        held2.push(null);
        reaches.push(
          tentacles ? COLUMN * scale * (1 + Math.max(...tentacles.map((one) => one.span))) : REACHES2[kind] * scale
        );
        return head;
      }
      return null;
    }
    function room(x, y, want2) {
      for (const other of heads) {
        const near = (want2 + other.span) / 2;
        if (Math.abs(other.y - y) > near * TIER) continue;
        if (Math.abs(other.x - x) < near) return false;
      }
      return true;
    }
    function raise() {
      const roll = makeRandom(options.seed ^ 37295);
      middle = width * (SEAT_LEAST + roll() * SEAT_SPAN);
      half2 = width * (HALF_LEAST + roll() * HALF_SPAN);
      rise = Math.min(height * (RISE_LEAST + roll() * RISE_SPAN), half2 * TALLEST);
      depth = DEPTH_FAR5 + roll() * (DEPTH_NEAR5 - DEPTH_FAR5);
      heads.length = 0;
      crowns.length = 0;
      held2.length = 0;
      reaches.length = 0;
      crest.length = 0;
      bounds = [middle - half2, middle + half2];
      for (let step2 = 0; step2 <= CREST_STEPS; step2++) {
        const x = middle - half2 + half2 * 2 / CREST_STEPS * step2;
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
        const held3 = order[at2];
        order[at2] = order[swap];
        order[swap] = held3;
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
        (one.x - middle) / Math.max(MIN_SPAN7, half2) * SWELL_CELLS,
        clock * SWELL_RATE
      );
      const own = Math.sin(clock * Math.PI * 2 * SWELL_RATE + one.lane);
      return sway * (passing * SWELL_SHARE + own * (1 - SWELL_SHARE));
    }
    function wander(at2, bend2, phase2) {
      const one = heads[at2];
      const was = held2[at2];
      if (!one || !was) return Number.POSITIVE_INFINITY;
      return (reaches[at2] ?? 0) * Math.abs(bend2 - was.bend) + crownSwept(COLUMN * one.scale, Math.abs(phase2 - was.phase));
    }
    function breathe() {
      for (const [at2, one] of heads.entries()) {
        const tentacles = crowns[at2];
        const bend2 = lean(one);
        const phase2 = tentacles ? clock * CROWN_RATE + one.lane : 0;
        if (wander(at2, bend2, phase2) < tolerance) continue;
        one.bend = bend2;
        if (tentacles) one.blades = crownAt(MOUTH, tentacles, COLUMN, phase2);
        one.cut++;
        held2[at2] = { bend: bend2, phase: phase2 };
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
        const reach2 = half2 * (1 + REACH2);
        if (x < middle - reach2 || x > middle + reach2) return false;
        const rock = surfaceAt(x, stand);
        return y >= rock - rise * HEADROOM && y <= rock;
      },
      resize(nextWidth, nextHeight, nextFloor) {
        width = Math.max(MIN_SPAN7, nextWidth);
        height = Math.max(MIN_SPAN7, nextHeight);
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

  // ../../../codincodv2/assets/js/ornament/relics.ts
  var ODDS2 = {
    block: 0.34,
    chest: 0.1,
    smoker: 0.5,
    wreck: 0.4
  };
  var SIZES = {
    block: [17, 26],
    chest: [20, 29],
    smoker: [38, 66],
    wreck: [95, 170]
  };
  var LEAN3 = {
    block: 0.6,
    chest: 0.12,
    smoker: 0.05,
    wreck: 0.16
  };
  var DEPTH_FAR6 = 0.6;
  var DEPTH_NEAR6 = 0.9;
  var PUFF_GAP = 0.13;
  var PUFF_SLOWEST = 0.72;
  var PUFF_FASTEST = 1.28;
  var PUFF_LIFE = 8;
  var PUFF_RISE = 52;
  var PUFF_DRAG = 0.62;
  var PUFF_SWELL = 4.5;
  var PUFF_SWAY = 16;
  var FIELD_CELLS4 = 2.4;
  var FIELD_ROWS = 5.5;
  var MIN_SPAN8 = 1;
  var WARMUP = 12;
  function createRelics(options) {
    const random = makeRandom(options.seed ^ 15407);
    const shear = makeNoise2(options.seed ^ 42780);
    let width = Math.max(MIN_SPAN8, options.width);
    let height = Math.max(MIN_SPAN8, options.height);
    let floor = options.floor;
    let since = 0;
    let drift2 = 0;
    const relics = [];
    const plume = [];
    function place() {
      const roll = makeRandom(options.seed ^ 36369);
      for (let spun = 0; spun < WARMUP; spun++) roll();
      relics.length = 0;
      for (const kind of ["wreck", "smoker", "block", "chest"]) {
        if (roll() >= ODDS2[kind]) continue;
        const [least, most] = SIZES[kind];
        const depth = DEPTH_FAR6 + roll() * (DEPTH_NEAR6 - DEPTH_FAR6);
        const x = width * (0.12 + roll() * 0.76);
        relics.push({
          depth,
          kind,
          lean: (roll() - 0.5) * LEAN3[kind] * 2,
          scale: (least + roll() * (most - least)) * depth,
          x,
          // Its own distance, which is the whole of the point. The ground is a
          // different line at every distance and this asked for the one at the
          // front, so a wreck standing a long way back was planted on the sand
          // that belongs against the glass: a shape drawn at its own distance and
          // sitting somewhere else entirely.
          y: floor(x, depth)
        });
      }
    }
    const smoker = () => relics.find((one) => one.kind === "smoker");
    place();
    return {
      plume,
      relics,
      resize(nextWidth, nextHeight, nextFloor) {
        width = Math.max(MIN_SPAN8, nextWidth);
        height = Math.max(MIN_SPAN8, nextHeight);
        floor = nextFloor;
        plume.length = 0;
        place();
      },
      step(seconds) {
        const dt = Math.min(Math.max(seconds, 0), 0.1);
        drift2 += dt * 0.05;
        const vent = smoker();
        if (vent) {
          since += dt;
          if (since >= PUFF_GAP) {
            since = 0;
            plume.push({
              age: 0,
              r: vent.scale * (0.07 + random() * 0.06),
              rise: PUFF_SLOWEST + random() * (PUFF_FASTEST - PUFF_SLOWEST),
              x: vent.x + (random() - 0.5) * vent.scale * 0.3,
              y: vent.y - vent.scale * SMOKER_LIP
            });
          }
        }
        for (let at2 = plume.length - 1; at2 >= 0; at2--) {
          const puff = plume[at2];
          if (!puff) continue;
          puff.age += dt / PUFF_LIFE;
          if (puff.age >= 1 || puff.y + puff.r < 0) {
            plume.splice(at2, 1);
            continue;
          }
          const climb = PUFF_RISE * puff.rise * (1 - PUFF_DRAG * puff.age);
          puff.y -= climb * dt;
          puff.r += PUFF_SWELL * (0.55 + puff.age) * dt;
          puff.x += shear(puff.x / width * FIELD_CELLS4 + drift2, puff.y / height * FIELD_ROWS + drift2) * PUFF_SWAY * dt;
        }
      }
    };
  }
  var WRECK = "M-1 0 L-0.62 -0.2 L0.52 -0.24 Q0.86 -0.23 1 -0.06 L0.94 0.04 Q0.4 0.11 -0.3 0.09 Z M-0.62 -0.2 L-0.58 -0.34 L0.44 -0.37 L0.52 -0.24 Z M0.1 -0.36 L0.16 -0.92 L0.23 -0.36 Z M-0.3 -0.35 L-0.2 -0.76 L-0.16 -0.35 Z";
  var WRECK_SPAR = [
    { x: 0.02, y: -0.74 },
    { x: 0.3, y: -0.66 }
  ];
  var SMOKER = "M-0.5 0 L-0.3 -0.7 L-0.22 -1.5 L-0.16 -2.1 L-0.2 -2.42 L-0.02 -2.5 L0.06 -2.16 L0.14 -2.34 L0.16 -1.9 L0.24 -1.2 L0.42 0 Z";
  var SMOKER_LIP = 2.45;
  var BLOCK_CARD = "M-1 -0.73 L1 -0.73 L1 0.73 L-1 0.73 Z";
  var BLOCK_LINES = [
    "M-0.62 -0.45 L0.2 -0.45 L0.2 -0.29 L-0.62 -0.29 Z",
    "M-0.62 -0.08 L0.74 -0.08 L0.74 0.08 L-0.62 0.08 Z",
    "M-0.62 0.29 L-0.03 0.29 L-0.03 0.45 L-0.62 0.45 Z"
  ];
  var CHEST_BODY = "M-1 0 L-1 -0.62 Q-1 -1.12 0 -1.12 Q1 -1.12 1 -0.62 L1 0 Z";
  var CHEST_BANDS = ["M-1 -0.66 L1 -0.66 L1 -0.58 L-1 -0.58 Z"];
  var CHEST_LOCK = "M-0.13 -0.72 L0.13 -0.72 L0.13 -0.44 L-0.13 -0.44 Z";
  var LAPTOP_SCREEN = "M-0.44 -1.94 L0.3 -2.04 L0.38 -1.2 L-0.36 -1.1 Z";
  var LAPTOP_BASE = "M-0.42 -1.14 L0.46 -1.24 L0.56 -1.1 L-0.34 -1 Z";
  var LAPTOP_LINES = [
    "M-0.3 -1.82 L0.02 -1.86 L0.02 -1.78 L-0.3 -1.74 Z",
    "M-0.3 -1.66 L0.16 -1.72 L0.16 -1.64 L-0.3 -1.58 Z",
    "M-0.3 -1.5 L-0.08 -1.53 L-0.08 -1.45 L-0.3 -1.42 Z"
  ];

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
  var OVERHANG2 = 40;
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
  var MIN_SPAN9 = 1;
  var mix = (far3, near, at2) => far3 + (near - far3) * at2;
  function createSeabed(options) {
    const colonies = makeNoise2(options.seed ^ 49168);
    const sprigs = makeNoise2(options.seed ^ 20887);
    const swell = makeNoise2(options.seed ^ 24235);
    const lumps = makeNoise2(options.seed ^ 4293);
    const random = makeRandom(options.seed ^ 11534);
    let width = Math.max(MIN_SPAN9, options.width);
    let height = Math.max(MIN_SPAN9, options.height);
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
        const x = -OVERHANG2 + at2 / RIDGE_STEPS * (width + OVERHANG2 * 2);
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
        const x = -OVERHANG2 + at2 / CLIFF_STEPS * (width + OVERHANG2 * 2);
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
        width = Math.max(MIN_SPAN9, nextWidth);
        height = Math.max(MIN_SPAN9, nextHeight);
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

  // ../../../codincodv2/assets/js/ornament/swarm.ts
  var LAYOUTS = {
    ball: {
      churn: 0.05,
      crowd: 0.6,
      seatLeast: 0.18,
      seatSpan: 0.34,
      takeLeast: 70,
      takeSpan: 40,
      tall: 0.11,
      thick: 0.11,
      wide: 0.12
    },
    ceiling: {
      churn: 0.015,
      crowd: 1,
      seatLeast: 0.04,
      seatSpan: 0.12,
      takeLeast: 95,
      takeSpan: 50,
      tall: 0.1,
      thick: 0.3,
      wide: 0.75
    },
    ribbon: {
      churn: 0.03,
      crowd: 0.8,
      seatLeast: 0.2,
      seatSpan: 0.36,
      takeLeast: 60,
      takeSpan: 34,
      tall: 0.05,
      thick: 0.1,
      wide: 0.36
    }
  };
  var OFFING2 = 0.55;
  var FADE2 = 0.12;
  var REST_LEAST = 420;
  var REST_SPAN = 620;
  var OPENING = 0.4;
  var DEEP_LEAST = 0.3;
  var DEEP_SPAN = 0.5;
  var DEPTH_SIZE4 = 0.7;
  var SHORTEST2 = 3.4;
  var LONGEST2 = 7.5;
  var FIDGET = 0.055;
  var FIDGET_RATE = 0.55;
  var FIDGET_CELLS = 2.6;
  var SHOVE = 0.85;
  var SHOVE_REACH = 1;
  var HOMED = 1.2;
  var SEEN = 0.05;
  var TILT_EASE = 3.5;
  var MIN_SPAN10 = 1;
  function createSwarm(options) {
    const random = makeRandom(options.seed ^ 24332);
    const field = makeNoise2(options.seed ^ 7338);
    const shapes = options.shapes ?? ["ball", "ceiling", "ribbon"];
    const eager = options.eager ?? false;
    let width = Math.max(MIN_SPAN10, options.width);
    let height = Math.max(MIN_SPAN10, options.height);
    let count = Math.max(0, Math.round(options.count));
    const pool = [];
    const specks = [];
    const homes = [];
    let shape = "ball";
    let along2 = 1;
    let deep = 1;
    let facing = 1;
    let seat = 0;
    let spin = 0;
    let take = 1;
    let weight = 0;
    let rest = (REST_LEAST + random() * REST_SPAN) * OPENING;
    let drift2 = 0;
    options.water?.enter(() => {
      const first = specks[0];
      if (weight <= SEEN || !first) return [];
      let left = first.x;
      let right = left;
      let top = first.y;
      let bottom = top;
      let far3 = 0;
      for (const one of specks) {
        if (one.x < left) left = one.x;
        if (one.x > right) right = one.x;
        if (one.y < top) top = one.y;
        if (one.y > bottom) bottom = one.y;
        far3 += one.depth;
      }
      return [
        {
          depth: far3 / specks.length,
          size: right - left,
          x: (left + right) / 2,
          y: (top + bottom) / 2
        }
      ];
    });
    function place() {
      const u = random() * 2 - 1;
      const v = random() * 2 - 1;
      const w = random() * 2 - 1;
      const reach2 = Math.hypot(u, v, w) || 1;
      const full = random() ** (1 / 3);
      return { u: u / reach2 * full, v: v / reach2 * full, w: w / reach2 * full };
    }
    function fill() {
      pool.length = 0;
      specks.length = 0;
      homes.length = 0;
      for (let made = 0; made < count; made++) {
        homes.push({
          long: SHORTEST2 + random() * (LONGEST2 - SHORTEST2),
          pushX: 0,
          pushY: 0,
          ...place()
        });
        pool.push({ depth: 1, size: 1, tilt: 0, x: 0, y: 0 });
      }
    }
    function arrive() {
      shape = shapes[Math.floor(random() * shapes.length)] ?? "ball";
      const layout2 = LAYOUTS[shape];
      along2 = 0;
      deep = DEEP_LEAST + random() * DEEP_SPAN;
      facing = random() < 0.5 ? -1 : 1;
      seat = height * (layout2.seatLeast + random() * layout2.seatSpan);
      spin = random() * Math.PI * 2;
      take = layout2.takeLeast + random() * layout2.takeSpan;
      weight = 0;
      for (const home of homes) {
        home.pushX = 0;
        home.pushY = 0;
      }
      specks.length = 0;
      const using = Math.min(pool.length, Math.round(pool.length * layout2.crowd));
      for (let at2 = 0; at2 < using; at2++) {
        const one = pool[at2];
        if (one) specks.push(one);
      }
    }
    function carry(dt, middle, startle) {
      const layout2 = LAYOUTS[shape];
      const wide = width * layout2.wide;
      const tall = width * layout2.tall;
      const thick = layout2.thick;
      const cos = Math.cos(spin);
      const sin = Math.sin(spin);
      const fall = HOMED * dt;
      for (let at2 = 0; at2 < specks.length; at2++) {
        const home = homes[at2];
        const one = specks[at2];
        if (!home || !one) continue;
        const u = home.u * cos - home.w * sin;
        const w = home.u * sin + home.w * cos;
        const wobbleX = field(home.u * FIDGET_CELLS + drift2, home.v * FIDGET_CELLS);
        const wobbleY = field(home.v * FIDGET_CELLS, home.u * FIDGET_CELLS - drift2);
        const wantX = middle + (u + wobbleX * FIDGET) * wide;
        const wantY = seat + (home.v + wobbleY * FIDGET) * tall;
        if (startle && startle.force > 0) {
          const offX = wantX + home.pushX - startle.x;
          const offY = wantY + home.pushY - startle.y;
          const gap = Math.hypot(offX, offY);
          const reach2 = startle.reach * SHOVE_REACH;
          if (gap < reach2 && gap > 0) {
            const push = (reach2 - gap) / reach2 * startle.force * SHOVE * dt * reach2;
            home.pushX += offX / gap * push;
            home.pushY += offY / gap * push;
          }
        }
        home.pushX -= home.pushX * Math.min(1, fall);
        home.pushY -= home.pushY * Math.min(1, fall);
        const nextX = wantX + home.pushX;
        const nextY = wantY + home.pushY;
        const runX = nextX - one.x;
        const runY = nextY - one.y;
        if (Math.hypot(runX, runY) > 0.01) {
          const want2 = Math.atan2(runY, runX);
          const turn2 = Math.atan2(Math.sin(want2 - one.tilt), Math.cos(want2 - one.tilt));
          one.tilt += turn2 * Math.min(1, TILT_EASE * dt);
        }
        one.depth = Math.max(0.05, Math.min(1, deep + w * thick));
        one.size = home.long * (1 - DEPTH_SIZE4 + DEPTH_SIZE4 * one.depth);
        one.x = nextX;
        one.y = nextY;
      }
    }
    fill();
    return {
      resize(nextWidth, nextHeight, nextCount) {
        width = Math.max(MIN_SPAN10, nextWidth);
        height = Math.max(MIN_SPAN10, nextHeight);
        if (nextCount != null) count = Math.max(0, Math.round(nextCount));
        along2 = 1;
        weight = 0;
        fill();
      },
      get shape() {
        return shape;
      },
      specks,
      step(seconds, startle = null) {
        const dt = Math.min(Math.max(seconds, 0), 0.1);
        drift2 += FIDGET_RATE * dt;
        if (along2 >= 1) {
          weight = 0;
          rest -= dt;
          if (eager || rest <= 0) {
            arrive();
            rest = REST_LEAST + random() * REST_SPAN;
          }
          if (along2 >= 1) return;
        }
        along2 += dt / Math.max(take, 1e-3);
        spin += LAYOUTS[shape].churn * Math.PI * 2 * dt;
        weight = Math.max(0, Math.min(1, along2 / FADE2, (1 - along2) / FADE2));
        const from = -OFFING2 * width;
        const to = width * (1 + OFFING2);
        const at2 = Math.min(1, along2);
        carry(dt, facing > 0 ? from + at2 * (to - from) : to - at2 * (to - from), startle);
      },
      get weight() {
        return weight;
      }
    };
  }

  // ../../../codincodv2/assets/js/ornament/visitors.ts
  var HABITS2 = {
    dolphin: {
      beat: 1.05,
      farLeast: 0.5,
      farSpan: 0.45,
      heft: 0.5,
      menace: 0.35,
      odds: 3,
      party: 2,
      partySpan: 3,
      seatLeast: 0.08,
      seatSpan: 0.16,
      sizeLeast: drawnAt(2.4, SWIMMING_OFF),
      sizeSpan: drawnAt(3.6, SWIMMING_OFF) - drawnAt(2.4, SWIMMING_OFF),
      takeLeast: 16,
      takeSpan: 9
    },
    manta: {
      beat: 0.3,
      farLeast: 0.35,
      farSpan: 0.45,
      heft: 0.35,
      menace: 0,
      odds: 2,
      party: 1,
      partySpan: 0,
      seatLeast: 0.12,
      seatSpan: 0.18,
      sizeLeast: drawnAt(2.6, SWIMMING_OFF),
      sizeSpan: drawnAt(4, SWIMMING_OFF) - drawnAt(2.6, SWIMMING_OFF),
      takeLeast: 30,
      takeSpan: 16
    },
    shark: {
      beat: 0.42,
      farLeast: 0.3,
      farSpan: 0.45,
      heft: 0.6,
      menace: 0.9,
      odds: 2,
      party: 1,
      partySpan: 1,
      seatLeast: 0.34,
      seatSpan: 0.22,
      sizeLeast: drawnAt(3.6, SWIMMING_OFF),
      sizeSpan: drawnAt(5.5, SWIMMING_OFF) - drawnAt(3.6, SWIMMING_OFF),
      takeLeast: 34,
      takeSpan: 18
    },
    turtle: {
      beat: 0.24,
      farLeast: 0.45,
      farSpan: 0.5,
      heft: 0.3,
      menace: 0,
      odds: 4,
      party: 1,
      partySpan: 0,
      seatLeast: 0.24,
      seatSpan: 0.36,
      sizeLeast: drawnAt(1, SWIMMING_OFF),
      sizeSpan: drawnAt(1.5, SWIMMING_OFF) - drawnAt(1, SWIMMING_OFF),
      takeLeast: 40,
      takeSpan: 22
    }
  };
  var COURSES = {
    dolphin: { rise: -0.03, roll: 0.07, waves: 2.6 },
    manta: { rise: -0.02, roll: 0.05, waves: 0.8 },
    shark: { rise: 0, roll: 0.03, waves: 0.6 },
    turtle: { rise: -0.2, roll: 0.04, waves: 1.1 }
  };
  var FADE3 = 0.14;
  var OFFING3 = 0.22;
  var REST_LEAST2 = 360;
  var REST_SPAN2 = 540;
  var OPENING2 = 0.35;
  var WING_BACK = 1.6;
  var WING_SIDE = 0.6;
  var WING_SHRINK = 0.1;
  var WING_PHASE = 0.17;
  var DEPTH_SIZE5 = 0.55;
  var FELT_REACH = 1.9;
  var FELT = 0.34;
  var MIN_SPAN11 = 1;
  var SEEN2 = 0.05;
  function createVisitors(options) {
    const random = makeRandom(options.seed ^ 29093);
    const kinds = options.kinds ?? ["dolphin", "manta", "shark", "turtle"];
    const eager = options.eager ?? false;
    let width = Math.max(MIN_SPAN11, options.width);
    let height = Math.max(MIN_SPAN11, options.height);
    const crossing = [];
    let take = 1;
    let course = COURSES.turtle;
    let seat = 0;
    let felt3 = null;
    let rest = (REST_LEAST2 + random() * REST_SPAN2) * OPENING2;
    options.water?.enter(
      () => crossing.filter((one) => one.weight > SEEN2).map((one) => ({
        depth: one.depth,
        menace: HABITS2[one.kind].menace * one.weight,
        size: one.size,
        x: one.x,
        y: one.y
      }))
    );
    function which() {
      let total = 0;
      for (const kind of kinds) total += HABITS2[kind].odds;
      let at2 = random() * total;
      for (const kind of kinds) {
        at2 -= HABITS2[kind].odds;
        if (at2 <= 0) return kind;
      }
      return kinds[0] ?? "turtle";
    }
    function arrive() {
      const kind = which();
      const habit = HABITS2[kind];
      const facing = random() < 0.5 ? -1 : 1;
      const far3 = habit.farLeast + random() * habit.farSpan;
      const size = width * (habit.sizeLeast + random() * habit.sizeSpan);
      const count = habit.party + Math.floor(random() * (habit.partySpan + 1));
      const run = width * (1 + OFFING3 * 2);
      take = habit.takeLeast + random() * habit.takeSpan;
      course = COURSES[kind];
      seat = height * (habit.seatLeast + random() * habit.seatSpan);
      for (let made = 0; made < count; made++) {
        const side = made % 2 === 0 ? 1 : -1;
        const out = Math.ceil(made / 2);
        const depth = Math.max(0.06, far3 - out * 0.05);
        crossing.push({
          along: -(made * WING_BACK * size) / run,
          depth,
          facing,
          kind,
          lift: side * out * WING_SIDE * size,
          size: size * (1 - made * WING_SHRINK) * (1 - DEPTH_SIZE5 + DEPTH_SIZE5 * depth),
          stroke: (random() + made * WING_PHASE) % 1,
          tilt: 0,
          weight: 0,
          x: 0,
          y: 0
        });
      }
    }
    const rides = (at2) => height * (course.rise * at2 + course.roll * Math.sin(at2 * Math.PI * 2 * course.waves));
    function courseAt(one) {
      const from = -OFFING3 * width;
      const to = width * (1 + OFFING3);
      const at2 = Math.max(0, Math.min(1, one.along));
      const step2 = 0.01;
      const ahead2 = Math.min(1, at2 + step2);
      const back = Math.max(0, at2 - step2);
      const run = (to - from) * (ahead2 - back) * one.facing;
      return {
        heading: Math.atan2(rides(ahead2) - rides(back), run || 1),
        x: one.facing > 0 ? from + at2 * (to - from) : to - at2 * (to - from),
        y: seat + rides(at2) + one.lift
      };
    }
    return {
      crossing,
      resize(nextWidth, nextHeight) {
        width = Math.max(MIN_SPAN11, nextWidth);
        height = Math.max(MIN_SPAN11, nextHeight);
        crossing.length = 0;
        felt3 = null;
        rest = REST_LEAST2 + random() * REST_SPAN2;
      },
      get startle() {
        return felt3;
      },
      step(seconds) {
        const dt = Math.min(Math.max(seconds, 0), 0.1);
        if (crossing.length === 0) {
          rest -= dt;
          if (eager || rest <= 0) {
            arrive();
            rest = REST_LEAST2 + random() * REST_SPAN2;
          }
        }
        for (let at2 = crossing.length - 1; at2 >= 0; at2--) {
          const one = crossing[at2];
          if (!one) continue;
          one.along += dt * driven(one.kind, one.stroke) / Math.max(take, 1e-3);
          if (one.along >= 1) {
            crossing.splice(at2, 1);
            continue;
          }
          const where = courseAt(one);
          one.stroke = (one.stroke + HABITS2[one.kind].beat * dt) % 1;
          one.tilt = drawnTilt(where.heading, one.facing);
          one.weight = Math.max(0, Math.min(1, one.along / FADE3, (1 - one.along) / FADE3));
          one.x = where.x;
          one.y = where.y;
        }
        felt3 = null;
        for (const one of crossing) {
          const force = FELT * HABITS2[one.kind].heft * one.weight;
          if (force <= 0 || felt3 && felt3.force >= force) continue;
          felt3 = { depth: one.depth, force, reach: one.size * FELT_REACH, x: one.x, y: one.y };
        }
      }
    };
  }
  var SHARK = [
    { over: 5e-3, under: 5e-3, x: 1 },
    { over: 0.045, under: 0.05, x: 0.88 },
    { over: 0.085, under: 0.088, x: 0.7 },
    { over: 0.113, under: 0.105, x: 0.46 },
    { over: 0.115, under: 0.098, x: 0.2 },
    { over: 0.098, under: 0.078, x: -0.06 },
    { over: 0.072, under: 0.055, x: -0.3 },
    { over: 0.05, under: 0.036, x: -0.46 },
    { over: 0.032, under: 0.026, x: -0.58 }
  ];
  var DOLPHIN = [
    { over: 0.02, under: 0.028, x: 1 },
    { over: 0.032, under: 0.05, x: 0.92 },
    { over: 0.055, under: 0.062, x: 0.84 },
    { over: 0.1, under: 0.078, x: 0.78 },
    { over: 0.15, under: 0.115, x: 0.68 },
    { over: 0.185, under: 0.165, x: 0.44 },
    { over: 0.18, under: 0.175, x: 0.14 },
    { over: 0.14, under: 0.13, x: -0.2 },
    { over: 0.095, under: 0.088, x: -0.44 },
    { over: 0.062, under: 0.056, x: -0.62 }
  ];
  var JOINTS = {
    dolphin: -0.62,
    shark: -0.58
  };
  var SWEEP3 = {
    dolphin: { sweep: 0.075, waves: 0.62 },
    shark: { sweep: 0.085, waves: 0.78 }
  };
  var envelope = (u) => 0.16 - 0.7 * u + 1.54 * u * u;
  var SLOPE = 0.05;
  var CURVE_STEPS = 8;
  var fixed = (value) => (Math.abs(value) < 5e-4 ? 0 : value).toFixed(3);
  function wound(points) {
    let area = 0;
    for (let at2 = 0; at2 < points.length; at2++) {
      const here = points[at2];
      const next = points[(at2 + 1) % points.length];
      if (!here || !next) continue;
      area += here[0] * next[1] - next[0] * here[1];
    }
    return area <= 0 ? points : [...points].reverse();
  }
  function rounded(given) {
    const points = wound(given);
    const mid = (a, b) => `${fixed((a[0] + b[0]) / 2)} ${fixed((a[1] + b[1]) / 2)}`;
    const last = points[points.length - 1];
    const first = points[0];
    if (!last || !first) return "";
    let d = `M${mid(last, first)}`;
    for (let at2 = 0; at2 < points.length; at2++) {
      const here = points[at2];
      const next = points[(at2 + 1) % points.length];
      if (!here || !next) continue;
      d += `Q${fixed(here[0])} ${fixed(here[1])} ${mid(here, next)}`;
    }
    return `${d}Z`;
  }
  function piece(given) {
    const points = wound(given);
    if (points.length === 0) return "";
    return `M${points.map(([x, y]) => `${fixed(x)} ${fixed(y)}`).join("L")}Z`;
  }
  function bend(kind, phase2) {
    const { sweep, waves } = SWEEP3[kind];
    const joint = JOINTS[kind];
    const run = 1 - joint;
    const at2 = (x) => {
      const u = Math.max(0, Math.min(1, (1 - x) / run));
      return sweep * envelope(u) * Math.sin(2 * Math.PI * waves * u - phase2);
    };
    const angleAt = (x) => Math.atan2(at2(x + SLOPE) - at2(x - SLOPE), 2 * SLOPE);
    return {
      angleAt,
      at: at2,
      clear(x, lift) {
        const angle = angleAt(x);
        return [x + Math.sin(angle) * lift, at2(x) - Math.cos(angle) * lift];
      },
      joint
    };
  }
  function swimmer(kind, table, phase2, fins) {
    const spine2 = bend(kind, phase2);
    const over2 = [];
    const under = [];
    for (const station3 of table) {
      over2.push(spine2.clear(station3.x, station3.over));
      under.push(spine2.clear(station3.x, -station3.under));
    }
    return rounded([...over2, ...under.reverse()]) + fins(spine2);
  }
  function hung(spine2) {
    const angle = spine2.angleAt(spine2.joint);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const base = spine2.at(spine2.joint);
    return ([x, y]) => [spine2.joint + x * cos - y * sin, base + x * sin + y * cos];
  }
  function sharkFins(spine2) {
    const carry = hung(spine2);
    return piece([
      spine2.clear(0.32, 0.05),
      spine2.clear(0.13, 0.32),
      spine2.clear(0.03, 0.15),
      spine2.clear(-0.05, 0.05)
    ]) + piece([spine2.clear(-0.3, 0.045), spine2.clear(-0.37, 0.11), spine2.clear(-0.44, 0.04)]) + piece([spine2.clear(-0.26, -0.04), spine2.clear(-0.34, -0.11), spine2.clear(-0.42, -0.03)]) + piece([spine2.clear(-0.04, -0.07), spine2.clear(-0.13, -0.15), spine2.clear(-0.2, -0.055)]) + blade(spine2.clear(0.46, -0.05), 2.95, 0.26, 0.045, -0.02) + blade(spine2.clear(0.42, -0.09), 2.55, 0.38, 0.055, 0.035) + piece([
      carry([0.04, 0]),
      carry([-0.08, -0.06]),
      carry([-0.36, -0.3]),
      carry([-0.22, -0.045]),
      carry([-0.2, 0.13]),
      carry([-0.05, 0.035])
    ]);
  }
  function dolphinFins(spine2) {
    const carry = hung(spine2);
    return piece([spine2.clear(0.28, 0.13), spine2.clear(0.03, 0.34), spine2.clear(-0.08, 0.15)]) + blade(spine2.clear(0.46, -0.12), 2.4, 0.44, 0.06, 0.04) + rounded([
      carry([0.1, 0]),
      carry([0.03, -0.07]),
      carry([-0.09, -0.15]),
      carry([-0.22, -0.21]),
      carry([-0.33, -0.245]),
      carry([-0.28, -0.19]),
      carry([-0.22, -0.13]),
      carry([-0.185, -0.07]),
      carry([-0.16, -0.02]),
      carry([-0.13, 0]),
      carry([-0.16, 0.02]),
      carry([-0.185, 0.07]),
      carry([-0.22, 0.13]),
      carry([-0.28, 0.19]),
      carry([-0.33, 0.245]),
      carry([-0.22, 0.21]),
      carry([-0.09, 0.15]),
      carry([0.03, 0.07])
    ]);
  }
  function blade(root, angle, reach2, wide, bow) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const points = [];
    const side = (way) => {
      for (let step2 = 0; step2 <= CURVE_STEPS; step2++) {
        const u = way > 0 ? step2 / CURVE_STEPS : 1 - step2 / CURVE_STEPS;
        const off = wide * (1 - u ** 1.4) * way + bow * Math.sin(u * Math.PI);
        const along2 = u * reach2;
        points.push([root[0] + along2 * cos - off * sin, root[1] + along2 * sin + off * cos]);
      }
    };
    side(1);
    side(-1);
    return rounded(points);
  }
  var sharkBody = (stroke) => swimmer("shark", SHARK, stroke * Math.PI * 2, sharkFins);
  var dolphinBody = (stroke) => swimmer("dolphin", DOLPHIN, stroke * Math.PI * 2, dolphinFins);
  var TURTLE_SEAT = 0.35;
  var TURTLE_PULL = 0.3;
  function turtleBeat(cycle) {
    const at2 = cycle - Math.floor(cycle);
    const ease3 = (part) => (1 - Math.cos(Math.PI * part)) / 2;
    if (at2 < TURTLE_PULL) {
      const through = at2 / TURTLE_PULL;
      return { phase: Math.PI * ease3(through), thrust: Math.sin(Math.PI * through) };
    }
    const back = (at2 - TURTLE_PULL) / (1 - TURTLE_PULL);
    return { phase: Math.PI + Math.PI * ease3(back), thrust: 0 };
  }
  var TURTLE_SURGE = 0.55;
  function driven(kind, cycle) {
    if (kind !== "turtle") return 1;
    const held2 = 2 * TURTLE_PULL / Math.PI;
    return 1 + TURTLE_SURGE * (turtleBeat(cycle).thrust - held2);
  }
  var TURTLE_SWING = 1.2;
  var TURTLE_REAR = 0.18;
  var TURTLE_FEATHER = 0.22;
  function turtleBody(stroke) {
    const near = turtleBeat(stroke).phase;
    const far3 = turtleBeat(stroke + 0.5).phase;
    const oar = (root, phase2, reach2, wide) => {
      const feather = Math.cos(phase2);
      const turned = 1 - TURTLE_FEATHER * feather;
      return blade(
        root,
        TURTLE_SEAT - TURTLE_SWING * Math.sin(phase2) * (0.62 + 0.38 * feather),
        reach2 * turned,
        wide * turned,
        0.06 * (1 - feather * 0.6)
      );
    };
    return (
      // The far pair first, so the near pair is drawn over them. They are the
      // same limbs half a beat behind, which is the whole of what tells a reader
      // they are on the other side of the animal.
      oar([0.3, 0.02], far3, 0.74, 0.09) + blade([-0.6, 0.06], 2.5 + TURTLE_REAR * Math.sin(far3), 0.26, 0.06, 0.02) + rounded([
        [0.45, -0.1],
        [0.2, -0.28],
        [-0.15, -0.32],
        [-0.5, -0.24],
        [-0.88, -0.02],
        [-0.55, 0.14],
        [-0.15, 0.2],
        [0.25, 0.16],
        [0.48, 0.06]
      ]) + rounded([
        [0.42, -0.05],
        [0.66, -0.11],
        [0.88, -0.12],
        [1.02, -0.03],
        [1.02, 0.06],
        [0.86, 0.12],
        [0.62, 0.12],
        [0.44, 0.1]
      ]) + oar([0.38, 0.07], near, 0.84, 0.115) + blade([-0.62, 0.11], 2.5 + TURTLE_REAR * Math.sin(near), 0.3, 0.07, 0.02)
    );
  }
  var MANTA_SPAN = 1.95;
  var MANTA_FOLD = 0.34;
  var MANTA_LAG = 0.1;
  function mantaBody(stroke) {
    const beat = Math.sin(stroke * Math.PI * 2);
    const span = MANTA_SPAN * (1 - MANTA_FOLD * Math.abs(beat));
    const bow = 0.22 * beat;
    const lag = -MANTA_LAG * (1 + 0.8 * Math.cos(stroke * Math.PI * 2));
    const wing = (side) => {
      const tip = [-0.22 + lag, side * (span + bow)];
      return [
        [0.9, side * 0.3],
        [0.42, side * (0.6 * span + bow * 0.4)],
        [0.05, side * (0.9 * span + bow * 0.8)],
        // Twice, so the corner survives the smoothing. A rounded wing tip is a
        // ray of some other sort, and the eye reads the tips before anything else.
        tip,
        tip,
        [-0.5, side * (0.5 * span + bow * 0.4)],
        [-0.74, side * 0.34]
      ];
    };
    const horn = (side) => piece([
      [0.96, side * 0.3],
      [1.28, side * (0.4 + 0.06 * beat)],
      [1.22, side * 0.22],
      [0.94, side * 0.14]
    ]);
    return rounded([
      [1.02, -0.24],
      [1.04, 0],
      [1.02, 0.24],
      ...wing(1),
      [-0.92, 0.12],
      [-0.92, -0.12],
      ...wing(-1).reverse()
    ]) + horn(1) + horn(-1) + piece([
      [-0.86, -0.035],
      [-1.9, -0.012 - 0.05 * beat],
      [-1.91, 6e-3 - 0.05 * beat],
      [-0.86, 0.035]
    ]);
  }
  var BODIES = {
    dolphin: dolphinBody,
    manta: mantaBody,
    shark: sharkBody,
    turtle: turtleBody
  };

  // ../../../codincodv2/assets/js/ornament/walkers.ts
  var CRAB_SMALLEST = 9;
  var CRAB_LARGEST = 17;
  var STARFISH_SMALLEST = 15;
  var STARFISH_LARGEST = 31;
  var DEPTH_SIZE6 = 0.55;
  var DEPTH_FAR7 = 0.12;
  var DEPTH_NEAR7 = 1;
  var STAR_BACK = 1.7;
  var MARGIN3 = 1.4;
  var SCUTTLE = 2.6;
  var HASTE2 = 0.45;
  var STAND_LEAST = 3.5;
  var STAND_SPAN = 9;
  var GO_LEAST = 0.8;
  var GO_SPAN = 2.6;
  var TURN_ODDS2 = 0.45;
  var MINDS2 = 1.6;
  var NOTICE2 = 3.2;
  var FRIGHT_FADE2 = 3.5;
  var BULK2 = 0.25;
  var FREEZE_AT = 0.05;
  var BOLT_AT = 0.55;
  var SQUASH_AT = 0.88;
  var BOLT3 = 3.4;
  var CREEP = 8e-3;
  var DAWDLE = 0.6;
  var HOLD_LEAST3 = 40;
  var HOLD_SPAN3 = 90;
  var RIDE = 0.24;
  var BOB = 0.035;
  var LEGS = 4;
  var AWAY = 0.66;
  var BEHIND2 = 0.05;
  var STRIDE3 = 0.1;
  var LIFT = 0.06;
  var GAIT2 = Math.PI * 4;
  var TOLERANCE4 = 0.25;
  var GAIT_REACH = Math.hypot(STRIDE3, LIFT);
  var ARM_TIP = 0.5;
  var ARMS = 5;
  var WEB = 0.44;
  var RIM = 44;
  var ODD_ARM = 0.22;
  var ARM_REACH = 0.12;
  var ARM_SLOWEST = 0.12;
  var ARM_FASTEST = 0.34;
  var FLATTEN = 0.46;
  var MIN_SPAN12 = 1;
  function crabShell(bob) {
    const at2 = (-RIDE - 0.22 + Math.sin(bob) * BOB).toFixed(3);
    const up = (-RIDE - 0.46 + Math.sin(bob) * BOB).toFixed(3);
    const low = (-RIDE + 0.02 + Math.sin(bob) * BOB).toFixed(3);
    return [
      `M-0.5 ${at2}`,
      `Q-0.48 ${up} 0 ${up}`,
      `Q0.48 ${up} 0.5 ${at2}`,
      `Q0.46 ${low} 0 ${low}`,
      `Q-0.46 ${low} -0.5 ${at2}`,
      "Z"
    ].join(" ");
  }
  var CRAB_SHELL = crabShell(0);
  function crabLegs(pose) {
    const legs = [];
    for (let side = -1; side <= 1; side += 2) {
      const away2 = side === -pose.facing ? AWAY : 1;
      for (let at2 = 0; at2 < LEGS; at2++) {
        const hip = { x: side * (0.44 - at2 * 0.05), y: -RIDE - 0.34 + at2 * 0.08 };
        const seat = (0.5 + at2 * 0.13) * away2;
        const swing = Math.sin(pose.stride + (at2 % 2 === 0 ? 0 : Math.PI) + (side < 0 ? Math.PI : 0));
        const foot = {
          x: side * seat + swing * STRIDE3 * pose.facing,
          y: -Math.max(0, swing) * LIFT * away2 - (away2 < 1 ? BEHIND2 : 0)
        };
        legs.push([
          hip,
          { x: (hip.x + foot.x) / 2 + side * 0.07, y: (-RIDE - 0.36 - at2 * 0.02) * away2 },
          foot
        ]);
      }
    }
    for (const up of [0, 1]) {
      const lead = pose.facing;
      const rise = -RIDE - 0.1 - up * 0.13;
      legs.push([
        { x: lead * 0.36, y: rise },
        { x: lead * (0.74 + up * 0.05), y: rise + 0.04 },
        { x: lead * (1.02 + up * 0.06), y: rise - 0.06 },
        { x: lead * (0.88 + up * 0.05), y: rise - 0.2 }
      ]);
    }
    return legs;
  }
  function starfishBody(reach2) {
    const arms = Math.max(1, reach2.length);
    const seat = Math.max(...reach2) * 0.5 * FLATTEN;
    const path = [];
    for (let at2 = 0; at2 <= RIM; at2++) {
      const turn2 = at2 / RIM * Math.PI * 2;
      const lobe = (1 + Math.cos(turn2 * arms)) / 2;
      const arm = reach2[Math.round(turn2 * arms / (Math.PI * 2)) % arms] ?? 1;
      const out = (WEB + (1 - WEB) * lobe ** 0.7) * arm * 0.5;
      const x = (Math.sin(turn2) * out).toFixed(3);
      const y = (-seat - Math.cos(turn2) * out * FLATTEN).toFixed(3);
      path.push(`${at2 === 0 ? "M" : "L"}${x} ${y}`);
    }
    path.push("Z");
    return path.join(" ");
  }
  function createWalkers(options) {
    const random = makeRandom(options.seed ^ 15434);
    let width = Math.max(MIN_SPAN12, options.width);
    let floor = options.floor;
    const walkers2 = [];
    const doings = [];
    const tolerance = Math.max(0, options.tolerance ?? TOLERANCE4);
    const held2 = [];
    function born(kind) {
      const crab = kind === "crab";
      const back = crab ? random() : random() ** STAR_BACK;
      const depth = DEPTH_FAR7 + back * (DEPTH_NEAR7 - DEPTH_FAR7);
      const span = crab ? CRAB_SMALLEST + random() * (CRAB_LARGEST - CRAB_SMALLEST) : STARFISH_SMALLEST + random() * (STARFISH_LARGEST - STARFISH_SMALLEST);
      const size = span * (1 - DEPTH_SIZE6 + DEPTH_SIZE6 * depth);
      const x = random() * width;
      const odd = [];
      const arms = [];
      const rates = [];
      if (!crab) {
        for (let at2 = 0; at2 < ARMS; at2++) {
          odd.push(1 - ODD_ARM + random() * ODD_ARM * 2);
          arms.push(random() * Math.PI * 2);
          rates.push(ARM_SLOWEST + random() * (ARM_FASTEST - ARM_SLOWEST));
        }
      }
      const going = crab ? random() < 0.3 : true;
      const run = crab ? bout(going) : HOLD_LEAST3 + random() * HOLD_SPAN3;
      let quickest = 0;
      for (let at2 = 0; at2 < odd.length; at2++) {
        quickest = Math.max(quickest, (odd[at2] ?? 0) * (rates[at2] ?? 0) * ARM_REACH * ARM_TIP);
      }
      doings.push({
        arms,
        at: random() * run,
        chased: 0,
        creep: quickest,
        fright: 0,
        going,
        odd,
        pace: crab ? size * SCUTTLE * (1 - HASTE2 + random() * HASTE2 * 2) : size * CREEP * (1 - DAWDLE + random() * DAWDLE * 2),
        rates,
        span: run,
        stride: random() * Math.PI * 2
      });
      walkers2.push({
        body: "",
        cut: 0,
        depth,
        facing: random() < 0.5 ? -1 : 1,
        kind,
        legs: [],
        size,
        x,
        y: floor(x, depth)
      });
      held2.push(null);
    }
    function bout(going) {
      return going ? GO_LEAST + random() * GO_SPAN : STAND_LEAST + random() * STAND_SPAN;
    }
    function minded(one, water) {
      const seen = { chased: 0, from: one.x, near: 0 };
      for (const thing of water) {
        if (thing.size < one.size * MINDS2) continue;
        const reach2 = thing.size * NOTICE2;
        const away2 = Math.hypot(one.x - thing.x, one.y - thing.y);
        if (away2 >= reach2) continue;
        const near = (1 - away2 / reach2) * abreast(one.depth, thing.depth);
        if (near <= seen.near) continue;
        seen.chased = near * (BULK2 + (thing.menace ?? 0) * (1 - BULK2));
        seen.from = thing.x;
        seen.near = near;
      }
      return seen;
    }
    function carry(at2, seconds, water) {
      const one = walkers2[at2];
      const doing = doings[at2];
      if (!one || !doing) return;
      doing.at += seconds;
      const was = held2[at2];
      if (was) was.since += seconds;
      if (one.kind === "crab") {
        const seen = minded(one, water);
        doing.fright = Math.max(0, Math.max(doing.fright - seconds / FRIGHT_FADE2, seen.near));
        doing.chased = Math.max(0, Math.max(doing.chased - seconds / FRIGHT_FADE2, seen.chased));
        if (doing.chased > BOLT_AT || doing.fright > SQUASH_AT) {
          one.facing = one.x < seen.from ? -1 : 1;
          const gone2 = doing.pace * BOLT3 * seconds * one.facing;
          one.x += gone2;
          doing.stride += Math.abs(gone2) / one.size * GAIT2;
          settle(one);
          return;
        }
        if (doing.fright > FREEZE_AT) {
          settle(one);
          return;
        }
        if (doing.at >= doing.span) {
          doing.going = !doing.going;
          doing.at = 0;
          doing.span = bout(doing.going);
          if (!doing.going && random() < TURN_ODDS2) one.facing = -one.facing;
        }
        if (doing.going) {
          const gone2 = doing.pace * seconds * one.facing;
          one.x += gone2;
          doing.stride += Math.abs(gone2) / one.size * GAIT2;
        }
      } else {
        if (doing.at >= doing.span) {
          doing.at = 0;
          doing.span = HOLD_LEAST3 + random() * HOLD_SPAN3;
          one.facing = random() < 0.5 ? -1 : 1;
        }
        one.x += doing.pace * seconds * one.facing;
        for (let arm = 0; arm < doing.arms.length; arm++) {
          doing.arms[arm] = (doing.arms[arm] ?? 0) + (doing.rates[arm] ?? 0) * seconds;
        }
      }
      settle(one);
    }
    function settle(one) {
      const past = one.size * MARGIN3;
      if (one.x < -past) one.x += width + past * 2;
      if (one.x > width + past) one.x -= width + past * 2;
      one.y = floor(one.x, one.depth);
    }
    function stir2(at2) {
      const one = walkers2[at2];
      const doing = doings[at2];
      const was = held2[at2];
      if (!one || !doing || !was) return Number.POSITIVE_INFINITY;
      if (was.facing !== one.facing) return Number.POSITIVE_INFINITY;
      const worked = GAIT_REACH * Math.abs(doing.stride - was.stride) + doing.creep * was.since;
      return Math.hypot(one.x - was.x, one.y - was.y) + one.size * worked;
    }
    function draw2(at2) {
      const one = walkers2[at2];
      const doing = doings[at2];
      if (!one || !doing) return;
      held2[at2] = {
        facing: one.facing,
        since: 0,
        stride: doing.stride,
        x: one.x,
        y: one.y
      };
      one.cut++;
      if (one.kind === "crab") {
        one.body = crabShell(doing.stride);
        one.legs = crabLegs({ facing: one.facing, stride: doing.stride });
        return;
      }
      one.body = starfishBody(
        doing.odd.map((odd, arm) => odd * (1 + Math.sin(doing.arms[arm] ?? 0) * ARM_REACH))
      );
    }
    function stock() {
      walkers2.length = 0;
      doings.length = 0;
      held2.length = 0;
      for (let made = 0; made < Math.max(0, options.crabs ?? 0); made++) born("crab");
      for (let made = 0; made < Math.max(0, options.starfish ?? 0); made++) born("starfish");
    }
    function advance2(seconds) {
      const step2 = Math.min(Math.max(seconds, 0), 0.1);
      const water = options.about?.() ?? [];
      for (let at2 = 0; at2 < walkers2.length; at2++) {
        carry(at2, step2, water);
        if (stir2(at2) >= tolerance) draw2(at2);
      }
    }
    stock();
    advance2(0);
    return {
      resize(nextWidth, _height, nextFloor) {
        const scale = Math.max(MIN_SPAN12, nextWidth) / width;
        width = Math.max(MIN_SPAN12, nextWidth);
        floor = nextFloor;
        for (let at2 = 0; at2 < walkers2.length; at2++) {
          const one = walkers2[at2];
          if (!one) continue;
          one.x *= scale;
          one.y = floor(one.x, one.depth);
          draw2(at2);
        }
      },
      step: advance2,
      walkers: walkers2
    };
  }

  // pen.ts
  var FORM = { fill: 0, light: 2, stroke: 1, wash: 3 };
  var TONE = { dusk: 4, ink: 6, moon: 3, shadow: 1, sun: 2, surface: 5, water: 0 };
  var SPENT = 512;
  var OWN = -1;
  var Pen = class {
    constructor(floats, at2) {
      this.floats = floats;
      this.at = at2;
      this.held = at2;
      this.floats[this.at++] = 0;
    }
    floats;
    at;
    drawn = 0;
    held = 0;
    /** How many numbers were written, once every drawing is in. */
    close() {
      this.floats[this.held] = this.drawn;
      return this.at;
    }
    fill(parts, mark, spot) {
      this.head(FORM.fill, mark);
      this.parts(parts, spot);
    }
    line(parts, mark, spot) {
      this.head(FORM.stroke, mark);
      this.parts(parts, spot);
    }
    /** A round light, which is a middle and a reach rather than a shape. */
    light(x, y, mark) {
      this.head(FORM.light, mark);
      this.put(1);
      this.put(1);
      this.put(x);
      this.put(y);
    }
    /** A wash over the whole box, which is what a night is. */
    wash(mark) {
      this.head(FORM.wash, mark);
      this.put(0);
    }
    head(form, mark) {
      this.drawn++;
      this.put(form);
      this.put((mark.tone ?? TONE.water) | (mark.spent ? SPENT : 0));
      this.put(mark.weight ?? 0);
      this.put(mark.shade ?? OWN);
      this.put(mark.alpha ?? 1);
      this.put(mark.lane);
      this.put(mark.width ?? 0);
      this.put(mark.fall ?? 1);
      this.put(mark.fade ? mark.fade[0] : 0);
      this.put(mark.fade ? mark.fade[1] : 0);
      this.put(mark.thin ?? 1);
      this.put(mark.soft ?? 0);
    }
    /**
     * Every piece of one drawing, stood where it is seen.
     *
     * Several pieces rather than one, because an animal is not one outline: a
     * fish is a body, a tail swung off its joint and a fin rooted inside the
     * back, and they are meant to overlap. Handed over as one drawing they are
     * filled as one silhouette; handed over as three they would each be painted
     * over the last, and every overlap would show as a seam.
     */
    parts(parts, spot) {
      this.put(parts.length);
      const scale = (spot?.scale ?? 1) * 1;
      const mirror = spot?.facing ?? 1;
      const turn2 = spot?.tilt ?? 0;
      const cos = Math.cos(turn2);
      const sin = Math.sin(turn2);
      for (const points of parts) {
        this.put(points.length);
        for (let i = 0; i < points.length; i++) {
          if (!spot) {
            this.put(points[i].x);
            this.put(points[i].y);
            continue;
          }
          const x = points[i].x * scale * mirror;
          const y = points[i].y * scale;
          this.put(spot.x + x * cos - y * sin);
          this.put(spot.y + x * sin + y * cos);
        }
      }
    }
    put(value) {
      this.floats[this.at++] = value;
    }
  };

  // light.ts
  var RAY_INK = 0.07;
  var SNOW_INK = 0.15;
  var BUBBLE_INK = 0.3;
  var MOON_RAYS = 0.28;
  var PLIES = 4;
  var TAPER = 0.13;
  var BUBBLES = 96;
  var LANE = { ray: -1 };
  function paintRays(pen, light3, daylight2) {
    const overcast = MOON_RAYS + (1 - MOON_RAYS) * daylight2;
    for (const ray of light3.rays) {
      const slope = Math.tan(ray.tilt);
      const mouth = ray.span / 2;
      const hem = ray.span * SPREAD / 2;
      const lit = RAY_INK / PLIES * overcast * ray.glow;
      if (lit <= 0) continue;
      for (let ply = 0; ply < PLIES; ply++) {
        const inset = 1 - ply / PLIES;
        const drop = ray.reach * (1 - ply * TAPER);
        const lean = drop * slope;
        const lip = mouth * inset;
        const flare = (mouth + (hem - mouth) * (ray.reach > 0 ? drop / ray.reach : 0)) * inset;
        pen.fill(
          [
            [
              { x: ray.x - lip, y: 0 },
              { x: ray.x + lip, y: 0 },
              { x: ray.x + flare + lean, y: drop },
              { x: ray.x - flare + lean, y: drop }
            ]
          ],
          {
            alpha: lit,
            fade: [0, drop],
            lane: LANE.ray,
            spent: true,
            tone: TONE.ink
          }
        );
      }
    }
  }
  function paintSnow(pen, drift2) {
    for (const mote of drift2.motes) {
      pen.fill([disc(mote.x, mote.y, mote.r)], {
        lane: mote.depth,
        shade: mote.y,
        weight: SNOW_INK * mote.depth
      });
    }
    let drawn2 = 0;
    for (const bubble of drift2.bubbles) {
      if (drawn2++ >= BUBBLES) break;
      pen.line([ring(bubble.x, bubble.y, bubble.r)], {
        alpha: BUBBLE_INK * bubble.depth,
        lane: bubble.depth,
        shade: OWN,
        tone: TONE.ink,
        width: 1
      });
    }
  }
  var SIDES = 16;
  function disc(cx, cy, r) {
    const points = [];
    for (let i = 0; i < SIDES; i++) {
      const turn2 = i / SIDES * Math.PI * 2;
      points.push({ x: cx + r * Math.cos(turn2), y: cy + r * Math.sin(turn2) });
    }
    return points;
  }
  function ring(cx, cy, r) {
    const points = disc(cx, cy, r);
    points.push(points[0]);
    return points;
  }

  // ../../../codincodv2/assets/js/ornament/fish_shape.ts
  var SPAN = 38;
  var NOSE = 29;
  var along = (t) => 21 * t * (1 - t) ** 2 + 63 * t ** 2 * (1 - t) + 29 * t ** 3;
  var half = (t) => 24 * t * (1 - t) + WRIST * (1 - t);
  var WRIST = 1.4;
  var STATIONS = 20;
  var SWEEP4 = 0.2;
  var WAVES = 0.85;
  var TWIST = 2 * Math.PI * WAVES;
  var envelope2 = (u) => 0.2 - 0.8 * u + 1.6 * u * u;
  var wave = (u, phase2) => envelope2(u) * Math.sin(TWIST * u - phase2);
  var SLOPE2 = 0.6;
  var FLUKE_BACK = -9;
  var FLUKE_SPREAD = 7;
  var FLUKE_NOTCH = -7;
  var SAMPLES = 90;
  function reach(amp) {
    let low = Number.POSITIVE_INFINITY;
    let high = Number.NEGATIVE_INFINITY;
    for (let at2 = 0; at2 < SAMPLES; at2++) {
      const phase2 = at2 / SAMPLES * 2 * Math.PI;
      const sway = (x) => amp * wave(1 - x / NOSE, phase2);
      const angle = Math.atan2(sway(SLOPE2) - sway(-SLOPE2), 2 * SLOPE2);
      const tip = sway(0) + FLUKE_BACK * Math.sin(angle);
      low = Math.min(low, tip);
      high = Math.max(high, tip);
    }
    return high - low;
  }
  function fitted() {
    let amp = SWEEP4 * SPAN;
    for (let pass = 0; pass < 8; pass++) amp *= SWEEP4 * SPAN / reach(amp);
    return amp;
  }
  var AMP = fitted();
  function spine(x, phase2) {
    return AMP * wave(1 - x / NOSE, phase2);
  }
  function station2(x, phase2) {
    const back = spine(x - SLOPE2, phase2);
    const front = spine(x + SLOPE2, phase2);
    return { angle: Math.atan2(front - back, 2 * SLOPE2), x, y: spine(x, phase2) };
  }
  var clear = (on, lift) => [
    on.x + Math.sin(on.angle) * lift,
    on.y - Math.cos(on.angle) * lift
  ];
  var above = (x, lift, phase2) => clear(station2(x, phase2), lift);
  var fixed2 = (value) => value.toFixed(2);
  function rounded2(points) {
    const mid = (a, b) => `${fixed2((a[0] + b[0]) / 2)} ${fixed2((a[1] + b[1]) / 2)}`;
    const last = points[points.length - 1];
    let d = `M${mid(last, points[0])}`;
    for (let at2 = 0; at2 < points.length; at2++) {
      const here = points[at2];
      const next = points[(at2 + 1) % points.length];
      d += `Q${fixed2(here[0])} ${fixed2(here[1])} ${mid(here, next)}`;
    }
    return `${d}Z`;
  }
  var fin = (points) => `M${points.map(([x, y]) => `${fixed2(x)} ${fixed2(y)}`).join("L")}Z`;
  function dorsal(phase2) {
    const foot = (t, over2) => {
      const x = along(t);
      return clear(station2(x, phase2), half(t) + over2);
    };
    return fin([foot(0.38, -SET), foot(0.52, TIP), foot(0.66, -SET)]);
  }
  var SET = 0.8;
  var TIP = 5;
  function outline(phase2) {
    const top = [];
    const bottom = [];
    for (let at2 = 0; at2 <= STATIONS; at2++) {
      const t = at2 / STATIONS;
      const x = along(t);
      const on = station2(x, phase2);
      const lift = half(t);
      top.push(clear(on, lift));
      bottom.push(clear(on, -lift));
    }
    return [...top, ...bottom.reverse()];
  }
  var ROOT2 = 2.5;
  function tail(phase2) {
    const joint = station2(0, phase2);
    const cos = Math.cos(joint.angle);
    const sin = Math.sin(joint.angle);
    const carry = ([x, y]) => [
      joint.x + x * cos - y * sin,
      joint.y + x * sin + y * cos
    ];
    return fin([
      carry([ROOT2, 0]),
      carry([FLUKE_BACK, FLUKE_SPREAD]),
      carry([FLUKE_NOTCH, 0]),
      carry([FLUKE_BACK, -FLUKE_SPREAD])
    ]);
  }
  var STEPS2 = 48;
  var drawn = new Array(STEPS2);
  var EYE_R = 1.5;
  var EYE_X = 22;
  var EYE_LIFT = 2;
  function build(at2) {
    const phase2 = at2 / STEPS2 * 2 * Math.PI;
    const [x, y] = above(EYE_X, EYE_LIFT, phase2);
    const d = rounded2(outline(phase2)) + tail(phase2) + dorsal(phase2);
    return {
      at: at2,
      billed: d + bill(phase2),
      d,
      eye: { r: EYE_R, x, y }
    };
  }
  function bill(phase2) {
    const nose = station2(NOSE, phase2);
    const cos = Math.cos(nose.angle);
    const sin = Math.sin(nose.angle);
    const carry = ([x, y]) => [
      nose.x + x * cos - y * sin,
      nose.y + x * sin + y * cos
    ];
    return fin([
      carry([-BILL_ROOT, -BILL_GIRTH]),
      carry([BILL_REACH, 0]),
      carry([-BILL_ROOT, BILL_GIRTH])
    ]);
  }
  var BILL_REACH = 15;
  var BILL_GIRTH = 1.1;
  var BILL_ROOT = 3;
  function frameAt(phase2) {
    const at2 = (Math.round(phase2 / (2 * Math.PI) * STEPS2) % STEPS2 + STEPS2) % STEPS2;
    const had = drawn[at2];
    if (had) return had;
    const made = build(at2);
    drawn[at2] = made;
    return made;
  }

  // trace.ts
  var STEP = 1.2;
  var MOST = 24;
  var walked = /* @__PURE__ */ new Map();
  function trace(d) {
    const held2 = walked.get(d);
    if (held2) return held2;
    const cut = walk(d);
    walked.set(d, cut);
    return cut;
  }
  function walk(d) {
    const parts = [];
    let here = [];
    let at2 = { x: 0, y: 0 };
    let start = { x: 0, y: 0 };
    const tokens = d.match(/[MLCQZmlcqz]|-?\d*\.?\d+(?:e-?\d+)?/g) ?? [];
    let read = 0;
    const number = () => Number(tokens[read++]);
    while (read < tokens.length) {
      const command = tokens[read++];
      if (command === "M" || command === "m") {
        if (here.length > 1) parts.push(here);
        here = [];
        at2 = { x: number(), y: number() };
        start = at2;
        here.push(at2);
        continue;
      }
      if (command === "L" || command === "l") {
        at2 = { x: number(), y: number() };
        here.push(at2);
        continue;
      }
      if (command === "C" || command === "c") {
        const one = { x: number(), y: number() };
        const two = { x: number(), y: number() };
        const end = { x: number(), y: number() };
        cubic(here, at2, one, two, end);
        at2 = end;
        continue;
      }
      if (command === "Q" || command === "q") {
        const hold = { x: number(), y: number() };
        const end = { x: number(), y: number() };
        quadratic(here, at2, hold, end);
        at2 = end;
        continue;
      }
      if (command === "Z" || command === "z") {
        if (here.length > 1) parts.push(here);
        here = [];
        at2 = start;
        continue;
      }
    }
    if (here.length > 1) parts.push(here);
    return parts;
  }
  function pieces(reach2) {
    return Math.max(2, Math.min(MOST, Math.ceil(reach2 / STEP)));
  }
  function cubic(into, from, one, two, end) {
    const reach2 = Math.hypot(one.x - from.x, one.y - from.y) + Math.hypot(two.x - one.x, two.y - one.y) + Math.hypot(end.x - two.x, end.y - two.y);
    const steps = pieces(reach2);
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const u = 1 - t;
      into.push({
        x: u * u * u * from.x + 3 * u * u * t * one.x + 3 * u * t * t * two.x + t * t * t * end.x,
        y: u * u * u * from.y + 3 * u * u * t * one.y + 3 * u * t * t * two.y + t * t * t * end.y
      });
    }
  }
  function quadratic(into, from, hold, end) {
    const reach2 = Math.hypot(hold.x - from.x, hold.y - from.y) + Math.hypot(end.x - hold.x, end.y - hold.y);
    const steps = pieces(reach2);
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const u = 1 - t;
      into.push({
        x: u * u * from.x + 2 * u * t * hold.x + t * t * end.x,
        y: u * u * from.y + 2 * u * t * hold.y + t * t * end.y
      });
    }
  }

  // life.ts
  var OPEN_WATER = 0.22;
  var DEPTH_INK = 0.65;
  var CRAWLER_INK = 0.42;
  var CRAWLER_LIFT = 0.8;
  var CRAWLER_RISEN = 0.62;
  var FROTH_INK = 0.3;
  var FROTH_LET_GO = 0.45;
  var HAZE_INK = 0.04;
  var HULL_INK = 0.16;
  var PING_INK = 0.62;
  var SPECK_INK = 0.16;
  var VISITOR_INK = 0.42;
  var CUT_SHADE = 0.34;
  var ARM_GIRTH = 0.075;
  var TENTACLE_GIRTH = 0.035;
  var MOST2 = { froth: 220, passers: 4, specks: 420, visitors: 6 };
  var LANE2 = { froth: 1.15, passer: 1.2 };
  function afloat(full, depth) {
    return full * (1 - DEPTH_INK + DEPTH_INK * depth);
  }
  function far(full, depth) {
    return HAZE_INK + (full - HAZE_INK) * Math.min(1, Math.max(0, depth));
  }
  function paintShoal(pen, shoal2) {
    for (const fish of shoal2.fish) {
      const weight = afloat(OPEN_WATER, fish.depth);
      if (weight <= 2e-3) continue;
      const frame = frameAt(fish.tail);
      const spot = {
        facing: fish.facing,
        scale: fish.size / SPAN,
        tilt: fish.tilt,
        x: fish.x,
        y: fish.y
      };
      pen.fill(trace(SPECIES[fish.kind].bill > 0 ? frame.billed : frame.d), {
        lane: fish.depth,
        shade: fish.y,
        weight
      }, spot);
      pen.fill([disc(frame.eye.x, frame.eye.y, frame.eye.r)], {
        lane: fish.depth,
        shade: fish.y,
        weight: weight * CUT_SHADE
      }, spot);
    }
  }
  function paintNemos(pen, nemos2) {
    for (const nemo of nemos2.nemos) {
      const weight = afloat(OPEN_WATER, nemo.host.depth) * (1 - nemo.cover);
      if (weight <= 2e-3) continue;
      pen.fill(trace(frameAt(nemo.beat).d), {
        lane: -3 + nemo.host.depth,
        shade: nemo.y,
        weight
      }, {
        facing: nemo.face,
        scale: nemo.length / SPAN,
        tilt: nemo.tilt,
        x: nemo.x,
        y: nemo.y
      });
    }
  }
  function paintSwarm(pen, flock2) {
    let drawn2 = 0;
    for (const speck of flock2.specks) {
      if (drawn2++ >= MOST2.specks) break;
      const weight = afloat(SPECK_INK, speck.depth) * flock2.weight;
      if (weight <= 2e-3) continue;
      const girth = Math.max(0.7, speck.size * 0.42);
      pen.line([[{ x: -speck.size / 2, y: 0 }, { x: speck.size / 2, y: 0 }]], {
        lane: speck.depth,
        shade: speck.y,
        weight,
        width: girth
      }, { tilt: speck.tilt, x: speck.x, y: speck.y });
    }
  }
  function paintVisitors(pen, visitors2) {
    let drawn2 = 0;
    for (const guest of visitors2.crossing) {
      if (drawn2++ >= MOST2.visitors) break;
      const weight = afloat(VISITOR_INK * guest.weight, guest.depth);
      if (weight <= 2e-3) continue;
      pen.fill(trace(BODIES[guest.kind](guest.stroke)), {
        lane: guest.depth,
        shade: guest.y,
        weight
      }, {
        facing: guest.facing,
        scale: guest.size,
        tilt: guest.tilt,
        x: guest.x,
        y: guest.y
      });
    }
  }
  function paintInklings(pen, inklings2) {
    for (const squid of inklings2.squids) {
      const weight = afloat(OPEN_WATER, squid.depth);
      if (weight <= 2e-3) continue;
      const spot = {
        facing: squid.facing,
        scale: squid.size,
        tilt: squid.tilt,
        x: squid.x,
        y: squid.y
      };
      const mark = { lane: squid.depth, shade: squid.y, weight };
      pen.fill(trace(squidBody(squid.squeeze)), mark, spot);
      pen.line(squidArms(squid.squeeze), { ...mark, width: TENTACLE_GIRTH * squid.size }, spot);
    }
    for (const octopus of inklings2.octopuses) {
      const aloft = Math.max(-1, Math.min(1, octopus.lift / CRAWLER_LIFT));
      const bedded = far(CRAWLER_INK, octopus.depth);
      const risen = far(CRAWLER_RISEN, octopus.depth);
      const weight = aloft < 0 ? bedded * (1 + aloft * 0.7) : bedded + (risen - bedded) * aloft;
      if (weight <= 2e-3) continue;
      const spot = { scale: octopus.size, x: octopus.x, y: octopus.y };
      const mark = { lane: octopus.depth, shade: octopus.y, weight };
      pen.fill(trace(octopusHead(octopus.breath)), mark, spot);
      pen.line(octopusArms(octopus), { ...mark, width: ARM_GIRTH * octopus.size }, spot);
    }
  }
  function paintWalkers(pen, walkers2) {
    for (const one of walkers2.walkers) {
      const weight = far(CRAWLER_INK, one.depth);
      if (weight <= 2e-3) continue;
      const spot = { facing: one.facing, scale: one.size, x: one.x, y: one.y };
      const mark = { lane: one.depth, shade: one.y, weight };
      pen.line(one.legs, { ...mark, width: ARM_GIRTH * one.size }, spot);
      pen.fill(trace(one.body), mark, spot);
    }
  }
  function paintPassers(pen, passers2) {
    let drawn2 = 0;
    for (const one of passers2.passing) {
      if (drawn2++ >= MOST2.passers) break;
      const weight = HULL_INK * one.weight;
      const spot = { facing: one.facing, scale: one.scale, x: one.x, y: one.y };
      const mark = { lane: LANE2.passer, shade: one.y, weight };
      if (one.kind === "boat") {
        pen.fill(trace(HULL), mark, spot);
        pen.fill(trace(SCREWS), mark, spot);
      }
      if (one.kind === "submarine") {
        pen.fill(trace(SUBMARINE), mark, spot);
        pen.fill(trace(SUB_SCREW), mark, spot);
      }
      if (one.kind === "sonar") {
        for (const stagger of PING_RINGS) {
          const at2 = ringAt(one.along, stagger);
          if (!at2) continue;
          pen.line([ring(one.x, one.y, at2.reach * one.scale)], {
            alpha: PING_INK * at2.weight * one.weight,
            lane: LANE2.passer,
            shade: OWN,
            tone: TONE.ink,
            // Thick where it leaves and a hairline by the time it is spent. A
            // front carries what it was sent with, spread over a circle that
            // keeps growing.
            width: Math.max(1, Math.round(4 * at2.weight))
          });
        }
      }
    }
    let churned = 0;
    for (const puff of passers2.wake) {
      if (churned++ >= MOST2.froth) break;
      pen.fill([disc(puff.x, puff.y, puff.r)], {
        alpha: Math.min(1, (1 - puff.age) / FROTH_LET_GO),
        lane: LANE2.froth,
        shade: puff.y,
        weight: FROTH_INK * (1 - puff.age)
      });
    }
  }

  // rock.ts
  var CRAG_INK = 0.94;
  var FLORA_INK = 0.33;
  var HAZE_INK2 = 0.04;
  var ISLE_INK = 0.88;
  var PLUME_INK = 0.2;
  var RELIC_INK = 0.24;
  var STONE_INK = 0.25;
  var CUT_SHADE2 = 0.34;
  var PLUME_LET_GO = 0.25;
  var CRAG_NEAR = 0.8;
  var CRAG_BLUR = 0.24 * 48;
  var PERCH_SCALE = 1.15;
  var PERCH_SHADE = 0.72;
  var BLADE_GIRTH = 0.8;
  var MOST3 = { plume: 76, relics: 4 };
  var LANE3 = { isle: -1.15, plume: -1.6 };
  function far2(full, depth) {
    return HAZE_INK2 + (full - HAZE_INK2) * Math.min(1, Math.max(0, depth));
  }
  function faced(points, edge2, box2) {
    const out = points.map((p) => ({ x: p.x, y: p.y }));
    if (!out.length) return out;
    const first = out[0];
    const last = out[out.length - 1];
    const past = 60;
    if (edge2 === "top") {
      out.push({ x: last.x, y: -past });
      out.push({ x: first.x, y: -past });
      return out;
    }
    const side = edge2 === "left" ? -past : box2.width + past;
    out.push({ x: side, y: last.y });
    out.push({ x: side, y: first.y });
    return out;
  }
  function floored(points, box2) {
    const out = points.map((p) => ({ x: p.x, y: p.y }));
    if (!out.length) return out;
    out.push({ x: out[out.length - 1].x, y: box2.height + 2 });
    out.push({ x: out[0].x, y: box2.height + 2 });
    return out;
  }
  function paintStones(pen, seabed2) {
    for (const stone of seabed2.stones) {
      const run = Math.max(0, stone.span - stone.rise) / 2;
      pen.line([[{ x: -run, y: 0 }, { x: run, y: 0 }]], {
        lane: -2 + stone.depth * 0.3,
        shade: stone.y,
        weight: far2(STONE_INK, stone.depth),
        width: stone.rise
      }, { tilt: stone.lean, x: stone.x, y: stone.y - stone.rise * 0.12 });
    }
  }
  function paintHeads(pen, reef2) {
    for (const head of reef2.heads) {
      const weight = far2(FLORA_INK, head.depth);
      const mark = { lane: -3 + head.depth, shade: head.y, weight };
      if (head.blades.length > 0) {
        pen.line([head.points], { ...mark, width: head.girth });
        pen.line(head.blades, { ...mark, width: head.girth * BLADE_GIRTH });
      }
      if (head.twigs.length === 0) continue;
      const spot = { scale: head.scale, tilt: head.lean + head.bend, x: head.x, y: head.y };
      for (const twig of head.twigs) {
        pen.line(trace(twig.d), { ...mark, width: twig.width * head.scale }, spot);
      }
    }
  }
  function paintCrags(pen, crags2, box2) {
    for (const crag of crags2.rocks) {
      const weight = CRAG_INK * crag.depth;
      const near = crag.depth >= CRAG_NEAR;
      const adrift = near ? (crag.depth - CRAG_NEAR) / Math.max(0.01, 1 - CRAG_NEAR) : 0;
      const lane = near ? crag.depth + 0.5 : crag.depth;
      const soft = CRAG_BLUR * adrift;
      pen.fill([faced(crag.outline, crag.edge, box2)], {
        lane,
        shade: OWN,
        soft,
        tone: TONE.shadow,
        weight
      });
      for (const perch of crag.perches) {
        const unit = perch.size * PERCH_SCALE * crag.depth;
        const spot = { scale: unit, tilt: perch.lean + Math.PI / 2, x: perch.x, y: perch.y };
        for (const twig of SPRIGS[perch.kind]) {
          pen.line(trace(twig.d), {
            lane,
            shade: perch.y,
            soft,
            tone: TONE.shadow,
            weight: weight * PERCH_SHADE,
            width: twig.width * unit
          }, spot);
        }
      }
    }
    if (crags2.isle) {
      pen.fill([floored(crags2.isle.outline, box2)], {
        lane: LANE3.isle,
        shade: OWN,
        tone: TONE.shadow,
        weight: ISLE_INK
      });
    }
  }
  function paintRelics(pen, wreckage2) {
    let drawn2 = 0;
    for (const one of wreckage2.relics) {
      if (drawn2++ >= MOST3.relics) break;
      const weight = RELIC_INK * one.depth;
      const spot = { scale: one.scale, tilt: one.lean, x: one.x, y: one.y };
      const mark = { lane: -3 + one.depth, shade: one.y, weight };
      const cut = { ...mark, weight: weight * CUT_SHADE2 };
      const body = one.kind === "wreck" ? WRECK : one.kind === "smoker" ? SMOKER : one.kind === "chest" ? CHEST_BODY : BLOCK_CARD;
      pen.fill(trace(body), mark, spot);
      if (one.kind === "wreck") {
        pen.line([WRECK_SPAR], { ...mark, width: 0.03 * one.scale }, spot);
      }
      if (one.kind === "block") {
        for (const line of BLOCK_LINES) pen.fill(trace(line), cut, spot);
      }
      if (one.kind === "chest") {
        for (const band of CHEST_BANDS) pen.fill(trace(band), cut, spot);
        pen.fill(trace(CHEST_LOCK), cut, spot);
        pen.fill(trace(LAPTOP_BASE), mark, spot);
        pen.fill(trace(LAPTOP_SCREEN), { ...mark, tone: TONE.ink, weight: 1 }, spot);
        for (const row of LAPTOP_LINES) {
          pen.fill(trace(row), { ...mark, tone: TONE.surface, weight: 1 }, spot);
        }
      }
    }
    let puffed = 0;
    for (const puff of wreckage2.plume) {
      if (puffed++ >= MOST3.plume) break;
      pen.fill([disc(puff.x, puff.y, puff.r)], {
        alpha: Math.min(1, (1 - puff.age) / PLUME_LET_GO),
        lane: LANE3.plume,
        shade: puff.y,
        weight: PLUME_INK * Math.sqrt(Math.max(0, 1 - puff.age))
      });
    }
  }

  // ../../../codincodv2/assets/js/ornament/sun.ts
  var RAD = Math.PI / 180;
  var J2000_OFFSET_DAYS = 10957.5;
  var DAY_MS = 864e5;
  var OBLIQUITY = 23.4397 * RAD;
  var REGION_LATITUDE = {
    Africa: 5,
    America: 38,
    Antarctica: -70,
    Arctic: 78,
    Asia: 30,
    Atlantic: 35,
    Australia: -30,
    Europe: 50,
    Indian: -15,
    Pacific: -20
  };
  var ZONE_PLACE = {
    "Africa/Cairo": [30, 31.2],
    "Africa/Casablanca": [33.6, -7.6],
    "Africa/Johannesburg": [-26.2, 28],
    "Africa/Lagos": [6.5, 3.4],
    "Africa/Nairobi": [-1.3, 36.8],
    "America/Argentina/Buenos_Aires": [-34.6, -58.4],
    "America/Bogota": [4.7, -74.1],
    "America/Chicago": [41.9, -87.6],
    "America/Denver": [39.7, -105],
    "America/Halifax": [44.6, -63.6],
    "America/Lima": [-12, -77],
    "America/Los_Angeles": [34.1, -118.2],
    "America/Mexico_City": [19.4, -99.1],
    "America/New_York": [40.7, -74],
    "America/Phoenix": [33.4, -112.1],
    "America/Santiago": [-33.4, -70.7],
    "America/Sao_Paulo": [-23.5, -46.6],
    "America/Toronto": [43.7, -79.4],
    "America/Vancouver": [49.3, -123.1],
    "Asia/Bangkok": [13.8, 100.5],
    "Asia/Dubai": [25.2, 55.3],
    "Asia/Hong_Kong": [22.3, 114.2],
    "Asia/Jakarta": [-6.2, 106.8],
    "Asia/Jerusalem": [31.8, 35.2],
    "Asia/Karachi": [24.9, 67],
    "Asia/Kolkata": [22.6, 88.4],
    "Asia/Manila": [14.6, 121],
    "Asia/Seoul": [37.6, 127],
    "Asia/Shanghai": [31.2, 121.5],
    "Asia/Singapore": [1.3, 103.8],
    "Asia/Taipei": [25, 121.5],
    "Asia/Tehran": [35.7, 51.4],
    "Asia/Tokyo": [35.7, 139.7],
    "Atlantic/Reykjavik": [64.1, -21.9],
    "Australia/Brisbane": [-27.5, 153],
    "Australia/Melbourne": [-37.8, 145],
    "Australia/Perth": [-31.9, 115.9],
    "Australia/Sydney": [-33.9, 151.2],
    "Europe/Amsterdam": [52.4, 4.9],
    "Europe/Athens": [38, 23.7],
    "Europe/Berlin": [52.5, 13.4],
    "Europe/Brussels": [50.8, 4.4],
    "Europe/Bucharest": [44.4, 26.1],
    "Europe/Dublin": [53.3, -6.3],
    "Europe/Helsinki": [60.2, 24.9],
    "Europe/Istanbul": [41, 29],
    "Europe/Kyiv": [50.5, 30.5],
    "Europe/Lisbon": [38.7, -9.1],
    "Europe/London": [51.5, -0.1],
    "Europe/Madrid": [40.4, -3.7],
    "Europe/Moscow": [55.8, 37.6],
    "Europe/Oslo": [59.9, 10.8],
    "Europe/Paris": [48.9, 2.4],
    "Europe/Prague": [50.1, 14.4],
    "Europe/Rome": [41.9, 12.5],
    "Europe/Stockholm": [59.3, 18.1],
    "Europe/Vienna": [48.2, 16.4],
    "Europe/Warsaw": [52.2, 21],
    "Europe/Zurich": [47.4, 8.5],
    "Pacific/Auckland": [-36.9, 174.8],
    "Pacific/Fiji": [-18.1, 178.4],
    "Pacific/Honolulu": [21.3, -157.9]
  };
  function position(now) {
    const longitude = clamp2(-standard(now) / 4, -180, 180);
    let zone = "";
    try {
      zone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
    } catch {
      zone = "";
    }
    const place = ZONE_PLACE[zone];
    if (place) return { latitude: place[0], longitude: place[1] };
    const region = zone.split("/")[0] ?? "";
    return { latitude: REGION_LATITUDE[region] ?? 45, longitude };
  }
  function standard(now) {
    const year = now.getFullYear();
    const january = new Date(year, 0, 1).getTimezoneOffset();
    const july = new Date(year, 6, 1).getTimezoneOffset();
    return Math.max(january, july);
  }
  function epochDays(now) {
    return now.getTime() / DAY_MS - J2000_OFFSET_DAYS;
  }
  function sunEcliptic(days) {
    const meanAnomaly = (357.5291 + 0.98560028 * days) * RAD;
    return meanAnomaly + (1.9148 * Math.sin(meanAnomaly) + 0.02 * Math.sin(2 * meanAnomaly) + 3e-4 * Math.sin(3 * meanAnomaly)) * RAD + 102.9372 * RAD + Math.PI;
  }
  function moonEcliptic(days) {
    const argument = (93.272 + 13.22935 * days) * RAD;
    const meanAnomaly = (134.963 + 13.064993 * days) * RAD;
    const meanLongitude = (218.316 + 13.176396 * days) * RAD;
    return {
      latitude: 5.128 * RAD * Math.sin(argument),
      longitude: meanLongitude + 6.289 * RAD * Math.sin(meanAnomaly)
    };
  }
  function equatorial(longitude, latitude) {
    return {
      declination: Math.asin(
        Math.sin(latitude) * Math.cos(OBLIQUITY) + Math.cos(latitude) * Math.sin(OBLIQUITY) * Math.sin(longitude)
      ),
      rightAscension: Math.atan2(
        Math.sin(longitude) * Math.cos(OBLIQUITY) - Math.tan(latitude) * Math.sin(OBLIQUITY),
        Math.cos(longitude)
      )
    };
  }
  function horizon(days, { latitude, longitude }, { declination, rightAscension }) {
    const siderealTime = (280.16 + 360.9856235 * days) * RAD + longitude * RAD;
    const hourAngle = siderealTime - rightAscension;
    const phi = latitude * RAD;
    const altitude = Math.asin(
      Math.sin(phi) * Math.sin(declination) + Math.cos(phi) * Math.cos(declination) * Math.cos(hourAngle)
    );
    return { altitude: altitude / RAD, hourAngle };
  }
  function passage({ altitude, hourAngle }) {
    const wrapped = wrap(hourAngle);
    const march = clamp2(0.5 + wrapped / Math.PI, 0, 1);
    return { arc: Math.sin(march * Math.PI), march, up: clamp2((altitude + 1) / 6, 0, 1) };
  }
  function phase(now) {
    const days = epochDays(now);
    const elongation = wrap(moonEcliptic(days).longitude - sunEcliptic(days));
    return { lit: (1 - Math.cos(elongation)) / 2, waxing: elongation > 0 };
  }
  function sunlit(x, y, { lit, waxing }) {
    const across = waxing ? x : -x;
    return across + (2 * lit - 1) * Math.sqrt(Math.max(0, 1 - y * y));
  }
  function light(altitude) {
    return {
      daylight: clamp2((altitude + 6) / 12, 0, 1),
      dusk: clamp2(1 - Math.abs(altitude) / 8, 0, 1)
    };
  }
  function sunNow() {
    const now = /* @__PURE__ */ new Date();
    const here = position(now);
    const days = epochDays(now);
    const sun = horizon(days, here, equatorial(sunEcliptic(days), 0));
    const moon = moonEcliptic(days);
    return {
      ...light(sun.altitude),
      moon: {
        ...passage(horizon(days, here, equatorial(moon.longitude, moon.latitude))),
        ...phase(now)
      },
      sun: passage(sun)
    };
  }
  function clamp2(value, low, high) {
    return Math.min(high, Math.max(low, value));
  }
  function wrap(angle) {
    return Math.atan2(Math.sin(angle), Math.cos(angle));
  }

  // sky.ts
  var EAST = 0.12;
  var WEST = 0.88;
  var HIGH = 0.055;
  var LOW = 0.17;
  var DISC = 0.028;
  var SWING2 = 0.34;
  var SPREAD2 = 0.085;
  var FALL = 0.34;
  var DISC_INK = 0.012;
  var DISC_GIVE = 2.6;
  var BLOOM = { fall: 2.4, ink: 0.016, reach: 13, thin: 1 };
  var HALO = { fall: 1.6, ink: 0.07, reach: 4.2, thin: 1 };
  var STREAK = { fall: 2.1, ink: 0.06, reach: 12, thin: 0.1 };
  var DUSK_REACH = 0.62;
  var DUSK_INK = 0.09;
  var NIGHT_INK = 0.3;
  var LANE4 = { body: -1.2, dusk: 3, night: 3.1 };
  var CRATERS = [
    [-0.34, -0.22, 0.22],
    [0.19, -0.45, 0.1],
    [0.31, 0.3, 0.15]
  ];
  var CRATER_INK = 0.34;
  var ROUND = 72;
  var asked = null;
  function pretend(hour) {
    asked = hour;
  }
  function paintSky(pen, box2) {
    const sky = asked ? {
      daylight: asked.daylight,
      dusk: asked.dusk,
      moon: {
        arc: Math.sin(asked.march * Math.PI),
        lit: asked.lit,
        march: asked.march,
        up: 1,
        waxing: asked.waxing
      },
      sun: { arc: Math.sin(asked.march * Math.PI), march: asked.march, up: 1 }
    } : sunNow();
    const bodies = [
      { moon: false, passage: sky.sun, phase: null, show: sky.daylight, tone: TONE.sun },
      {
        moon: true,
        passage: sky.moon,
        phase: sky.moon,
        show: (1 - sky.daylight) * sky.moon.up,
        tone: TONE.moon
      }
    ];
    for (const body of bodies) {
      if (body.show <= 4e-3) continue;
      paintBody(pen, box2, body.passage, body.phase, body.show, body.tone);
    }
    if (sky.dusk > 0) {
      pen.wash({
        alpha: DUSK_INK * sky.dusk,
        fade: [0, box2.height * DUSK_REACH],
        lane: LANE4.dusk,
        tone: TONE.dusk
      });
    }
    if (sky.daylight < 1) {
      pen.wash({ alpha: NIGHT_INK * (1 - sky.daylight), lane: LANE4.night, tone: TONE.surface });
    }
    return { daylight: sky.daylight, dusk: sky.dusk };
  }
  function paintBody(pen, box2, passage2, phase2, show, tone) {
    const r = box2.height * DISC;
    const cx = box2.width * (EAST + passage2.march * (WEST - EAST));
    const cy = box2.height * (LOW + passage2.arc * (HIGH - LOW));
    const glow = show * (phase2 ? phase2.lit : 1);
    const lean = (0.5 - passage2.march) * SWING2;
    for (const light3 of [BLOOM, HALO, STREAK]) {
      pen.light(cx, cy, {
        alpha: light3.ink * glow,
        fall: light3.fall,
        lane: LANE4.body,
        shade: OWN,
        thin: light3.thin,
        tone,
        width: r * light3.reach
      });
    }
    pen.fill(
      [
        [
          { x: cx - r, y: cy },
          { x: cx + r, y: cy },
          { x: cx + box2.width * (lean + SPREAD2), y: box2.height },
          { x: cx + box2.width * (lean - SPREAD2), y: box2.height }
        ]
      ],
      {
        alpha: DISC_INK * glow,
        fade: [cy, Math.max(1, box2.height * FALL - cy)],
        fall: DISC_GIVE,
        lane: LANE4.body,
        tone
      }
    );
    pen.fill([phase2 ? crescent(cx, cy, r, phase2) : disc2(cx, cy, r)], {
      alpha: show,
      lane: LANE4.body,
      tone
    });
    if (!phase2) return;
    for (const [x, y, size] of CRATERS) {
      const clear2 = sunlit(x, y, phase2) / size - 1;
      if (clear2 <= 0) continue;
      pen.fill([disc2(cx + r * x, cy + r * y, r * size)], {
        alpha: CRATER_INK * show * Math.min(1, clear2),
        lane: LANE4.body,
        tone: TONE.surface
      });
    }
  }
  function disc2(cx, cy, r) {
    const points = [];
    for (let i = 0; i < ROUND; i++) {
      const turn2 = i / ROUND * Math.PI * 2;
      points.push({ x: cx + r * Math.cos(turn2), y: cy + r * Math.sin(turn2) });
    }
    return points;
  }
  function crescent(cx, cy, r, { lit, waxing }) {
    const side = waxing ? 1 : -1;
    const waist = r * (2 * lit - 1);
    const points = [];
    const half2 = ROUND / 2;
    for (let i = 0; i <= half2; i++) {
      const turn2 = i / half2 * Math.PI;
      points.push({ x: cx + side * r * Math.sin(turn2), y: cy - r * Math.cos(turn2) });
    }
    for (let i = half2; i >= 0; i--) {
      const turn2 = i / half2 * Math.PI;
      points.push({ x: cx - side * waist * Math.sin(turn2), y: cy - r * Math.cos(turn2) });
    }
    return points;
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
  var MOST4 = {
    anemones: 200,
    cliffs: 16,
    corals: 500,
    fans: 220,
    grasses: 1400,
    kelps: 280,
    stones: 108
  };
  var LEAST = 2;
  var REEF_HEADS = 34;
  var RANGES = 6;
  var carved = /* @__PURE__ */ new Map();
  function twigOf(d) {
    const held2 = carved.get(d);
    if (held2) return held2;
    const numbers = d.match(/-?\d+(\.\d+)?/g);
    const cut = numbers ? numbers.map(Number) : [];
    carved.set(d, cut);
    return cut;
  }
  var KINDS2 = { anemone: 2, coral: 4, fan: 3, grass: 1, kelp: 0 };
  var CYCLE = 150;
  var GROUND = { cliff: 2, hill: 1, mound: 3, sand: 0 };
  var geometry = new Float32Array(1 << 23);
  var flora = null;
  var reef = null;
  var seabed = null;
  var box = { height: 0, width: 0 };
  var thrift = 1;
  var aimed = -1;
  var crags = null;
  var drift = null;
  var flock = null;
  var inklings = null;
  var light2 = null;
  var nemos = null;
  var passers = null;
  var rushed = false;
  var shoal = null;
  var visitors = null;
  var walkers = null;
  var wreckage = null;
  var FISH = { least: 6, most: 44, night: 0.55, per: 62e3 };
  var MOTES = { least: 40, most: 280, per: 12500 };
  var CRAWLERS = { crabs: 11, mostCrabs: 28, mostStarfish: 24, starfish: 9 };
  var SHAFTS = 5;
  var VENTS = 3;
  var SPECKS = 420;
  var SQUIDS = 2;
  var OCTOPUSES = 2;
  var CRUISE2 = 0.8;
  var SHORTEST3 = 52;
  var LONGEST3 = 92;
  var WIND_STEP = 1 / 10;
  function spread(perThousand, most, width) {
    return Math.max(LEAST, Math.min(most, Math.round(width * perThousand / 1e3)));
  }
  function lush(perThousand, most, width, day) {
    return spread(perThousand * day, most, width);
  }
  function rush(on) {
    rushed = on !== 0;
  }
  function pretend2(daylight2, dusk, march, lit) {
    pretend(
      daylight2 < 0 ? null : { daylight: daylight2, dusk, lit: Math.abs(lit), march, waxing: lit >= 0 }
    );
  }
  function today() {
    return daySeed();
  }
  function build2(width, height, seed, tolerance) {
    box = { height, width };
    handed.length = 0;
    const day = thriving(seed);
    thrift = day;
    aimed = daylight;
    const water = createBiome();
    seabed = createSeabed({
      cliffs: spread(PER_K.cliffs, MOST4.cliffs, width),
      height,
      ranges: RANGES,
      seed,
      stones: spread(PER_K.stones, MOST4.stones, width),
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
      about: water.about,
      anemones: lush(PER_K.anemones, MOST4.anemones, width, day),
      corals: lush(PER_K.corals, MOST4.corals, width, day),
      // The crowns and nothing else. Everything the water only bends is handed
      // over as a shape once and swayed on the card; see `layout`.
      cutting: ["anemone"],
      fans: lush(PER_K.fans, MOST4.fans, width, day),
      floor: seabed.floorAt,
      grasses: lush(PER_K.grasses, MOST4.grasses, width, day),
      height,
      kelps: lush(PER_K.kelps, MOST4.kelps, width, day),
      seed,
      tolerance,
      width
    });
    walkers = createWalkers({
      about: water.about,
      crabs: lush(CRAWLERS.crabs, CRAWLERS.mostCrabs, width, day),
      floor: seabed.floorAt,
      seed,
      starfish: lush(CRAWLERS.starfish, CRAWLERS.mostStarfish, width, day),
      tolerance,
      width
    });
    shoal = createShoal({
      count: fishCount(width, height, day),
      cruise: CRUISE2,
      height,
      longest: LONGEST3,
      seed,
      shortest: SHORTEST3,
      species: WILD,
      width
    });
    inklings = createCephalopods({
      floor: seabed.floorAt,
      height,
      octopuses: OCTOPUSES,
      seed,
      squids: SQUIDS,
      width
    });
    const seen = inklings;
    water.enter(() => {
      const about = [];
      for (const pus of seen.octopuses) {
        if (pus.lift > 0) {
          about.push({ depth: pus.depth, menace: 0.55, size: pus.size * 2, x: pus.x, y: pus.y });
        }
      }
      for (const squid of seen.squids) {
        about.push({ depth: squid.depth, menace: 0.3, size: squid.size, x: squid.x, y: squid.y });
      }
      return about;
    });
    wreckage = createRelics({ floor: seabed.floorAt, height, seed, width });
    passers = createPassers({ eager: rushed, height, seed, width });
    visitors = createVisitors({ eager: rushed, height, seed, water, width });
    flock = createSwarm({ count: SPECKS, eager: rushed, height, seed, water, width });
    nemos = createNemos({ about: water.about, reef, seed });
    crags = createCrags({ floor: seabed.floorAt, height, seed, width });
    drift = createDrift({
      floor: seabed.floorAt,
      height,
      motes: moteCount(width, height),
      seed,
      tolerance,
      vents: VENTS,
      width
    });
    light2 = createRays({ count: SHAFTS, height, seed, width });
  }
  var DAWN_STEP = 0.01;
  function fishCount(width, height, day) {
    const full = Math.max(FISH.least, Math.min(FISH.most, Math.round(width * height / FISH.per)));
    const hour = FISH.night + (1 - FISH.night) * daylight;
    return Math.max(FISH.least, Math.round(full * hour * Math.sqrt(day)));
  }
  function moteCount(width, height) {
    return Math.max(MOTES.least, Math.min(MOTES.most, Math.round(width * height / MOTES.per)));
  }
  function felt2() {
    const above2 = passers?.startle ?? null;
    const among = visitors?.startle ?? null;
    if (!above2) return among;
    if (!among) return above2;
    return among.force > above2.force ? among : above2;
  }
  function open(settle) {
    wind(rushed ? settle : settle + Math.floor(Date.now() / 1e3) % CYCLE);
  }
  function wind(seconds) {
    const steps = Math.round(Math.max(0, seconds) / WIND_STEP);
    for (let i = 0; i < steps; i++) {
      if (rushed) passers?.step(WIND_STEP);
      visitors?.step(WIND_STEP);
      flock?.step(WIND_STEP, felt2());
      shoal?.step(WIND_STEP, null, felt2());
      drift?.step(WIND_STEP);
      light2?.step(WIND_STEP);
      inklings?.step(WIND_STEP, rushed ? passers?.startle ?? null : null);
      walkers?.step(WIND_STEP);
      nemos?.step(WIND_STEP);
      wreckage?.step(WIND_STEP);
    }
    flora?.wind(steps * WIND_STEP);
    reef?.wind(steps * WIND_STEP);
  }
  function step(seconds) {
    passers?.step(seconds);
    visitors?.step(seconds);
    flock?.step(seconds, felt2());
    shoal?.step(seconds, null, felt2());
    drift?.step(seconds);
    light2?.step(seconds);
    flora?.step(seconds);
    inklings?.step(seconds, passers?.startle ?? null);
    walkers?.step(seconds);
    reef?.step(seconds);
    nemos?.step(seconds);
    wreckage?.step(seconds);
    held += seconds;
    turn = (turn + 1) % 512;
  }
  var held = 0;
  var turn = 0;
  var SWAY_REACH = 5e-3;
  var SWAY_ROLL = 22e-4;
  function over() {
    at = 0;
    const unit = Math.min(box.width, box.height) * SWAY_REACH;
    put(unit * (0.62 * Math.sin(held * 0.11) + 0.38 * Math.sin(held * 0.29 + 1.7)));
    put(unit * (0.62 * Math.sin(held * 0.13 + 2.4) + 0.38 * Math.sin(held * 0.23 + 0.6)));
    put(SWAY_ROLL * Math.sin(held * 0.09 + 1.1));
    const reach2 = unit + Math.abs(SWAY_ROLL) * Math.hypot(box.width, box.height) / 2;
    put(1 + 2 * reach2 / Math.max(1, Math.min(box.width, box.height)));
    put(turn);
    daylightAt = at;
    put(daylight);
    const pen = new Pen(geometry, at);
    const sky = paintSky(pen, box);
    daylight = sky.daylight;
    put_at(daylightAt, daylight);
    if (shoal && Math.abs(daylight - aimed) > DAWN_STEP) {
      aimed = daylight;
      shoal.hold(fishCount(box.width, box.height, thrift));
    }
    if (crags) paintCrags(pen, crags, box);
    if (seabed) paintStones(pen, seabed);
    if (reef) paintHeads(pen, reef);
    if (wreckage) paintRelics(pen, wreckage);
    if (light2) paintRays(pen, light2, daylight);
    if (drift) paintSnow(pen, drift);
    if (shoal) paintShoal(pen, shoal);
    if (nemos) paintNemos(pen, nemos);
    if (flock) paintSwarm(pen, flock);
    if (inklings) paintInklings(pen, inklings);
    if (walkers) paintWalkers(pen, walkers);
    if (visitors) paintVisitors(pen, visitors);
    if (passers) paintPassers(pen, passers);
    at = pen.close();
    return at;
  }
  var daylight = 1;
  var daylightAt = 0;
  function put_at(slot, value) {
    geometry[slot] = value;
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
  function putGround() {
    if (!seabed) return;
    put(GROUND.sand);
    put(1);
    putPoints(seabed.ridge);
    for (const band of seabed.ranges) {
      put(GROUND.hill);
      put(band.depth);
      putPoints(band.ridge);
    }
    if (reef) {
      put(GROUND.mound);
      put(reef.depth);
      putPoints(reef.crest);
    }
    for (const cliff of seabed.cliffs) {
      put(GROUND.cliff);
      put(cliff.depth);
      putPoints(cliff.ridge);
    }
  }
  function grounds() {
    if (!seabed) return 0;
    return 1 + seabed.ranges.length + (reef ? 1 : 0) + seabed.cliffs.length;
  }
  function putTwigs(plant) {
    put(plant.twigs.length);
    for (let t = 0; t < plant.twigs.length; t++) {
      const twig = plant.twigs[t];
      const cut = twigOf(twig.d);
      put(twig.width);
      put(cut.length);
      for (let n = 0; n < cut.length; n++) put(cut[n]);
    }
  }
  function layout() {
    at = 0;
    if (!flora || !seabed) return 0;
    put(3);
    put(box.width);
    put(box.height);
    put(grounds());
    put(flora.plants.length);
    putGround();
    for (let p = 0; p < flora.plants.length; p++) {
      const plant = flora.plants[p];
      put(KINDS2[plant.kind] ?? 0);
      put(plant.depth);
      put(plant.girth);
      put(plant.scale);
      put(plant.x);
      put(plant.y);
      if (plant.kind === "coral") {
        putTwigs(plant);
        continue;
      }
      if (plant.kind === "anemone") continue;
      const frame = flora.madeOf(p);
      if (!frame) {
        put(0);
        put(0);
        continue;
      }
      put(frame.limbs.length);
      for (const limb of frame.limbs) {
        put(limb.beat);
        put(limb.give);
        put(limb.own);
        put(limb.seat);
        put(limb.shift);
        put(limb.slant);
        put(limb.span);
        put(limb.steps);
        put(limb.stem);
      }
      put(frame.leaves.length);
      for (const leaf of frame.leaves) {
        put(leaf.limb);
        put(leaf.seat);
        putPoints(leaf.shape);
      }
    }
    return at;
  }
  var handed = [];
  function publish() {
    at = 0;
    if (!flora) return 0;
    put(flora.plants.length);
    for (let p = 0; p < flora.plants.length; p++) {
      const plant = flora.plants[p];
      const swing = flora.swinging[p];
      put(swing ? swing.amp : 0);
      put(swing ? swing.own : 0);
      if (plant.kind !== "anemone" || handed[p] === plant.cut) {
        put(0);
        continue;
      }
      handed[p] = plant.cut;
      put(1);
      putPoints(plant.points);
      put(plant.blades.length);
      for (let b = 0; b < plant.blades.length; b++) putPoints(plant.blades[b]);
    }
    return at;
  }
  return __toCommonJS(scene_exports);
})();
