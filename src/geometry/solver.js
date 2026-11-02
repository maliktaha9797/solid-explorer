// Distance and the right-triangle solver. Pure functions on [x, y, z] arrays: no `three`, no DOM.

// Straight-line distance between two points. Same arithmetic as three's Vector3.distanceTo, so
// lengths agree with the reference to the last bit.
export function distance(p, q) {
  const dx = p[0] - q[0],
    dy = p[1] - q[1],
    dz = p[2] - q[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// Solve a right-angled triangle given as three points, using the rule that every triangle entry
// in a shape follows: the right angle is at Q (pts[1]) and the angle of interest, theta, is at P
// (pts[0]).
//   adj   = |PQ|   the side next to theta
//   opp   = |QR|   the side opposite theta
//   hyp   = |PR|   the longest side
//   theta = atan2(opp, adj), in radians
export function solveRightTriangle(P, Q, R) {
  const adj = distance(P, Q),
    opp = distance(Q, R),
    hyp = distance(P, R),
    theta = Math.atan2(opp, adj);
  return { adj, opp, hyp, theta };
}
