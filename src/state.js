// Single source of app state, with pub/sub. Imports nothing and touches no DOM.
// All UI modules and the scene read this and subscribe to it; none reaches into another's DOM.
//
// Contract (decisions.md P-2):
//   get()          the current state object. Treat it as read-only.
//   set(patch)     shallow-merge the patch, then notify every subscriber synchronously.
//   subscribe(fn)  fn(state, changedKeys) runs after every set(). Returns an unsubscribe function.
//
// set() always notifies and always produces a new top-level object. Replace objects and Sets
// (hiEdges, renames, entered, toggles, ...) instead of mutating them, so subscribers can compare
// by reference.
//
// Defaults mirror the prototype's boot values. The toggles are the five switches in the panel:
// Dimension labels, Corner letters, Ground grid, Transparent faces, Hide answers for practice.
//
// Persisted through storage.js (restore at boot and write on change, wired in main.js):
//   shapeKey -> se:shape, unit -> se:unit, panelOpen -> se:panel, theme -> se:theme
// Mode, dimensions and the toggles are not persisted in the prototype, so they are not here either.
//
// Not in the plan's state object, and so not here yet: lastGood (the last valid canonical dims,
// used when an input is invalid), the active panel tab, the drag tool and the current view.
// Phase 4 decides where they live. If any joins this object, record it in decisions.md.

export const DEFAULT_TOGGLES = { dims: true, labels: true, grid: true, faces: true, hide: false };

export function createState(overrides = {}) {
  let state = {
    shapeKey: 'cuboid',
    modeIdx: 0,
    entered: {},
    dimVals: {},
    triIdx: -1,
    hiEdges: new Set(),
    renames: {},
    unit: 'cm',
    toggles: { ...DEFAULT_TOGGLES },
    panelOpen: true,
    theme: null,
    ...overrides,
  };
  const listeners = new Set();

  return {
    get: () => state,
    set(patch) {
      state = { ...state, ...patch };
      const changed = Object.keys(patch);
      // Snapshot, so a subscriber that unsubscribes during notification does not skip the others.
      [...listeners].forEach((fn) => fn(state, changed));
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

export const state = createState();
