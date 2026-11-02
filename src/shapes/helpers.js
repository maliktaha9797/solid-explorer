// Shared helpers for the shape modules. Pure functions: no `three`, no DOM.
//
// The reference also has `polyGeometry(verts, faces)`, which builds a three.js BufferGeometry.
// That wrapper needs three, so it belongs to scene/model.js (Phase 3). `fanTriangulate` below is
// the pure part of it: the flat position array the BufferGeometry is built from.

// Selection key for a line, the same whichever way round the two letters are given.
// Lives here (not in geometry/diagonals.js) so that `uniqueEdges` can use it without a circular
// import. geometry/diagonals.js re-exports it, which is where callers should import it from.
export const edgeKey = (a, b) => [a, b].sort().join('');

// Every edge of a polygon solid once, in the order the faces list them.
export function uniqueEdges(faces) {
  const seen = new Set(),
    out = [];
  faces.forEach((f) =>
    f.forEach((a, i) => {
      const b = f[(i + 1) % f.length],
        k = edgeKey(a, b);
      if (!seen.has(k)) {
        seen.add(k);
        out.push([a, b]);
      }
    }),
  );
  return out;
}

// Fan-triangulate each (convex) face from its first vertex and return the flat
// [x, y, z, x, y, z, ...] position array. The scene builds its BufferGeometry from this.
export function fanTriangulate(verts, faces) {
  const pos = [];
  faces.forEach((f) => {
    for (let i = 1; i < f.length - 1; i++) {
      [f[0], f[i], f[i + 1]].forEach((n) => pos.push(...verts[n]));
    }
  });
  return pos;
}

// Shared factory for the two pyramids. The square pyramid passes l = w = b and overrides `dims`.
// A B C D is the base (A front-left), V the apex, O the centre of the base and M the midpoint of BC.
export function pyramid(l, w, h) {
  const x = l / 2,
    y = h / 2,
    z = w / 2;
  return {
    verts: {
      A: [-x, -y, z],
      B: [x, -y, z],
      C: [x, -y, -z],
      D: [-x, -y, -z],
      V: [0, y, 0],
      O: [0, -y, 0],
      M: [x, -y, 0],
    },
    faces: [
      ['A', 'D', 'C', 'B'],
      ['A', 'B', 'V'],
      ['B', 'C', 'V'],
      ['C', 'D', 'V'],
      ['D', 'A', 'V'],
    ],
    dashed: [
      ['V', 'O'],
      ['O', 'M'],
      ['O', 'C'],
    ],
    dims: [
      ['A', 'B', 'l'],
      ['B', 'C', 'w'],
      ['V', 'O', 'h'],
    ],
    tris: [
      {
        title: 'Slant height [VM]',
        pts: ['M', 'O', 'V'],
        note: '[M] is the midpoint of [BC], so [OM] is half the length. The angle at [M] is between the face and the base.',
      },
      {
        title: 'Half diagonal [OC]',
        pts: ['O', 'M', 'C'],
        note: 'Centre to a corner. [MC] is half the width.',
      },
      {
        title: 'Slant edge [VC]',
        pts: ['C', 'O', 'V'],
        note: 'The angle at [C] is between the edge and the base. [OC] comes from the triangle above.',
      },
    ],
  };
}
