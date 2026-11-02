// The pointer and keyboard controls, driven with fake events against a fake canvas. Runs in Node:
// the camera, world and picking are real three.js objects, and only the DOM is faked.
import * as THREE from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MODES } from '../src/modes.js';
import { createState } from '../src/state.js';
import { freshDims } from '../src/ui/dims-model.js';
import { rebuild } from '../src/scene/model.js';
import {
  CLICK_THRESHOLD,
  MOMENTUM_KEEP,
  MOMENTUM_MIN,
  ROTATE_PER_PX,
  createControls,
  worldPerPx,
} from '../src/scene/controls.js';
import { createViews } from '../src/scene/views.js';

const RECT = { left: 100, top: 50, width: 900, height: 700 };
const colours = Object.fromEntries(
  ['ink', 'accent', 'teal', 'blue', 'line', 'line2'].map((k) => [k, new THREE.Color('#336699')]),
);

function fakeCanvas() {
  const handlers = {};
  const classes = new Set();
  return {
    handlers,
    addEventListener: (type, fn) => (handlers[type] ||= []).push(fn),
    dispatch: (type, e) => (handlers[type] || []).forEach((fn) => fn(e)),
    getBoundingClientRect: () => RECT,
    setPointerCapture: vi.fn(),
    classList: {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      contains: (c) => classes.has(c),
      toggle: (c, force) => (force ? classes.add(c) : classes.delete(c)),
    },
  };
}

function setup(statePatch = {}) {
  const state = createState({
    shapeKey: 'cuboid',
    ...freshDims(MODES.cuboid[0], null),
    ...statePatch,
  });
  const world = new THREE.Group();
  const model = new THREE.Group(),
    env = new THREE.Group();
  world.add(model, env);
  const current = rebuild(state.get(), { model, env, colours, groundTex: null });
  const camera = new THREE.PerspectiveCamera(36, RECT.width / RECT.height, 0.1, 1000);
  camera.position.set(0, 0, current.camDist);
  camera.updateMatrixWorld(true);
  world.updateMatrixWorld(true);

  const canvas = fakeCanvas();
  const tipEl = { style: { display: 'none' }, textContent: '' };
  const win = { keydown: null, addEventListener: (t, fn) => (win[t] = fn) };
  const viewCalls = [];
  const setView = (v) => {
    viewCalls.push(v);
    if (state.get().view !== v) state.set({ view: v });
  };
  const views = createViews({ world, camera, getCamDist: () => current.camDist, setView });
  // createViews starts the world in iso. These tests aim at the model from the front, so undo that.
  world.quaternion.identity();
  world.updateMatrixWorld(true);
  const controls = createControls({
    canvas,
    tipEl,
    camera,
    world,
    state,
    views,
    setView,
    getModel: () => current,
    win,
  });
  const ev = (o) => ({
    pointerId: 1,
    pointerType: 'mouse',
    button: 0,
    shiftKey: false,
    clientX: 0,
    clientY: 0,
    preventDefault: vi.fn(),
    ...o,
  });
  // Where a model point is on the page (the model is unrotated, so it is the front view).
  const screenOf = (pt) => {
    const v = new THREE.Vector3(...pt).applyMatrix4(world.matrixWorld).project(camera);
    return {
      x: RECT.left + ((v.x + 1) / 2) * RECT.width,
      y: RECT.top + ((1 - v.y) / 2) * RECT.height,
    };
  };
  const down = (o) => canvas.dispatch('pointerdown', ev(o));
  const move = (o) => canvas.dispatch('pointermove', ev(o));
  const up = (o) => canvas.dispatch('pointerup', ev(o));
  const key = (k, o = {}) => win.keydown({ key: k, target: { matches: () => false }, ...o });
  // The midpoint of the front bottom edge AB: nothing else is near it from the front.
  const mid = (a, b) => {
    const verts = current.built.verts;
    return screenOf([0, 1, 2].map((i) => (verts[a][i] + verts[b][i]) / 2));
  };
  return {
    state,
    world,
    camera,
    canvas,
    tipEl,
    views,
    controls,
    current,
    viewCalls,
    ev,
    screenOf,
    mid,
    down,
    move,
    up,
    key,
    win,
  };
}

