// Panel shell: the four tabs, collapse via the edge handle on the stage, and the five display
// switches (Dimension labels, Corner letters, Ground grid, Transparent faces, Hide answers).
//
// The toolbar's panel button belongs to ui/toolbar.js. Both write state.panelOpen, and this
// module applies it to the layout (the `collapsed` class on #work), as the prototype's setPanel did.
//
// State read:    tab, panelOpen, toggles
// State written: tab, panelOpen, toggles
import '../styles/tokens.css';
import '../styles/layout.css';
import '../styles/stage.css';
import '../styles/panel.css';
import { watch } from './watch.js';

const $ = (s) => document.querySelector(s);

// The five switches: element id, and the key in state.toggles.
const SWITCHES = [
  ['tDims', 'dims'],
  ['tLabels', 'labels'],
  ['tGrid', 'grid'],
  ['tFaces', 'faces'],
  ['tHide', 'hide'],
];

export function mount(state) {
  const workEl = $('#work');
  const tabs = document.querySelectorAll('.tab');
  const tabPanels = document.querySelectorAll('.tabpanel');
  // What the shell markup shows before anything has run: the Shape tab.
  let shownTab = 'shape';

  // Choosing a tab also opens the panel if it is collapsed, as showTab did.
  tabs.forEach((t) =>
    t.addEventListener('click', () => {
      state.set(
        state.get().panelOpen ? { tab: t.dataset.tab } : { tab: t.dataset.tab, panelOpen: true },
      );
    }),
  );
  $('#edgeToggle').addEventListener('click', () =>
    state.set({ panelOpen: !state.get().panelOpen }),
  );

  SWITCHES.forEach(([id, key]) =>
    document.getElementById(id).addEventListener('change', (e) => {
      state.set({ toggles: { ...state.get().toggles, [key]: e.target.checked } });
    }),
  );

  function render(s) {
    // Only touch the tab attributes when the tab changes, so the markup is left as written until then.
    if (s.tab !== shownTab) {
      shownTab = s.tab;
      tabs.forEach((t) => t.setAttribute('aria-selected', t.dataset.tab === s.tab));
      tabPanels.forEach((p) => (p.dataset.active = p.dataset.tab === s.tab));
    }
    workEl.classList.toggle('collapsed', !s.panelOpen);
    SWITCHES.forEach(([id, key]) => {
      document.getElementById(id).checked = s.toggles[key];
    });
  }
  const onState = watch(['tab', 'panelOpen', 'toggles'], render);
  onState(state.get());
  state.subscribe(onState);
}
