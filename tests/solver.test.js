import { describe, expect, it } from 'vitest';
import { distance, solveRightTriangle } from '../src/geometry/solver.js';
import { allEdges, diagonals, edgeKey } from '../src/geometry/diagonals.js';
import { SHAPES, buildShape } from '../src/shapes/index.js';
import { deg } from '../src/format.js';

const defaultsOf = (shape) => Object.fromEntries(shape.dims.map(([k, , d]) => [k, d]));
const add = (p, ...vs) => p.map((c, i) => c + vs.reduce((s, v) => s + v[i], 0));
const scale = (v, k) => v.map((c) => c * k);

describe('distance', () => {
  it('measures along an axis', () => {
    expect(distance([0, 0, 0], [3, 0, 0])).toBe(3);
    expect(distance([0, 2, 0], [0, -2, 0])).toBe(4);
  });

  it('measures in three dimensions', () => {
    expect(distance([0, 0, 0], [1, 2, 2])).toBe(3);
    expect(distance([1, 1, 1], [1, 1, 1])).toBe(0);
  });

  it('is the same both ways round', () => {
    expect(distance([1, 2, 3], [4, 6, 3])).toBe(distance([4, 6, 3], [1, 2, 3]));
  });
});

describe('solveRightTriangle', () => {
  it('solves the 3-4-5 triangle', () => {
    // Right angle at Q, theta at P.
    const Q = [0, 0, 0],
      P = [3, 0, 0],
      R = [0, 4, 0];
    const t = solveRightTriangle(P, Q, R);
    expect(t.adj).toBe(3);
    expect(t.opp).toBe(4);
    expect(t.hyp).toBe(5);
    expect(deg(t.theta)).toBe('53.13°');
  });

  it('solves the 5-12-13 triangle', () => {
    const Q = [0, 0, 0],
      P = [5, 0, 0],
      R = [0, 0, 12];
    const t = solveRightTriangle(P, Q, R);
    expect(t.adj).toBe(5);
    expect(t.opp).toBe(12);
    expect(t.hyp).toBe(13);
    expect(deg(t.theta)).toBe('67.38°');
  });

  it('measures adjacent from pts[0] to pts[1], opposite from pts[1] to pts[2], hypotenuse from pts[0] to pts[2]', () => {
    const t = solveRightTriangle([0, 0, 0], [0, 6, 0], [8, 6, 0]);
    expect(t.adj).toBe(6);
    expect(t.opp).toBe(8);
    expect(t.hyp).toBe(10);
  });

  it('gives theta as atan2(opposite, adjacent)', () => {
    const t = solveRightTriangle([3, 0, 0], [0, 0, 0], [0, 4, 0]);
    expect(t.theta).toBe(Math.atan2(4, 3));
  });

  it('gives 45 degrees for equal legs', () => {
    const t = solveRightTriangle([2, 0, 0], [0, 0, 0], [0, 2, 0]);
    expect(t.theta).toBeCloseTo(Math.PI / 4, 12);
    expect(deg(t.theta)).toBe('45°');
  });

  it('gives 60 degrees when the opposite is root 3 times the adjacent', () => {
    const t = solveRightTriangle([1, 0, 0], [0, 0, 0], [0, Math.sqrt(3), 0]);
    expect(t.theta).toBeCloseTo(Math.PI / 3, 12);
    expect(t.hyp).toBeCloseTo(2, 12);
  });

  it('works for a triangle tilted in 3D, away from the origin', () => {
    // Two perpendicular unit vectors, neither along an axis.
    const u = [1 / 3, 2 / 3, 2 / 3],
      v = [2 / 3, 1 / 3, -2 / 3];
    const Q = [1, 2, 3];
    const P = add(Q, scale(u, 5));
    const R = add(Q, scale(v, 12));
    const t = solveRightTriangle(P, Q, R);
    expect(t.adj).toBeCloseTo(5, 12);
    expect(t.opp).toBeCloseTo(12, 12);
    expect(t.hyp).toBeCloseTo(13, 12);
    expect(deg(t.theta)).toBe('67.38°');
  });

  it('does not change the points it is given', () => {
    const P = [3, 0, 0],
      Q = [0, 0, 0],
      R = [0, 4, 0];
    solveRightTriangle(P, Q, R);
    expect(P).toEqual([3, 0, 0]);
    expect(Q).toEqual([0, 0, 0]);
    expect(R).toEqual([0, 4, 0]);
  });
});