afterEach(() => vi.restoreAllMocks());

describe('constants', () => {
  it('are the reference values', () => {
    expect(ROTATE_PER_PX).toBe(0.0075);
    expect(CLICK_THRESHOLD).toBe(4);
    expect(MOMENTUM_MIN).toBe(0.02);
    expect(MOMENTUM_KEEP).toBe(0.92);
  });

  it('worldPerPx is the height of the view at distance z over the canvas height', () => {
    expect(worldPerPx(18, 36, 700)).toBeCloseTo(
      (2 * 18 * Math.tan(THREE.MathUtils.degToRad(18))) / 700,
      12,
    );
  });
});

describe('click to select', () => {
  it('a press and release on a line selects it', () => {
    const t = setup();
    const p = t.mid('A', 'B');
    t.down({ clientX: p.x, clientY: p.y });
    t.up({ clientX: p.x, clientY: p.y });
    expect([...t.state.get().hiEdges]).toEqual(['AB']);
  });

  it('a click toggles: the second one deselects', () => {
    const t = setup();
    const p = t.mid('A', 'B');
    for (let i = 0; i < 2; i++) {
      t.down({ clientX: p.x, clientY: p.y });
      t.up({ clientX: p.x, clientY: p.y });
    }
    expect(t.state.get().hiEdges.size).toBe(0);
  });

  it('a few pixels away from the line still selects it (the tube is fat)', () => {
    const t = setup();
    const p = t.mid('A', 'B');
    t.down({ clientX: p.x, clientY: p.y + 6 });
    t.up({ clientX: p.x, clientY: p.y + 6 });
    expect([...t.state.get().hiEdges]).toEqual(['AB']);
  });

  it('clicking empty space selects nothing', () => {
    const t = setup();
    t.down({ clientX: RECT.left + 5, clientY: RECT.top + 5 });
    t.up({ clientX: RECT.left + 5, clientY: RECT.top + 5 });
    expect(t.state.get().hiEdges.size).toBe(0);
  });

  it('a wobble of 4 px or less is still a click and does not rotate', () => {
    const t = setup();
    const p = t.mid('A', 'B');
    const before = t.world.quaternion.clone();
    t.down({ clientX: p.x, clientY: p.y });
    t.move({ clientX: p.x + 3, clientY: p.y + 2 }); // hypot 3.6
    t.up({ clientX: p.x + 3, clientY: p.y + 2 });
    expect([...t.state.get().hiEdges]).toEqual(['AB']);
    expect(t.world.quaternion.equals(before)).toBe(true);
    expect(t.canvas.classList.contains('grabbing')).toBe(false);
  });

  it('more than 4 px is a drag: it rotates, shows the grabbing cursor and selects nothing', () => {
    const t = setup();
    const p = t.mid('A', 'B');
    t.down({ clientX: p.x, clientY: p.y });
    t.move({ clientX: p.x + 5, clientY: p.y });
    expect(t.canvas.classList.contains('grabbing')).toBe(true);
    t.up({ clientX: p.x + 5, clientY: p.y });
    expect(t.state.get().hiEdges.size).toBe(0);
    expect(t.canvas.classList.contains('grabbing')).toBe(false);
    expect(t.world.quaternion.equals(new THREE.Quaternion())).toBe(false);
  });

  it('releasing the right button on a line does not select it', () => {
    const t = setup();
    const p = t.mid('A', 'B');
    t.down({ clientX: p.x, clientY: p.y, button: 2 });
    t.up({ clientX: p.x, clientY: p.y, button: 2 });
    expect(t.state.get().hiEdges.size).toBe(0);
  });

  it('a cancelled press that never moved selects, the same as a release (reference quirk O-4)', () => {
    const t = setup();
    const p = t.mid('A', 'B');
    t.down({ clientX: p.x, clientY: p.y });
    t.canvas.dispatch('pointercancel', t.ev({ clientX: p.x, clientY: p.y }));
    expect([...t.state.get().hiEdges]).toEqual(['AB']);
  });

  it('the press captures the pointer', () => {
    const t = setup();
    t.down({ clientX: 500, clientY: 400, pointerId: 7 });
    expect(t.canvas.setPointerCapture).toHaveBeenCalledWith(7);
  });
});

