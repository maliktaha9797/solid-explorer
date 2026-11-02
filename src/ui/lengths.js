// Lengths tab: a chip for every edge, and for every diagonal and construction line.
// A chip toggles the same selection as clicking the line on the model, and shows its length
// once selected. Also writes the badge on the Lengths tab.
//
// State read:    shapeKey, dimVals, hiEdges, renames
// State written: hiEdges, through state.toggleEdge
import '../styles/panel.css';
import { edgeKey } from '../geometry/diagonals.js';
import { fmt, nm } from '../format.js';
import { builtFor, dist } from './built.js';
import { watch } from './watch.js';

const $ = (s) => document.querySelector(s);

export function mount(state) {
  function fill(el, list, s, built) {
    el.innerHTML = '';
    list.forEach(([a, b]) => {
      const k = edgeKey(a, b);
      const btn = document.createElement('button');
      btn.className = 'chip';
      btn.innerHTML =
        `<span>${nm(s.renames, a)}${nm(s.renames, b)}</span>` +
        (s.hiEdges.has(k)
          ? `<span class="v mono">${fmt(dist(built.verts[a], built.verts[b]))}</span>`
          : '');
      btn.setAttribute('aria-pressed', s.hiEdges.has(k));
      btn.addEventListener('click', () => state.toggleEdge(k));
      el.appendChild(btn);
    });
  }

  function render(s) {
    const built = builtFor(s);
    fill($('#edges'), built.allEdges, s, built);
    fill($('#diags'), built.diags, s, built);
    if (!built.diags.length)
      $('#diags').innerHTML = '<span class="sub">None for this shape.</span>';
    $('#bLen').textContent = s.hiEdges.size || '';
  }

  const onState = watch(['shapeKey', 'dimVals', 'hiEdges', 'renames'], render);
  onState(state.get());
  state.subscribe(onState);
}
