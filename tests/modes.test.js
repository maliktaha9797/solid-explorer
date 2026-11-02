import { describe, expect, it } from 'vitest';
import { MODES } from '../src/modes.js';
import { SHAPES } from '../src/shapes/index.js';

const defaultsOf = (inputs) => Object.fromEntries(inputs.map(([k, , d]) => [k, d]));
const canonOf = (shapeKey) => defaultsOf(SHAPES[shapeKey].dims);
const run = (shapeKey, modeIdx, values) => MODES[shapeKey][modeIdx].toCanon(values);
const inputDefault = (shapeKey, modeIdx, key) =>
  MODES[shapeKey][modeIdx].inputs.find(([k]) => k === key)[2];

const ALL_MODES = Object.entries(MODES).flatMap(([shapeKey, modes]) =>
  modes.map((mode, idx) => ({ shapeKey, idx, mode, label: `${shapeKey}: ${mode.name}` })),
);

const EXPECTED_NAMES = {
  cuboid: [
    'Length, width, height',
    'Length, width, space diagonal',
    'Length, width, front face diagonal',
    'Base diagonal, height, length',
  ],
  cube: ['Side', 'Face diagonal', 'Space diagonal'],
  sqpyramid: [
    'Base and vertical height',
    'Base and slant height',
    'Base and slant edge',
    'Slant height and slant edge',
    'Base and face angle',
  ],
  rectpyramid: ['Base and vertical height', 'Base and slant height', 'Base and slant edge'],
  prism: [
    'Base, height, length',
    'Hypotenuse, base, length',
    'Hypotenuse, height, length',
    'Base, height, space diagonal',
  ],
  cone: [
    'Radius and height',
    'Diameter and height',
    'Radius and slant height',
    'Height and slant height',
    'Radius and angle at the base',
  ],
  cylinder: ['Radius and height', 'Diameter and height', 'Radius and longest internal line'],
};

