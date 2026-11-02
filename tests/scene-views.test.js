// The view presets and the camera animations. Runs in Node: three's maths needs no WebGL.
import { existsSync, readFileSync } from 'node:fs';
import * as THREE from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ANIM_MS,
  buildViewQuaternions,
  createViews,
  ease,
  pinchZ,
  wheelTarget,
  zoomInTarget,
  zoomOutTarget,
} from '../src/scene/views.js';

const REFERENCE = new URL('../reference/solid-explorer.html', import.meta.url);
const hasReference = existsSync(REFERENCE);

const q = (x, y, z, w) => new THREE.Quaternion(x, y, z, w);
const expectQ = (a, b) => {
  ['x', 'y', 'z', 'w'].forEach((k) => expect(a[k]).toBeCloseTo(b[k], 12));
};

describe('view quaternions', () => {
  const viewQ = buildViewQuaternions();

  it('has exactly the four presets', () => {
    expect(Object.keys(viewQ).sort()).toEqual(['front', 'iso', 'right', 'top']);
  });

  it('front is no rotation', () => {
    expectQ(viewQ.front, q(0, 0, 0, 1));
  });

  it('top turns the model about X by PI/2 - 0.0001', () => {
    const a = Math.PI / 2 - 0.0001;
    expectQ(viewQ.top, q(Math.sin(a / 2), 0, 0, Math.cos(a / 2)));
  });

  it('right turns the model about Y by -PI/2', () => {
    expectQ(viewQ.right, q(0, -Math.sin(Math.PI / 4), 0, Math.cos(Math.PI / 4)));
  });

  it('iso is Y by -0.6, then X by 0.42, both about the world axes', () => {
    // About-world-axis rotations premultiply, so the X rotation is applied last and sits on the left.
    const qy = q(0, Math.sin(-0.3), 0, Math.cos(-0.3));
    const qx = q(Math.sin(0.21), 0, 0, Math.cos(0.21));
    expectQ(viewQ.iso, qx.multiply(qy));
  });

  it('returns unit quaternions that are independent copies', () => {
    Object.values(viewQ).forEach((v) => expect(v.length()).toBeCloseTo(1, 12));
    expect(new Set(Object.values(viewQ)).size).toBe(4);
  });

  it.skipIf(!hasReference)('match the reference code, evaluated as written', () => {
    const src = readFileSync(REFERENCE, 'utf8');
    const a = src.indexOf('const viewQ = {};');
    const b = src.indexOf('let animQ = null;', a);
    expect(a).toBeGreaterThan(0);
    expect(b).toBeGreaterThan(a);
    const ref = new Function('THREE', src.slice(a, b) + '\nreturn viewQ;')(THREE);
    expect(Object.keys(ref).sort()).toEqual(Object.keys(viewQ).sort());
    for (const name of Object.keys(ref)) {
      for (const k of ['x', 'y', 'z', 'w']) expect(viewQ[name][k]).toBe(ref[name][k]);
    }
  });
});

describe('zoom targets', () => {
  const camDist = 20;

  it('the button clamps are one-sided, as in the reference', () => {
    expect(zoomInTarget(20, camDist)).toBe(16); // 20 * 0.8
    expect(zoomInTarget(7.5, camDist)).toBe(7); // floored at 0.35 * 20
    expect(zoomOutTarget(20, camDist)).toBe(25); // 20 * 1.25
    expect(zoomOutTarget(55, camDist)).toBe(60); // capped at 3 * 20
    // One-sided: zoom in does not cap the top, zoom out does not floor the bottom.
    expect(zoomInTarget(100, camDist)).toBe(80);
    expect(zoomOutTarget(2, camDist)).toBe(2.5);
  });

  it('the wheel clamps both ends and scales by 0.0012 per unit of deltaY', () => {
    expect(wheelTarget(20, 100, camDist)).toBeCloseTo(20 * 1.12, 12);
    expect(wheelTarget(20, -100, camDist)).toBeCloseTo(20 * 0.88, 12);
    expect(wheelTarget(20, 1e6, camDist)).toBe(60);
    expect(wheelTarget(20, -1e6, camDist)).toBe(7);
  });

  it('pinch scales by the ratio of finger distances and clamps both ends', () => {
    expect(pinchZ(20, 100, 200, camDist)).toBe(10); // fingers apart: zoom in
    expect(pinchZ(20, 200, 100, camDist)).toBe(40); // fingers together: zoom out
    expect(pinchZ(20, 100, 1, camDist)).toBe(60);
    expect(pinchZ(20, 1, 100, camDist)).toBe(7);
  });

  it('ease is ease-out cubic', () => {
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
    expect(ease(0.5)).toBeCloseTo(0.875, 12);
  });
});

