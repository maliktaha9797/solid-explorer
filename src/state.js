// Single source of app state, with pub/sub. Imports nothing and touches no DOM.
// All UI modules and the scene read this and subscribe to it; none reaches into another's DOM.
//
// Contract:
//   get()          the current state object. Treat it as read-only.
//   set(patch)     shallow-merge the patch, then notify every subscriber synchronously.
//   subscribe(fn)  fn(state, changedKeys) runs after every set(). Returns an unsubscribe function.
//
// set() always notifies and always produces a new top-level object. Replace objects and Sets
// (hiEdges, renames, entered, toggles, ...) instead of mutating them, so subscribers can compare
// by reference.
//
// Two small actions are shared by the panel, the toolbar and the scene, so they live here:
//   toggleEdge(key)    select or deselect one line (edge, diagonal or construction line)
//   clearSelection()   deselect every line and the triangle (Clear button, Esc)
//
// Defaults mirror the prototype's boot values. The toggles are the five switches in the panel:
// Dimension labels, Corner letters, Ground grid, Transparent faces, Hide answers for practice.
//
// Persisted through storage.js (restore at boot and write on change, wired in main.js):
//   shapeKey -> se:shape, unit -> se:unit, panelOpen -> se:panel, theme -> se:theme
// Mode, dimensions and the toggles are not persisted in the prototype, so they are not here either.
//
// Fields the prototype kept in module variables or read back from the DOM (Phase 4, decisions D-024):
//   lastGood     the last valid canonical dims, used when an input is invalid. Cleared on shape change.
//   dimError     the red message under the dimension fields, or null. Written with entered and dimVals.
//   tab          the active panel tab: 'shape' | 'lengths' | 'tri' | 'working'. Not persisted.
//   view         'iso' | 'front' | 'top' | 'right', or null after a manual rotate. Written by the scene.
//   dragTool     'rotate' | 'pan'. Written by the toolbar, read by the scene's pointer controls.
//   systemDark   whether the system prefers dark. Written by the toolbar, so the scene can recolour
//                when the system setting changes while theme is null.
//
// entered, dimVals, lastGood and dimError always change together with shapeKey and modeIdx, in one
// set(), so no subscriber sees a shape paired with another shape's dimensions. Mount ui/dims.js
// before anything that reads the built shape, because it fills entered and dimVals at mount.

export const DEFAULT_TOGGLES = { dims: true, labels: true, grid: true, faces: true, hide: false };

export function createState(overrides = {}) {
  let state = {
    shapeKey: 'cuboid',
    modeIdx: 0,
    entered: {},
    dimVals: {},
    lastGood: null,
    dimError: null,
    triIdx: -1,
    hiEdges: new Set(),
    renames: {},
    unit: 'cm',
    toggles: { ...DEFAULT_TOGGLES },
    tab: 'shape',
    panelOpen: true,
    theme: null,
    systemDark: false,
    view: 'iso',
    dragTool: 'rotate',
    ...overrides,
  };
  const listeners = new Set();

  function set(patch) {
    state = { ...state, ...patch };
    const changed = Object.keys(patch);
    // Snapshot, so a subscriber that unsubscribes during notification does not skip the others.
    [...listeners].forEach((fn) => fn(state, changed));
  }

  return {
    get: () => state,
    set,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    toggleEdge(key) {
      const hiEdges = new Set(state.hiEdges);
      if (hiEdges.has(key)) hiEdges.delete(key);
      else hiEdges.add(key);
      set({ hiEdges });
    },
    clearSelection() {
      set({ hiEdges: new Set(), triIdx: -1 });
    },
  };
}

export const state = createState();
