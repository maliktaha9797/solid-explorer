// Which lines of a built solid can be selected: its edges, its dashed lines and its diagonals.
// Pure functions: no `three`, no DOM.
import { edgeKey, uniqueEdges } from '../shapes/helpers.js';
import { distance } from './solver.js';

// The key a line is selected by, the same whichever way round the two letters are given:
// edgeKey('B', 'A') and edgeKey('A', 'B') are both 'AB'. Defined in shapes/helpers.js (which
// needs it too) and re-exported here.
export { edgeKey };

// Every drawn line a student can select: the solid edges, then the dashed lines.
// Polygon solids derive their edges from the faces. Curved solids list their silhouette edges.
export function allEdges(built) {
  const solid = built.curved ? built.edges || [] : uniqueEdges(built.faces);
  return solid.concat(built.dashed || []);
}

// Every pair of vertices that is not an edge or dashed line, and whose two points are not the
// same point. Pairs come in vertex order (A before B, and so on), which is the order the
// "Diagonals and construction lines" list shows them in.
export function diagonals(built) {
  const { verts } = built;
  const edgeKeys = new Set(allEdges(built).map(([a, b]) => edgeKey(a, b)));
  const names = Object.keys(verts);
  const out = [];
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      const a = names[i],
        b = names[j];
      if (edgeKeys.has(edgeKey(a, b))) continue;
      if (distance(verts[a], verts[b]) < 1e-6) continue;
      out.push([a, b]);
    }
  }
  return out;
}
