// The 3D view. mount(state) wires the renderer, the model, the labels, the views and the pointer
// controls, starts the render loop, and returns the actions the toolbar needs (decisions D-036):
//
//   const scene = mount(state);   // { goView(name), zoomIn(), zoomOut() }
//
// DOM: it owns #c (canvas), #labels and #tip, and reads the size of #stage. It touches nothing
// else and imports nothing from ui/. Mount it after the UI modules: the toolbar applies
// data-theme, and rebuild() reads the colours from the CSS variables.
//
// State read:    shapeKey, dimVals, entered, modeIdx, triIdx, hiEdges, renames, unit, toggles,
//                theme, systemDark (the model rebuilds when any of these change), and dragTool
//                (read by the pointer controls when a press starts).
// State written: view (the view name, null after a manual rotate; only when it changes),
//                toggleEdge on a click on a line, clearSelection on Esc, panelOpen on ] and [.
// Nothing is written from the render loop except `view` when the rotation starts.
import * as THREE from 'three';
import { createControls } from './controls.js';
import { createLabels } from './labels.js';
import { createGroundTexture, readColours, rebuild } from './model.js';
import { createViews } from './views.js';

// Changing any of these rebuilds the model. `view`, `dragTool`, `tab`, `panelOpen`, `lastGood`
// and `dimError` do not.
const REBUILD_KEYS = [
  'shapeKey',
  'dimVals',
  'entered',
  'modeIdx',
  'triIdx',
  'hiEdges',
  'renames',
  'unit',
  'toggles',
  'theme',
  'systemDark',
];

// The axis gizmo is drawn into a square in the bottom-right corner, above the 30 px status bar.
const GIZMO_SIZE = 84,
  GIZMO_PAD = 14,
  STATUS_BAR = 30;

export function mount(state) {
  const $ = (s) => document.querySelector(s);
  const canvas = $('#c'),
    labelsEl = $('#labels'),
    tipEl = $('#tip'),
    stage = $('#stage');

  // Renderer, camera, lights
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 1000);
  scene.add(new THREE.AmbientLight(0xffffff, 0.8));
  const keyL = new THREE.DirectionalLight(0xffffff, 0.6);
  keyL.position.set(6, 10, 8);
  scene.add(keyL);
  const fillL = new THREE.DirectionalLight(0xffffff, 0.25);
  fillL.position.set(-6, -2, -6);
  scene.add(fillL);
  const world = new THREE.Group(); // rotates and pans with user input
  scene.add(world);
  const model = new THREE.Group(); // rebuilt per shape
  world.add(model);
  const env = new THREE.Group(); // grid, ground shadow
  world.add(env);

  // Axis gizmo: its own scene, drawn with a scissor in the corner, turning with the model.
  const gScene = new THREE.Scene();
  const gCam = new THREE.OrthographicCamera(-1.6, 1.6, 1.6, -1.6, 0.1, 10);
  gCam.position.set(0, 0, 5);
  const gGroup = new THREE.Group();
  gScene.add(gGroup);
  [
    [1, 0, 0, 0xe5484d],
    [0, 1, 0, 0x30a46c],
    [0, 0, 1, 0x3b7dd8],
  ].forEach(([x, y, z, c]) =>
    gGroup.add(
      new THREE.ArrowHelper(new THREE.Vector3(x, y, z), new THREE.Vector3(), 1.1, c, 0.3, 0.18),
    ),
  );

  const groundTex = createGroundTexture();
  let current = { built: null, labelItems: [], hitMeshes: [], maxDim: 10, camDist: 20 };

  // Reporting the view writes state only when the value changes, so a rotate drag does not wake
  // every subscriber on every frame.
  const setView = (v) => {
    if (state.get().view !== v) state.set({ view: v });
  };
  const views = createViews({ world, camera, getCamDist: () => current.camDist, setView });
  const labels = createLabels({ labelsEl, stage, world, camera });
  const controls = createControls({
    canvas,
    tipEl,
    camera,
    world,
    state,
    views,
    setView,
    getModel: () => current,
  });

  function rebuildScene(s) {
    current = rebuild(s, { model, env, colours: readColours(), groundTex });
    labels.setItems(current.labelItems);
    views.placeCamera();
  }

  state.subscribe((s, changed) => {
    if (changed.some((k) => REBUILD_KEYS.includes(k))) rebuildScene(s);
  });

  function resize() {
    const w = stage.clientWidth,
      h = stage.clientHeight,
      pr = renderer.getPixelRatio();
    if (canvas.width !== Math.floor(w * pr) || canvas.height !== Math.floor(h * pr)) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
  }

  function loop() {
    resize();
    if (!views.stepAnimation()) controls.stepMomentum();
    views.stepPanHome();
    views.stepZoom();
    const w = canvas.width,
      h = canvas.height,
      pr = renderer.getPixelRatio();
    renderer.setViewport(0, 0, w, h);
    renderer.setScissorTest(false);
    renderer.render(scene, camera);
    const gs = Math.round(GIZMO_SIZE * pr),
      pad = Math.round(GIZMO_PAD * pr),
      bottom = Math.round(STATUS_BAR * pr);
    renderer.autoClear = false;
    renderer.setScissorTest(true);
    renderer.setScissor(w - gs - pad, bottom + pad, gs, gs);
    renderer.setViewport(w - gs - pad, bottom + pad, gs, gs);
    gGroup.quaternion.copy(world.quaternion);
    renderer.render(gScene, gCam);
    renderer.setScissorTest(false);
    renderer.autoClear = true;
    labels.draw();
    requestAnimationFrame(loop);
  }

  // Boot: build, then start in iso with no animation.
  rebuildScene(state.get());
  views.boot();
  loop();

  return { goView: views.goView, zoomIn: views.zoomIn, zoomOut: views.zoomOut };
}
