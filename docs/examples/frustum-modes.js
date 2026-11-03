// The first ("canonical") way to define the frustum, for docs/adding-a-shape.md.
//
// In the app this is the first entry of MODES.frustum in src/modes.js, where needGT already
// exists. It is repeated here so that this file can run on its own.

// Strict: equal is an error too. Chain with || so the first failing check wins.
const needGT = (big, small, msg) => (big <= small ? { error: msg } : null);

export const frustumModes = [
  {
    name: 'Bottom side, top side, height',
    inputs: [
      ['a', 'Bottom side', 10],
      ['b', 'Top side', 4],
      ['h', 'Height', 4],
    ],
    toCanon: (v) =>
      needGT(v.a, v.b, 'The bottom side must be longer than the top side.') || {
        a: v.a,
        b: v.b,
        h: v.h,
      },
  },
];
