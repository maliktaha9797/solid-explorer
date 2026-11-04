import { describe, expect, it } from 'vitest';
import { flatTriangleSvg, textWidth } from '../src/ui/flat-triangle.js';

// The SVG is a string, so its numbers can be read back without a browser.
function read(svg) {
  const [px, qy, qx, , , ry] = svg
    .match(/<polygon points="([^"]+)"/)[1]
    .split(/[ ,]/)
    .map(Number);
  const texts = [...svg.matchAll(/<text x="([^"]+)" y="([^"]+)"([^>]*)>([^<]*)<\/text>/g)].map(
    (m) => ({
      x: +m[1],
      y: +m[2],
      anchor: (m[3].match(/text-anchor="(\w+)"/) || [])[1] ?? 'start',
      text: m[4],
    }),
  );
  return {
    px,
    qx,
    qy,
    ry,
    left: texts.find((t) => t.anchor === 'end'),
    base: texts.find((t) => t.anchor === 'middle'),
    hyp: texts.find((t) => / = /.test(t.text) && t.anchor === 'start'),
  };
}

const make = (over = {}) =>
  flatTriangleSvg({
    Pn: 'A',
    Qn: 'C',
    Rn: 'G',
    adj: 9.43,
    opp: 4,
    hyp: 10.25,
    theta: 0.4,
    hide: false,
    ...over,
  });

// Widths of the label on the left side, measured in Chrome with Manrope Bold at 12.5px (the SVG
// units equal pixels at that size). The label text is what the SVG must contain for the number to apply.
const MEASURED = [
  { Qn: 'C', Rn: 'G', opp: 4, text: 'CG = 4', width: 40.36 },
  { Qn: 'C', Rn: 'G', opp: 8.06, text: 'CG = 8.06', width: 60.19 },
  { Qn: 'M', Rn: 'W', opp: 1234.5, text: 'MW = 1234.5', width: 75.91 },
  { Qn: 'W', Rn: 'W', opp: 1234.57, text: 'WW = 1234.57', width: 84.09 },
  { Qn: 'I', Rn: 'J', opp: 0.5, text: 'IJ = 0.5', width: 43.49 },
  { Qn: 'WW', Rn: 'WW', opp: 1414.21, text: 'WWWW = 1414.21', width: 105.76 },
  { Qn: 'MW', Rn: 'MW', opp: 12345.68, text: 'MWMW = 12345.68', width: 114.46 },
];

describe('flatTriangleSvg: the label on the left side', () => {
  it.each(MEASURED)(
    '$text is never estimated narrower than Chrome measured it',
    ({ text, width }) => {
      expect(textWidth(text, 12.5)).toBeGreaterThanOrEqual(width);
      expect(textWidth(text, 12.5)).toBeLessThan(width * 1.5); // and not so wide that it wastes the space
    },
  );

  it.each(MEASURED)(
    '$text fits inside the box, using the width Chrome measured',
    ({ Qn, Rn, opp, text, width }) => {
      const { left } = read(make({ Qn, Rn, opp }));
      expect(left.text).toBe(text);
      expect(left.x - width).toBeGreaterThanOrEqual(0); // the front of the label is not cut off
    },
  );

  it('keeps the front of CG = 4 inside the box (the prototype cut it to G = 4)', () => {
    const { left } = read(make());
    expect(left.text).toBe('CG = 4');
    expect(left.x - 40.36).toBeGreaterThan(0);
  });

  it('does not shrink an ordinary triangle by much to make room', () => {
    const { qx, px } = read(make());
    expect(qx).toBeLessThanOrEqual(60);
    expect(px).toBeLessThanOrEqual(280); // the right margin is the same as before
    expect(px - qx).toBeGreaterThan(200); // out of 240 before
  });
});

describe('flatTriangleSvg: everything stays inside the box', () => {
  const NAMES = [
    ['A', 'C', 'G'],
    ['M', 'W', 'W'],
    ['WW', 'MW', 'WW'],
  ];
  const SIDES = [0.5, 3, 4, 9.43, 120, 1234.5, 12345.68];
  const cases = [];
  for (const [Pn, Qn, Rn] of NAMES)
    for (const adj of SIDES) for (const opp of SIDES) cases.push({ Pn, Qn, Rn, adj, opp });

  it.each(cases)('$Pn$Qn$Rn adj $adj opp $opp', ({ Pn, Qn, Rn, adj, opp }) => {
    for (const hide of [false, true]) {
      const hyp = Math.hypot(adj, opp);
      const r = read(
        flatTriangleSvg({ Pn, Qn, Rn, adj, opp, hyp, theta: Math.atan2(opp, adj), hide }),
      );
      for (const x of [r.px, r.qx]) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(320);
      }
      expect(r.ry).toBeGreaterThanOrEqual(0);
      expect(r.qy).toBeLessThanOrEqual(200);
      // the estimate is never narrower than the label, so these hold for the real font too
      expect(r.left.x - textWidth(r.left.text, 12.5)).toBeGreaterThanOrEqual(0);
      expect(r.hyp.x + textWidth(r.hyp.text, 12.5)).toBeLessThanOrEqual(320);
      expect(r.base.x - textWidth(r.base.text, 12.5) / 2).toBeGreaterThanOrEqual(0);
      expect(r.base.x + textWidth(r.base.text, 12.5) / 2).toBeLessThanOrEqual(320);
    }
  });
});

describe('flatTriangleSvg: what did not change', () => {
  it('keeps the proportions of the triangle', () => {
    for (const [adj, opp] of [
      [9.43, 4],
      [4, 9.43],
      [3, 4],
      [1000, 1],
    ]) {
      const { qx, px, qy, ry } = read(make({ adj, opp }));
      expect((px - qx) / (qy - ry)).toBeCloseTo(adj / opp, 6);
    }
  });

  it('puts the right angle at the second letter, at the bottom left', () => {
    const { qx, qy, px, ry } = read(make());
    expect(px).toBeGreaterThan(qx); // the base runs right from Q
    expect(ry).toBeLessThan(qy); // the vertical side runs up from Q
  });

  it('shows ? for the hypotenuse when answers are hidden, and the number otherwise', () => {
    expect(read(make({ hide: true })).hyp.text).toBe('AG = ?');
    expect(read(make({ hide: false })).hyp.text).toBe('AG = 10.25');
  });

  it('keeps the viewBox, so the sheet is the same height', () => {
    expect(make()).toContain('viewBox="0 0 320 200"');
  });
});
