// Working tab: the sheet for the selected triangle. The flattened SVG comes from flat-triangle.js.
// Shows the steps a student would write: Pythagoras, then tan inverse for the angle, then a check
// with sin and cos. With Hide answers on, every answer becomes ?, including inside the square
// root and inside tan inverse.
//
// The Hide answers switch itself is bound in ui/panel.js; this module only reads state.toggles.hide.
//
// State read:    shapeKey, dimVals, triIdx, renames, unit, toggles.hide
import '../styles/panel.css';
import { solveRightTriangle } from '../geometry/solver.js';
import { fmt, deg, nm, tx } from '../format.js';
import { builtFor } from './built.js';
import { flatTriangleSvg } from './flat-triangle.js';
import { watch } from './watch.js';

const $ = (s) => document.querySelector(s);

export function mount(state) {
  function render(s) {
    const el = $('#working');
    const built = builtFor(s);
    const tri = built.tris[s.triIdx];
    if (!tri) {
      el.innerHTML = `<div class="empty"><b>No triangle selected</b>Open the Triangles tab and choose one to see the Pythagoras and trigonometry working here.</div>`;
      return;
    }
    const unit = s.unit;
    const [Pn, Qn, Rn] = tri.pts.map((n) => nm(s.renames, n));
    const { adj, opp, hyp, theta } = solveRightTriangle(
      built.verts[tri.pts[0]],
      built.verts[tri.pts[1]],
      built.verts[tri.pts[2]],
    );
    const hide = s.toggles.hide;
    const A = (t) => (hide ? `<span class="hid">?</span>` : `<span class="ans mono">${t}</span>`);
    const svg = flatTriangleSvg({ Pn, Qn, Rn, adj, opp, hyp, theta, hide });
    el.innerHTML = `<div class="sheet">
      <div class="hd"><b>Triangle ${Pn}${Qn}${Rn}</b><span>Right angle at ${Qn}</span></div>
      <div class="bd">${svg}
        <p class="sub" style="margin:0 0 6px">${tx(s.renames, tri.note)}</p>
        <div class="step"><h4>Pythagoras</h4>
          ${Pn}${Rn}² = ${Pn}${Qn}² + ${Qn}${Rn}²<br>
          ${Pn}${Rn}² = ${fmt(adj)}² + ${fmt(opp)}² = ${A(fmt(adj * adj) + ' + ' + fmt(opp * opp) + ' = ' + fmt(hyp * hyp))}<br>
          ${Pn}${Rn} = √${hide ? '?' : fmt(hyp * hyp)} = ${A(fmt(hyp) + ' ' + unit)}
        </div>
        <div class="step"><h4>Trigonometry, angle θ at ${Pn}</h4>
          opposite ${Qn}${Rn} = ${fmt(opp)}, adjacent ${Pn}${Qn} = ${fmt(adj)}<br>
          tan θ = ${fmt(opp)} ÷ ${fmt(adj)} = ${A(fmt(opp / adj))}<br>
          θ = tan⁻¹(${hide ? '?' : fmt(opp / adj)}) = ${A(deg(theta))}
        </div>
        <div class="step"><h4>Check with sin and cos</h4>
          sin θ = ${fmt(opp)} ÷ ${hide ? '?' : fmt(hyp)} = ${A(fmt(opp / hyp))}<br>
          cos θ = ${fmt(adj)} ÷ ${hide ? '?' : fmt(hyp)} = ${A(fmt(adj / hyp))}
        </div>
      </div></div>`;
  }

  const onState = watch(['shapeKey', 'dimVals', 'triIdx', 'renames', 'unit', 'toggles'], render);
  onState(state.get());
  state.subscribe(onState);
}