describe('solveRightTriangle on real solids', () => {
  const triangle = (shapeKey, dims, index) => {
    const built = buildShape(shapeKey, dims);
    const [P, Q, R] = built.tris[index].pts.map((n) => built.verts[n]);
    return solveRightTriangle(P, Q, R);
  };

  it('finds 5, 12 and 13 in a 3 by 4 by 12 cuboid', () => {
    const dims = { l: 3, w: 4, h: 12 };
    const base = triangle('cuboid', dims, 0);
    expect(base.adj).toBeCloseTo(3, 12);
    expect(base.opp).toBeCloseTo(4, 12);
    expect(base.hyp).toBeCloseTo(5, 12);
    const space = triangle('cuboid', dims, 1);
    expect(space.adj).toBeCloseTo(5, 12);
    expect(space.opp).toBeCloseTo(12, 12);
    expect(space.hyp).toBeCloseTo(13, 12);
  });

  it('matches hand-checked lengths at the default cuboid', () => {
    const dims = defaultsOf(SHAPES.cuboid); // 8 by 5 by 4
    expect(triangle('cuboid', dims, 0).hyp).toBeCloseTo(Math.sqrt(89), 12);
    expect(triangle('cuboid', dims, 1).hyp).toBeCloseTo(Math.sqrt(105), 12);
    expect(triangle('cuboid', dims, 2).hyp).toBeCloseTo(Math.sqrt(80), 12);
    expect(triangle('cuboid', dims, 3).hyp).toBeCloseTo(Math.sqrt(105), 12);
  });

  it('matches the slant height the cone and cylinder defaults are built from', () => {
    expect(triangle('cone', defaultsOf(SHAPES.cone), 0).hyp).toBeCloseTo(Math.sqrt(65), 12);
    const cyl = triangle('cylinder', defaultsOf(SHAPES.cylinder), 0);
    expect(cyl.adj).toBeCloseTo(6, 12);
    expect(cyl.opp).toBeCloseTo(8, 12);
    expect(cyl.hyp).toBeCloseTo(10, 12);
  });

  it('finds the prism end-face hypotenuse and space diagonal', () => {
    const dims = defaultsOf(SHAPES.prism); // 6 by 4 by 9
    expect(triangle('prism', dims, 0).hyp).toBeCloseTo(Math.sqrt(52), 12);
    expect(triangle('prism', dims, 3).hyp).toBeCloseTo(Math.sqrt(133), 12);
  });

  it.each(Object.keys(SHAPES))('%s: every triangle satisfies Pythagoras', (shapeKey) => {
    const built = buildShape(shapeKey, defaultsOf(SHAPES[shapeKey]));
    built.tris.forEach((tri) => {
      const [P, Q, R] = tri.pts.map((n) => built.verts[n]);
      const { adj, opp, hyp, theta } = solveRightTriangle(P, Q, R);
      expect(hyp * hyp).toBeCloseTo(adj * adj + opp * opp, 9);
      expect(Math.tan(theta)).toBeCloseTo(opp / adj, 9);
      expect(Math.sin(theta)).toBeCloseTo(opp / hyp, 9);
      expect(Math.cos(theta)).toBeCloseTo(adj / hyp, 9);
    });
  });
});

describe('edgeKey', () => {
  it('is the same whichever way round the letters are given', () => {
    expect(edgeKey('A', 'B')).toBe('AB');
    expect(edgeKey('B', 'A')).toBe('AB');
    expect(edgeKey('V', 'C')).toBe('CV');
  });

  it('is [a, b].sort().join("")', () => {
    for (const [a, b] of [
      ['G', 'A'],
      ['O', 'P'],
      ['T', 'Q'],
    ]) {
      expect(edgeKey(a, b)).toBe([a, b].sort().join(''));
    }
  });
});

