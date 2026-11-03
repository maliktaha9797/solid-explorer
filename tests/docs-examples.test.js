// Runs the worked examples in docs/examples/ and checks the docs that show them.
//
//   docs/examples/frustum.js              a square frustum, for docs/adding-a-shape.md
//   docs/examples/frustum-modes.js        its first "Define by" mode, for the same page
//   docs/examples/cone-diameter-slant.js  a new cone mode, for docs/adding-a-define-by-mode.md
//
// Three things are tested:
//   1. The code block in each doc is the whole of the file that runs here, character for character.
//      Change one and not the other and the build fails.
//   2. The frustum goes through the real shape contract (the same helpers and the same rules that
//      tests/shapes.test.js holds the seven real shapes to), and the two modes go through the real
//      mode rules (tests/modes.test.js) and the real resolveDims that the Define by fields use.
//   3. The numbers and the test rows quoted in the docs are the ones that were run.
//
// The examples are NOT registered in SHAPES or MODES, so the app is unchanged. When a frustum is
// added for real (the `/add-shape` workflow), delete the example files and this test, and point the
// docs at the real file.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { frustum } from '../docs/examples/frustum.js';
import { frustumModes } from '../docs/examples/frustum-modes.js';
import { coneDiameterSlant } from '../docs/examples/cone-diameter-slant.js';
import { MODES } from '../src/modes.js';
import { SHAPES, buildShape } from '../src/shapes/index.js';
import { uniqueEdges } from '../src/shapes/helpers.js';
import { allEdges, diagonals, edgeKey } from '../src/geometry/diagonals.js';
import { distance, solveRightTriangle } from '../src/geometry/solver.js';
import { resolveDims } from '../src/ui/dims-model.js';
import { deg, fmt, tx } from '../src/format.js';

// ---------------------------------------------------------------------------------------------
// Reading the docs
// ---------------------------------------------------------------------------------------------

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');

const SHAPE_DOC = 'docs/adding-a-shape.md';
const MODE_DOC = 'docs/adding-a-define-by-mode.md';
const shapeMd = read(SHAPE_DOC);
const modeMd = read(MODE_DOC);

// A marker line, then a fenced js block:
//   <!-- docs-example: docs/examples/frustum.js -->   the whole of that file
//   <!-- docs-check: boundary-row -->                  a snippet this test evaluates and runs
const blocks = (markdown, kind) =>
  [
    ...markdown.matchAll(
      new RegExp(`<!-- docs-${kind}: (\\S+) -->\\s*\`\`\`js\\n([\\s\\S]*?)\\n\`\`\``, 'g'),
    ),
  ].map((m) => ({ name: m[1], code: m[2] }));
const checkBlock = (markdown, name) => {
  const found = blocks(markdown, 'check').filter((b) => b.name === name);
  expect(found, `a "docs-check: ${name}" block`).toHaveLength(1);
  return found[0].code;
};
// Evaluate a snippet from a doc. A trailing comma is allowed, because the snippets are written the
// way they would sit in the test files.
const evaluate = (code) =>
  new Function(`'use strict'; return (${code.trim().replace(/,$/, '')});`)();
const evaluateMembers = (code) => evaluate(`{ ${code} }`);

// ---------------------------------------------------------------------------------------------
// Small maths helpers
// ---------------------------------------------------------------------------------------------

const sub = (a, b) => a.map((v, i) => v - b[i]);
const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
const len = (a) => Math.hypot(...a);
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
// The angle at Q, in degrees, between the lines to P and to R.
const angleAt = (Q, P, R) =>
  (Math.acos(dot(sub(P, Q), sub(R, Q)) / (len(sub(P, Q)) * len(sub(R, Q)))) * 180) / Math.PI;
const defaultsOf = (inputs) => Object.fromEntries(inputs.map(([k, , d]) => [k, d]));

// The two lines buildShape (src/shapes/index.js) runs, for a shape that is not in the registry.
const buildLikeTheRegistry = (shape, dims) => {
  const built = shape.build(dims);
  return { ...built, allEdges: allEdges(built), diags: diagonals(built) };
};