describe('rotate and pan', () => {
  it('a left drag rotates about the world axes by 0.0075 rad per pixel', () => {
    const t = setup();
    t.down({ clientX: 500, clientY: 400 });
    t.move({ clientX: 540, clientY: 430 }); // dx 40, dy 30
    const expected = new THREE.Object3D();
    expected.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), 40 * 0.0075);
    expected.rotateOnWorldAxis(new THREE.Vector3(1, 0, 0), 30 * 0.0075);
    ['x', 'y', 'z', 'w'].forEach((k) =>
      expect(t.world.quaternion[k]).toBeCloseTo(expected.quaternion[k], 12),
    );
    expect(t.world.position.toArray()).toEqual([0, 0, 0]);
  });

  it('rotating clears the pressed view, once, not on every move', () => {
    const t = setup();
    expect(t.state.get().view).toBe('iso');
    let notes = 0;
    t.state.subscribe(() => notes++);
    t.down({ clientX: 500, clientY: 400 });
    for (let i = 1; i <= 30; i++) t.move({ clientX: 500 + i * 5, clientY: 400 });
    expect(t.state.get().view).toBeNull();
    expect(notes).toBe(1);
  });

  it.each([
    ['the right button', { button: 2 }, {}],
    ['Shift', { shiftKey: true }, {}],
    ['the Pan tool', {}, { dragTool: 'pan' }],
  ])('%s pans instead of rotating', (_, evProps, statePatch) => {
    const t = setup(statePatch);
    t.down({ clientX: 500, clientY: 400, ...evProps });
    t.move({ clientX: 530, clientY: 380, ...evProps });
    const k = worldPerPx(t.camera.position.z, 36, RECT.height);
    expect(t.world.position.x).toBeCloseTo(30 * k, 12);
    expect(t.world.position.y).toBeCloseTo(20 * k, 12); // screen y is down, world y is up
    expect(t.world.quaternion.equals(new THREE.Quaternion())).toBe(true);
  });

  it('the drag tool is read when the press starts, not during the drag', () => {
    const t = setup();
    t.down({ clientX: 500, clientY: 400 });
    t.state.set({ dragTool: 'pan' });
    t.move({ clientX: 540, clientY: 400 });
    expect(t.world.position.x).toBe(0);
    expect(t.world.quaternion.equals(new THREE.Quaternion())).toBe(false);
  });

  it('touch drags rotate like a mouse', () => {
    const t = setup();
    t.down({ clientX: 500, clientY: 400, pointerType: 'touch' });
    t.move({ clientX: 520, clientY: 400, pointerType: 'touch' });
    expect(t.world.quaternion.equals(new THREE.Quaternion())).toBe(false);
  });

  it('a press stops a view animation', () => {
    vi.spyOn(performance, 'now').mockReturnValue(0);
    const t = setup();
    t.views.goView('top');
    t.down({ clientX: 500, clientY: 400 });
    expect(t.views.stepAnimation()).toBe(false);
  });
});

