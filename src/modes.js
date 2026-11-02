// Alternative ways to define each shape ("Define by"). Pure data and pure functions: no `three`,
// no DOM. Every mode maps its own inputs to the shape's canonical dimensions.
//
// Each mode:
//   name      shown in the Define by dropdown
//   inputs    [[key, label, default], ...]. A degree sign in the label marks an angle.
//   toCanon   (values) => the shape's canonical dims, or { error } when there is no such solid
//   extra     optional [[a, b, inputKey], ...]: a line on the model that carries an input which is
//             not one of the shape's labelled lines
//
// The first mode of every shape is the canonical one: its input keys are the shape's dims keys.
// Every mode's defaults must reproduce the canonical defaults to within 0.01 (tests/modes.test.js).
//
// Two defaults differ from the prototype, on purpose (decisions.md D-017, CHANGELOG.md):
//   rectpyramid "Base and slant edge": e is 7.63, the prototype had 8.73 (height 7.35, not 6)
//   cone "Radius and angle at the base": t is 60.26, the prototype had 60.3 (height 7.0127, not 7)

const sq = (x) => x * x,
  rt = Math.sqrt;
// Strict: equal is an error too. Chain with || so the first failing check wins.
const needGT = (big, small, msg) => (big <= small ? { error: msg } : null);

