// The shape registry. The keys are saved in localStorage as `se:shape`: never rename one.
// Order here is the order of the Shape dropdown.
import { allEdges, diagonals } from '../geometry/diagonals.js';
import { cuboid } from './cuboid.js';
import { cube } from './cube.js';
import { sqpyramid } from './square-pyramid.js';
import { rectpyramid } from './rectangular-pyramid.js';
import { prism } from './triangular-prism.js';
import { cone } from './cone.js';
import { cylinder } from './cylinder.js';

export const SHAPES = { cuboid, cube, sqpyramid, rectpyramid, prism, cone, cylinder };

// Build a shape from its canonical dimensions, plus the two derived line lists the UI and the
// scene both need:
//   allEdges  the solid edges, then the dashed lines
//   diags     every other vertex pair that is not the same point
// For a curved solid the result carries `curved: { kind: 'cone' | 'cylinder', r, h }`.
export function buildShape(shapeKey, dimVals) {
  const built = SHAPES[shapeKey].build(dimVals);
  return { ...built, allEdges: allEdges(built), diags: diagonals(built) };
}
