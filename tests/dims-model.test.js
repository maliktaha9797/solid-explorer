import { describe, expect, it } from 'vitest';
import { defaultsOf, freshDims, resolveDims } from '../src/ui/dims-model.js';

// A mode shaped like the real ones (see .claude/skills/define-by-modes.md), defined here so this
// test does not depend on src/modes.js.
const needGT = (big, small, msg) => (big <= small ? { error: msg } : null);
const coneBySlant = {
  name: 'Radius and slant height',
  inputs: [
    ['r', 'Radius', 4],
    ['l', 'Slant height VP', 8.06],
  ],
  extra: [['V', 'P', 'l']],
  toCanon: (v) =>
    needGT(v.l, v.r, 'The slant height must be longer than the radius.') || {
      r: v.r,
      h: Math.sqrt(v.l * v.l - v.r * v.r),
    },
};

describe('defaultsOf', () => {
  it('maps each input key to its default', () => {
    expect(defaultsOf(coneBySlant)).toEqual({ r: 4, l: 8.06 });
  });
});

describe('resolveDims with valid values', () => {
  it('returns the entered values, the canonical dims and clears the error', () => {
    const out = resolveDims(coneBySlant, { r: 3, l: 5 }, null);
    expect(out.entered).toEqual({ r: 3, l: 5 });
    expect(out.dimVals).toEqual({ r: 3, h: 4 });
    expect(out.dimError).toBeNull();
  });

  it('records the result as the last good solid', () => {
    const out = resolveDims(coneBySlant, { r: 3, l: 5 }, { r: 1, h: 1 });
    expect(out.lastGood).toBe(out.dimVals);
  });
});

describe('resolveDims with blank, zero, negative or unreadable values', () => {
  it.each([
    ['blank (NaN)', NaN],
    ['zero', 0],
    ['negative', -2],
    ['not there', undefined],
  ])("falls back to that input's default when it is %s, with no error", (_, bad) => {
    const out = resolveDims(coneBySlant, { r: bad, l: 5 }, null);
    expect(out.entered).toEqual({ r: 4, l: 5 });
    expect(out.dimError).toBeNull();
    expect(out.dimVals).toEqual({ r: 4, h: 3 });
  });

  it('falls back for every input at once', () => {
    const out = resolveDims(coneBySlant, { r: NaN, l: -1 }, null);
    expect(out.entered).toEqual({ r: 4, l: 8.06 });
  });

  it('keeps a small positive value as typed', () => {
    expect(resolveDims(coneBySlant, { r: 0.05, l: 5 }, null).entered.r).toBe(0.05);
  });
});

describe('resolveDims when toCanon reports an error', () => {
  it('shows the message, keeps the typed values, and keeps the last good solid', () => {
    const good = { r: 3, h: 4 };
    const out = resolveDims(coneBySlant, { r: 5, l: 4 }, good);
    expect(out.dimError).toBe('The slant height must be longer than the radius.');
    expect(out.entered).toEqual({ r: 5, l: 4 });
    expect(out.dimVals).toBe(good);
    expect(out.lastGood).toBe(good);
  });

  it('uses the mode defaults when there is no last good solid yet', () => {
    const out = resolveDims(coneBySlant, { r: 5, l: 4 }, null);
    expect(out.dimError).toBe('The slant height must be longer than the radius.');
    expect(out.lastGood).toBeNull();
    expect(out.dimVals.r).toBe(4);
    expect(out.dimVals.h).toBeCloseTo(Math.sqrt(8.06 * 8.06 - 16), 10);
  });

  it('treats equality as an error, because the rule is strict', () => {
    expect(resolveDims(coneBySlant, { r: 4, l: 4 }, null).dimError).not.toBeNull();
  });
});

describe('freshDims', () => {
  it('resolves the mode as if its fields held their defaults', () => {
    const out = freshDims(coneBySlant, null);
    expect(out.entered).toEqual({ r: 4, l: 8.06 });
    expect(out.dimError).toBeNull();
    expect(out.dimVals.h).toBeCloseTo(7, 1);
  });

  it('replaces the last good solid when the defaults are valid', () => {
    const good = { r: 3, h: 4 };
    const out = freshDims(coneBySlant, good);
    expect(out.lastGood).toBe(out.dimVals);
    expect(out.lastGood).not.toBe(good);
  });
});
