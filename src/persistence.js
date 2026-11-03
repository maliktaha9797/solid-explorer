// Which settings survive a reload, and how they go in and out of storage (decisions D-020).
// Four, as in the prototype: shape, unit, panel, theme. Everything else starts fresh each time.
// `store` is storage.js, or anything with get(key, fallback) and set(key, value).
import { SHAPES } from './shapes/index.js';

// The values to start the state with. A saved shape that no longer exists falls back to cuboid.
export function restoreSettings(store) {
  const shape = store.get('shape', 'cuboid');
  return {
    shapeKey: typeof shape === 'string' && Object.hasOwn(SHAPES, shape) ? shape : 'cuboid',
    unit: store.get('unit', 'cm'),
    panelOpen: store.get('panel', true),
    theme: store.get('theme', null),
  };
}

// Saves the four settings now and again whenever one changes. The prototype writes the shape, the
// panel and the theme at boot as well, and the unit only on change; doing the same keeps what ends
// up in localStorage identical. Returns the function that stops saving.
export function persistSettings(state, store) {
  const { shapeKey, panelOpen, theme } = state.get();
  store.set('shape', shapeKey);
  store.set('panel', panelOpen);
  store.set('theme', theme || null);
  return state.subscribe((s, changed) => {
    if (changed.includes('shapeKey')) store.set('shape', s.shapeKey);
    if (changed.includes('unit')) store.set('unit', s.unit);
    if (changed.includes('panelOpen')) store.set('panel', s.panelOpen);
    if (changed.includes('theme')) store.set('theme', s.theme || null);
  });
}
