// Cuboid. A B C D is the bottom face (A front-left), E F G H the top face above A to D.
export const cuboid = {
  name: 'Cuboid',
  dims: [
    ['l', 'Length', 8],
    ['w', 'Width', 5],
    ['h', 'Height', 4],
  ],
  build({ l, w, h }) {
    const x = l / 2,
      y = h / 2,
      z = w / 2;
    return {
      verts: {
        A: [-x, -y, z],
        B: [x, -y, z],
        C: [x, -y, -z],
        D: [-x, -y, -z],
        E: [-x, y, z],
        F: [x, y, z],
        G: [x, y, -z],
        H: [-x, y, -z],
      },
      faces: [
        ['A', 'D', 'C', 'B'],
        ['E', 'F', 'G', 'H'],
        ['A', 'B', 'F', 'E'],
        ['B', 'C', 'G', 'F'],
        ['C', 'D', 'H', 'G'],
        ['D', 'A', 'E', 'H'],
      ],
      dims: [
        ['A', 'B', 'l'],
        ['B', 'C', 'w'],
        ['B', 'F', 'h'],
      ],
      tris: [
        {
          title: 'Base diagonal [AC]',
          pts: ['A', 'B', 'C'],
          note: 'A diagonal across the bottom face.',
        },
        {
          title: 'Space diagonal [AG]',
          pts: ['A', 'C', 'G'],
          note: 'Corner to opposite corner through the inside. Uses [AC] from the first triangle.',
        },
        {
          title: 'Front face diagonal [AF]',
          pts: ['A', 'B', 'F'],
          note: 'A diagonal across the front face.',
        },
        {
          title: 'Space diagonal [AG] via [AF]',
          pts: ['A', 'F', 'G'],
          note: 'The same diagonal, reached through the front face.',
        },
      ],
    };
  },
};
