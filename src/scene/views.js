// View presets and the camera animations: the iso, front, top and right views, the slerp between
// them, the pan that eases back to the centre, and the eased zoom. Every constant is copied from
// the reference.
//
// This module moves `world` (rotation and position) and `camera` (z only). It touches no DOM and
// does not know about state: the caller says how to report the view that is showing.
import * as THREE from 'three';

// 450 ms slerp, ease-out cubic.
export const ANIM_MS = 450;
// Camera z may go from 0.35 to 3 times the default distance for the solid.
export const ZOOM_MIN = 0.35;
export const ZOOM_MAX = 3;
export const ease = (t) => 1 - Math.pow(1 - t, 3);

// The four preset orientations of `world`, as quaternions. Built the way the reference builds them,
// by rotating an Object3D about the world axes.
//   iso    about Y by -0.6, then about X by 0.42
//   front  no rotation
//   top    about X by PI/2 - 0.0001 (the small offset keeps it off the degenerate pole)
//   right  about Y by -PI/2
export function buildViewQuaternions() {
  const viewQ = {};
  const o = new THREE.Object3D();
  const set = (name, fn) => {
    o.quaternion.identity();
    fn(o);
    viewQ[name] = o.quaternion.clone();
  };
  const Y = new THREE.Vector3(0, 1, 0),
    X = new THREE.Vector3(1, 0, 0);
  set('iso', (o) => {
    o.rotateOnWorldAxis(Y, -0.6);
    o.rotateOnWorldAxis(X, 0.42);
  });
  set('front', () => {});
  set('top', (o) => o.rotateOnWorldAxis(X, Math.PI / 2 - 0.0001));
  set('right', (o) => o.rotateOnWorldAxis(Y, -Math.PI / 2));
  return viewQ;
}

// Zoom targets. `z` is the current camera z (or the pending target, which the caller resolves
// first) and `camDist` the default distance for the current solid.
// The button clamps are one-sided, exactly as in the reference: zoom in only floors the result and
// zoom out only caps it. The wheel clamps both ends.
export const zoomInTarget = (z, camDist) => Math.max(camDist * ZOOM_MIN, z * 0.8);
export const zoomOutTarget = (z, camDist) => Math.min(camDist * ZOOM_MAX, z * 1.25);
export const wheelTarget = (z, deltaY, camDist) =>
  Math.min(camDist * ZOOM_MAX, Math.max(camDist * ZOOM_MIN, z * (1 + deltaY * 0.0012)));
export const pinchZ = (z, prevDistance, distance, camDist) =>
  Math.min(camDist * ZOOM_MAX, Math.max(camDist * ZOOM_MIN, (z * prevDistance) / distance));

// opts:
//   world        the THREE.Group the user rotates and pans
//   camera       the perspective camera (only position.z is changed)
//   getCamDist   () => the default camera distance for the current solid
//   setView      (name | null) => report which view is showing, or null after a manual rotate
export function createViews({ world, camera, getCamDist, setView }) {
  const viewQ = buildViewQuaternions();
  let animQ = null; // { from, to, t0, dur }
  let panHome = false;
  let targetZ = null;

  world.quaternion.copy(viewQ.iso);

  function goView(name) {
    animQ = {
      from: world.quaternion.clone(),
      to: viewQ[name],
      t0: performance.now(),
      dur: ANIM_MS,
    };
    targetZ = getCamDist();
    panHome = true;
    setView(name);
  }

  return {
    viewQ,
    goView,
    // The boot sequence: start in iso with no animation. The zoom and pan are already home, and
    // the first frame snaps the camera to its target.
    boot() {
      goView('iso');
      world.quaternion.copy(viewQ.iso);
      animQ = null;
    },
    // A new press on the canvas stops any view animation.
    cancelAnimation() {
      animQ = null;
    },
    zoomIn() {
      targetZ = zoomInTarget(targetZ ?? camera.position.z, getCamDist());
    },
    zoomOut() {
      targetZ = zoomOutTarget(targetZ ?? camera.position.z, getCamDist());
    },
    wheel(deltaY) {
      targetZ = wheelTarget(targetZ ?? camera.position.z, deltaY, getCamDist());
    },
    // Pinching sets the camera directly and drops any eased target.
    pinch(prevDistance, distance) {
      camera.position.z = pinchZ(camera.position.z, prevDistance, distance, getCamDist());
      targetZ = null;
    },
    // After a rebuild the camera goes back to the default distance, unless a zoom or view
    // animation is still running (the reference does the same).
    placeCamera() {
      if (targetZ === null) camera.position.set(0, 0, getCamDist());
    },
    // Per frame, in the order the reference runs them. stepAnimation returns true while a view
    // animation owns the rotation, which is when momentum must not also rotate.
    stepAnimation() {
      if (!animQ) return false;
      const t = Math.min(1, (performance.now() - animQ.t0) / animQ.dur);
      // The reference calls the static Quaternion.slerp(qa, qb, qm, t). r128 deprecates it and logs a
      // warning on every call, so every frame of an animation; it just calls this method, so the
      // numbers are the same.
      world.quaternion.slerpQuaternions(animQ.from, animQ.to, ease(t));
      if (t >= 1) animQ = null;
      return true;
    },
    stepPanHome() {
      if (!panHome) return;
      world.position.multiplyScalar(0.8);
      if (world.position.length() < 0.001) {
        world.position.set(0, 0, 0);
        panHome = false;
      }
    },
    stepZoom() {
      if (targetZ === null) return;
      camera.position.z += (targetZ - camera.position.z) * 0.18;
      if (Math.abs(targetZ - camera.position.z) < 0.01) {
        camera.position.z = targetZ;
        targetZ = null;
      }
    },
  };
}
