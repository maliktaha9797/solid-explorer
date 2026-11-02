// Triangles tab: a card for every right-angled triangle in the solid, and the badge on the tab.
// Selecting a card shades the triangle on the model and switches to the Working tab (opening the
// panel if it is collapsed). Selecting the selected card again deselects it and stays on the tab.
//
// State read:    shapeKey, dimVals, triIdx, renames, panelOpen
// State written: triIdx, tab, panelOpen
import '../styles/panel.css';
import { nm, tx } from '../format.js';
import { builtFor } from './built.js';
import { watch } from './watch.js';

const $ = (s) => document.querySelector(s);

export function mount(state) {
  function render(s) {
    const built = builtFor(s);
    const el = $('#tris');
    el.innerHTML = '';
    built.tris.forEach((t, i) => {
      const b = document.createElement('button');
      b.className = 'card';
      b.setAttribute('aria-pressed', i === s.triIdx);
      b.innerHTML = `<span class="t">${tx(s.renames, t.title)}</span><span class="pts">${t.pts.map((n) => nm(s.renames, n)).join('')}</span><span class="n">${tx(s.renames, t.note)}</span>`;
      b.addEventListener('click', () => {
        const cur = state.get();
        if (cur.triIdx === i) {
          state.set({ triIdx: -1 });
        } else {
          // Selecting also switches to the Working tab, and opens the panel if it is collapsed.
          state.set({ triIdx: i, tab: 'working', ...(cur.panelOpen ? {} : { panelOpen: true }) });
        }
      });
      el.appendChild(b);
    });
    $('#bTri').textContent = s.triIdx >= 0 ? '1' : '';
  }

  const onState = watch(['shapeKey', 'dimVals', 'triIdx', 'renames'], render);
  onState(state.get());
  state.subscribe(onState);
}
