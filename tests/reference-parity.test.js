// Compares the extracted maths with the prototype it was extracted from (decisions.md D-021).
//
// At test time this reads reference/solid-explorer.html, cuts out the SHAPES, pyramid and MODES
// code (plus the small helpers beside it) and runs it with a stand-in for three.js. Every shape,
// mode, string and number in src/ is then compared with the original, so an accidental edit to a
// name, a default, an error message, a vertex or a triangle shows up here.
//
// The only differences allowed are the two corrected defaults (decisions.md Q-1, D-017).
//
// This file skips itself if the reference is not on disk. Remove it, or replace it with a
// snapshot, once v1.0 has shipped and the reference is retired.
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MODES } from '../src/modes.js';
import { SHAPES, buildShape } from '../src/shapes/index.js';
import { deg, fmt, nm, tx } from '../src/format.js';
import { solveRightTriangle } from '../src/geometry/solver.js';

const REFERENCE = new URL('../reference/solid-explorer.html', import.meta.url);
const hasReference = existsSync(REFERENCE);

// ---------------------------------------------------------------------------------------------
// Loading the reference
// ---------------------------------------------------------------------------------------------

const between = (src, from, to) => {
  const a = src.indexOf(from);
  const b = a < 0 ? -1 : src.indexOf(to, a);
  if (a < 0 || b < 0) throw new Error(`Cannot find "${from}" to "${to}" in the reference.`);
  return src.slice(a, b);
};

const lineStartingWith = (src, start) => {
  const line = src.split('\n').find((l) => l.trimStart().startsWith(start));
  if (!line) throw new Error(`Cannot find a line starting "${start}" in the reference.`);
  return line.trim();
};

function loadReference() {
  const src = readFileSync(REFERENCE, 'utf8');

  // Stand-in for three.js. It only records what the prototype asked for, so the test can check the
  // segment counts and flags the scene has to reproduce.
  const recorder = (kind) =>
    class {
      constructor(...args) {
        this.kind = kind;
        this.args = args;
      }
    };
  const THREE = { ConeGeometry: recorder('cone'), CylinderGeometry: recorder('cylinder') };

  const library = between(src, '// ---------- Shape library', '// ---------- State');
  const uniqueEdgesSrc = between(src, 'function uniqueEdges(faces)', 'function lineSeg');
  // The part of rebuild() that derives allEdges and diags, run as written.
  const deriveSrc = between(src, 'built.allEdges = solidEdges.concat', 'const dimKeys');
  const helperLines = [
    'const fmt = ',
    'const deg = ',
    'const key = ',
    'const nm = ',
    'const tx = ',
  ].map((start) => lineStartingWith(src, start));
  const solveLine = lineStartingWith(src, 'const adj = P.distanceTo(Q)');

  const factory = new Function(
    'THREE',
    `
    let renames = {};
    ${helperLines.join('\n')}
    ${uniqueEdgesSrc}
    ${library}
    // Just enough of THREE.Vector3: distanceTo, with the same arithmetic as r128.
    const V = (a) => ({
      a,
      distanceTo(v) {
        const dx = a[0] - v.a[0], dy = a[1] - v.a[1], dz = a[2] - v.a[2];
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
      },
    });
    const derive = (built) => {
      const verts = built.verts;
      const solidEdges = built.curved ? (built.edges || []) : uniqueEdges(built.faces);
      ${deriveSrc}
      return { allEdges: built.allEdges, diags: built.diags };
    };
    const solve = (P, Q, R) => {
      P = V(P); Q = V(Q); R = V(R);
      ${solveLine}
      return { adj, opp, hyp, theta };
    };
    return { SHAPES, MODES, fmt, deg, nm, tx, derive, solve, setRenames: (r) => { renames = r; } };
  `,
  );
  return factory(THREE);
}

const ref = hasReference ? loadReference() : null;

// The reference holds a three.js geometry in `curved`. The port holds a descriptor. This turns the
// stand-in into the descriptor, so the rest of the result can be compared as it is.
const asDescriptor = ({ kind, args }) => ({
  kind,
  r: args[0],
  h: kind === 'cone' ? args[1] : args[2],
});
const refBuild = (shapeKey, dims) => {
  const built = ref.SHAPES[shapeKey].build(dims);
  return built.curved ? { ...built, curved: asDescriptor(built.curved) } : built;
};

