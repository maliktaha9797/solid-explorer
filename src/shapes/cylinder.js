// Cylinder. O and N are the centres of the bottom and top circles. P and Q are on the bottom rim,
// T and S on the top rim (T above P, S above Q).
//
// `curved` is a descriptor, not a three.js geometry. scene/model.js builds the geometry from it,
// and must reproduce what the reference builds:
//   new THREE.CylinderGeometry(r, r, h, 72, 1, true)
// that is an open-ended tube (no caps), 72 radial segments, 1 height segment, centred on the
// origin, with the same radius top and bottom.
export const cylinder = {
  name: 'Cylinder',
  dims: [
    ['r', 'Radius', 3],
    ['h', 'Height', 8],
  ],
  build({ r, h }) {
    const y = h / 2;
    return {
      verts: {
        O: [0, -y, 0],
        N: [0, y, 0],
        P: [r, -y, 0],
        Q: [-r, -y, 0],
        S: [-r, y, 0],
        T: [r, y, 0],
      },
      curved: { kind: 'cylinder', r, h },
      circles: [
        [-y, r],
        [y, r],
      ],
      edges: [
        ['P', 'T'],
        ['Q', 'S'],
      ],
      dashed: [
        ['Q', 'P'],
        ['N', 'O'],
      ],
      dims: [
        ['O', 'P', 'r'],
        ['P', 'T', 'h'],
      ],
      tris: [
        {
          title: 'Longest line inside, [QT]',
          pts: ['Q', 'P', 'T'],
          note: '[QP] is the diameter, twice the radius.',
        },
      ],
    };
  },
};