describe('momentum', () => {
  it('carries on after release at 0.92 of the speed a frame, until it drops under 0.02', () => {
    const now = vi.spyOn(performance, 'now').mockReturnValue(0);
    const t = setup();
    t.down({ clientX: 500, clientY: 400 });
    now.mockReturnValue(16);
    t.move({ clientX: 510, clientY: 400 }); // 10 px in 16 ms: velocity 10 per event
    t.up({ clientX: 510, clientY: 400 });
    const q0 = t.world.quaternion.clone();
    t.viewCalls.length = 0; // every rotation reports the view once
    for (let i = 0; i < 300; i++) t.controls.stepMomentum();
    // The reference: rotate while a component is above 0.02, then multiply it by 0.92.
    let v = 10,
      expected = 0;
    while (v > MOMENTUM_MIN) {
      expected++;
      v *= MOMENTUM_KEEP;
    }
    expect(expected).toBe(75);
    expect(t.viewCalls).toHaveLength(expected);
    expect(t.world.quaternion.equals(q0)).toBe(false);
    // Once it has stopped it stays stopped.
    const q1 = t.world.quaternion.clone();
    t.controls.stepMomentum();
    expect(t.world.quaternion.equals(q1)).toBe(true);
  });

  it('does not run while the pointer is still down', () => {
    const now = vi.spyOn(performance, 'now').mockReturnValue(0);
    const t = setup();
    t.down({ clientX: 500, clientY: 400 });
    now.mockReturnValue(16);
    t.move({ clientX: 520, clientY: 400 });
    const q = t.world.quaternion.clone();
    t.controls.stepMomentum();
    expect(t.world.quaternion.equals(q)).toBe(true);
  });

  it('a new press zeroes the velocity', () => {
    const now = vi.spyOn(performance, 'now').mockReturnValue(0);
    const t = setup();
    t.down({ clientX: 500, clientY: 400 });
    now.mockReturnValue(16);
    t.move({ clientX: 520, clientY: 400 });
    t.up({ clientX: 520, clientY: 400 });
    t.down({ clientX: 520, clientY: 400 });
    t.up({ clientX: 520, clientY: 400 });
    const q = t.world.quaternion.clone();
    t.controls.stepMomentum();
    expect(t.world.quaternion.equals(q)).toBe(true);
  });

  it('a pan drag leaves no momentum', () => {
    const now = vi.spyOn(performance, 'now').mockReturnValue(0);
    const t = setup();
    t.down({ clientX: 500, clientY: 400, shiftKey: true });
    now.mockReturnValue(16);
    t.move({ clientX: 520, clientY: 400, shiftKey: true });
    t.up({ clientX: 520, clientY: 400, shiftKey: true });
    t.controls.stepMomentum();
    expect(t.world.quaternion.equals(new THREE.Quaternion())).toBe(true);
  });
});

describe('two pointers', () => {
  function pinch(t) {
    t.down({ pointerId: 1, clientX: 500, clientY: 400, pointerType: 'touch' });
    t.down({ pointerId: 2, clientX: 600, clientY: 400, pointerType: 'touch' });
  }

  it('moving the fingers apart zooms in by the ratio of the distances', () => {
    const t = setup();
    const z0 = t.camera.position.z;
    pinch(t);
    t.move({ pointerId: 2, clientX: 700, clientY: 400, pointerType: 'touch' });
    expect(t.camera.position.z).toBeCloseTo(z0 / 2, 12);
  });

  it('moving the centre pans, with the zoom applied first', () => {
    const t = setup();
    pinch(t);
    t.move({ pointerId: 2, clientX: 700, clientY: 400, pointerType: 'touch' }); // centre 550 to 600
    const k = worldPerPx(t.camera.position.z, 36, RECT.height);
    expect(t.world.position.x).toBeCloseTo(50 * k, 12);
  });

  it('zoom is clamped to 0.35 to 3 times the default distance', () => {
    const t = setup();
    const camDist = t.current.camDist;
    pinch(t);
    t.move({ pointerId: 2, clientX: 5000, clientY: 400, pointerType: 'touch' });
    expect(t.camera.position.z).toBeCloseTo(camDist * 0.35, 12);
    t.move({ pointerId: 2, clientX: 500.001, clientY: 400, pointerType: 'touch' });
    expect(t.camera.position.z).toBeCloseTo(camDist * 3, 12);
  });

  it('does not rotate, and lifting the fingers selects nothing', () => {
    const t = setup();
    const p = t.mid('A', 'B');
    t.down({ pointerId: 1, clientX: p.x, clientY: p.y, pointerType: 'touch' });
    t.down({ pointerId: 2, clientX: p.x + 80, clientY: p.y, pointerType: 'touch' });
    t.move({ pointerId: 1, clientX: p.x - 20, clientY: p.y + 30, pointerType: 'touch' });
    t.up({ pointerId: 2, clientX: p.x + 80, clientY: p.y, pointerType: 'touch' });
    t.up({ pointerId: 1, clientX: p.x - 20, clientY: p.y + 30, pointerType: 'touch' });
    expect(t.world.quaternion.equals(new THREE.Quaternion())).toBe(true);
    expect(t.state.get().hiEdges.size).toBe(0);
  });
});

