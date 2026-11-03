// A square-based frustum: a square pyramid with its top sliced off by a plane parallel to the base.
//
// This is the worked example in docs/adding-a-shape.md. It is not part of the app. It lives in
// docs/examples/ so that tests/docs-examples.test.js can run it and the docs cannot be wrong.
// In the app this object would be the whole of src/shapes/frustum.js.
//
// Vertices (y is up, and the solid is centred on the origin):
//   A B C D   the bottom square, side a, with A at the front left
//   E F G H   the top square, side b, with E above A, F above B, and so on
//   J         on the bottom edge AB, level with F, so that JF is at a right angle to AB
//   K         on the base, directly below F
export const frustum = {
  name: 'Square frustum',
  dims: [
    ['a', 'Bottom side', 10],
    ['b', 'Top side', 4],
    ['h', 'Height', 4],
  ],
  build({ a, b, h }) {
    const p = a / 2,
      q = b / 2,
      y = h / 2;
    return {
      verts: {
        A: [-p, -y, p],
        B: [p, -y, p],
        C: [p, -y, -p],
        D: [-p, -y, -p],
        E: [-q, y, q],
        F: [q, y, q],
        G: [q, y, -q],
        H: [-q, y, -q],
        J: [q, -y, p],
        K: [q, -y, q],
      },
      faces: [
        ['A', 'D', 'C', 'B'],
        ['E', 'F', 'G', 'H'],
        ['A', 'B', 'F', 'E'],
        ['B', 'C', 'G', 'F'],
        ['C', 'D', 'H', 'G'],
        ['D', 'A', 'E', 'H'],
      ],
      dashed: [
        ['J', 'K'],
        ['K', 'F'],
        ['J', 'F'],
      ],
      dims: [
        ['A', 'B', 'a'],
        ['E', 'F', 'b'],
        ['K', 'F', 'h'],
      ],
      tris: [
        {
          title: 'Slant height [JF]',
          pts: ['J', 'K', 'F'],
          note: '[K] is directly below [F], so [JK] is half the difference between the two sides. The angle at [J] is between the face and the base.',
        },
        {
          title: 'Slant edge [BF]',
          pts: ['B', 'J', 'F'],
          note: '[BJ] is half the difference between the two sides too. [JF] comes from the first triangle.',
        },
      ],
    };
  },
};
