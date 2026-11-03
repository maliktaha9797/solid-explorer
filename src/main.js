// Entry point: makes the state from the saved settings, mounts the UI and the scene, and keeps the
// saved settings up to date. The order is fixed by decisions D-031 and D-036.
import { createState } from './state.js';
import * as storage from './storage.js';
import { persistSettings, restoreSettings } from './persistence.js';
import { mount as mountDims } from './ui/dims.js';
import { mount as mountNames } from './ui/names.js';
import { mount as mountToolbar } from './ui/toolbar.js';
import { mount as mountPanel } from './ui/panel.js';
import { mount as mountLengths } from './ui/lengths.js';
import { mount as mountTriangles } from './ui/triangles.js';
import { mount as mountWorking } from './ui/working.js';
import { mount as mountStatus } from './ui/status.js';
import { mount as mountScene } from './scene/renderer.js';

const state = createState(restoreSettings(storage));
persistSettings(state, storage);

// The toolbar mounts before the scene but needs the scene's actions, so it gets closures that look
// the scene up when a button is pressed.
let scene;
const actions = {
  goView: (name) => scene.goView(name),
  zoomIn: () => scene.zoomIn(),
  zoomOut: () => scene.zoomOut(),
};

// dims first, because it fills `entered` and `dimVals` when it mounts. The toolbar applies the
// theme before the scene mounts, because the scene reads its colours from the CSS variables.
mountDims(state);
mountNames(state);
mountToolbar(state, actions);
mountPanel(state);
mountLengths(state);
mountTriangles(state);
mountWorking(state);
mountStatus(state);
scene = mountScene(state);
