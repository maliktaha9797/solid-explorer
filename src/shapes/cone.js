// Cone. V is the apex, O the centre of the base, P and Q opposite points on the rim.
//
// `curved` is a descriptor, not a three.js geometry. scene/model.js builds the geometry from it,
// and must reproduce what the reference builds:
//   new THREE.ConeGeometry(r, h, 72)
// that is a closed cone (bottom cap included), 72 radial segments, 1 height segment, centred on
// the origin with the apex at +h/2.
export const cone = {
  name: 'Cone',
  dims: [
    ['r', 'Radius', 4],
    ['h', 'Height', 7],
  ],
  build({ r, h }) {
    const y = h / 2;
    return {
      verts: { V: [0, y, 0], O: [0, -y, 0], P: [r, -y, 0], Q: [-r, -y, 0] },
      curved: { kind: 'cone', r, h },
      circles: [[-y, r]],
      edges: [
        ['V', 'P'],
        ['V', 'Q'],
      ],
      dashed: [
        ['V', 'O'],
        ['O', 'P'],
      ],
      dims: [
        ['O', 'P', 'r'],
        ['V', 'O', 'h'],
      ],
      tris: [
        {
          title: 'Slant height [VP]',
          pts: ['P', 'O', 'V'],
          note: 'Radius, height and slant height always form a right-angled triangle.',
        },
      ],
    };
  },
};