describe('allEdges', () => {
  it('lists polygon edges once each, in face order, then the dashed lines', () => {
    const built = {
      verts: { A: [0, 0, 0], B: [1, 0, 0], C: [0, 1, 0], D: [0, 0, 1] },
      faces: [['A', 'B', 'C']],
      dashed: [['A', 'D']],
    };
    expect(allEdges(built)).toEqual([
      ['A', 'B'],
      ['B', 'C'],
      ['C', 'A'],
      ['A', 'D'],
    ]);
  });

  it('counts an edge shared by two faces once', () => {
    const built = {
      verts: { A: [0, 0, 0], B: [1, 0, 0], C: [0, 1, 0], D: [1, 1, 0] },
      faces: [
        ['A', 'B', 'C'],
        ['B', 'D', 'C'],
      ],
    };
    expect(allEdges(built)).toEqual([
      ['A', 'B'],
      ['B', 'C'],
      ['C', 'A'],
      ['B', 'D'],
      ['D', 'C'],
    ]);
  });

  it('uses the listed edges for a curved solid, then the dashed lines', () => {
    const built = {
      verts: { V: [0, 1, 0], O: [0, -1, 0], P: [1, -1, 0] },
      curved: { kind: 'cone', r: 1, h: 2 },
      edges: [['V', 'P']],
      dashed: [['V', 'O']],
    };
    expect(allEdges(built)).toEqual([
      ['V', 'P'],
      ['V', 'O'],
    ]);
  });

  it('copes with a curved solid that has no edges or dashed lines', () => {
    expect(allEdges({ verts: {}, curved: { kind: 'cone', r: 1, h: 1 } })).toEqual([]);
  });

  it('does not change the object it is given', () => {
    const built = { verts: {}, faces: [['A', 'B', 'C']], dashed: [['A', 'D']] };
    allEdges(built);
    expect(built).toEqual({ verts: {}, faces: [['A', 'B', 'C']], dashed: [['A', 'D']] });
  });
});

describe('diagonals', () => {
  it('gives the two diagonals of a square, in vertex order', () => {
    const built = {
      verts: { A: [0, 0, 0], B: [1, 0, 0], C: [1, 1, 0], D: [0, 1, 0] },
      faces: [['A', 'B', 'C', 'D']],
    };
    expect(diagonals(built)).toEqual([
      ['A', 'C'],
      ['B', 'D'],
    ]);
  });

  it('gives none for a triangle', () => {
    const built = {
      verts: { A: [0, 0, 0], B: [1, 0, 0], C: [0, 1, 0] },
      faces: [['A', 'B', 'C']],
    };
    expect(diagonals(built)).toEqual([]);
  });

  it('leaves out dashed lines, which are already selectable lines', () => {
    const built = {
      verts: { A: [0, 0, 0], B: [1, 0, 0], C: [1, 1, 0], D: [0, 1, 0] },
      faces: [['A', 'B', 'C', 'D']],
      dashed: [['A', 'C']],
    };
    expect(diagonals(built)).toEqual([['B', 'D']]);
  });

  it('leaves out pairs whose points are the same point', () => {
    const built = {
      verts: { A: [0, 0, 0], B: [0, 0, 0], C: [1, 0, 0] },
      curved: { kind: 'cone', r: 1, h: 1 },
      edges: [['A', 'C']],
    };
    expect(diagonals(built)).toEqual([['B', 'C']]);
  });

  it('treats points closer than 1e-6 as the same point, and points further apart as different', () => {
    const near = { A: [0, 0, 0], B: [5e-7, 0, 0] };
    const apart = { A: [0, 0, 0], B: [2e-6, 0, 0] };
    expect(diagonals({ verts: near, curved: {} })).toEqual([]);
    expect(diagonals({ verts: apart, curved: {} })).toEqual([['A', 'B']]);
  });

  it('recognises an edge given in either letter order', () => {
    const built = {
      verts: { A: [0, 0, 0], B: [1, 0, 0] },
      curved: {},
      edges: [['B', 'A']],
    };
    expect(diagonals(built)).toEqual([]);
  });

  it('finds the 16 diagonals of a cuboid', () => {
    const built = SHAPES.cuboid.build(defaultsOf(SHAPES.cuboid));
    const diags = diagonals(built);
    expect(diags).toHaveLength(16);
    // Six faces with two diagonals each is 12, plus the 4 space diagonals.
    const keys = diags.map(([a, b]) => edgeKey(a, b));
    for (const space of ['AG', 'BH', 'CE', 'DF']) expect(keys).toContain(space);
    expect(new Set(keys).size).toBe(16);
  });
});
