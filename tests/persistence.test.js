import { afterEach, describe, expect, it, vi } from 'vitest';
import { createState } from '../src/state.js';
import * as storage from '../src/storage.js';
import { persistSettings, restoreSettings } from '../src/persistence.js';

// A store with the same get and set as storage.js, backed by a Map, that remembers every write.
function fakeStore(initial = {}) {
  const data = new Map(Object.entries(initial));
  const writes = [];
  return {
    data,
    writes,
    get: (k, fallback) => (data.has(k) ? data.get(k) : fallback),
    set: (k, v) => {
      data.set(k, v);
      writes.push([k, v]);
    },
  };
}

describe('restoreSettings', () => {
  it('uses the prototype defaults when nothing is saved', () => {
    expect(restoreSettings(fakeStore())).toEqual({
      shapeKey: 'cuboid',
      unit: 'cm',
      panelOpen: true,
      theme: null,
    });
  });

  it('returns what was saved', () => {
    const saved = restoreSettings(
      fakeStore({ shape: 'cone', unit: 'mm', panel: false, theme: 'dark' }),
    );
    expect(saved).toEqual({ shapeKey: 'cone', unit: 'mm', panelOpen: false, theme: 'dark' });
  });

  it('falls back to cuboid for a shape that does not exist', () => {
    expect(restoreSettings(fakeStore({ shape: 'frustum' })).shapeKey).toBe('cuboid');
  });

  it('does not take a shape from the object prototype or from a non-string', () => {
    for (const shape of ['constructor', 'toString', '__proto__', 5, null, {}, ['cone']]) {
      expect(restoreSettings(fakeStore({ shape })).shapeKey).toBe('cuboid');
    }
  });

  it('accepts every registered shape key, because the keys are permanent', () => {
    for (const shape of [
      'cuboid',
      'cube',
      'sqpyramid',
      'rectpyramid',
      'prism',
      'cone',
      'cylinder',
    ]) {
      expect(restoreSettings(fakeStore({ shape })).shapeKey).toBe(shape);
    }
  });

  it('feeds createState', () => {
    const s = createState(restoreSettings(fakeStore({ shape: 'prism', theme: 'light' }))).get();
    expect(s.shapeKey).toBe('prism');
    expect(s.theme).toBe('light');
    expect(s.panelOpen).toBe(true);
  });
});

describe('persistSettings at boot', () => {
  it('writes the shape, the panel and the theme, and not the unit, as the prototype does', () => {
    const store = fakeStore();
    persistSettings(createState(), store);
    expect(store.writes).toEqual([
      ['shape', 'cuboid'],
      ['panel', true],
      ['theme', null],
    ]);
  });

  it('writes back what it restored', () => {
    const store = fakeStore({ shape: 'cone', unit: 'mm', panel: false, theme: 'dark' });
    persistSettings(createState(restoreSettings(store)), store);
    expect([...store.data]).toEqual([
      ['shape', 'cone'],
      ['unit', 'mm'],
      ['panel', false],
      ['theme', 'dark'],
    ]);
  });

  it('replaces an unknown saved shape with cuboid', () => {
    const store = fakeStore({ shape: 'frustum' });
    persistSettings(createState(restoreSettings(store)), store);
    expect(store.data.get('shape')).toBe('cuboid');
  });
});

describe('persistSettings on change', () => {
  function started() {
    const store = fakeStore();
    const state = createState();
    const stop = persistSettings(state, store);
    store.writes.length = 0;
    return { store, state, stop };
  }

  it('saves each of the four settings when it changes', () => {
    const { store, state } = started();
    state.set({ shapeKey: 'cylinder' });
    state.set({ unit: 'm' });
    state.set({ panelOpen: false });
    state.set({ theme: 'dark' });
    expect(store.writes).toEqual([
      ['shape', 'cylinder'],
      ['unit', 'm'],
      ['panel', false],
      ['theme', 'dark'],
    ]);
  });

  it('saves a cleared theme as null', () => {
    const { store, state } = started();
    state.set({ theme: 'dark' });
    state.set({ theme: null });
    expect(store.writes.at(-1)).toEqual(['theme', null]);
  });

  it('saves only the settings in the change, when several change together', () => {
    const { store, state } = started();
    state.set({ shapeKey: 'cone', modeIdx: 0, triIdx: -1, hiEdges: new Set(), renames: {} });
    expect(store.writes).toEqual([['shape', 'cone']]);
  });

  it('does not save anything else: mode, dimensions, toggles, selection, tab, view, tool', () => {
    const { store, state } = started();
    state.set({ modeIdx: 2 });
    state.set({ entered: { l: 3 }, dimVals: { l: 3 } });
    state.set({ toggles: { dims: false, labels: true, grid: true, faces: true, hide: true } });
    state.set({ triIdx: 1, hiEdges: new Set(['AB']), renames: { A: 'P' } });
    state.set({ tab: 'working', view: 'top', dragTool: 'pan', systemDark: true });
    state.set({ lastGood: {}, dimError: 'x' });
    expect(store.writes).toEqual([]);
  });

  it('stops saving once the returned function is called', () => {
    const { store, state, stop } = started();
    stop();
    state.set({ shapeKey: 'prism', unit: 'mm', panelOpen: false, theme: 'dark' });
    expect(store.writes).toEqual([]);
  });
});

describe('with the real storage.js', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('uses the se: prefix and JSON values, so the saved keys are unchanged', () => {
    const backing = new Map();
    vi.stubGlobal('localStorage', {
      getItem: (k) => (backing.has(k) ? backing.get(k) : null),
      setItem: (k, v) => backing.set(k, String(v)),
    });
    const state = createState(restoreSettings(storage));
    persistSettings(state, storage);
    state.set({ unit: 'mm', theme: 'dark', panelOpen: false, shapeKey: 'cone' });
    expect(Object.fromEntries(backing)).toEqual({
      'se:shape': '"cone"',
      'se:panel': 'false',
      'se:theme': '"dark"',
      'se:unit': '"mm"',
    });
    // And a second page load reads them back.
    expect(restoreSettings(storage)).toEqual({
      shapeKey: 'cone',
      unit: 'mm',
      panelOpen: false,
      theme: 'dark',
    });
  });

  it('keeps working when localStorage is blocked', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    });
    const state = createState(restoreSettings(storage));
    expect(state.get().shapeKey).toBe('cuboid');
    expect(() => persistSettings(state, storage)).not.toThrow();
    expect(() => state.set({ shapeKey: 'cone', unit: 'mm' })).not.toThrow();
  });
});
