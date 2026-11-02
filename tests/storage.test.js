import { afterEach, describe, expect, it, vi } from 'vitest';
import { get, set } from '../src/storage.js';

// A minimal in-memory localStorage.
const memoryStorage = () => {
  const data = new Map();
  return {
    data,
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => void data.set(k, String(v)),
  };
};

afterEach(() => vi.unstubAllGlobals());

describe('storage with a working localStorage', () => {
  it('stores JSON under the se: prefix', () => {
    const ls = memoryStorage();
    vi.stubGlobal('localStorage', ls);
    set('unit', 'mm');
    set('panel', false);
    expect(ls.data.get('se:unit')).toBe('"mm"');
    expect(ls.data.get('se:panel')).toBe('false');
  });

  it('reads back what it stored', () => {
    vi.stubGlobal('localStorage', memoryStorage());
    set('shape', 'cone');
    expect(get('shape', 'cuboid')).toBe('cone');
  });

  it('returns the fallback for a missing key', () => {
    vi.stubGlobal('localStorage', memoryStorage());
    expect(get('shape', 'cuboid')).toBe('cuboid');
  });

  it('returns a stored null rather than the fallback (theme unset)', () => {
    vi.stubGlobal('localStorage', memoryStorage());
    set('theme', null);
    expect(get('theme', 'dark')).toBeNull();
  });

  it('returns the fallback when the stored value is not valid JSON', () => {
    const ls = memoryStorage();
    ls.data.set('se:unit', '{not json');
    vi.stubGlobal('localStorage', ls);
    expect(get('unit', 'cm')).toBe('cm');
  });
});

describe('storage degrades silently when localStorage fails', () => {
  it('works when localStorage does not exist', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(get('unit', 'cm')).toBe('cm');
    expect(() => set('unit', 'mm')).not.toThrow();
  });

  it('works when every call throws, as in blocked storage', () => {
    const boom = () => {
      throw new Error('SecurityError');
    };
    vi.stubGlobal('localStorage', { getItem: boom, setItem: boom });
    expect(get('unit', 'cm')).toBe('cm');
    expect(() => set('unit', 'mm')).not.toThrow();
  });
});
