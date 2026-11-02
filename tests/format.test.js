import { describe, expect, it } from 'vitest';
import { deg, fmt, nm, tx } from '../src/format.js';

describe('fmt', () => {
  it('shows whole numbers without a decimal point', () => {
    expect(fmt(5)).toBe('5');
    expect(fmt(0)).toBe('0');
    expect(fmt(120)).toBe('120');
    expect(fmt(-3)).toBe('-3');
  });

  it('shows two decimals when both are needed', () => {
    expect(fmt(3.14159)).toBe('3.14');
    expect(fmt(10.239)).toBe('10.24');
    expect(fmt(0.07)).toBe('0.07');
    expect(fmt(-1.234)).toBe('-1.23');
  });

  it('trims a trailing zero', () => {
    expect(fmt(2.5)).toBe('2.5');
    expect(fmt(2.504)).toBe('2.5');
    expect(fmt(0.1)).toBe('0.1');
    expect(fmt(9.4)).toBe('9.4');
  });

  it('rounds to two decimals before deciding how to show the number', () => {
    expect(fmt(2.506)).toBe('2.51');
    expect(fmt(7.999)).toBe('8');
    expect(fmt(4.996)).toBe('5');
    expect(fmt(0.1 + 0.2)).toBe('0.3');
    expect(fmt(1e-9)).toBe('0');
  });

  it('never shows a negative zero', () => {
    expect(fmt(-1e-9)).toBe('0');
    expect(fmt(-0)).toBe('0');
  });

  it('keeps the whole part of large numbers', () => {
    expect(fmt(1234.5678)).toBe('1234.57');
    expect(fmt(1000000)).toBe('1000000');
  });
});

describe('deg', () => {
  it('converts radians to degrees and adds the degree sign', () => {
    expect(deg(Math.PI / 4)).toBe('45°');
    expect(deg(Math.PI / 2)).toBe('90°');
    expect(deg(Math.PI)).toBe('180°');
    expect(deg(0)).toBe('0°');
  });

  it('uses the same rounding as fmt', () => {
    expect(deg(Math.atan2(4, 3))).toBe('53.13°');
    expect(deg(Math.atan2(12, 5))).toBe('67.38°');
    expect(deg(Math.PI / 6)).toBe('30°');
    expect(deg(Math.atan2(1, 10))).toBe('5.71°');
  });

  it('trims a trailing zero', () => {
    expect(deg((26.5 * Math.PI) / 180)).toBe('26.5°');
  });
});

describe('nm', () => {
  it('gives the renamed letter when there is one', () => {
    expect(nm({ A: 'P' }, 'A')).toBe('P');
    expect(nm({ A: 'PQ' }, 'A')).toBe('PQ');
  });

  it('gives the original letter when there is no rename', () => {
    expect(nm({ A: 'P' }, 'B')).toBe('B');
    expect(nm({}, 'A')).toBe('A');
  });
});

describe('tx', () => {
  it('drops the brackets and keeps the letters when nothing is renamed', () => {
    expect(tx({}, 'Base diagonal [AC]')).toBe('Base diagonal AC');
  });

  it('renames a bracketed token letter by letter', () => {
    expect(tx({ A: 'P', C: 'R' }, 'Base diagonal [AC]')).toBe('Base diagonal PR');
  });

  it('renames some letters and leaves the others', () => {
    expect(tx({ G: 'X' }, 'Space diagonal [AG]')).toBe('Space diagonal AX');
  });

  it('handles tokens of any length', () => {
    expect(tx({ A: 'P', B: 'Q', C: 'R' }, '[A] then [ABC]')).toBe('P then PQR');
    expect(tx({}, '[ABCD]')).toBe('ABCD');
  });

  it('handles several tokens in one sentence', () => {
    expect(
      tx(
        { M: 'X', B: 'Y' },
        '[M] is the midpoint of [BC], so [OM] is half the length. The angle at [M] is between the face and the base.',
      ),
    ).toBe(
      'X is the midpoint of YC, so OX is half the length. The angle at X is between the face and the base.',
    );
  });

  it('allows a rename to be two letters long', () => {
    expect(tx({ A: 'A1', B: 'B2' }, '[AB]')).toBe('A1B2');
  });

  it('leaves text with no tokens alone', () => {
    expect(tx({ A: 'P' }, 'A diagonal across the bottom face.')).toBe(
      'A diagonal across the bottom face.',
    );
  });

  it('only treats capital letters inside square brackets as a token', () => {
    expect(tx({ A: 'P' }, '[a] [A1] [] [ A ]')).toBe('[a] [A1] [] [ A ]');
  });

  it('gives an empty string for missing text', () => {
    expect(tx({}, undefined)).toBe('');
    expect(tx({}, null)).toBe('');
    expect(tx({}, '')).toBe('');
  });
});
