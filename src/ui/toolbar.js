// Toolbar: shape select, view buttons, Rotate and Pan tools, zoom, reset view, Clear, theme
// toggle and the panel button. Everything in <header class="toolbar">, and nothing else.
//
// The toolbar never imports scene/. The camera moves through `actions`, which main.js builds from
// the scene's public API (decisions D-019):
//   actions = { goView(name), zoomIn(), zoomOut() }
// The scene writes state.view; the toolbar only shows it. The toolbar writes state.dragTool.
//
// State read:    shapeKey, view, dragTool, theme, panelOpen
// State written: shapeKey (with everything a shape change resets), dragTool, theme, systemDark,
//                panelOpen, and the selection (Clear)
// DOM it applies from state: data-theme on <html>, which the scene reads to recolour itself.
import '../styles/tokens.css';
import '../styles/layout.css';
import '../styles/toolbar.css';
import { SHAPES } from '../shapes/index.js';
import { MODES } from '../modes.js';
import { freshDims } from './dims-model.js';
import { watch } from './watch.js';

const $ = (s) => document.querySelector(s);

export function mount(state, actions) {
  const root = document.documentElement;
  const shapeSel = $('#shapeSel');
  const viewBtns = document.querySelectorAll('[data-view]');
  const dark = matchMedia('(prefers-color-scheme: dark)');

  // Shape select, filled from the registry in its order.
  Object.entries(SHAPES).forEach(([k, s]) => {
    const o = document.createElement('option');
    o.value = k;
    o.textContent = s.name;
    shapeSel.appendChild(o);
  });
  // Changing shape resets the mode, the selections, the renames and the last valid solid.
  shapeSel.addEventListener('change', () => {
    const shapeKey = shapeSel.value;
    state.set({
      shapeKey,
      modeIdx: 0,
      lastGood: null,
      triIdx: -1,
      hiEdges: new Set(),
      renames: {},
      ...freshDims(MODES[shapeKey][0], null),
    });
  });

  viewBtns.forEach((b) => b.addEventListener('click', () => actions.goView(b.dataset.view)));
  $('#resetView').addEventListener('click', () => actions.goView('iso'));
  $('#zoomIn').addEventListener('click', () => actions.zoomIn());
  $('#zoomOut').addEventListener('click', () => actions.zoomOut());
  $('#toolRotate').addEventListener('click', () => state.set({ dragTool: 'rotate' }));
  $('#toolPan').addEventListener('click', () => state.set({ dragTool: 'pan' }));
  $('#clearAll').addEventListener('click', () => state.clearSelection());
  $('#panelBtn').addEventListener('click', () => state.set({ panelOpen: !state.get().panelOpen }));

  // Theme: with no saved choice the page follows the system. The button flips whatever is showing.
  $('#themeBtn').addEventListener('click', () => {
    const cur = state.get().theme || (dark.matches ? 'dark' : 'light');
    state.set({ theme: cur === 'dark' ? 'light' : 'dark' });
  });
  // The scene recolours from CSS variables, so it needs to hear that the system setting moved.
  dark.addEventListener?.('change', (e) => state.set({ systemDark: e.matches }));
  if (state.get().systemDark !== dark.matches) state.set({ systemDark: dark.matches });

  function render(s) {
    if (shapeSel.value !== s.shapeKey) shapeSel.value = s.shapeKey;
    viewBtns.forEach((b) => b.setAttribute('aria-pressed', b.dataset.view === s.view));
    $('#toolRotate').setAttribute('aria-pressed', s.dragTool === 'rotate');
    $('#toolPan').setAttribute('aria-pressed', s.dragTool === 'pan');
    $('#panelBtn').setAttribute('aria-pressed', s.panelOpen);
    if (s.theme) root.dataset.theme = s.theme;
    else delete root.dataset.theme;
  }
  const onState = watch(['shapeKey', 'view', 'dragTool', 'panelOpen', 'theme'], render);
  onState(state.get());
  state.subscribe(onState);
}