const defaultsOf = (entries) => Object.fromEntries(entries.map(([k, , d]) => [k, d]));

// A second set of dimensions per shape, none of them a default.
const SECOND_DIMS = {
  cuboid: { l: 7, w: 3, h: 2 },
  cube: { a: 2.5 },
  sqpyramid: { b: 4, h: 9 },
  rectpyramid: { l: 6, w: 9, h: 3.5 },
  prism: { a: 3, b: 5, L: 11 },
  cone: { r: 2.5, h: 9 },
  cylinder: { r: 1.5, h: 6 },
};

// The two defaults that were corrected on purpose: shape:modeIndex:inputKey.
const KNOWN_FIXES = {
  'rectpyramid:2:e': { was: 8.73, now: 7.63 },
  'cone:4:t': { was: 60.3, now: 60.26 },
};

const product = (lists) =>
  lists.reduce((acc, list) => acc.flatMap((prefix) => list.map((v) => [...prefix, v])), [[]]);

// Collection-time lists. Empty when the reference is missing, in which case the whole file is skipped.
const SHAPE_KEYS = ref ? Object.keys(ref.SHAPES) : [];
const ALL_MODES = ref
  ? Object.entries(ref.MODES).flatMap(([shapeKey, modes]) =>
      modes.map((refMode, idx) => ({
        shapeKey,
        idx,
        refMode,
        label: `${shapeKey}: ${refMode.name}`,
      })),
    )
  : [];

