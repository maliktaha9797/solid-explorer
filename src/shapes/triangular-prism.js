// Triangular prism. A B C is the front triangle (right angle at A), D E F the back triangle.
export const prism = {
  name: 'Triangular prism',
  dims: [
    ['a', 'Base', 6],
    ['b', 'Height', 4],
    ['L', 'Length', 9],
  ],
  build({ a, b, L }) {
    const x = a / 2,
      y = b / 2,
      z = L / 2;
    return {
      verts: {
        A: [-x, -y, z],
        B: [x, -y, z],
        C: [-x, y, z],
        D: [-x, -y, -z],
        E: [x, -y, -z],
        F: [-x, y, -z],
      },
      faces: [
        ['A', 'B', 'C'],
        ['D', 'F', 'E'],
        ['A', 'D', 'E', 'B'],
        ['A', 'C', 'F', 'D'],
        ['B', 'E', 'F', 'C'],
      ],
      dims: [
        ['A', 'B', 'a'],
        ['A', 'C', 'b'],
        ['B', 'E', 'L'],
      ],
      tris: [
        {
          title: 'Hypotenuse [BC] of the end face',
          pts: ['B', 'A', 'C'],
          note: 'The right angle at [A] is part of the shape.',
        },
        {
          title: 'Diagonal [AE] of the base',
          pts: ['A', 'B', 'E'],
          note: 'Across the rectangular bottom face.',
        },
        {
          title: 'Diagonal [BF] of the sloping face',
          pts: ['B', 'E', 'F'],
          note: '[EF] is the hypotenuse from the first triangle.',
        },
        {
          title: 'Space diagonal [CE]',
          pts: ['C', 'A', 'E'],
          note: 'Top corner to the far bottom corner. [AE] comes from the second triangle.',
        },
      ],
    };
  },
};
