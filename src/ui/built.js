// The built shape for the current state, shared by the panel modules that need its vertices,
// edges, diagonals and triangles. buildShape() is pure, so the result is cached on the shape key
// and on the identity of dimVals: lengths, triangles, working and status then build it once per
// change, not once each.
import { buildShape } from '../shapes/index.js';

let last = { shapeKey: null, dimVals: null, built: null };

export function builtFor(s) {
  if (last.shapeKey !== s.shapeKey || last.dimVals !== s.dimVals) {
    last = { shapeKey: s.shapeKey, dimVals: s.dimVals, built: buildShape(s.shapeKey, s.dimVals) };
  }
  return last.built;
}

// Distance between two [x, y, z] points, computed as three.js does (Vector3.distanceTo), so the
// rounded lengths match the prototype exactly.
export function dist(p, q) {
  const dx = p[0] - q[0];
  const dy = p[1] - q[1];
  const dz = p[2] - q[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
