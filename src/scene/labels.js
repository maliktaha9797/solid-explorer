// HTML labels on top of the canvas, positioned every frame by projecting 3D points to the screen.
//
// `items` is the list rebuild() makes: { pos, text, cls }, with `pos` a Vector3 in model space (the
// local space of `world`). Elements live in #labels, which has pointer-events: none so clicks reach
// the canvas. They are pooled: item i always uses element i, more are created only when there are
// more items than elements, and the spare ones are hidden. No occlusion test: a label behind a
// face still shows, as in the reference.
//
// Class and text are written on every frame, as the reference does. Skipping the write when
// nothing changed looks harmless but is not: it left the border row of a pill one level off in the
// green channel against the reference (measured, Chrome 156, SwiftShader), so the paint pattern
// is part of the spec.
import * as THREE from 'three';

// opts:
//   labelsEl   the #labels overlay
//   stage      the #stage element (its CSS pixel size is the projection target)
//   world      the THREE.Group whose matrix places the model
//   camera     the perspective camera
export function createLabels({ labelsEl, stage, world, camera }) {
  const pool = [];
  const p = new THREE.Vector3();
  let items = [];

  return {
    setItems(next) {
      items = next;
    },
    // Call after the frame has been rendered, so the camera matrices are current.
    draw() {
      const w = stage.clientWidth,
        h = stage.clientHeight;
      world.updateMatrixWorld();
      items.forEach((it, i) => {
        let el = pool[i];
        if (!el) {
          el = document.createElement('div');
          pool.push(el);
          labelsEl.appendChild(el);
        }
        p.copy(it.pos).applyMatrix4(world.matrixWorld).project(camera);
        el.className = 'lbl ' + it.cls;
        el.textContent = it.text;
        el.style.left = ((p.x + 1) / 2) * w + 'px';
        el.style.top = ((1 - p.y) / 2) * h + 'px';
        el.style.display = '';
      });
      for (let i = items.length; i < pool.length; i++) pool[i].style.display = 'none';
    },
  };
}
