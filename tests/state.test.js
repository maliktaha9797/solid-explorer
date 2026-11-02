import { describe, expect, it, vi } from 'vitest';
import { createState, DEFAULT_TOGGLES } from '../src/state.js';

describe('createState defaults', () => {
  it('match the prototype boot values', () => {
    const s = createState().get();
    expect(s.shapeKey).toBe('cuboid');
    expect(s.modeIdx).toBe(0);
    expect(s.triIdx).toBe(-1);
    expect(s.unit).toBe('cm');
    expect(s.theme).toBeNull();
    expect(s.panelOpen).toBe(true);
    expect(s.hiEdges).toBeInstanceOf(Set);
    expect(s.hiEdges.size).toBe(0);
    expect(s.renames).toEqual({});
    expect(s.entered).toEqual({});
    expect(s.dimVals).toEqual({});
  });

  it('holds the fields the prototype kept outside its state', () => {
    const s = createState().get();
    expect(s.lastGood).toBeNull();
    expect(s.dimError).toBeNull();
    expect(s.tab).toBe('shape');
    expect(s.systemDark).toBe(false);
    expect(s.view).toBe('iso');
    expect(s.dragTool).toBe('rotate');
  });

  it('has every toggle on except hide answers', () => {
    expect(createState().get().toggles).toEqual({
      dims: true,
      labels: true,
      grid: true,
      faces: true,
      hide: false,
    });
  });

  it('does not share mutable defaults between instances', () => {
    const a = createState();
    const b = createState();
    expect(a.get().toggles).not.toBe(b.get().toggles);
    expect(a.get().hiEdges).not.toBe(b.get().hiEdges);
    expect(a.get().toggles).not.toBe(DEFAULT_TOGGLES);
  });

  it('accepts overrides', () => {
    expect(createState({ shapeKey: 'cone', unit: 'mm' }).get()).toMatchObject({
      shapeKey: 'cone',
      unit: 'mm',
      modeIdx: 0,
    });
  });
});

describe('set', () => {
  it('shallow-merges and leaves other fields alone', () => {
    const s = createState();
    s.set({ shapeKey: 'prism', triIdx: 2 });
    expect(s.get()).toMatchObject({ shapeKey: 'prism', triIdx: 2, unit: 'cm', modeIdx: 0 });
  });

  it('produces a new top-level object each time', () => {
    const s = createState();
    const before = s.get();
    s.set({ unit: 'm' });
    expect(s.get()).not.toBe(before);
    expect(before.unit).toBe('cm');
  });
});

describe('subscribe', () => {
  it('calls the listener with the new state and the changed keys', () => {
    const s = createState();
    const fn = vi.fn();
    s.subscribe(fn);
    s.set({ unit: 'mm', triIdx: 1 });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn.mock.calls[0][0]).toBe(s.get());
    expect(fn.mock.calls[0][1]).toEqual(['unit', 'triIdx']);
  });

  it('notifies every subscriber', () => {
    const s = createState();
    const a = vi.fn();
    const b = vi.fn();
    s.subscribe(a);
    s.subscribe(b);
    s.set({ modeIdx: 1 });
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('stops calling a listener once it unsubscribes', () => {
    const s = createState();
    const fn = vi.fn();
    const off = s.subscribe(fn);
    off();
    s.set({ unit: 'm' });
    expect(fn).not.toHaveBeenCalled();
  });

  it('does not skip other listeners when one unsubscribes during notification', () => {
    const s = createState();
    const second = vi.fn();
    const off = s.subscribe(() => off());
    s.subscribe(second);
    s.set({ unit: 'm' });
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('lets a listener read the already-updated state', () => {
    const s = createState();
    let seen;
    s.subscribe(() => {
      seen = s.get().shapeKey;
    });
    s.set({ shapeKey: 'cylinder' });
    expect(seen).toBe('cylinder');
  });
});

describe('toggleEdge', () => {
  it('adds a line, then removes it again', () => {
    const s = createState();
    s.toggleEdge('AB');
    expect([...s.get().hiEdges]).toEqual(['AB']);
    s.toggleEdge('AB');
    expect(s.get().hiEdges.size).toBe(0);
  });

  it('replaces the Set instead of mutating it, so subscribers can compare by reference', () => {
    const s = createState();
    const before = s.get().hiEdges;
    s.toggleEdge('AB');
    expect(s.get().hiEdges).not.toBe(before);
    expect(before.size).toBe(0);
  });

  it('notifies subscribers once, with hiEdges as the changed key', () => {
    const s = createState();
    const fn = vi.fn();
    s.subscribe(fn);
    s.toggleEdge('CD');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn.mock.calls[0][1]).toEqual(['hiEdges']);
  });
});

describe('clearSelection', () => {
  it('clears the selected lines and the triangle together, and nothing else', () => {
    const s = createState({ triIdx: 2, hiEdges: new Set(['AB', 'AC']), renames: { A: 'P' } });
    const fn = vi.fn();
    s.subscribe(fn);
    s.clearSelection();
    expect(s.get().triIdx).toBe(-1);
    expect(s.get().hiEdges.size).toBe(0);
    expect(s.get().renames).toEqual({ A: 'P' });
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