describe('hover', () => {
  it('a mouse over a line shows the tooltip, the pick cursor and the length', () => {
    const t = setup();
    const p = t.mid('A', 'B');
    t.move({ clientX: p.x, clientY: p.y });
    expect(t.canvas.classList.contains('pick')).toBe(true);
    expect(t.tipEl.style.display).toBe('block');
    // The reference lists the edge as B then A (the order the faces traverse it).
    expect(t.tipEl.textContent).toBe('BA = 8 cm');
    expect(t.tipEl.style.left).toBe(p.x - RECT.left + 'px');
    expect(t.tipEl.style.top).toBe(p.y - RECT.top + 'px');
  });

  it('uses the current letters and unit', () => {
    const t = setup({ renames: { A: 'P', B: 'q' }, unit: 'mm' });
    const p = t.mid('A', 'B');
    t.move({ clientX: p.x, clientY: p.y });
    expect(t.tipEl.textContent).toBe('qP = 8 mm');
  });

  it('moving off the line hides it again', () => {
    const t = setup();
    const p = t.mid('A', 'B');
    t.move({ clientX: p.x, clientY: p.y });
    t.move({ clientX: RECT.left + 5, clientY: RECT.top + 5 });
    expect(t.canvas.classList.contains('pick')).toBe(false);
    expect(t.tipEl.style.display).toBe('none');
  });

  it('touch and pen pointers get no tooltip and no pick cursor', () => {
    for (const pointerType of ['touch', 'pen']) {
      const t = setup();
      const p = t.mid('A', 'B');
      t.move({ clientX: p.x, clientY: p.y, pointerType });
      expect(t.canvas.classList.contains('pick')).toBe(false);
      expect(t.tipEl.style.display).toBe('none');
    }
  });

  it('pressing hides the tooltip, and leaving the canvas hides it and drops the cursor', () => {
    const t = setup();
    const p = t.mid('A', 'B');
    t.move({ clientX: p.x, clientY: p.y });
    t.down({ clientX: p.x, clientY: p.y });
    expect(t.tipEl.style.display).toBe('none');
    t.up({ clientX: p.x, clientY: p.y });
    t.move({ clientX: p.x, clientY: p.y });
    t.canvas.dispatch('pointerleave', t.ev());
    expect(t.tipEl.style.display).toBe('none');
    expect(t.canvas.classList.contains('pick')).toBe(false);
  });

  it('a button held while moving does not hover (it is a drag)', () => {
    const t = setup();
    const p = t.mid('A', 'B');
    t.down({ clientX: RECT.left + 5, clientY: RECT.top + 5 });
    t.move({ clientX: p.x, clientY: p.y });
    expect(t.tipEl.style.display).toBe('none');
  });
});