export const MODES = {
  cuboid: [
    {
      name: 'Length, width, height',
      inputs: [
        ['l', 'Length', 8],
        ['w', 'Width', 5],
        ['h', 'Height', 4],
      ],
      toCanon: (v) => ({ l: v.l, w: v.w, h: v.h }),
    },
    {
      name: 'Length, width, space diagonal',
      inputs: [
        ['l', 'Length', 8],
        ['w', 'Width', 5],
        ['d', 'Space diagonal AG', 10.25],
      ],
      extra: [['A', 'G', 'd']],
      toCanon: (v) =>
        needGT(
          sq(v.d),
          sq(v.l) + sq(v.w),
          'The space diagonal must be longer than the base diagonal.',
        ) || { l: v.l, w: v.w, h: rt(sq(v.d) - sq(v.l) - sq(v.w)) },
    },
    {
      name: 'Length, width, front face diagonal',
      inputs: [
        ['l', 'Length', 8],
        ['w', 'Width', 5],
        ['f', 'Front diagonal AF', 8.94],
      ],
      extra: [['A', 'F', 'f']],
      toCanon: (v) =>
        needGT(v.f, v.l, 'The face diagonal must be longer than the length.') || {
          l: v.l,
          w: v.w,
          h: rt(sq(v.f) - sq(v.l)),
        },
    },
    {
      name: 'Base diagonal, height, length',
      inputs: [
        ['c', 'Base diagonal AC', 9.43],
        ['h', 'Height', 4],
        ['l', 'Length', 8],
      ],
      extra: [['A', 'C', 'c']],
      toCanon: (v) =>
        needGT(v.c, v.l, 'The base diagonal must be longer than the length.') || {
          l: v.l,
          w: rt(sq(v.c) - sq(v.l)),
          h: v.h,
        },
    },
  ],
  cube: [
    { name: 'Side', inputs: [['a', 'Side', 6]], toCanon: (v) => ({ a: v.a }) },
    {
      name: 'Face diagonal',
      inputs: [['f', 'Face diagonal', 8.49]],
      extra: [['A', 'C', 'f']],
      toCanon: (v) => ({ a: v.f / rt(2) }),
    },
    {
      name: 'Space diagonal',
      inputs: [['d', 'Space diagonal', 10.39]],
      extra: [['A', 'G', 'd']],
      toCanon: (v) => ({ a: v.d / rt(3) }),
    },
  ],
  sqpyramid: [
    {
      name: 'Base and vertical height',
      inputs: [
        ['b', 'Base side', 6],
        ['h', 'Vertical height', 7],
      ],
      toCanon: (v) => ({ b: v.b, h: v.h }),
    },
    {
      name: 'Base and slant height',
      inputs: [
        ['b', 'Base side', 6],
        ['s', 'Slant height VM', 7.62],
      ],
      extra: [['V', 'M', 's']],
      toCanon: (v) =>
        needGT(v.s, v.b / 2, 'The slant height must be more than half the base.') || {
          b: v.b,
          h: rt(sq(v.s) - sq(v.b / 2)),
        },
    },
    {
      name: 'Base and slant edge',
      inputs: [
        ['b', 'Base side', 6],
        ['e', 'Slant edge VC', 8.19],
      ],
      extra: [['V', 'C', 'e']],
      toCanon: (v) =>
        needGT(
          sq(v.e),
          sq(v.b) / 2,
          'The slant edge must be longer than half the base diagonal.',
        ) || { b: v.b, h: rt(sq(v.e) - sq(v.b) / 2) },
    },
    {
      name: 'Slant height and slant edge',
      inputs: [
        ['s', 'Slant height VM', 7.62],
        ['e', 'Slant edge VC', 8.19],
      ],
      extra: [
        ['V', 'M', 's'],
        ['V', 'C', 'e'],
      ],
      toCanon: (v) => {
        if (v.e <= v.s) return { error: 'The slant edge must be longer than the slant height.' };
        const b = 2 * rt(sq(v.e) - sq(v.s));
        return (
          needGT(v.s, b / 2, 'These lengths cannot form a pyramid.') || {
            b,
            h: rt(sq(v.s) - sq(b / 2)),
          }
        );
      },
    },
    {
      name: 'Base and face angle',
      inputs: [
        ['b', 'Base side', 6],
        ['t', 'Angle between face and base (°)', 66.8],
      ],
      toCanon: (v) =>
        v.t <= 0 || v.t >= 90
          ? { error: 'The angle must be between 0° and 90°.' }
          : { b: v.b, h: (v.b / 2) * Math.tan((v.t * Math.PI) / 180) },
    },
  ],
  rectpyramid: [
    {
      name: 'Base and vertical height',
      inputs: [
        ['l', 'Base length', 8],
        ['w', 'Base width', 5],
        ['h', 'Vertical height', 6],
      ],
      toCanon: (v) => ({ l: v.l, w: v.w, h: v.h }),
    },
    {
      name: 'Base and slant height',
      inputs: [
        ['l', 'Base length', 8],
        ['w', 'Base width', 5],
        ['s', 'Slant height VM', 7.21],
      ],
      extra: [['V', 'M', 's']],
      toCanon: (v) =>
        needGT(v.s, v.l / 2, 'The slant height must be more than half the length.') || {
          l: v.l,
          w: v.w,
          h: rt(sq(v.s) - sq(v.l / 2)),
        },
    },
    {
      name: 'Base and slant edge',
      inputs: [
        ['l', 'Base length', 8],
        ['w', 'Base width', 5],
        ['e', 'Slant edge VC', 7.63],
      ],
      extra: [['V', 'C', 'e']],
      toCanon: (v) =>
        needGT(
          sq(v.e),
          (sq(v.l) + sq(v.w)) / 4,
          'The slant edge must be longer than half the base diagonal.',
        ) || { l: v.l, w: v.w, h: rt(sq(v.e) - (sq(v.l) + sq(v.w)) / 4) },
    },
  ],
  prism: [
    {
      name: 'Base, height, length',
      inputs: [
        ['a', 'Base', 6],
        ['b', 'Height', 4],
        ['L', 'Length', 9],
      ],
      toCanon: (v) => ({ a: v.a, b: v.b, L: v.L }),
    },
    {
      name: 'Hypotenuse, base, length',
      inputs: [
        ['c', 'Hypotenuse BC', 7.21],
        ['a', 'Base', 6],
        ['L', 'Length', 9],
      ],
      extra: [['B', 'C', 'c']],
      toCanon: (v) =>
        needGT(v.c, v.a, 'The hypotenuse must be longer than the base.') || {
          a: v.a,
          b: rt(sq(v.c) - sq(v.a)),
          L: v.L,
        },
    },
    {
      name: 'Hypotenuse, height, length',
      inputs: [
        ['c', 'Hypotenuse BC', 7.21],
        ['b', 'Height', 4],
        ['L', 'Length', 9],
      ],
      extra: [['B', 'C', 'c']],
      toCanon: (v) =>
        needGT(v.c, v.b, 'The hypotenuse must be longer than the height.') || {
          a: rt(sq(v.c) - sq(v.b)),
          b: v.b,
          L: v.L,
        },
    },
    {
      name: 'Base, height, space diagonal',
      inputs: [
        ['a', 'Base', 6],
        ['b', 'Height', 4],
        ['d', 'Space diagonal CE', 11.53],
      ],
      extra: [['C', 'E', 'd']],
      toCanon: (v) =>
        needGT(
          sq(v.d),
          sq(v.a) + sq(v.b),
          'The space diagonal must be longer than the hypotenuse of the end face.',
        ) || { a: v.a, b: v.b, L: rt(sq(v.d) - sq(v.a) - sq(v.b)) },
    },
  ],
  cone: [
    {
      name: 'Radius and height',
      inputs: [
        ['r', 'Radius', 4],
        ['h', 'Height', 7],
      ],
      toCanon: (v) => ({ r: v.r, h: v.h }),
    },
    {
      name: 'Diameter and height',
      inputs: [
        ['d', 'Diameter', 8],
        ['h', 'Height', 7],
      ],
      toCanon: (v) => ({ r: v.d / 2, h: v.h }),
    },
    {
      name: 'Radius and slant height',
      inputs: [
        ['r', 'Radius', 4],
        ['l', 'Slant height VP', 8.06],
      ],
      extra: [['V', 'P', 'l']],
      toCanon: (v) =>
        needGT(v.l, v.r, 'The slant height must be longer than the radius.') || {
          r: v.r,
          h: rt(sq(v.l) - sq(v.r)),
        },
    },
    {
      name: 'Height and slant height',
      inputs: [
        ['h', 'Height', 7],
        ['l', 'Slant height VP', 8.06],
      ],
      extra: [['V', 'P', 'l']],
      toCanon: (v) =>
        needGT(v.l, v.h, 'The slant height must be longer than the height.') || {
          r: rt(sq(v.l) - sq(v.h)),
          h: v.h,
        },
    },
    {
      name: 'Radius and angle at the base',
      inputs: [
        ['r', 'Radius', 4],
        ['t', 'Angle between slant and base (°)', 60.26],
      ],
      toCanon: (v) =>
        v.t <= 0 || v.t >= 90
          ? { error: 'The angle must be between 0° and 90°.' }
          : { r: v.r, h: v.r * Math.tan((v.t * Math.PI) / 180) },
    },
  ],
  cylinder: [
    {
      name: 'Radius and height',
      inputs: [
        ['r', 'Radius', 3],
        ['h', 'Height', 8],
      ],
      toCanon: (v) => ({ r: v.r, h: v.h }),
    },
    {
      name: 'Diameter and height',
      inputs: [
        ['d', 'Diameter', 6],
        ['h', 'Height', 8],
      ],
      toCanon: (v) => ({ r: v.d / 2, h: v.h }),
    },
    {
      name: 'Radius and longest internal line',
      inputs: [
        ['r', 'Radius', 3],
        ['k', 'Longest line QT', 10],
      ],
      extra: [['Q', 'T', 'k']],
      toCanon: (v) =>
        needGT(v.k, 2 * v.r, 'The longest line must exceed the diameter.') || {
          r: v.r,
          h: rt(sq(v.k) - sq(2 * v.r)),
        },
    },
  ],
};