describe.skipIf(!hasReference)('parity with reference/solid-explorer.html', () => {
  describe('shapes', () => {
    it('has the same shape keys, in the same order', () => {
      expect(Object.keys(SHAPES)).toEqual(Object.keys(ref.SHAPES));
    });

    it.each(SHAPE_KEYS)('%s: same name and dimension keys, labels and defaults', (k) => {
      expect(SHAPES[k].name).toBe(ref.SHAPES[k].name);
      expect(SHAPES[k].dims).toEqual(ref.SHAPES[k].dims);
    });

    it.each(SHAPE_KEYS)('%s: build() matches at the defaults', (k) => {
      const dims = defaultsOf(ref.SHAPES[k].dims);
      expect(SHAPES[k].build(dims)).toEqual(refBuild(k, dims));
    });

    it.each(SHAPE_KEYS)('%s: build() matches at a second set of dimensions', (k) => {
      expect(SHAPES[k].build(SECOND_DIMS[k])).toEqual(refBuild(k, SECOND_DIMS[k]));
    });

    it.each(SHAPE_KEYS)('%s: same vertex order (it sets the diagonals order)', (k) => {
      const dims = SECOND_DIMS[k];
      expect(Object.keys(SHAPES[k].build(dims).verts)).toEqual(
        Object.keys(refBuild(k, dims).verts),
      );
    });

    it('describes the curved solids the way the prototype builds them', () => {
      // The scene builds these, so the arguments are part of the contract. See cone.js, cylinder.js.
      const cone = ref.SHAPES.cone.build({ r: 4, h: 7 }).curved;
      expect(cone.kind).toBe('cone');
      expect(cone.args).toEqual([4, 7, 72]); // radius, height, 72 radial segments, closed
      const cylinder = ref.SHAPES.cylinder.build({ r: 3, h: 8 }).curved;
      expect(cylinder.kind).toBe('cylinder');
      expect(cylinder.args).toEqual([3, 3, 8, 72, 1, true]); // r top, r bottom, h, 72, 1, open-ended
      expect(SHAPES.cone.build({ r: 4, h: 7 }).curved).toEqual({ kind: 'cone', r: 4, h: 7 });
      expect(SHAPES.cylinder.build({ r: 3, h: 8 }).curved).toEqual({
        kind: 'cylinder',
        r: 3,
        h: 8,
      });
    });

    it.each(SHAPE_KEYS)('%s: allEdges and diags match what rebuild() derives', (k) => {
      for (const dims of [defaultsOf(ref.SHAPES[k].dims), SECOND_DIMS[k]]) {
        const want = ref.derive(ref.SHAPES[k].build(dims));
        const got = buildShape(k, dims);
        expect(got.allEdges).toEqual(want.allEdges);
        expect(got.diags).toEqual(want.diags);
      }
    });

    it.each(SHAPE_KEYS)('%s: solveRightTriangle matches the Working panel sums', (k) => {
      for (const dims of [defaultsOf(ref.SHAPES[k].dims), SECOND_DIMS[k]]) {
        const built = SHAPES[k].build(dims);
        built.tris.forEach((tri) => {
          const [P, Q, R] = tri.pts.map((n) => built.verts[n]);
          const want = ref.solve(P, Q, R);
          const got = solveRightTriangle(P, Q, R);
          expect(got).toEqual(want);
        });
      }
    });
  });

  describe('modes', () => {
    it('has the same shapes, in the same order, with the same number of modes', () => {
      expect(Object.keys(MODES)).toEqual(Object.keys(ref.MODES));
      for (const k of Object.keys(ref.MODES)) expect(MODES[k], k).toHaveLength(ref.MODES[k].length);
    });

    it.each(ALL_MODES)('$label: same name, input keys and labels', ({ shapeKey, idx, refMode }) => {
      const mode = MODES[shapeKey][idx];
      expect(mode.name).toBe(refMode.name);
      expect(mode.inputs.map(([k, label]) => [k, label])).toEqual(
        refMode.inputs.map(([k, label]) => [k, label]),
      );
    });

    it.each(ALL_MODES)(
      '$label: same defaults, apart from the two corrected ones',
      ({ shapeKey, idx, refMode }) => {
        const mode = MODES[shapeKey][idx];
        const expected = refMode.inputs.map(([k, label, def]) => [
          k,
          label,
          KNOWN_FIXES[`${shapeKey}:${idx}:${k}`]?.now ?? def,
        ]);
        expect(mode.inputs).toEqual(expected);
      },
    );

    it.each(ALL_MODES)('$label: same extra lines', ({ shapeKey, idx, refMode }) => {
      expect(MODES[shapeKey][idx].extra).toEqual(refMode.extra);
    });

    it('differs from the reference in exactly the two corrected defaults, and nothing else', () => {
      const differences = ALL_MODES.flatMap(({ shapeKey, idx, refMode }) =>
        refMode.inputs.flatMap(([k, , def], i) => {
          const now = MODES[shapeKey][idx].inputs[i][2];
          return now === def ? [] : [{ at: `${shapeKey}:${idx}:${k}`, was: def, now }];
        }),
      );
      expect(differences).toEqual([
        { at: 'rectpyramid:2:e', was: 8.73, now: 7.63 },
        { at: 'cone:4:t', was: 60.3, now: 60.26 },
      ]);
      expect(Object.keys(KNOWN_FIXES)).toEqual(differences.map((d) => d.at));
    });

    // Every combination of a spread of inputs, including zero, which the UI never passes but a pure
    // function must still answer the same way. Equal means the same solid or the same message.
    const LENGTHS = [0, 0.5, 1, 2, 3, 4, 5, 6, 8, 10, 13];
    const ANGLES = [-5, 0, 0.1, 30, 45, 66.8, 89.9, 90, 95];

    it.each(ALL_MODES)(
      '$label: toCanon agrees over a grid of inputs, valid and invalid',
      ({ shapeKey, idx, refMode }) => {
        const mode = MODES[shapeKey][idx];
        const lists = refMode.inputs.map(([, label, def], i) => {
          const base = label.includes('°') ? ANGLES : LENGTHS;
          return [...new Set([...base, def, mode.inputs[i][2]])];
        });
        const mismatches = [];
        let tried = 0;
        for (const combo of product(lists)) {
          const values = Object.fromEntries(refMode.inputs.map(([k], i) => [k, combo[i]]));
          const want = refMode.toCanon({ ...values });
          const got = mode.toCanon({ ...values });
          tried++;
          try {
            expect(got).toEqual(want);
          } catch {
            mismatches.push({ values, got, want });
          }
        }
        expect(tried).toBeGreaterThanOrEqual(11);
        expect(mismatches.slice(0, 3)).toEqual([]);
      },
    );

    it('rectangular pyramid "Base and slant edge": same sums, different starting value', () => {
      const refMode = ref.MODES.rectpyramid[2];
      const mode = MODES.rectpyramid[2];
      const refDefaults = defaultsOf(refMode.inputs);
      const newDefaults = defaultsOf(mode.inputs);
      expect(refDefaults).toEqual({ l: 8, w: 5, e: 8.73 });
      expect(newDefaults).toEqual({ l: 8, w: 5, e: 7.63 });
      // At the reference value the two agree, and both give the wrong height.
      expect(mode.toCanon(refDefaults)).toEqual(refMode.toCanon(refDefaults));
      expect(refMode.toCanon(refDefaults).h).toBeCloseTo(7.3459, 4);
      // At the new value the height is the canonical 6, to within 0.01.
      expect(Math.abs(mode.toCanon(newDefaults).h - 6)).toBeLessThanOrEqual(0.01);
      expect(mode.toCanon(newDefaults)).toEqual(refMode.toCanon(newDefaults));
    });

    it('cone "Radius and angle at the base": same sums, different starting value', () => {
      const refMode = ref.MODES.cone[4];
      const mode = MODES.cone[4];
      const refDefaults = defaultsOf(refMode.inputs);
      const newDefaults = defaultsOf(mode.inputs);
      expect(refDefaults).toEqual({ r: 4, t: 60.3 });
      expect(newDefaults).toEqual({ r: 4, t: 60.26 });
      expect(mode.toCanon(refDefaults)).toEqual(refMode.toCanon(refDefaults));
      expect(Math.abs(refMode.toCanon(refDefaults).h - 7)).toBeGreaterThan(0.01);
      expect(Math.abs(mode.toCanon(newDefaults).h - 7)).toBeLessThanOrEqual(0.01);
      expect(mode.toCanon(newDefaults)).toEqual(refMode.toCanon(newDefaults));
    });
  });

  describe('formatting', () => {
    const NUMBERS = [
      0,
      1,
      -1,
      5,
      120,
      0.1,
      0.5,
      0.07,
      0.001,
      1.005,
      2.5,
      2.505,
      2.675,
      3.14159,
      7.0014,
      7.3459,
      8.06,
      9.43398,
      10.239999,
      11.53,
      53.13010235415598,
      67.38013505195957,
      99.995,
      100,
      1234.5678,
      1e6,
      1e-9,
      -1e-9,
      -0,
      -2.5,
      -1.234,
      0.1 + 0.2,
    ];

    it.each(NUMBERS)('fmt(%s) gives the same text', (v) => {
      expect(fmt(v)).toBe(ref.fmt(v));
    });

    it.each([
      0,
      Math.PI / 6,
      Math.PI / 4,
      Math.PI / 2,
      1,
      0.5,
      Math.atan2(4, 3),
      Math.atan2(12, 5),
    ])('deg(%s) gives the same text', (rad) => {
      expect(deg(rad)).toBe(ref.deg(rad));
    });

    const RENAMES = [
      {},
      { A: 'P' },
      { A: 'P', B: 'Q', C: 'R', G: 'X' },
      { A: 'A1', M: 'MM' },
      { V: '' },
    ];
    const TEXTS = [
      '',
      undefined,
      null,
      'No letters here.',
      '[A]',
      '[AB]',
      '[ABCDEFGH]',
      'Space diagonal [AG] via [AF]',
      '[a] [A1] [] [ A ]',
      ...Object.values(SHAPES).flatMap((s) => {
        const built = s.build(defaultsOf(s.dims));
        return built.tris.flatMap((t) => [t.title, t.note]);
      }),
    ];

    it('nm and tx give the same letters and text for every rename set', () => {
      for (const renames of RENAMES) {
        ref.setRenames(renames);
        for (const letter of ['A', 'B', 'C', 'G', 'M', 'V', 'Z']) {
          expect(nm(renames, letter), `nm ${letter} ${JSON.stringify(renames)}`).toBe(
            ref.nm(letter),
          );
        }
        for (const text of TEXTS) {
          expect(tx(renames, text), `tx ${JSON.stringify(text)} ${JSON.stringify(renames)}`).toBe(
            ref.tx(text),
          );
        }
      }
    });
  });
});