describe('createViews', () => {
  afterEach(() => vi.restoreAllMocks());

  function setup(camDist = 20) {
    const world = new THREE.Group();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 1000);
    camera.position.set(0, 0, camDist);
    const seen = [];
    const views = createViews({
      world,
      camera,
      getCamDist: () => camDist,
      setView: (v) => seen.push(v),
    });
    return { world, camera, views, seen };
  }

  it('starts in iso', () => {
    const { world, views } = setup();
    expectQ(world.quaternion, views.viewQ.iso);
  });

  it('goView reports the view and starts a 450 ms slerp to it', () => {
    const now = vi.spyOn(performance, 'now').mockReturnValue(1000);
    const { world, views, seen } = setup();
    world.quaternion.copy(views.viewQ.iso);
    views.goView('top');
    expect(seen).toEqual(['top']);
    expect(views.stepAnimation()).toBe(true);
    expectQ(world.quaternion, views.viewQ.iso); // t = 0: nothing has moved yet
    now.mockReturnValue(1000 + ANIM_MS / 2);
    expect(views.stepAnimation()).toBe(true);
    const half = new THREE.Quaternion();
    half.slerpQuaternions(views.viewQ.iso, views.viewQ.top, ease(0.5));
    expectQ(world.quaternion, half);
    now.mockReturnValue(1000 + ANIM_MS);
    expect(views.stepAnimation()).toBe(true);
    expectQ(world.quaternion, views.viewQ.top);
    expect(views.stepAnimation()).toBe(false); // finished: momentum may run again
  });

  it('slerps with the same numbers as the reference static call, without its deprecation warning', () => {
    const now = vi.spyOn(performance, 'now').mockReturnValue(0);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { world, views } = setup();
    world.quaternion.copy(views.viewQ.iso);
    views.goView('right');
    for (const t of [0, 100, 225, 337, 450]) {
      now.mockReturnValue(t);
      views.stepAnimation();
      // What the reference computes each frame: the static form, which r128 deprecates.
      const ref = new THREE.Quaternion();
      THREE.Quaternion.slerp(
        views.viewQ.iso,
        views.viewQ.right,
        ref,
        ease(Math.min(1, t / ANIM_MS)),
      );
      ['x', 'y', 'z', 'w'].forEach((k) => expect(world.quaternion[k]).toBe(ref[k]));
    }
    // The only warnings are the five from the reference-form calls in this test itself.
    expect(warn).toHaveBeenCalledTimes(5);
  });

  it('a new press cancels the animation', () => {
    vi.spyOn(performance, 'now').mockReturnValue(0);
    const { views } = setup();
    views.goView('front');
    views.cancelAnimation();
    expect(views.stepAnimation()).toBe(false);
  });

  it('goView sets the zoom target to the default distance and pans home', () => {
    vi.spyOn(performance, 'now').mockReturnValue(0);
    const { world, camera, views } = setup(20);
    camera.position.z = 8;
    world.position.set(3, -2, 0);
    views.goView('front');
    // The pan eases home by 0.8 a frame and snaps to zero under 0.001.
    views.stepPanHome();
    expect(world.position.x).toBeCloseTo(2.4, 12);
    expect(world.position.y).toBeCloseTo(-1.6, 12);
    for (let i = 0; i < 60; i++) views.stepPanHome();
    expect(world.position.toArray()).toEqual([0, 0, 0]);
    // The camera eases towards 20 by 0.18 of the gap a frame and snaps within 0.01.
    views.stepZoom();
    expect(camera.position.z).toBeCloseTo(8 + 12 * 0.18, 12);
    for (let i = 0; i < 100; i++) views.stepZoom();
    expect(camera.position.z).toBe(20);
  });

  it('boot starts in iso with no animation', () => {
    vi.spyOn(performance, 'now').mockReturnValue(0);
    const { world, views, seen } = setup();
    views.boot();
    expect(seen).toEqual(['iso']);
    expectQ(world.quaternion, views.viewQ.iso);
    expect(views.stepAnimation()).toBe(false);
  });

  it('button zoom eases to the target, one step per click compounding', () => {
    const { camera, views } = setup(20);
    views.zoomIn();
    views.zoomIn(); // the second click starts from the pending target, 16, not the camera, 20
    for (let i = 0; i < 200; i++) views.stepZoom();
    expect(camera.position.z).toBeCloseTo(12.8, 12);
    views.zoomOut();
    for (let i = 0; i < 200; i++) views.stepZoom();
    expect(camera.position.z).toBeCloseTo(16, 12);
  });

  it('the wheel sets an eased target, and pinch sets z directly and drops the target', () => {
    const { camera, views } = setup(20);
    views.wheel(100);
    views.stepZoom();
    expect(camera.position.z).toBeCloseTo(20 + 20 * 0.12 * 0.18, 12);
    views.pinch(100, 200); // halves z and clears the pending wheel target
    expect(camera.position.z).toBeCloseTo((20 + 20 * 0.12 * 0.18) / 2, 12);
    const z = camera.position.z;
    views.stepZoom(); // nothing pending any more
    expect(camera.position.z).toBe(z);
  });

  it('placeCamera resets the distance after a rebuild, unless a zoom is still running', () => {
    const { camera, views } = setup(20);
    camera.position.z = 9;
    views.placeCamera();
    expect(camera.position.z).toBe(20);
    views.zoomIn(); // a target is pending
    camera.position.z = 9;
    views.placeCamera();
    expect(camera.position.z).toBe(9);
  });
});