// En dash and em dash, written as code points so that this file contains neither.
const DASHES = new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`);
// Comments may mention three.js and the page. Code may not use them (as in tests/shapes.test.js).
const codeOf = (path) => read(path).replace(/\/\/.*$/gm, '');

// ---------------------------------------------------------------------------------------------
// 1. The code in the docs is the code that runs
// ---------------------------------------------------------------------------------------------

describe('the code in the docs is the code that runs', () => {
  const DOCS = [
    [SHAPE_DOC, shapeMd, ['docs/examples/frustum.js', 'docs/examples/frustum-modes.js']],
    [MODE_DOC, modeMd, ['docs/examples/cone-diameter-slant.js']],
  ];

  it.each(DOCS)('%s shows these example files, whole, in this order', (_doc, md, files) => {
    const shown = blocks(md, 'example');
    expect(shown.map((b) => b.name)).toEqual(files);
    for (const b of shown) expect(b.code, b.name).toBe(read(b.name).trimEnd());
  });

  it('notices when a docs block drifts from its file', () => {
    // The control: change one number in the doc, and the comparison above must fail.
    const drifted = shapeMd.replace("['a', 'Bottom side', 10],", "['a', 'Bottom side', 11],");
    expect(drifted).not.toBe(shapeMd);
    const [first] = blocks(drifted, 'example');
    expect(first.code).not.toBe(read(first.name).trimEnd());
  });

  it('has a block for every snippet the tests below run', () => {
    expect(blocks(shapeMd, 'check').map((b) => b.name)).toEqual([
      'second-dims',
      'counts',
      'frustum-boundary-row',
      'other-values',
    ]);
    expect(blocks(modeMd, 'check').map((b) => b.name)).toEqual([
      'boundary-row',
      'hand-checked-row',
    ]);
  });
});

describe('the docs and the examples have no em or en dashes', () => {
  const FILES = [
    SHAPE_DOC,
    MODE_DOC,
    'docs/examples/frustum.js',
    'docs/examples/frustum-modes.js',
    'docs/examples/cone-diameter-slant.js',
  ];
  it.each(FILES)('%s', (path) => {
    expect(read(path)).not.toMatch(DASHES);
  });
});

// ---------------------------------------------------------------------------------------------
// 2a. The frustum goes through the real shape contract
// ---------------------------------------------------------------------------------------------

describe('the frustum follows the shape contract', () => {
  const SECOND = evaluateMembers(checkBlock(shapeMd, 'second-dims')).frustum;
  const COUNTS = evaluateMembers(checkBlock(shapeMd, 'counts')).frustum;
  const DIM_SETS = [
    { which: 'defaults', dims: defaultsOf(frustum.dims) },
    { which: 'the second set from the docs', dims: SECOND },
  ];

  it('builds through the same lines as buildShape (checked against a real shape)', () => {
    const dims = defaultsOf(SHAPES.cuboid.dims);
    expect(buildLikeTheRegistry(SHAPES.cuboid, dims)).toEqual(buildShape('cuboid', dims));
  });

  it('has a name and three dimensions, each [key, label, default]', () => {
    expect(frustum.name).toBe('Square frustum');
    expect(frustum.dims).toEqual([
      ['a', 'Bottom side', 10],
      ['b', 'Top side', 4],
      ['h', 'Height', 4],
    ]);
    expect(typeof frustum.build).toBe('function');
  });

  it('uses a second set of sizes that is not the defaults and has no two equal', () => {
    const defaults = defaultsOf(frustum.dims);
    for (const k of Object.keys(defaults)) expect(SECOND[k], k).not.toBe(defaults[k]);
    expect(new Set(Object.values(SECOND)).size).toBe(3);
    expect(SECOND.a).toBeGreaterThan(SECOND.b);
  });

  it.each(DIM_SETS)('$which: every vertex is one capital letter, and there are 10', ({ dims }) => {
    const names = Object.keys(frustum.build(dims).verts);
    expect(names).toHaveLength(COUNTS.verts);
    names.forEach((n) => expect(n).toMatch(/^[A-Z]$/));
  });

  it('gives the same vertex letters at any size', () => {
    const [a, b] = DIM_SETS.map(({ dims }) => Object.keys(frustum.build(dims).verts));
    expect(b).toEqual(a);
  });

  it.each(DIM_SETS)('$which: every face has real vertices and is flat and convex', ({ dims }) => {
    const { verts, faces } = frustum.build(dims);
    faces.forEach((face) => {
      face.forEach((n) => expect(verts[n], n).toBeDefined());
      expect(face.length).toBeGreaterThanOrEqual(3);
      const pts = face.map((n) => verts[n]);
      const normal = cross(sub(pts[1], pts[0]), sub(pts[2], pts[1]));
      pts.forEach((p, i) => {
        expect(Math.abs(dot(sub(p, pts[0]), normal)) / len(normal), `${face} is flat`).toBeLessThan(
          1e-9,
        );
        const q = pts[(i + 1) % pts.length],
          r = pts[(i + 2) % pts.length];
        expect(dot(cross(sub(q, p), sub(r, q)), normal), `${face} is convex`).toBeGreaterThan(0);
      });
    });
  });

  it.each(DIM_SETS)(
    '$which: has the counts the docs give, and every vertex pair is exactly one kind of line',
    ({ dims }) => {
      const built = buildLikeTheRegistry(frustum, dims);
      expect(Object.keys(built.verts)).toHaveLength(COUNTS.verts);
      expect(uniqueEdges(built.faces)).toHaveLength(COUNTS.solidEdges);
      expect(built.dashed).toHaveLength(COUNTS.dashed);
      expect(built.allEdges).toHaveLength(COUNTS.allEdges);
      expect(built.diags).toHaveLength(COUNTS.diags);
      const names = Object.keys(built.verts);
      const keys = built.allEdges.concat(built.diags).map(([a, b]) => edgeKey(a, b));
      expect(new Set(keys).size).toBe(keys.length);
      expect(keys.length).toBe((names.length * (names.length - 1)) / 2);
    },
  );

  it.each(DIM_SETS)('$which: no two points are the same point', ({ dims }) => {
    const { verts } = frustum.build(dims);
    const names = Object.keys(verts);
    names.forEach((a, i) =>
      names.slice(i + 1).forEach((b) => {
        expect(distance(verts[a], verts[b]), `${a}${b}`).toBeGreaterThanOrEqual(1e-6);
      }),
    );
  });

  it.each(DIM_SETS)(
    '$which: dims name real vertices, label each dimension once, on a drawn line that is that long',
    ({ dims }) => {
      const built = buildLikeTheRegistry(frustum, dims);
      const drawn = new Set(built.allEdges.map(([a, b]) => edgeKey(a, b)));
      expect(built.dims.map(([, , k]) => k).sort()).toEqual(frustum.dims.map(([k]) => k).sort());
      built.dims.forEach(([a, b, k]) => {
        expect(built.verts[a], a).toBeDefined();
        expect(built.verts[b], b).toBeDefined();
        expect(drawn.has(edgeKey(a, b)), `${a}${b} is drawn`).toBe(true);
        expect(distance(built.verts[a], built.verts[b]), `${a}${b} is ${k}`).toBeCloseTo(
          dims[k],
          9,
        );
      });
    },
  );

  it.each(DIM_SETS)('$which: the solid is centred on the origin', ({ dims }) => {
    const points = Object.values(frustum.build(dims).verts);
    for (let axis = 0; axis < 3; axis++) {
      const values = points.map((p) => p[axis]);
      expect((Math.min(...values) + Math.max(...values)) / 2, `axis ${axis}`).toBeCloseTo(0, 12);
    }
  });

  it('builds the same thing every time and shares nothing between builds', () => {
    const dims = defaultsOf(frustum.dims);
    const a = frustum.build(dims),
      b = frustum.build(dims);
    expect(a).toEqual(b);
    a.verts.A[0] = 999;
    expect(b.verts.A[0]).toBe(-5);
  });

  describe('the triangles', () => {
    it.each(DIM_SETS)(
      '$which: three different real vertices, the right angle at pts[1], theta at pts[0]',
      ({ dims }) => {
        const { verts, tris } = frustum.build(dims);
        expect(tris).toHaveLength(2);
        tris.forEach((t) => {
          expect(t.pts).toHaveLength(3);
          expect(new Set(t.pts).size).toBe(3);
          t.pts.forEach((n) => expect(verts[n], n).toBeDefined());
          const [P, Q, R] = t.pts.map((n) => verts[n]);
          expect(Math.abs(angleAt(Q, P, R) - 90), `${t.pts.join('')} at pts[1]`).toBeLessThan(0.01);
          // theta is the angle at pts[0], between the side to pts[1] and the hypotenuse.
          const { adj, opp, hyp, theta } = solveRightTriangle(P, Q, R);
          expect((theta * 180) / Math.PI).toBeCloseTo(angleAt(P, Q, R), 9);
          expect(theta).toBeLessThan(Math.PI / 2);
          expect(adj).toBeCloseTo(distance(P, Q), 12);
          expect(opp).toBeCloseTo(distance(Q, R), 12);
          expect(hyp).toBeCloseTo(Math.hypot(adj, opp), 9);
        });
      },
    );

    it('would notice a triangle whose pts were reordered', () => {
      const { verts, tris } = frustum.build(defaultsOf(frustum.dims));
      const [P, Q, R] = tris[0].pts.map((n) => verts[n]); // J K F, right angle at K
      expect(Math.abs(angleAt(P, Q, R) - 90)).toBeGreaterThan(1);
    });

    it.each(DIM_SETS)(
      '$which: the sides are half the difference, the height and the slant, as the docs say',
      ({ dims: { a, b, h } }) => {
        const { verts, tris } = frustum.build({ a, b, h });
        const half = (a - b) / 2;
        const first = solveRightTriangle(...tris[0].pts.map((n) => verts[n]));
        const second = solveRightTriangle(...tris[1].pts.map((n) => verts[n]));
        expect(first.adj).toBeCloseTo(half, 12);
        expect(first.opp).toBeCloseTo(h, 12);
        expect(first.hyp).toBeCloseTo(Math.hypot(half, h), 12);
        // The second note says JF comes from the first triangle, so it must be the same length.
        expect(second.adj).toBeCloseTo(half, 12);
        expect(second.opp).toBeCloseTo(first.hyp, 12);
      },
    );

    it('has [AB] tokens that name real vertices, in the voice of the other shapes', () => {
      const { verts, tris } = frustum.build(defaultsOf(frustum.dims));
      tris.forEach((t) => {
        expect(t.title).toMatch(/\[[A-Z]+\]/);
        for (const text of [t.title, t.note]) {
          for (const [, letters] of text.matchAll(/\[([A-Z]+)\]/g)) {
            letters.split('').forEach((n) => expect(verts[n], `${n} in "${text}"`).toBeDefined());
          }
          expect(text).not.toMatch(DASHES);
          // No bare vertex letters: take the tokens out and no capital letter should be left,
          // apart from the first letter of a sentence.
          const rest = text.replace(/\[[A-Z]+\]/g, '').replace(/(^|\. )[A-Z]/g, '$1');
          expect(rest, text).not.toMatch(/\b[A-Z]{1,2}\b/);
        }
      });
    });

    it('follows a renamed corner, and drops the brackets', () => {
      const { tris } = frustum.build(defaultsOf(frustum.dims));
      expect(tx({ J: 'X' }, tris[0].title)).toBe('Slant height XF');
      expect(tx({ J: 'X' }, tris[1].note)).toBe(
        'BX is half the difference between the two sides too. XF comes from the first triangle.',
      );
    });
  });

  it('has the numbers the docs quote for the default sizes', () => {
    const built = frustum.build(defaultsOf(frustum.dims));
    const [one, two] = built.tris.map((t) =>
      solveRightTriangle(...t.pts.map((n) => built.verts[n])),
    );
    expect(fmt(one.adj)).toBe('3');
    expect(fmt(one.opp)).toBe('4');
    expect(fmt(one.hyp)).toBe('5');
    expect(deg(one.theta)).toBe('53.13°');
    expect(fmt(two.adj)).toBe('3');
    expect(fmt(two.opp)).toBe('5');
    expect(fmt(two.hyp)).toBe('5.83');
    expect(deg(two.theta)).toBe('59.04°');
    // ... and they are in the doc.
    for (const text of [
      '53.13°',
      '59.04°',
      '5.83',
      'JF² = 3² + 4² = 9 + 16 = 25',
      'JF = √25 = 5 cm',
    ]) {
      expect(shapeMd, text).toContain(text);
    }
    expect(shapeMd).toContain(
      `${COUNTS.verts} points, ${COUNTS.solidEdges} solid edges and ${COUNTS.dashed} dashed lines`,
    );
    expect(shapeMd).toContain(`${COUNTS.allEdges} selectable lines`);
    expect(shapeMd).toContain(
      `the other ${COUNTS.diags} of the ${(COUNTS.verts * (COUNTS.verts - 1)) / 2} pairs`,
    );
  });

  it('keeps pure data: no three.js and no page', () => {
    for (const path of ['docs/examples/frustum.js', 'docs/examples/frustum-modes.js']) {
      expect(codeOf(path), path).not.toMatch(
        /from\s+['"]three['"]|import\s*\(\s*['"]three|require\(\s*['"]three/,
      );
      expect(codeOf(path), path).not.toMatch(/THREE\./);
      expect(codeOf(path), path).not.toMatch(
        /\b(document|window|localStorage|sessionStorage|navigator)\b/,
      );
    }
  });
});

// ---------------------------------------------------------------------------------------------
// 2b. The frustum's first mode goes through the real mode rules
// ---------------------------------------------------------------------------------------------

describe('the frustum first mode', () => {
  const [first] = frustumModes;
  const ERROR = 'The bottom side must be longer than the top side.';

  it('is the canonical mode: its keys and defaults are the shape dims', () => {
    expect(frustumModes).toHaveLength(1);
    expect(first.inputs.map(([k]) => k)).toEqual(frustum.dims.map(([k]) => k));
    expect(defaultsOf(first.inputs)).toEqual(defaultsOf(frustum.dims));
    expect(first.toCanon(defaultsOf(first.inputs))).toEqual(defaultsOf(frustum.dims));
  });

  it('returns valid inputs unchanged, with the numbers the docs give for the test', () => {
    const OTHER = new Function(`${checkBlock(shapeMd, 'other-values')}\nreturn OTHER;`)();
    expect(first.toCanon(OTHER.frustum)).toEqual(OTHER.frustum);
  });

  it('refuses the numbers 1.5, 2.5 and 3.5 that the real first-mode test would feed it', () => {
    // This is why the docs tell you to give the frustum its own numbers in that test.
    expect(first.toCanon({ a: 1.5, b: 2.5, h: 3.5 })).toEqual({ error: ERROR });
  });

  it('passes the boundary row from the docs: equal is an error, a little more is a solid', () => {
    const row = evaluate(checkBlock(shapeMd, 'frustum-boundary-row'));
    expect(row.shapeKey).toBe('frustum');
    expect(row.idx).toBe(0);
    expect(row.error).toBe(ERROR);
    for (const values of row.bad)
      expect(first.toCanon(values), JSON.stringify(values)).toEqual({ error: ERROR });
    const res = first.toCanon(row.good);
    expect(res.error).toBeUndefined();
    for (const k of Object.keys(row.expected)) expect(res[k]).toBeCloseTo(row.expected[k], 9);
  });

  it('works with the real resolveDims, as the Define by fields use it', () => {
    const defaults = defaultsOf(first.inputs);
    // A blank, zero or negative field falls back to that input's default.
    const fallback = resolveDims(first, { a: NaN, b: -1, h: 0 }, null);
    expect(fallback.entered).toEqual(defaults);
    expect(fallback.dimVals).toEqual(defaults);
    expect(fallback.dimError).toBeNull();
    // An error keeps the last good solid, and shows the message.
    const good = resolveDims(first, { a: 12, b: 5, h: 6 }, null);
    expect(good.lastGood).toEqual({ a: 12, b: 5, h: 6 });
    const bad = resolveDims(first, { a: 4, b: 5, h: 6 }, good.lastGood);
    expect(bad.dimError).toBe(ERROR);
    expect(bad.dimVals).toBe(good.lastGood);
    // With no good solid yet, the mode's own defaults are used.
    expect(resolveDims(first, { a: 4, b: 5, h: 6 }, null).dimVals).toEqual(defaults);
  });

  it('never gives NaN or a message that is not a full sentence, over a grid of inputs', () => {
    const LENGTHS = [0.5, 1, 2, 3.5, 6, 7, 10, 25];
    let solids = 0;
    for (const a of LENGTHS)
      for (const b of LENGTHS)
        for (const h of LENGTHS) {
          const res = first.toCanon({ a, b, h });
          if (res.error !== undefined) {
            expect(res.error).toMatch(/^[A-Z].+\.$/);
            continue;
          }
          solids++;
          Object.values(res).forEach((v) => expect(Number.isFinite(v) && v > 0).toBe(true));
          Object.values(frustum.build(res).verts)
            .flat()
            .forEach((c) => expect(Number.isFinite(c)).toBe(true));
        }
    expect(solids).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------------------------
// 2c. The cone mode goes through the real mode rules
// ---------------------------------------------------------------------------------------------

describe('the cone mode "Diameter and slant height"', () => {
  const mode = coneDiameterSlant;
  const ERROR = 'The slant height must be longer than the radius.';
  const canon = defaultsOf(SHAPES.cone.dims);
  // The cone's modes as they would be once this one is added at the end.
  const CONE_MODES = [...MODES.cone, mode];

  it('goes at the end of the cone list, as the doc says, with a name nobody else has', () => {
    expect(CONE_MODES.indexOf(mode)).toBe(5);
    expect(CONE_MODES.map((m) => m.name).filter((n) => n === mode.name)).toHaveLength(1);
    expect(mode.name).toBe('Diameter and slant height');
  });

  it('has inputs that are [key, label, positive default], with unique keys', () => {
    mode.inputs.forEach(([key, label, def]) => {
      expect(key).toMatch(/^[a-zA-Z]$/);
      expect(label.length).toBeGreaterThan(0);
      expect(Number.isFinite(def) && def > 0).toBe(true);
    });
    const keys = mode.inputs.map(([k]) => k);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('uses no key that is a canonical dimension of the cone, and no angle', () => {
    const canonKeys = SHAPES.cone.dims.map(([k]) => k);
    mode.inputs.forEach(([k, label]) => {
      expect(canonKeys).not.toContain(k);
      expect(label).not.toContain('°');
    });
  });

  it('has an extra line that is a real pair of vertices, fed by an input', () => {
    const verts = Object.keys(SHAPES.cone.build(canon).verts);
    const inputKeys = mode.inputs.map(([k]) => k);
    mode.extra.forEach(([a, b, key]) => {
      expect(verts).toContain(a);
      expect(verts).toContain(b);
      expect(a).not.toBe(b);
      expect(inputKeys).toContain(key);
    });
    // The slant edge is drawn already, and is not one of the cone's labelled lines.
    const built = buildShape('cone', canon);
    const drawn = built.allEdges.map(([a, b]) => edgeKey(a, b));
    expect(drawn).toContain('PV');
    expect(built.dims.map(([a, b]) => edgeKey(a, b))).not.toContain('PV');
  });

  it('has defaults that make the canonical cone to within 0.01, and the numbers the docs work out', () => {
    const res = mode.toCanon(defaultsOf(mode.inputs));
    expect(res.error).toBeUndefined();
    expect(Object.keys(res).sort()).toEqual(Object.keys(canon).sort());
    for (const k of Object.keys(canon))
      expect(Math.abs(res[k] - canon[k])).toBeLessThanOrEqual(0.01);
    // Step 4 of the doc: d = 2 r, l = root 65 rounded to two places, and the check back.
    expect(mode.inputs[0][2]).toBe(2 * canon.r);
    expect(Math.sqrt(canon.r ** 2 + canon.h ** 2).toFixed(4)).toBe('8.0623');
    expect(Math.round(Math.sqrt(canon.r ** 2 + canon.h ** 2) * 100) / 100).toBe(mode.inputs[1][2]);
    expect(res.h.toFixed(4)).toBe('6.9974');
    for (const text of ['8.0623', '6.9974', '8.06']) expect(modeMd, text).toContain(text);
  });

  it('passes the boundary row from the docs: equal is an error, a little more is a solid', () => {
    const row = evaluate(checkBlock(modeMd, 'boundary-row'));
    expect(row.shapeKey).toBe('cone');
    expect(row.idx).toBe(CONE_MODES.indexOf(mode));
    expect(row.error).toBe(ERROR);
    expect(row.bad.length).toBeGreaterThan(0);
    for (const values of row.bad)
      expect(mode.toCanon(values), JSON.stringify(values)).toEqual({ error: ERROR });
    const res = mode.toCanon(row.good);
    expect(res.error).toBeUndefined();
    expect(Object.keys(res).sort()).toEqual(Object.keys(row.expected).sort());
    for (const k of Object.keys(row.expected)) {
      expect(res[k]).toBeCloseTo(row.expected[k], 9);
      expect(res[k]).toBeGreaterThan(0);
    }
    // The table in the doc.
    expect(fmt(res.h)).toBe('2.06');
    expect(modeMd).toContain('h = √(4.5² − 4²) = 2.06');
  });

  it('passes the hand-checked row from the docs: a diameter of 6 and a slant of 5 give 3 and 4', () => {
    const [shapeKey, idx, values, expected] = evaluate(checkBlock(modeMd, 'hand-checked-row'));
    expect(shapeKey).toBe('cone');
    expect(idx).toBe(CONE_MODES.indexOf(mode));
    const res = mode.toCanon(values);
    expect(res.error).toBeUndefined();
    expect(Object.keys(res).sort()).toEqual(Object.keys(expected).sort());
    for (const k of Object.keys(expected)) expect(res[k]).toBeCloseTo(expected[k], 9);
  });

  it('works with the real resolveDims, and what the doc says you will see in the app', () => {
    const defaults = defaultsOf(mode.inputs);
    const start = resolveDims(mode, {}, null);
    expect(start.entered).toEqual(defaults);
    expect(start.dimError).toBeNull();
    expect(fmt(start.dimVals.r)).toBe('4');
    expect(fmt(start.dimVals.h)).toBe('7');
    // Typing 4 into the slant height: the red message, and the cone stays as it was.
    const four = resolveDims(mode, { d: 8, l: 4 }, start.lastGood);
    expect(four.dimError).toBe(ERROR);
    expect(four.dimVals).toBe(start.lastGood);
    // Typing 4.5: the cone is short and wide.
    const fourFive = resolveDims(mode, { d: 8, l: 4.5 }, start.lastGood);
    expect(fourFive.dimError).toBeNull();
    expect(fmt(fourFive.dimVals.h)).toBe('2.06');
    // A blank or negative field falls back to the default.
    expect(resolveDims(mode, { d: NaN, l: -2 }, null).entered).toEqual(defaults);
  });

  it('turns into a cone the real shape builds', () => {
    const res = mode.toCanon({ d: 6, l: 5 });
    const built = buildShape('cone', res);
    expect(built.curved).toEqual({ kind: 'cone', r: 3, h: 4 });
    expect(built.tris[0].pts).toEqual(['P', 'O', 'V']);
  });

  it('never gives NaN or a message that is not a full sentence, over a grid of inputs', () => {
    const LENGTHS = [0.5, 1, 2, 3.5, 6, 7, 10, 25];
    let solids = 0;
    let errors = 0;
    for (const d of LENGTHS)
      for (const l of LENGTHS) {
        const res = mode.toCanon({ d, l });
        if (res.error !== undefined) {
          errors++;
          expect(res.error).toMatch(/^[A-Z].+\.$/);
          continue;
        }
        solids++;
        Object.values(res).forEach((v) => expect(Number.isFinite(v) && v > 0).toBe(true));
        Object.values(SHAPES.cone.build(res).verts)
          .flat()
          .forEach((c) => expect(Number.isFinite(c)).toBe(true));
      }
    expect(solids).toBeGreaterThan(0);
    expect(errors).toBeGreaterThan(0);
  });

  it('keeps pure data: no three.js and no page', () => {
    const path = 'docs/examples/cone-diameter-slant.js';
    expect(codeOf(path)).not.toMatch(
      /from\s+['"]three['"]|import\s*\(\s*['"]three|require\(\s*['"]three/,
    );
    expect(codeOf(path)).not.toMatch(/\b(document|window|localStorage|sessionStorage|navigator)\b/);
  });
});
