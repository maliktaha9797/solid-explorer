// The flattened triangle on the Working sheet, as a pure string builder (no DOM).
// The right angle sits at the bottom left (the triangle's second point, called Q), the angle of
// interest theta at the bottom right (P), and R at the top left. Side labels carry the renamed
// letters, and the hypotenuse shows ? when answers are hidden.
import { fmt } from '../format.js';

// Pn, Qn, Rn  the letters of pts[0], pts[1], pts[2], already renamed
// adj, opp, hyp, theta  from the solver (theta in radians)
// hide  true to show ? for the hypotenuse
export function flatTriangleSvg({ Pn, Qn, Rn, adj, opp, hyp, theta, hide }) {
  const W = 320,
    H = 200,
    pad = 40,
    sc = Math.min((W - 2 * pad) / adj, (H - 2 * pad) / opp);
  const qx = pad,
    qy = H - pad,
    px = qx + adj * sc,
    ry = qy - opp * sc;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Flattened triangle ${Pn}${Qn}${Rn}">
      <polygon points="${px},${qy} ${qx},${qy} ${qx},${ry}" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round"/>
      <polyline points="${qx + 14},${qy} ${qx + 14},${qy - 14} ${qx},${qy - 14}" fill="none" stroke="var(--accent)" stroke-width="1.5"/>
      <path d="M ${px - 26} ${qy} A 26 26 0 0 0 ${px - 26 * Math.cos(theta)} ${qy - 26 * Math.sin(theta)}" fill="none" stroke="var(--accent)" stroke-width="1.5"/>
      <text x="${px - 42}" y="${qy - 9}" font-size="14" font-style="italic" font-family="Georgia,serif" fill="var(--accent)">θ</text>
      <text x="${qx - 10}" y="${qy + 18}" font-size="14" font-weight="800" fill="var(--ink)">${Qn}</text>
      <text x="${px + 4}" y="${qy + 18}" font-size="14" font-weight="800" fill="var(--ink)">${Pn}</text>
      <text x="${qx - 10}" y="${ry - 8}" font-size="14" font-weight="800" fill="var(--ink)">${Rn}</text>
      <text x="${(qx + px) / 2}" y="${qy + 32}" font-size="12.5" font-weight="700" text-anchor="middle" fill="var(--teal)">${Pn}${Qn} = ${fmt(adj)}</text>
      <text x="${qx - 8}" y="${(qy + ry) / 2 + 4}" font-size="12.5" font-weight="700" text-anchor="end" fill="var(--teal)">${Qn}${Rn} = ${fmt(opp)}</text>
      <text x="${(qx + px) / 2 + 14}" y="${(qy + ry) / 2 - 10}" font-size="12.5" font-weight="800" fill="var(--accent)">${Pn}${Rn} = ${hide ? '?' : fmt(hyp)}</text>
    </svg>`;
}
