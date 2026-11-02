// Pointer and keyboard control of the scene, written by hand with no three.js example module.
// Constants are copied from the reference.
//
//   left drag          rotate, with momentum        (the Pan tool, Shift or the right button: pan)
//   two pointers       pinch zoom and pan together
//   click on a line    select it, if the pointer never travelled more than 4 px
//   mouse hover        tooltip "AB = x unit" and the pick cursor (mouse only, not touch or pen)
//   wheel              eased zoom                    double-click: iso view
//   keys               1 R iso, 2 front, 3 top, 4 right, Esc clear, ] [ panel, + = zoom in, - out
//
// What it reads from state: dragTool (at pointer down), unit and renames (for the tooltip).
// What it writes: toggleEdge on a click, clearSelection on Esc, panelOpen on ] and [, and the view
// (through setView, null after a manual rotate). It never writes from the render loop.
import * as THREE from 'three';
import { fmt, nm } from '../format.js';

// Radians of rotation per pixel of drag.
export const ROTATE_PER_PX = 0.0075;
// A pointer that stays within this many pixels of where it went down is a click, not a drag.
export const CLICK_THRESHOLD = 4;
// Momentum: below this speed it stops, and each frame it keeps this fraction of its speed.
export const MOMENTUM_MIN = 0.02;
export const MOMENTUM_KEEP = 0.92;

// How far the world moves for one pixel of pan, at camera distance z.
export const worldPerPx = (z, fovDeg, heightPx) =>
  (2 * z * Math.tan((fovDeg * Math.PI) / 360)) / heightPx;

// opts:
//   canvas, tipEl   #c and #tip
//   camera, world   the perspective camera and the group that rotates and pans
//   state           the app state (get, set, toggleEdge, clearSelection)
//   views           from createViews (goView, zoomIn, zoomOut, wheel, pinch, cancelAnimation)
//   setView         (name | null) => report the view, only when it changes
//   getModel        () => { built, hitMeshes } of the latest rebuild
//   win             where the keyboard listener goes (window; a test passes its own)
export function createControls({
  canvas,
  tipEl,
  camera,
  world,
  state,
  views,
  setView,
  getModel,
  win = window,
}) {
  const pointers = new Map();
  let drag = null,
    vel = { x: 0, y: 0 },
    pinchD = 0,
    pinchC = null;
  const raycaster = new THREE.Raycaster();
  const Y = new THREE.Vector3(0, 1, 0),
    X = new THREE.Vector3(1, 0, 0);
  const V = (a) => new THREE.Vector3(a[0], a[1], a[2]);

  function pan(dx, dy) {
    const r = canvas.getBoundingClientRect();
    const k = worldPerPx(camera.position.z, camera.fov, r.height);
    world.position.x += dx * k;
    world.position.y -= dy * k;
  }
  function rotate(dx, dy) {
    world.rotateOnWorldAxis(Y, dx * ROTATE_PER_PX);
    world.rotateOnWorldAxis(X, dy * ROTATE_PER_PX);
    setView(null);
  }
  function pick(cx, cy) {
    const r = canvas.getBoundingClientRect();
    raycaster.setFromCamera(
      new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1),
      camera,
    );
    const hits = raycaster.intersectObjects(getModel().hitMeshes, false);
    return hits.length ? hits[0].object.userData : null;
  }

  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      drag = {
        x: e.clientX,
        y: e.clientY,
        sx: e.clientX,
        sy: e.clientY,
        moved: false,
        t: performance.now(),
        pan: e.button === 2 || e.shiftKey || state.get().dragTool === 'pan',
      };
      vel = { x: 0, y: 0 };
      views.cancelAnimation();
    }
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchD = Math.hypot(a.x - b.x, a.y - b.y);
      pinchC = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      drag = null;
    }
    tipEl.style.display = 'none';
  });

  canvas.addEventListener('pointermove', (e) => {
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()],
        d = Math.hypot(a.x - b.x, a.y - b.y),
        c = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      if (pinchD) views.pinch(pinchD, d);
      if (pinchC) pan(c.x - pinchC.x, c.y - pinchC.y);
      pinchD = d;
      pinchC = c;
      return;
    }
    if (drag) {
      const dx = e.clientX - drag.x,
        dy = e.clientY - drag.y;
      if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > CLICK_THRESHOLD) {
        drag.moved = true;
        canvas.classList.add('grabbing');
      }
      if (drag.moved) {
        if (drag.pan) pan(dx, dy);
        else {
          rotate(dx, dy);
          const now = performance.now(),
            dt = Math.max(1, now - drag.t);
          vel = { x: (dx / dt) * 16, y: (dy / dt) * 16 };
          drag.t = now;
        }
      }
      drag.x = e.clientX;
      drag.y = e.clientY;
    } else if (e.pointerType === 'mouse') {
      const h = pick(e.clientX, e.clientY);
      canvas.classList.toggle('pick', !!h);
      if (h) {
        const { renames, unit } = state.get(),
          { verts } = getModel().built;
        tipEl.textContent = `${nm(renames, h.a)}${nm(renames, h.b)} = ${fmt(V(verts[h.a]).distanceTo(V(verts[h.b])))} ${unit}`;
        tipEl.style.display = 'block';
        const r = canvas.getBoundingClientRect();
        tipEl.style.left = e.clientX - r.left + 'px';
        tipEl.style.top = e.clientY - r.top + 'px';
      } else tipEl.style.display = 'none';
    }
  });

  // pointerup and pointercancel run the same handler, as in the reference: a cancelled press that
  // never moved can still select a line.
  const endPointer = (e) => {
    pointers.delete(e.pointerId);
    if (drag && !drag.moved && pointers.size === 0 && e.button !== 2) {
      const h = pick(e.clientX, e.clientY);
      if (h) state.toggleEdge(h.k);
    }
    if (pointers.size < 2) {
      pinchD = 0;
      pinchC = null;
    }
    if (pointers.size === 0) {
      drag = null;
      canvas.classList.remove('grabbing');
    }
  };
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  canvas.addEventListener('pointerleave', () => {
    tipEl.style.display = 'none';
    canvas.classList.remove('pick');
  });
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      views.wheel(e.deltaY);
    },
    { passive: false },
  );
  canvas.addEventListener('dblclick', () => views.goView('iso'));

  // No modifier-key guard, as in the reference: Ctrl or Cmd + R also resets the view.
  win.addEventListener('keydown', (e) => {
    if (e.target.matches('input, select, textarea')) return;
    const k = e.key.toLowerCase();
    if (k === 'r' || k === '1') views.goView('iso');
    else if (k === '2') views.goView('front');
    else if (k === '3') views.goView('top');
    else if (k === '4') views.goView('right');
    else if (k === 'escape') state.clearSelection();
    else if (k === ']' || k === '[') state.set({ panelOpen: !state.get().panelOpen });
    else if (k === '+' || k === '=') views.zoomIn();
    else if (k === '-') views.zoomOut();
  });

  return {
    // Per frame, when no view animation is running: the spin that carries on after a drag.
    stepMomentum() {
      if (!drag && (Math.abs(vel.x) > MOMENTUM_MIN || Math.abs(vel.y) > MOMENTUM_MIN)) {
        rotate(vel.x, vel.y);
        vel.x *= MOMENTUM_KEEP;
        vel.y *= MOMENTUM_KEEP;
      }
    },
  };
}