describe('wheel, double-click and the context menu', () => {
  it('the wheel prevents the page scroll and sets an eased zoom target', () => {
    const t = setup();
    const z0 = t.camera.position.z;
    const e = t.ev({ deltaY: 100 });
    t.canvas.dispatch('wheel', e);
    expect(e.preventDefault).toHaveBeenCalled();
    t.views.stepZoom();
    expect(t.camera.position.z).toBeCloseTo(z0 + z0 * 0.12 * 0.18, 12);
  });

  it('the wheel listener is not passive, so preventDefault works', () => {
    const t = setup();
    const calls = [];
    const canvas = { ...t.canvas, addEventListener: (type, fn, opts) => calls.push([type, opts]) };
    createControls({
      canvas,
      tipEl: t.tipEl,
      camera: t.camera,
      world: t.world,
      state: t.state,
      views: t.views,
      setView() {},
      getModel: () => t.current,
      win: { addEventListener() {} },
    });
    expect(calls.find(([type]) => type === 'wheel')[1]).toEqual({ passive: false });
  });

  it('a double-click goes to the iso view', () => {
    const t = setup();
    t.state.set({ view: 'front' });
    t.canvas.dispatch('dblclick', t.ev());
    expect(t.viewCalls).toContain('iso');
    expect(t.state.get().view).toBe('iso');
  });

  it('the context menu is cancelled', () => {
    const t = setup();
    const e = t.ev();
    t.canvas.dispatch('contextmenu', e);
    expect(e.preventDefault).toHaveBeenCalled();
  });
});

describe('keyboard', () => {
  it.each([
    ['1', 'iso'],
    ['r', 'iso'],
    ['R', 'iso'],
    ['2', 'front'],
    ['3', 'top'],
    ['4', 'right'],
  ])('%s goes to the %s view', (k, view) => {
    const t = setup({ view: null });
    t.key(k);
    expect(t.state.get().view).toBe(view);
  });

  it('Esc clears the selected lengths and the triangle', () => {
    const t = setup({ hiEdges: new Set(['AB', 'AC']), triIdx: 2 });
    t.key('Escape');
    expect(t.state.get().hiEdges.size).toBe(0);
    expect(t.state.get().triIdx).toBe(-1);
  });

  it('] and [ both toggle the panel', () => {
    const t = setup();
    t.key(']');
    expect(t.state.get().panelOpen).toBe(false);
    t.key('[');
    expect(t.state.get().panelOpen).toBe(true);
  });

  it('+ and = zoom in, - zooms out', () => {
    const t = setup();
    const camDist = t.current.camDist;
    const settle = () => {
      for (let i = 0; i < 200; i++) t.views.stepZoom();
      return t.camera.position.z;
    };
    t.key('+');
    expect(settle()).toBeCloseTo(camDist * 0.8, 12);
    t.key('=');
    expect(settle()).toBeCloseTo(camDist * 0.64, 12);
    t.key('-');
    expect(settle()).toBeCloseTo(camDist * 0.8, 12);
  });

  it('is ignored while typing in an input, select or textarea', () => {
    const t = setup({ view: null, hiEdges: new Set(['AB']) });
    const typing = { target: { matches: (sel) => sel === 'input, select, textarea' } };
    t.key('r', typing);
    t.key('Escape', typing);
    t.key(']', typing);
    expect(t.state.get().view).toBeNull();
    expect(t.state.get().hiEdges.size).toBe(1);
    expect(t.state.get().panelOpen).toBe(true);
  });

  it('has no modifier guard, as in the reference (O-1): Ctrl+R still resets the view', () => {
    const t = setup({ view: null });
    t.key('r', { ctrlKey: true, metaKey: true });
    expect(t.state.get().view).toBe('iso');
  });

  it('other keys do nothing', () => {
    const t = setup({ view: null });
    ['a', '5', 'Enter', ' '].forEach((k) => t.key(k));
    expect(t.state.get().view).toBeNull();
  });
});
