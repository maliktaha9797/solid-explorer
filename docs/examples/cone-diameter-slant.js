// A new "Define by" mode for the cone: diameter and slant height.
//
// This is the worked example in docs/adding-a-define-by-mode.md. It is not part of the app. In the
// app this object goes at the end of the MODES.cone list in src/modes.js, where sq, rt and needGT
// already exist. They are repeated here so that this file can run on its own.

const sq = (x) => x * x,
  rt = Math.sqrt;
// Strict: equal is an error too. Chain with || so the first failing check wins.
const needGT = (big, small, msg) => (big <= small ? { error: msg } : null);

export const coneDiameterSlant = {
  name: 'Diameter and slant height',
  inputs: [
    ['d', 'Diameter', 8],
    ['l', 'Slant height VP', 8.06],
  ],
  extra: [['V', 'P', 'l']],
  toCanon: (v) =>
    needGT(v.l, v.d / 2, 'The slant height must be longer than the radius.') || {
      r: v.d / 2,
      h: rt(sq(v.l) - sq(v.d / 2)),
    },
};
