# The seascape, and everything still owed

Everything asked for, in one place, so nothing is lost between sessions. The
simulations live in `assets/js/ornament/` in the CodinCod repository; this repo
renders them. Both the website and the desktop get all of it.

## In the water

- [x] **Marine snow** falling through the whole column, reading the same field
      the fish read, so it is the water becoming visible rather than dust.
      `drift.ts`
- [x] **Bubbles**, in bursts off a vent and then a long rest, swelling and
      wobbling as they rise. `drift.ts`
- [x] **Light rays** through the surface, each on its own slow breath, drawn as
      stacked wedges so they fade across their width as well as down their
      length. `rays.ts`

## The bottom

- [x] **Sand**, as a rolling profile rather than a line, and the thing every
      other layer roots to. `seabed.ts`
- [x] **Stones** lying on it. `seabed.ts`
- [x] **Cliffs** standing further out in the murk. `seabed.ts`
- [x] **Kelp**, rooted and leaning on the shared current, blades trailing.
      `flora.ts`
- [x] **Grass**, short tufts that barely lean. `flora.ts`
- [x] **Coral**, which does not sway, because it is a skeleton. `flora.ts`
- [ ] **Volcanic vents**: a chimney on the floor with a plume coming off it.
      The bubble vents already model a point on the floor that bursts and
      rests, so a smoker is a chimney and a plume on machinery that exists.

## The animals

- [ ] **More fish species**, each with its own way of moving: the cruiser there
      now, a small one that darts and stops, a long slow one in the deep murk,
      and a pair that hold station together.
- [ ] **Squid**: jet and drift, the opposite rhythm to a fish. A hard pulse,
      then a long passive glide with the tentacles trailing.
- [ ] **Octopuses**: on the bottom rather than in the water, arms working over
      the stones, and very occasionally letting go and jetting.

## Once in a great while

- [ ] **Shipwrecks**, lying on the floor in the murk.
- [ ] **A diving boat** crossing the surface, once in a very long time.
- [ ] **Sonar blips**.

## Easter eggs

- [ ] **The chest with a laptop open on its lid, screen still lit.** The site's
      own, from `Marks.chest/1`: "the joke the site is named after, said once
      and quietly". It is never drawn beside the fish, because a laptop next to
      a cod is the joke explained.
- [ ] **A sunken code block**, from `Marks.code_block/1`.
- [ ] More, and rarer.

## Rules the whole scene keeps

- Nothing names a colour. Everything is drawn in the theme's accent and cut out
  in its background, so a theme switch recolours the sea.
- Everything reads the same Perlin field, so the plants, the snow and the fish
  agree about which way the water is moving. That agreement is what makes it a
  sea rather than several animations sharing a rectangle.
- Everything is seeded. The same seed gives the same water twice.
- Nothing advances while the wallpaper is covered.
- It is ornament, so it is allowed to do nothing. Every branch that cannot get
  what it needs returns quietly.