describe('MODES registry', () => {
  it('has exactly 27 modes', () => {
    expect(ALL_MODES).toHaveLength(27);
  });

  it('has the same shape keys, in the same order, as SHAPES', () => {
    expect(Object.keys(MODES)).toEqual(Object.keys(SHAPES));
  });

  it('has the reference mode names, in order', () => {
    const names = Object.fromEntries(
      Object.entries(MODES).map(([k, modes]) => [k, modes.map((m) => m.name)]),
    );
    expect(names).toEqual(EXPECTED_NAMES);
  });

  it('has unique names within a shape', () => {
    for (const [shapeKey, modes] of Object.entries(MODES)) {
      const names = modes.map((m) => m.name);
      expect(new Set(names).size, shapeKey).toBe(names.length);
    }
  });

  it.each(ALL_MODES)('$label: inputs are [key, label, positive default]', ({ mode }) => {
    expect(mode.inputs.length).toBeGreaterThan(0);
    mode.inputs.forEach(([key, label, def]) => {
      expect(key).toMatch(/^[a-zA-Z]$/);
      expect(typeof label).toBe('string');
      expect(label.length).toBeGreaterThan(0);
      expect(Number.isFinite(def) && def > 0).toBe(true);
    });
    const keys = mode.inputs.map(([k]) => k);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it.each(ALL_MODES)(
    '$label: extra lines are real vertex pairs fed by an input',
    ({ shapeKey, mode }) => {
      const verts = Object.keys(SHAPES[shapeKey].build(canonOf(shapeKey)).verts);
      const inputKeys = mode.inputs.map(([k]) => k);
      (mode.extra || []).forEach(([a, b, key]) => {
        expect(verts).toContain(a);
        expect(verts).toContain(b);
        expect(a).not.toBe(b);
        expect(inputKeys).toContain(key);
      });
    },
  );

  it('marks an angle input with a degree sign in its label, and no other input', () => {
    const angleInputs = ALL_MODES.flatMap(({ shapeKey, idx, mode }) =>
      mode.inputs
        .filter(([, label]) => label.includes('°'))
        .map(([k]) => `${shapeKey}:${idx}:${k}`),
    );
    expect(angleInputs).toEqual(['sqpyramid:4:t', 'cone:4:t']);
  });
});

describe('the first mode of each shape is the canonical one', () => {
  it.each(Object.keys(SHAPES))('%s: input keys and defaults are the shape dims', (shapeKey) => {
    const first = MODES[shapeKey][0];
    expect(first.inputs.map(([k]) => k)).toEqual(SHAPES[shapeKey].dims.map(([k]) => k));
    expect(defaultsOf(first.inputs)).toEqual(canonOf(shapeKey));
  });

  it.each(Object.keys(SHAPES))('%s: returns its inputs unchanged', (shapeKey) => {
    const first = MODES[shapeKey][0];
    expect(first.toCanon(defaultsOf(first.inputs))).toEqual(canonOf(shapeKey));
    const other = Object.fromEntries(first.inputs.map(([k], i) => [k, 1.5 + i]));
    expect(first.toCanon(other)).toEqual(other);
  });
});

describe('defaults are consistent', () => {
  it.each(ALL_MODES)(
    '$label: defaults reproduce the canonical defaults within 0.01',
    ({ shapeKey, mode }) => {
      const canon = canonOf(shapeKey);
      const res = mode.toCanon(defaultsOf(mode.inputs));
      expect(res.error).toBeUndefined();
      expect(Object.keys(res).sort()).toEqual(Object.keys(canon).sort());
      for (const k of Object.keys(canon)) {
        expect(
          Math.abs(res[k] - canon[k]),
          `${k}: ${res[k]} against ${canon[k]}`,
        ).toBeLessThanOrEqual(0.01);
      }
    },
  );
});

describe('the two corrected defaults (decisions.md Q-1, D-017)', () => {
  it('rectangular pyramid "Base and slant edge" now defaults to e = 7.63', () => {
    expect(MODES.rectpyramid[2].name).toBe('Base and slant edge');
    expect(inputDefault('rectpyramid', 2, 'e')).toBe(7.63);
    const res = run('rectpyramid', 2, defaultsOf(MODES.rectpyramid[2].inputs));
    expect(res.l).toBe(8);
    expect(res.w).toBe(5);
    expect(res.h).toBeCloseTo(5.9972, 4);
  });

  it('cone "Radius and angle at the base" now defaults to t = 60.26', () => {
    expect(MODES.cone[4].name).toBe('Radius and angle at the base');
    expect(inputDefault('cone', 4, 't')).toBe(60.26);
    const res = run('cone', 4, defaultsOf(MODES.cone[4].inputs));
    expect(res.r).toBe(4);
    expect(res.h).toBeCloseTo(7.0014, 4);
  });

  it('the old values would have failed the 0.01 rule', () => {
    const oldRect = run('rectpyramid', 2, { l: 8, w: 5, e: 8.73 });
    expect(oldRect.h).toBeCloseTo(7.3459, 4);
    expect(Math.abs(oldRect.h - 6)).toBeGreaterThan(0.01);
    const oldCone = run('cone', 4, { r: 4, t: 60.3 });
    expect(oldCone.h).toBeCloseTo(7.0127, 4);
    expect(Math.abs(oldCone.h - 7)).toBeGreaterThan(0.01);
  });
});

// Equality is an error (needGT is strict). Just inside the valid side gives a solid.
// Where a boundary is irrational (root 18 and so on) it is tested a hair either side instead,
// because no pair of floating point numbers sits exactly on it.
const BOUNDARIES = [
  {
    where: 'cuboid "Length, width, space diagonal"',
    shapeKey: 'cuboid',
    idx: 1,
    error: 'The space diagonal must be longer than the base diagonal.',
    bad: [
      { l: 3, w: 4, d: 5 },
      { l: 3, w: 4, d: 4 },
    ],
    good: { l: 3, w: 4, d: 5.01 },
    expected: { l: 3, w: 4, h: Math.sqrt(5.01 * 5.01 - 25) },
  },
  {
    where: 'cuboid "Length, width, front face diagonal"',
    shapeKey: 'cuboid',
    idx: 2,
    error: 'The face diagonal must be longer than the length.',
    bad: [
      { l: 3, w: 4, f: 3 },
      { l: 3, w: 4, f: 2 },
    ],
    good: { l: 3, w: 4, f: 3.5 },
    expected: { l: 3, w: 4, h: Math.sqrt(12.25 - 9) },
  },
  {
    where: 'cuboid "Base diagonal, height, length"',
    shapeKey: 'cuboid',
    idx: 3,
    error: 'The base diagonal must be longer than the length.',
    bad: [
      { c: 8, h: 4, l: 8 },
      { c: 7, h: 4, l: 8 },
    ],
    good: { c: 8.5, h: 4, l: 8 },
    expected: { l: 8, w: Math.sqrt(72.25 - 64), h: 4 },
  },
  {
    where: 'square pyramid "Base and slant height"',
    shapeKey: 'sqpyramid',
    idx: 1,
    error: 'The slant height must be more than half the base.',
    bad: [
      { b: 6, s: 3 },
      { b: 6, s: 2 },
    ],
    good: { b: 6, s: 3.5 },
    expected: { b: 6, h: Math.sqrt(12.25 - 9) },
  },
  {
    where: 'square pyramid "Base and slant edge"',
    shapeKey: 'sqpyramid',
    idx: 2,
    error: 'The slant edge must be longer than half the base diagonal.',
    // Half the base diagonal of a base 6 is root 18.
    bad: [
      { b: 6, e: Math.sqrt(18) },
      { b: 6, e: Math.sqrt(18) - 1e-6 },
      { b: 6, e: 3 },
    ],
    good: { b: 6, e: Math.sqrt(18) + 1e-6 },
    expected: { b: 6, h: Math.sqrt((Math.sqrt(18) + 1e-6) ** 2 - 18) },
  },
  {
    where:
      'square pyramid "Slant height and slant edge", first check (edge not longer than height)',
    shapeKey: 'sqpyramid',
    idx: 3,
    error: 'The slant edge must be longer than the slant height.',
    bad: [
      { s: 5, e: 5 },
      { s: 5, e: 4 },
    ],
    good: { s: 5, e: 5.5 },
    expected: { b: 2 * Math.sqrt(5.5 * 5.5 - 25), h: Math.sqrt(25 - (5.5 * 5.5 - 25)) },
  },
  {
    where: 'square pyramid "Slant height and slant edge", second check (the base it implies)',
    shapeKey: 'sqpyramid',
    idx: 3,
    error: 'These lengths cannot form a pyramid.',
    // The implied base is 2 * root(e squared minus s squared). It is too wide once e passes s * root 2.
    bad: [
      { s: 3, e: Math.sqrt(18) + 1e-6 },
      { s: 3, e: 4.25 },
      { s: 3, e: 10 },
    ],
    good: { s: 3, e: Math.sqrt(18) - 1e-6 },
    expected: {
      b: 2 * Math.sqrt((Math.sqrt(18) - 1e-6) ** 2 - 9),
      h: Math.sqrt(9 - ((Math.sqrt(18) - 1e-6) ** 2 - 9)),
    },
  },
  {
    where: 'rectangular pyramid "Base and slant height"',
    shapeKey: 'rectpyramid',
    idx: 1,
    error: 'The slant height must be more than half the length.',
    bad: [
      { l: 8, w: 5, s: 4 },
      { l: 8, w: 5, s: 3 },
    ],
    good: { l: 8, w: 5, s: 4.5 },
    expected: { l: 8, w: 5, h: Math.sqrt(20.25 - 16) },
  },
  {
    where: 'rectangular pyramid "Base and slant edge"',
    shapeKey: 'rectpyramid',
    idx: 2,
    error: 'The slant edge must be longer than half the base diagonal.',
    // A base of 6 by 8 has a half diagonal of exactly 5.
    bad: [
      { l: 6, w: 8, e: 5 },
      { l: 6, w: 8, e: 4 },
    ],
    good: { l: 6, w: 8, e: 5.5 },
    expected: { l: 6, w: 8, h: Math.sqrt(30.25 - 25) },
  },
  {
    where: 'prism "Hypotenuse, base, length"',
    shapeKey: 'prism',
    idx: 1,
    error: 'The hypotenuse must be longer than the base.',
    bad: [
      { c: 6, a: 6, L: 9 },
      { c: 5, a: 6, L: 9 },
    ],
    good: { c: 6.5, a: 6, L: 9 },
    expected: { a: 6, b: 2.5, L: 9 },
  },
  {
    where: 'prism "Hypotenuse, height, length"',
    shapeKey: 'prism',
    idx: 2,
    error: 'The hypotenuse must be longer than the height.',
    bad: [
      { c: 4, b: 4, L: 9 },
      { c: 3, b: 4, L: 9 },
    ],
    good: { c: 4.5, b: 4, L: 9 },
    expected: { a: Math.sqrt(20.25 - 16), b: 4, L: 9 },
  },
  {
    where: 'prism "Base, height, space diagonal"',
    shapeKey: 'prism',
    idx: 3,
    error: 'The space diagonal must be longer than the hypotenuse of the end face.',
    // An end face with base 3 and height 4 has a hypotenuse of exactly 5.
    bad: [
      { a: 3, b: 4, d: 5 },
      { a: 3, b: 4, d: 4 },
    ],
    good: { a: 3, b: 4, d: 5.5 },
    expected: { a: 3, b: 4, L: Math.sqrt(30.25 - 25) },
  },
  {
    where: 'cone "Radius and slant height"',
    shapeKey: 'cone',
    idx: 2,
    error: 'The slant height must be longer than the radius.',
    bad: [
      { r: 3, l: 3 },
      { r: 3, l: 2 },
    ],
    good: { r: 3, l: 5 },
    expected: { r: 3, h: 4 },
  },
  {
    where: 'cone "Height and slant height"',
    shapeKey: 'cone',
    idx: 3,
    error: 'The slant height must be longer than the height.',
    bad: [
      { h: 4, l: 4 },
      { h: 4, l: 3 },
    ],
    good: { h: 4, l: 5 },
    expected: { r: 3, h: 4 },
  },
  {
    where: 'cylinder "Radius and longest internal line"',
    shapeKey: 'cylinder',
    idx: 2,
    error: 'The longest line must exceed the diameter.',
    bad: [
      { r: 3, k: 6 },
      { r: 3, k: 5 },
    ],
    good: { r: 3, k: 10 },
    expected: { r: 3, h: 8 },
  },
];

describe('validation boundaries', () => {
  it.each(BOUNDARIES)('$where', ({ shapeKey, idx, error, bad, good, expected }) => {
    for (const values of bad) {
      expect(run(shapeKey, idx, values), JSON.stringify(values)).toEqual({ error });
    }
    const res = run(shapeKey, idx, good);
    expect(res.error).toBeUndefined();
    expect(Object.keys(res).sort()).toEqual(Object.keys(expected).sort());
    for (const k of Object.keys(expected)) {
      expect(res[k], `${k} for ${JSON.stringify(good)}`).toBeCloseTo(expected[k], 9);
      expect(res[k]).toBeGreaterThan(0);
    }
  });

  it('covers every mode that has a needGT or other validation', () => {
    // Modes with no validation, because every positive input gives a solid.
    const unchecked = [
      'cuboid:0',
      'cube:0',
      'cube:1',
      'cube:2',
      'sqpyramid:0',
      'rectpyramid:0',
      'prism:0',
      'cone:0',
      'cone:1',
      'cylinder:0',
      'cylinder:1',
    ];
    // Angle modes are covered by the next describe block.
    const angle = ['sqpyramid:4', 'cone:4'];
    const covered = BOUNDARIES.map((b) => `${b.shapeKey}:${b.idx}`);
    const all = ALL_MODES.map((m) => `${m.shapeKey}:${m.idx}`);
    const rest = all.filter((id) => ![...unchecked, ...angle, ...covered].includes(id));
    expect(rest).toEqual([]);
  });
});

describe('angle modes', () => {
  const ANGLE_ERROR = 'The angle must be between 0° and 90°.';
  const cases = [
    {
      where: 'square pyramid "Base and face angle"',
      shapeKey: 'sqpyramid',
      idx: 4,
      other: { b: 6 },
    },
    { where: 'cone "Radius and angle at the base"', shapeKey: 'cone', idx: 4, other: { r: 4 } },
  ];

  it.each(cases)('$where: 0, 90 and anything outside are errors', ({ shapeKey, idx, other }) => {
    for (const t of [0, 90, -1, -45, 91, 120, 180]) {
      expect(run(shapeKey, idx, { ...other, t }), `t = ${t}`).toEqual({ error: ANGLE_ERROR });
    }
  });

  it.each(cases)(
    '$where: anything strictly between 0 and 90 is a solid',
    ({ shapeKey, idx, other }) => {
      for (const t of [0.1, 1, 30, 45, 60, 89, 89.9]) {
        const res = run(shapeKey, idx, { ...other, t });
        expect(res.error, `t = ${t}`).toBeUndefined();
        expect(Number.isFinite(res.h) && res.h > 0).toBe(true);
      }
    },
  );

  it('a 45 degree face angle makes the height half the base', () => {
    expect(run('sqpyramid', 4, { b: 6, t: 45 }).h).toBeCloseTo(3, 12);
  });

  it('a 45 degree base angle makes the cone as tall as it is wide', () => {
    expect(run('cone', 4, { r: 4, t: 45 }).h).toBeCloseTo(4, 12);
  });
});

describe('hand-checked numbers', () => {
  const cases = [
    // Pythagorean triples, so the answers are whole numbers.
    [
      'cuboid',
      1,
      { l: 3, w: 4, d: 13 },
      { l: 3, w: 4, h: 12 },
      'base diagonal 5, space diagonal 13',
    ],
    ['cuboid', 2, { l: 3, w: 4, f: 5 }, { l: 3, w: 4, h: 4 }, 'face diagonal 5'],
    ['cuboid', 3, { c: 5, h: 12, l: 3 }, { l: 3, w: 4, h: 12 }, 'base diagonal 5 on a length of 3'],
    ['cube', 1, { f: Math.SQRT2 }, { a: 1 }, 'face diagonal of a unit cube'],
    ['cube', 2, { d: Math.sqrt(3) }, { a: 1 }, 'space diagonal of a unit cube'],
    ['sqpyramid', 1, { b: 6, s: 5 }, { b: 6, h: 4 }, 'half base 3, slant 5'],
    ['sqpyramid', 2, { b: 6, e: Math.sqrt(34) }, { b: 6, h: 4 }, 'slant edge squared 18 + 16'],
    ['sqpyramid', 3, { s: 5, e: Math.sqrt(34) }, { b: 6, h: 4 }, 'slant 5, edge root 34'],
    ['rectpyramid', 1, { l: 8, w: 5, s: 5 }, { l: 8, w: 5, h: 3 }, 'half length 4, slant 5'],
    ['rectpyramid', 2, { l: 6, w: 8, e: 13 }, { l: 6, w: 8, h: 12 }, 'half diagonal 5, edge 13'],
    ['prism', 1, { c: 5, a: 3, L: 9 }, { a: 3, b: 4, L: 9 }, 'end face 3-4-5, from the base'],
    ['prism', 2, { c: 5, b: 4, L: 9 }, { a: 3, b: 4, L: 9 }, 'end face 3-4-5, from the height'],
    [
      'prism',
      3,
      { a: 3, b: 4, d: 13 },
      { a: 3, b: 4, L: 12 },
      'end hypotenuse 5, space diagonal 13',
    ],
    ['cone', 1, { d: 8, h: 7 }, { r: 4, h: 7 }, 'diameter halved'],
    ['cone', 2, { r: 3, l: 5 }, { r: 3, h: 4 }, '3-4-5'],
    ['cone', 3, { h: 4, l: 5 }, { r: 3, h: 4 }, '3-4-5'],
    ['cylinder', 1, { d: 6, h: 8 }, { r: 3, h: 8 }, 'diameter halved'],
    ['cylinder', 2, { r: 3, k: 10 }, { r: 3, h: 8 }, 'diameter 6, height 8, line 10'],
  ];

  it.each(cases)('%s mode %i: %j gives %j (%s)', (shapeKey, idx, values, expected) => {
    const res = run(shapeKey, idx, values);
    expect(res.error).toBeUndefined();
    expect(Object.keys(res).sort()).toEqual(Object.keys(expected).sort());
    for (const k of Object.keys(expected)) expect(res[k]).toBeCloseTo(expected[k], 9);
  });
});

describe('every mode over a grid of inputs', () => {
  // Close pairs such as 6 and 7 are there so that "Slant height and slant edge" can give a solid.
  const LENGTHS = [0.5, 1, 2, 3.5, 6, 7, 10, 25];
  const ANGLES = [0.1, 1, 30, 45, 60, 89, 89.9, 90, 120];
  const product = (lists) =>
    lists.reduce((acc, list) => acc.flatMap((prefix) => list.map((v) => [...prefix, v])), [[]]);

  it.each(ALL_MODES)(
    '$label: gives a clear message or a finite solid, never NaN',
    ({ shapeKey, mode }) => {
      const lists = mode.inputs.map(([, label]) => (label.includes('°') ? ANGLES : LENGTHS));
      let solids = 0;
      let errors = 0;
      for (const combo of product(lists)) {
        const values = Object.fromEntries(mode.inputs.map(([k], i) => [k, combo[i]]));
        const res = mode.toCanon(values);
        if (res.error !== undefined) {
          errors++;
          // A full sentence: capital letter first, full stop last.
          expect(res.error, JSON.stringify(values)).toMatch(/^[A-Z].+\.$/);
          continue;
        }
        solids++;
        for (const v of Object.values(res)) {
          expect(Number.isFinite(v) && v > 0, `${JSON.stringify(values)} gave ${v}`).toBe(true);
        }
        // A solid must also build: no NaN reaches the renderer.
        const built = SHAPES[shapeKey].build(res);
        Object.values(built.verts)
          .flat()
          .forEach((c) => expect(Number.isFinite(c)).toBe(true));
      }
      expect(solids).toBeGreaterThan(0);
      expect(solids + errors).toBe(product(lists).length);
    },
  );
});
