// Corner letters section: one small field per vertex, and Reset letters.
//
// Typing a letter writes state.renames, which every other module reads through nm() and tx().
// The fields are rendered only when the shape changes (a new shape has other vertices, and a shape
// change has already cleared the renames), so a field keeps its focus while the student types.
//
// State read:    shapeKey, renames
// State written: renames
import '../styles/panel.css';
import { SHAPES } from '../shapes/index.js';

const $ = (s) => document.querySelector(s);

export function mount(state) {
  const el = $('#names');
  let shownShape = null;

  // Vertex letters come from building the shape at its default dimensions, so they do not depend
  // on what the student has typed.
  function renderInputs(s) {
    shownShape = s.shapeKey;
    el.innerHTML = '';
    const defaults = Object.fromEntries(SHAPES[s.shapeKey].dims.map(([k, , d]) => [k, d]));
    Object.keys(SHAPES[s.shapeKey].build(defaults).verts).forEach((n) => {
      const f = document.createElement('div');
      f.className = 'field';
      f.innerHTML = `<label for="nm-${n}">${n}</label><input id="nm-${n}" maxlength="2" placeholder="${n}" value="${s.renames[n] || ''}" autocomplete="off">`;
      f.querySelector('input').addEventListener('input', (e) => {
        const v = e.target.value.trim().toUpperCase();
        const renames = { ...state.get().renames };
        if (v) renames[n] = v;
        else delete renames[n];
        state.set({ renames });
      });
      el.appendChild(f);
    });
  }

  $('#resetNames').addEventListener('click', () => {
    state.set({ renames: {} });
    renderInputs(state.get());
  });

  renderInputs(state.get());
  state.subscribe((s) => {
    if (s.shapeKey !== shownShape) renderInputs(s);
  });
}
