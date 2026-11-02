// Status bar along the bottom of the stage: shape, size, selection and the key hints.
// The hints are hidden on narrow screens by stage.css.
//
// State read:    shapeKey, modeIdx, entered, unit, hiEdges, triIdx
import '../styles/stage.css';
import { SHAPES } from '../shapes/index.js';
import { MODES } from '../modes.js';
import { fmt } from '../format.js';
import { watch } from './watch.js';

const $ = (s) => document.querySelector(s);

export function mount(state) {
  function render(s) {
    const d = MODES[s.shapeKey][s.modeIdx].inputs
      .map(([k, label]) => fmt(s.entered[k]) + (label.includes('°') ? '°' : ''))
      .join(' × ');
    const n = s.hiEdges.size;
    const sel =
      [n ? `${n} length${n > 1 ? 's' : ''}` : null, s.triIdx >= 0 ? '1 triangle' : null]
        .filter(Boolean)
        .join(', ') || 'Nothing selected';
    $('#status').innerHTML =
      `<span><span class="k">Shape</span> ${SHAPES[s.shapeKey].name}</span><span><span class="k">Size</span> <span class="mono">${d} ${s.unit}</span></span><span><span class="k">Selection</span> ${sel}</span><span class="hintkeys">Drag to rotate · Right-drag or Shift+drag to move · Scroll to zoom · Click a line to select · <kbd>R</kbd> reset · <kbd>Esc</kbd> clear</span>`;
  }

  const onState = watch(['shapeKey', 'modeIdx', 'entered', 'unit', 'hiEdges', 'triIdx'], render);
  onState(state.get());
  state.subscribe(onState);
}
