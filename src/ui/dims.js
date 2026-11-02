// Dimensions section: the Define by select, the input fields, the Units select and the red message.
//
// This module turns what is typed into state. It reads the fields on every keystroke and writes
// entered, dimVals, lastGood and dimError in one set() (the prototype's readDims). The fields
// themselves are rendered only when the shape or the mode changes, so a field keeps its focus and
// caret while the student types. A change of unit only rewrites the unit suffixes.
//
// Mount this first. It fills entered and dimVals from the current mode's defaults at mount, and
// everything that reads the built shape needs them.
//
// State read:    shapeKey, modeIdx, unit, lastGood, dimError
// State written: modeIdx, entered, dimVals, lastGood, dimError, unit
import '../styles/panel.css';
import '../styles/stage.css'; // .err, the red message
import { MODES } from '../modes.js';
import { freshDims, resolveDims } from './dims-model.js';
import { watch } from './watch.js';

const $ = (s) => document.querySelector(s);

export function mount(state) {
  const modeSel = $('#modeSel');
  const unitSel = $('#unitSel');
  const dimsEl = $('#dims');
  const errEl = $('#dimErr');
  // What the fields on screen were rendered for.
  const shown = { shapeKey: null, modeIdx: null, unit: null };

  // Read the fields, work out the canonical dims, and put the result in state.
  function commit() {
    const s = state.get();
    const mode = MODES[s.shapeKey][s.modeIdx];
    const values = {};
    mode.inputs.forEach(([k]) => {
      const el = document.getElementById('dim-' + k);
      values[k] = el ? parseFloat(el.value) : undefined;
    });
    state.set(resolveDims(mode, values, s.lastGood));
  }

  function renderInputs(s) {
    shown.shapeKey = s.shapeKey;
    shown.modeIdx = s.modeIdx;
    shown.unit = s.unit;
    modeSel.innerHTML = '';
    MODES[s.shapeKey].forEach((m, i) => {
      const o = document.createElement('option');
      o.value = i;
      o.textContent = m.name;
      modeSel.appendChild(o);
    });
    modeSel.value = s.modeIdx;
    dimsEl.innerHTML = '';
    MODES[s.shapeKey][s.modeIdx].inputs.forEach(([k, label, def]) => {
      const isAngle = label.includes('°');
      const f = document.createElement('div');
      f.className = 'field';
      f.innerHTML = `<label for="dim-${k}">${label.replace(' (°)', '')} <span style="color:var(--ink-3)">(${k})</span></label><div class="inwrap"><input id="dim-${k}" type="number" min="0.1" step="${isAngle ? 1 : 0.5}" value="${def}" inputmode="decimal"><span class="unit">${isAngle ? '°' : s.unit}</span></div>`;
      f.querySelector('input').addEventListener('input', commit);
      dimsEl.appendChild(f);
    });
  }

  // Changing the mode keeps the selected lengths and triangle and renders the new mode's defaults.
  modeSel.addEventListener('change', () => {
    const s = state.get();
    const modeIdx = +modeSel.value;
    state.set({ modeIdx, ...freshDims(MODES[s.shapeKey][modeIdx], s.lastGood) });
  });
  unitSel.addEventListener('change', () => state.set({ unit: unitSel.value }));

  function render(s) {
    if (s.shapeKey !== shown.shapeKey || s.modeIdx !== shown.modeIdx) {
      renderInputs(s);
    } else if (s.unit !== shown.unit) {
      shown.unit = s.unit;
      dimsEl.querySelectorAll('.unit').forEach((u) => {
        if (u.textContent !== '°') u.textContent = s.unit;
      });
    }
    if (unitSel.value !== s.unit) unitSel.value = s.unit;
    // The message text is left in place when it hides, as in the prototype.
    if (s.dimError) {
      errEl.textContent = s.dimError;
      errEl.classList.add('show');
    } else {
      errEl.classList.remove('show');
    }
  }

  renderInputs(state.get());
  commit();
  const onState = watch(['shapeKey', 'modeIdx', 'unit', 'dimError'], render);
  onState(state.get());
  state.subscribe(onState);
}
