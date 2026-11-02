import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SHAPES, buildShape } from '../src/shapes/index.js';
import { edgeKey } from '../src/geometry/diagonals.js';
import { fanTriangulate, pyramid, uniqueEdges } from '../src/shapes/helpers.js';

// En dash and em dash, written as code points so this file contains neither.
const DASHES = new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`);

const KEYS = ['cuboid', 'cube', 'sqpyramid', 'rectpyramid', 'prism', 'cone', 'cylinder'];

const defaultsOf = (shape) => Object.fromEntries(shape.dims.map(([k, , d]) => [k, d]));

// A second set of dimensions per shape: none of them is a default, and none has equal sides, so a
// builder that mixes up two dimensions would show.
const SECOND_DIMS = {
  cuboid: { l: 7, w: 3, h: 2 },
  cube: { a: 2.5 },
  sqpyramid: { b: 4, h: 9 },
  rectpyramid: { l: 6, w: 9, h: 3.5 },
  prism: { a: 3, b: 5, L: 11 },
  cone: { r: 2.5, h: 9 },
  cylinder: { r: 1.5, h: 6 },
};

// What the reference derives for each shape at its default dimensions.
const EXPECTED_COUNTS = {
  cuboid: { verts: 8, solidEdges: 12, dashed: 0, allEdges: 12, diags: 16 },
  cube: { verts: 8, solidEdges: 12, dashed: 0, allEdges: 12, diags: 16 },
  sqpyramid: { verts: 7, solidEdges: 8, dashed: 3, allEdges: 11, diags: 10 },
  rectpyramid: { verts: 7, solidEdges: 8, dashed: 3, allEdges: 11, diags: 10 },
  prism: { verts: 6, solidEdges: 9, dashed: 0, allEdges: 9, diags: 6 },
  cone: { verts: 4, solidEdges: 2, dashed: 2, allEdges: 4, diags: 2 },
  cylinder: { verts: 6, solidEdges: 2, dashed: 2, allEdges: 4, diags: 11 },
};

const sub = (a, b) => a.map((v, i) => v - b[i]);
const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
const len = (a) => Math.hypot(...a);
const angleAt = (Q, P, R) =>
  (Math.acos(dot(sub(P, Q), sub(R, Q)) / (len(sub(P, Q)) * len(sub(R, Q)))) * 180) / Math.PI;

const DIM_SETS = KEYS.flatMap((shapeKey) => [
  { shapeKey, which: 'defaults', dims: defaultsOf(SHAPES[shapeKey]) },
  { shapeKey, which: 'second set', dims: SECOND_DIMS[shapeKey] },
]);

describe('SHAPES registry', () => {
  it('has the seven shape keys, in the dropdown order', () => {
    expect(Object.keys(SHAPES)).toEqual(KEYS);
  });

  it('has the reference names', () => {
    expect(Object.fromEntries(Object.entries(SHAPES).map(([k, s]) => [k, s.name]))).toEqual({
      cuboid: 'Cuboid',
      cube: 'Cube',
      sqpyramid: 'Square pyramid',
      rectpyramid: 'Rectangular pyramid',
      prism: 'Triangular prism',
      cone: 'Cone',
      cylinder: 'Cylinder',
    });
  });

  it('has the reference dimension keys, labels and defaults', () => {
    expect(Object.fromEntries(Object.entries(SHAPES).map(([k, s]) => [k, s.dims]))).toEqual({
      cuboid: [
        ['l', 'Length', 8],
        ['w', 'Width', 5],
        ['h', 'Height', 4],
      ],
      cube: [['a', 'Side', 6]],
      sqpyramid: [
        ['b', 'Base side', 6],
        ['h', 'Height', 7],
      ],
      rectpyramid: [
        ['l', 'Base length', 8],
        ['w', 'Base width', 5],
        ['h', 'Height', 6],
      ],
      prism: [
        ['a', 'Base', 6],
        ['b', 'Height', 4],
        ['L', 'Length', 9],
      ],
      cone: [
        ['r', 'Radius', 4],
        ['h', 'Height', 7],
      ],
      cylinder: [
        ['r', 'Radius', 3],
        ['h', 'Height', 8],
      ],
    });
  });

  it('has a build function on every shape', () => {
    KEYS.forEach((k) => expect(typeof SHAPES[k].build).toBe('function'));
  });
});

describe('vertices, edges and diagonals', () => {
  it.each(KEYS)('%s: has the expected counts at the defaults', (shapeKey) => {
    const want = EXPECTED_COUNTS[shapeKey];
    const built = buildShape(shapeKey, defaultsOf(SHAPES[shapeKey]));
    expect(Object.keys(built.verts)).toHaveLength(want.verts);
    const solid = built.curved ? built.edges : uniqueEdges(built.faces);
    expect(solid).toHaveLength(want.solidEdges);
    expect(built.dashed || []).toHaveLength(want.dashed);
    expect(built.allEdges).toHaveLength(want.allEdges);
    expect(built.diags).toHaveLength(want.diags);
  });

  it.each(DIM_SETS)(
    '$shapeKey ($which): every vertex pair is exactly one of edge, dashed or diagonal',
    ({ shapeKey, dims }) => {
      const built = buildShape(shapeKey, dims);
      const names = Object.keys(built.verts);
      const pairs = (names.length * (names.length - 1)) / 2;
      const keys = built.allEdges.concat(built.diags).map(([a, b]) => edgeKey(a, b));
      expect(new Set(keys).size).toBe(keys.length);
      expect(keys.length).toBe(pairs);
    },
  );

  it.each(DIM_SETS)(
    '$shapeKey ($which): every line joins two real, different vertices',
    ({ shapeKey, dims }) => {
      const built = buildShape(shapeKey, dims);
      const names = new Set(Object.keys(built.verts));
      built.allEdges.concat(built.diags).forEach(([a, b]) => {
        expect(names.has(a), a).toBe(true);
        expect(names.has(b), b).toBe(true);
        expect(a).not.toBe(b);
      });
    },
  );

  it.each(DIM_SETS)(
    '$shapeKey ($which): no coincident points end up in the diagonals',
    ({ shapeKey, dims }) => {
      const built = buildShape(shapeKey, dims);
      built.diags.forEach(([a, b]) => {
        expect(len(sub(built.verts[a], built.verts[b])), `${a}${b}`).toBeGreaterThanOrEqual(1e-6);
      });
    },
  );

  it('lists the diagonals of the cuboid in vertex order', () => {
    const { diags } = buildShape('cuboid', defaultsOf(SHAPES.cuboid));
    expect(diags.map((d) => d.join(''))).toEqual([
      'AC',
      'AF',
      'AG',
      'AH',
      'BD',
      'BE',
      'BG',
      'BH',
      'CE',
      'CF',
      'CH',
      'DE',
      'DF',
      'DG',
      'EG',
      'FH',
    ]);
  });

  it('lists the cone and cylinder lines as the reference does', () => {
    const cone = buildShape('cone', defaultsOf(SHAPES.cone));
    expect(cone.allEdges.map((e) => e.join(''))).toEqual(['VP', 'VQ', 'VO', 'OP']);
    expect(cone.diags.map((e) => e.join(''))).toEqual(['OQ', 'PQ']);
    const cyl = buildShape('cylinder', defaultsOf(SHAPES.cylinder));
    expect(cyl.allEdges.map((e) => e.join(''))).toEqual(['PT', 'QS', 'QP', 'NO']);
  });

  it('lists the pyramid solid edges, then its three dashed lines', () => {
    const built = buildShape('rectpyramid', defaultsOf(SHAPES.rectpyramid));
    expect(built.allEdges.slice(8)).toEqual([
      ['V', 'O'],
      ['O', 'M'],
      ['O', 'C'],
    ]);
    expect(built.allEdges.slice(0, 8)).toEqual(uniqueEdges(built.faces));
  });
});

describe('dimension labels and triangles name real vertices', () => {
  it.each(DIM_SETS)(
    '$shapeKey ($which): dims use the shape dimension keys and real vertices',
    ({ shapeKey, dims }) => {
      const built = buildShape(shapeKey, dims);
      const names = new Set(Object.keys(built.verts));
      const keys = SHAPES[shapeKey].dims.map(([k]) => k);
      built.dims.forEach(([a, b, key]) => {
        expect(names.has(a), a).toBe(true);
        expect(names.has(b), b).toBe(true);
        expect(keys).toContain(key);
      });
    },
  );

  it.each(KEYS)('%s: every dimension is labelled on exactly one line', (shapeKey) => {
    const built = buildShape(shapeKey, defaultsOf(SHAPES[shapeKey]));
    const labelled = built.dims.map(([, , key]) => key).sort();
    expect(labelled).toEqual(SHAPES[shapeKey].dims.map(([k]) => k).sort());
  });

  it.each(KEYS)('%s: every dimension line is a selectable line', (shapeKey) => {
    const built = buildShape(shapeKey, defaultsOf(SHAPES[shapeKey]));
    const selectable = new Set(built.allEdges.concat(built.diags).map(([a, b]) => edgeKey(a, b)));
    built.dims.forEach(([a, b]) => expect(selectable.has(edgeKey(a, b))).toBe(true));
  });

  // Recorded, not fixed (see the report for this phase): the cylinder labels its radius on the line
  // O to P, which is a selectable diagonal but is not drawn until a student selects it. The skill
  // says every dimension line should be drawn. The reference does it this way, so the port does too.
  it('only the cylinder radius label sits on a line that is not drawn (as in the reference)', () => {
    const notDrawn = KEYS.flatMap((shapeKey) => {
      const built = buildShape(shapeKey, defaultsOf(SHAPES[shapeKey]));
      const drawn = new Set(built.allEdges.map(([a, b]) => edgeKey(a, b)));
      return built.dims
        .filter(([a, b]) => !drawn.has(edgeKey(a, b)))
        .map(([a, b, key]) => `${shapeKey}:${key}:${edgeKey(a, b)}`);
    });
    expect(notDrawn).toEqual(['cylinder:r:OP']);
  });

  it.each(DIM_SETS)(
    '$shapeKey ($which): triangles use three different real vertices',
    ({ shapeKey, dims }) => {
      const built = buildShape(shapeKey, dims);
      const names = new Set(Object.keys(built.verts));
      expect(built.tris.length).toBeGreaterThan(0);
      built.tris.forEach((t) => {
        expect(t.pts).toHaveLength(3);
        t.pts.forEach((n) => expect(names.has(n), n).toBe(true));
        expect(new Set(t.pts).size).toBe(3);
      });
    },
  );

  it('has the expected number of triangles per shape', () => {
    const counts = Object.fromEntries(
      KEYS.map((k) => [k, buildShape(k, defaultsOf(SHAPES[k])).tris.length]),
    );
    expect(counts).toEqual({
      cuboid: 4,
      cube: 4,
      sqpyramid: 3,
      rectpyramid: 3,
      prism: 4,
      cone: 1,
      cylinder: 1,
    });
  });

  it.each(KEYS)('%s: titles and notes use [AB] tokens that name real vertices', (shapeKey) => {
    const built = buildShape(shapeKey, defaultsOf(SHAPES[shapeKey]));
    const names = new Set(Object.keys(built.verts));
    built.tris.forEach((t) => {
      expect(t.title.length).toBeGreaterThan(0);
      expect(t.title).toMatch(/\[[A-Z]+\]/);
      for (const text of [t.title, t.note]) {
        for (const [, letters] of text.matchAll(/\[([A-Z]+)\]/g)) {
          letters.split('').forEach((n) => expect(names.has(n), `${n} in "${text}"`).toBe(true));
        }
        // The copy rules ban em dashes, and en dashes too.
        expect(text).not.toMatch(DASHES);
      }
    });
  });
});

describe('the right angle is at pts[1]', () => {
  // The rule: right angle at pts[1], the angle of interest at pts[0]. The Working tab draws the
  // flat triangle on that basis, so a reordered pts would make the picture and the sums wrong.
  it.each(DIM_SETS)(
    '$shapeKey ($which): every triangle has 90 degrees at pts[1]',
    ({ shapeKey, dims }) => {
      const built = buildShape(shapeKey, dims);
      built.tris.forEach((t) => {
        const [P, Q, R] = t.pts.map((n) => built.verts[n]);
        const angle = angleAt(Q, P, R);
        expect(
          Math.abs(angle - 90),
          `${t.pts.join('')} in ${shapeKey} is ${angle} degrees`,
        ).toBeLessThan(0.01);
      });
    },
  );

  it('would notice a triangle whose pts were reordered', () => {
    const built = buildShape('cuboid', defaultsOf(SHAPES.cuboid));
    const [P, Q, R] = built.tris[0].pts.map((n) => built.verts[n]); // A B C, right angle at B
    expect(Math.abs(angleAt(P, Q, R) - 90)).toBeGreaterThan(1);
  });
});

describe('curved solids', () => {
  it('describes the cone with a plain object', () => {
    const built = buildShape('cone', { r: 4, h: 7 });
    expect(built.curved).toEqual({ kind: 'cone', r: 4, h: 7 });
    expect(built.faces).toBeUndefined();
    expect(built.circles).toEqual([[-3.5, 4]]);
    expect(built.edges).toEqual([
      ['V', 'P'],
      ['V', 'Q'],
    ]);
    expect(built.dashed).toEqual([
      ['V', 'O'],
      ['O', 'P'],
    ]);
  });

  it('describes the cylinder with a plain object', () => {
    const built = buildShape('cylinder', { r: 3, h: 8 });
    expect(built.curved).toEqual({ kind: 'cylinder', r: 3, h: 8 });
    expect(built.faces).toBeUndefined();
    expect(built.circles).toEqual([
      [-4, 3],
      [4, 3],
    ]);
    expect(built.edges).toEqual([
      ['P', 'T'],
      ['Q', 'S'],
    ]);
    expect(built.dashed).toEqual([
      ['Q', 'P'],
      ['N', 'O'],
    ]);
  });

  it('passes the dimensions through as given', () => {
    expect(SHAPES.cone.build({ r: 2.5, h: 9 }).curved).toEqual({ kind: 'cone', r: 2.5, h: 9 });
    expect(SHAPES.cylinder.build({ r: 1.5, h: 6 }).curved).toEqual({
      kind: 'cylinder',
      r: 1.5,
      h: 6,
    });
  });

  it('puts the circle outlines on the rim heights', () => {
    const cyl = buildShape('cylinder', { r: 1.5, h: 6 });
    expect(cyl.circles).toEqual([
      [-3, 1.5],
      [3, 1.5],
    ]);
    expect(cyl.verts.P[1]).toBe(-3);
    expect(cyl.verts.T[1]).toBe(3);
  });

  it('gives polygon solids faces and no curved descriptor', () => {
    for (const k of ['cuboid', 'cube', 'sqpyramid', 'rectpyramid', 'prism']) {
      const built = buildShape(k, defaultsOf(SHAPES[k]));
      expect(built.curved, k).toBeUndefined();
      expect(built.faces.length, k).toBeGreaterThan(3);
    }
  });
});

describe('buildShape', () => {
  it.each(KEYS)('%s: returns everything build returns, plus allEdges and diags', (shapeKey) => {
    const dims = defaultsOf(SHAPES[shapeKey]);
    const built = buildShape(shapeKey, dims);
    const raw = SHAPES[shapeKey].build(dims);
    for (const field of Object.keys(raw)) expect(built[field], field).toEqual(raw[field]);
    expect(Array.isArray(built.allEdges)).toBe(true);
    expect(Array.isArray(built.diags)).toBe(true);
    expect(Object.keys(built).sort()).toEqual([...Object.keys(raw), 'allEdges', 'diags'].sort());
  });

  it('builds the same thing every time and shares nothing between builds', () => {
    const a = buildShape('cuboid', { l: 8, w: 5, h: 4 });
    const b = buildShape('cuboid', { l: 8, w: 5, h: 4 });
    expect(a).toEqual(b);
    a.verts.A[0] = 999;
    a.allEdges.pop();
    expect(b.verts.A[0]).toBe(-4);
    expect(b.allEdges).toHaveLength(12);
  });

  it('does not let one shape change another (the cube is built from the cuboid)', () => {
    const cube = buildShape('cube', { a: 6 });
    const cuboid = buildShape('cuboid', { l: 8, w: 5, h: 4 });
    expect(cube.dims).toEqual([['A', 'B', 'a']]);
    expect(cuboid.dims).toEqual([
      ['A', 'B', 'l'],
      ['B', 'C', 'w'],
      ['B', 'F', 'h'],
    ]);
  });
});

describe('vertex names do not depend on the dimensions', () => {
  // The Corner letters section calls build() at the defaults to find the vertex names.
  it.each(KEYS)('%s: same vertex letters at any dimensions', (shapeKey) => {
    const atDefaults = Object.keys(SHAPES[shapeKey].build(defaultsOf(SHAPES[shapeKey])).verts);
    const atOther = Object.keys(SHAPES[shapeKey].build(SECOND_DIMS[shapeKey]).verts);
    expect(atOther).toEqual(atDefaults);
    atDefaults.forEach((n) => expect(n).toMatch(/^[A-Z]$/));
  });
});

describe('every solid is centred on the origin', () => {
  it.each(DIM_SETS)('$shapeKey ($which): the bounding box is centred', ({ shapeKey, dims }) => {
    const { verts } = buildShape(shapeKey, dims);
    const points = Object.values(verts);
    for (let axis = 0; axis < 3; axis++) {
      const values = points.map((p) => p[axis]);
      expect((Math.min(...values) + Math.max(...values)) / 2, `axis ${axis}`).toBeCloseTo(0, 12);
    }
  });

  it('puts boxes at plus or minus half each dimension', () => {
    const { verts } = buildShape('cuboid', { l: 8, w: 5, h: 4 });
    expect(verts.A).toEqual([-4, -2, 2.5]);
    expect(verts.G).toEqual([4, 2, -2.5]);
  });

  it('puts the apex of a pyramid or cone at +h/2 and the base at -h/2', () => {
    expect(buildShape('sqpyramid', { b: 6, h: 7 }).verts.V).toEqual([0, 3.5, 0]);
    expect(buildShape('sqpyramid', { b: 6, h: 7 }).verts.O).toEqual([0, -3.5, 0]);
    expect(buildShape('cone', { r: 4, h: 7 }).verts.V).toEqual([0, 3.5, 0]);
    expect(buildShape('cone', { r: 4, h: 7 }).verts.P).toEqual([4, -3.5, 0]);
  });
});

describe('the dimensions drive the solid', () => {
  it('uses l along x, h along y and w along z for a cuboid', () => {
    const { verts } = buildShape('cuboid', { l: 7, w: 3, h: 2 });
    expect(verts.B[0] - verts.A[0]).toBe(7);
    expect(verts.F[1] - verts.B[1]).toBe(2);
    expect(verts.B[2] - verts.C[2]).toBe(3);
  });

  it('makes the cube a cuboid with three equal sides', () => {
    const cube = buildShape('cube', { a: 2.5 });
    const cuboid = buildShape('cuboid', { l: 2.5, w: 2.5, h: 2.5 });
    expect(cube.verts).toEqual(cuboid.verts);
    expect(cube.faces).toEqual(cuboid.faces);
    expect(cube.tris).toEqual(cuboid.tris);
  });

  it('makes the square pyramid a rectangular pyramid with equal base sides', () => {
    const sq = buildShape('sqpyramid', { b: 4, h: 9 });
    const rect = buildShape('rectpyramid', { l: 4, w: 4, h: 9 });
    expect(sq.verts).toEqual(rect.verts);
    expect(sq.faces).toEqual(rect.faces);
    expect(sq.dims).toEqual([
      ['A', 'B', 'b'],
      ['V', 'O', 'h'],
    ]);
    expect(rect.dims).toEqual([
      ['A', 'B', 'l'],
      ['B', 'C', 'w'],
      ['V', 'O', 'h'],
    ]);
  });

  it('has the right angle of the prism at A, with the base along x and the height along y', () => {
    const { verts } = buildShape('prism', { a: 6, b: 4, L: 9 });
    expect(verts.B[0] - verts.A[0]).toBe(6);
    expect(verts.C[1] - verts.A[1]).toBe(4);
    expect(verts.A[2] - verts.D[2]).toBe(9);
  });

  it('puts the midpoint M on the middle of the pyramid side BC', () => {
    const { verts } = buildShape('rectpyramid', { l: 8, w: 5, h: 6 });
    expect(verts.M).toEqual([
      (verts.B[0] + verts.C[0]) / 2,
      (verts.B[1] + verts.C[1]) / 2,
      (verts.B[2] + verts.C[2]) / 2,
    ]);
  });
});

describe('helpers', () => {
  it('uniqueEdges lists each edge once, in the order the faces give them', () => {
    expect(
      uniqueEdges([
        ['A', 'B', 'C'],
        ['C', 'B', 'D'],
      ]),
    ).toEqual([
      ['A', 'B'],
      ['B', 'C'],
      ['C', 'A'],
      ['B', 'D'],
      ['D', 'C'],
    ]);
  });

  it('fanTriangulate turns a triangle into three points', () => {
    const verts = { A: [0, 0, 0], B: [1, 0, 0], C: [0, 1, 0] };
    expect(fanTriangulate(verts, [['A', 'B', 'C']])).toEqual([0, 0, 0, 1, 0, 0, 0, 1, 0]);
  });

  it('fanTriangulate splits a quad into two triangles from its first vertex', () => {
    const verts = { A: [0, 0, 0], B: [1, 0, 0], C: [1, 1, 0], D: [0, 1, 0] };
    expect(fanTriangulate(verts, [['A', 'B', 'C', 'D']])).toEqual([
      ...[0, 0, 0, 1, 0, 0, 1, 1, 0],
      ...[0, 0, 0, 1, 1, 0, 0, 1, 0],
    ]);
  });

  it('fanTriangulate gives nine numbers (three points) for each triangle it makes', () => {
    // A cuboid has six quads: 12 triangles, 108 numbers.
    const cuboid = SHAPES.cuboid.build(defaultsOf(SHAPES.cuboid));
    expect(fanTriangulate(cuboid.verts, cuboid.faces)).toHaveLength(12 * 3 * 3);
    // A prism has 2 triangles and 3 quads: 2 + 6 = 8 triangles, 72 numbers.
    const prism = SHAPES.prism.build(defaultsOf(SHAPES.prism));
    expect(fanTriangulate(prism.verts, prism.faces)).toHaveLength(8 * 3 * 3);
  });

  it('fanTriangulate gives 6 triangles for a pyramid (2 for the base, 4 sides)', () => {
    const p = pyramid(8, 5, 6);
    expect(fanTriangulate(p.verts, p.faces)).toHaveLength(6 * 3 * 3);
  });

  it('pyramid is the shared factory for both pyramids', () => {
    const p = pyramid(8, 5, 6);
    expect(p.dims).toEqual(SHAPES.rectpyramid.build({ l: 8, w: 5, h: 6 }).dims);
    expect(p.verts.V).toEqual([0, 3, 0]);
  });
});

describe('the pure modules stay pure', () => {
  const root = new URL('../src/', import.meta.url);
  const named = (dir) =>
    readdirSync(new URL(`${dir}/`, root)).map((f) => [`${dir}/${f}`, new URL(`${dir}/${f}`, root)]);
  const files = [
    ...named('shapes'),
    ...named('geometry'),
    ['modes.js', new URL('modes.js', root)],
    ['format.js', new URL('format.js', root)],
  ];
  // Comments may mention three.js and the DOM. Code may not use them.
  const code = (url) => readFileSync(url, 'utf8').replace(/\/\/.*$/gm, '');

  it('finds the files it is meant to check', () => {
    expect(files.length).toBeGreaterThanOrEqual(12);
  });

  it.each(files)('%s: no three import', (_name, url) => {
    expect(code(url)).not.toMatch(
      /from\s+['"]three['"]|import\s*\(\s*['"]three|require\(\s*['"]three/,
    );
    expect(code(url)).not.toMatch(/THREE\./);
  });

  it.each(files)('%s: no DOM or storage', (_name, url) => {
    expect(code(url)).not.toMatch(/\b(document|window|localStorage|sessionStorage|navigator)\b/);
  });
});
