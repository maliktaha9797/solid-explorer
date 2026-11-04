// The solid and its surroundings, rebuilt from state whenever the shape, its dimensions, the
// selection, the labels settings or the theme change.
//
// rebuild(s, ctx) clears `model` and `env`, builds the new contents in the order the reference
// does (that order decides draw order where depths tie, so it matters for pixel parity), and
// returns what the other scene modules need:
//   built        buildShape() output: verts, allEdges, diags, tris, ...
//   labelItems   [{ pos, text, cls }, ...] for scene/labels.js, in model space
//   hitMeshes    the invisible tubes picking runs against; userData is { a, b, k }
//   maxDim       twice the largest absolute vertex coordinate
//   camDist      the default camera distance: maxDim * 2 + 2, or further out if that would not
//                show the whole solid (see boundingRadius)
//   floor        the floor's ShaderMaterial (its uPx uniform follows the pixel ratio), or null
//
// Colours come in as THREE.Color objects (readColours() reads them from the CSS tokens), so this
// module needs no DOM and its pure parts run in Node. Geometries and materials are disposed on
// every rebuild. The ground texture is shared across rebuilds and is never disposed here.
import * as THREE from 'three';
import { MODES } from '../modes.js';
import { fmt, nm } from '../format.js';
import { buildShape } from '../shapes/index.js';
import { fanTriangulate, uniqueEdges } from '../shapes/helpers.js';
import { edgeKey } from '../geometry/diagonals.js';

const V = (a) => new THREE.Vector3(a[0], a[1], a[2]);

// Three colours the model uses come from CSS custom properties, which change with the theme. Only
// hex tokens go through THREE.Color.
export function readColours() {
  const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const col = (n) => new THREE.Color(css(n));
  return {
    ink: col('--ink'),
    accent: col('--accent'),
    teal: col('--teal'),
    blue: col('--blue'),
    line: col('--line'),
    line2: col('--line-2'),
  };
}

// The soft shadow under the solid: a radial gradient, black at 0.22 fading to nothing. Make it
// once and share it, because every rebuild uses the same one.
export function createGroundTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d'),
    grd = g.createRadialGradient(128, 128, 10, 128, 128, 128);
  grd.addColorStop(0, 'rgba(0,0,0,0.22)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

// The floor: one grid that reaches the horizon in every view and fades out with distance, so there
// is never an edge. The lines are worked out per pixel from where each point of the floor lies, so
// they stay one pixel wide and do not shimmer. The fine lines are a quarter of the solid's size
// apart, as the old 12-division grid was, and every fourth one is drawn stronger.
const FLOOR_VERT = `
  varying vec2 vLocal;
  varying vec3 vWorld;
  void main() {
    vLocal = position.xz;
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;
const FLOOR_FRAG = `
  uniform vec3 uMinor;
  uniform vec3 uMajor;
  uniform float uStep;
  uniform float uPx;
  uniform float uOpacity;
  varying vec2 vLocal;
  varying vec3 vWorld;

  // 1 on a line, 0 between lines. Lines are about one CSS pixel wide. Where the cells get smaller
  // than a couple of pixels (near the horizon) they fade out instead of shimmering.
  float lines(vec2 p, float step) {
    vec2 c = p / step;
    vec2 w = fwidth(c);
    vec2 g = abs(fract(c - 0.5) - 0.5) / max(w * uPx, vec2(1e-5));
    float line = 1.0 - clamp(min(g.x, g.y) * 1.4 - 0.2, 0.0, 1.0);
    return line * (1.0 - smoothstep(0.15, 0.4, max(w.x, w.y)));
  }

  void main() {
    float fine = lines(vLocal, uStep);
    float coarse = lines(vLocal, uStep * 4.0);
    // distance from the camera, in camera distances (the camera looks at the middle of the solid)
    float far = distance(vWorld, cameraPosition) / length(cameraPosition);
    float a = max(fine, coarse) * uOpacity * (1.0 - smoothstep(2.0, 5.0, far));
    if (a < 0.003) discard;
    gl_FragColor = vec4(mix(uMinor, uMajor, coarse), a);
  }
`;

function floorMesh(maxDim, camDist, colours) {
  // Big enough that the fade ends well inside it, even zoomed all the way out.
  const half = camDist * 16;
  const geometry = new THREE.PlaneGeometry(half * 2, half * 2);
  geometry.rotateX(-Math.PI / 2);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uMinor: { value: colours.line },
      uMajor: { value: colours.line2 },
      uStep: { value: maxDim / 4 },
      uPx: { value: 1 },
      uOpacity: { value: 0.7 },
    },
    vertexShader: FLOOR_VERT,
    fragmentShader: FLOOR_FRAG,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    extensions: { derivatives: true },
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = -1; // behind the faces, whatever the depth sort says
  mesh.frustumCulled = false;
  return mesh;
}

// ---------- Framing (pure) ----------

// The radius of the smallest sphere about the origin that holds the whole solid. The solids are
// centred on the origin, and a cone or cylinder also holds the circle of its base.
export function boundingRadius(built) {
  let r2 = 0;
  for (const p of Object.values(built.verts)) r2 = Math.max(r2, p[0] ** 2 + p[1] ** 2 + p[2] ** 2);
  if (built.curved) r2 = Math.max(r2, built.curved.r ** 2 + (built.curved.h / 2) ** 2);
  return Math.sqrt(r2);
}

// The camera looks through a 36 degree lens, so a sphere of radius R only just fits at a distance of
// R / sin(18 degrees), which is 3.236 R. 3.8 R leaves about a seventh of the view free around that
// sphere, so the corner letters and the status bar at the bottom do not touch the solid. (The
// default cuboid sat at 3.5 R before.)
export const FIT_DISTANCE = 3.8;

// ---------- Label positions (pure; model space) ----------

// Twice the largest absolute coordinate of any vertex.
export function maxDimOf(verts) {
  let maxDim = 0;
  Object.values(verts).forEach((p) =>
    p.forEach((c) => {
      maxDim = Math.max(maxDim, Math.abs(c));
    }),
  );
  return maxDim * 2;
}

// A corner letter sits just outside its vertex, pushed away from the origin. A vertex at the
// origin has no outward direction, so its letter goes along +x.
export function cornerLabelPos(pt, maxDim) {
  const v = V(pt),
    off =
      v.lengthSq() > 1e-6
        ? v
            .clone()
            .normalize()
            .multiplyScalar(maxDim * 0.055)
        : new THREE.Vector3(maxDim * 0.05, 0, 0);
  return v.add(off);
}

// The pill for a selected line sits beside its midpoint, away from the origin (along +y when the
// midpoint is the origin).
export function lengthLabelPos(pa, pb, maxDim) {
  const mid = V(pa).add(V(pb)).multiplyScalar(0.5);
  const off =
    mid.lengthSq() > 1e-6
      ? mid
          .clone()
          .normalize()
          .multiplyScalar(maxDim * 0.07)
      : new THREE.Vector3(0, maxDim * 0.07, 0);
  return mid.add(off);
}

// A dimension label sits beside the midpoint of its line, away from the origin. If the midpoint
// is the origin, or the line runs almost along that direction (the label would sit on the line),
// it goes along +x instead.
export function dimLabelPos(pa, pb, maxDim) {
  const mid = V(pa).add(V(pb)).multiplyScalar(0.5),
    dir = V(pb).sub(V(pa)).normalize();
  const off = mid
    .clone()
    .normalize()
    .multiplyScalar(maxDim * 0.08);
  if (mid.lengthSq() < 1e-6 || Math.abs(dir.dot(off.clone().normalize())) > 0.9)
    off.set(maxDim * 0.08, 0, 0);
  return mid.add(off);
}

// The θ label sits inside the angle at P, 1.5 arc radii along the bisector.
export function thetaLabelPos(P, Q, R, maxDim) {
  const p = V(P),
    a1 = V(Q).sub(p).normalize(),
    a2 = V(R).sub(p).normalize(),
    ar = maxDim * 0.11;
  return p.clone().add(
    a1
      .clone()
      .add(a2)
      .normalize()
      .multiplyScalar(ar * 1.5),
  );
}

// ---------- Geometry helpers ----------

function dispose(obj) {
  obj.traverse?.((c) => {
    c.geometry?.dispose?.();
    if (c.material)
      (Array.isArray(c.material) ? c.material : [c.material]).forEach((m) => m.dispose());
  });
}

function clear(g) {
  while (g.children.length) {
    const o = g.children.pop();
    dispose(o);
  }
}

// Polygon faces, fan-triangulated from each face's first vertex (decisions D-025).
function polyGeometry(verts, faces) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(fanTriangulate(verts, faces), 3));
  g.computeVertexNormals();
  return g;
}

// Curved solids, from the shape's descriptor (decisions D-026).
function curvedGeometry({ kind, r, h }) {
  if (kind === 'cone') return new THREE.ConeGeometry(r, h, 72);
  if (kind === 'cylinder') return new THREE.CylinderGeometry(r, r, h, 72, 1, true);
  throw new Error(`Unknown curved solid: ${kind}`);
}

function lineSeg(a, b, color, dashed, maxDim) {
  const g = new THREE.BufferGeometry().setFromPoints([V(a), V(b)]);
  const m = dashed
    ? new THREE.LineDashedMaterial({ color, dashSize: maxDim * 0.04, gapSize: maxDim * 0.025 })
    : new THREE.LineBasicMaterial({ color });
  const l = new THREE.Line(g, m);
  if (dashed) l.computeLineDistances();
  return l;
}

// A cylinder between two points. With an opacity it is transparent and writes no depth: the hit
// tubes pass 0, so they can be raycast but are never seen.
function tube(a, b, color, radius, opacity) {
  const pa = V(a),
    pb = V(b),
    dir = pb.clone().sub(pa),
    len = dir.length();
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, len, 10),
    new THREE.MeshBasicMaterial({
      color,
      transparent: opacity !== undefined,
      opacity: opacity ?? 1,
      depthWrite: opacity === undefined,
    }),
  );
  mesh.position.copy(pa.clone().add(pb).multiplyScalar(0.5));
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return mesh;
}

function circleLine(y, r, color) {
  const pts = [];
  for (let i = 0; i <= 120; i++) {
    const t = (i / 120) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(t) * r, y, Math.sin(t) * r));
  }
  return new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({ color }),
  );
}

// ---------- Build ----------

// s    the state: shapeKey, dimVals, entered, modeIdx, triIdx, hiEdges, renames, unit, toggles
// ctx  { model, env, colours, groundTex }: the two groups to refill, the theme colours, and the
//      shared ground texture
export function rebuild(s, { model, env, colours, groundTex }) {
  const { shapeKey, dimVals, entered, modeIdx, triIdx, hiEdges, renames, unit, toggles } = s;
  const built = buildShape(shapeKey, dimVals);
  const verts = built.verts;
  clear(model);
  clear(env);
  const labelItems = [],
    hitMeshes = [];

  const maxDim = maxDimOf(verts);
  // The old distance, unless that is too near for the whole solid to show with room to spare (a
  // cube of side 6 used to lose its lower corner).
  const camDist = Math.max(maxDim * 2.0 + 2, FIT_DISTANCE * boundingRadius(built));
  const thick = maxDim * 0.008;
  const { ink, accent, teal, blue } = colours;
  const showFaces = toggles.faces;

  // Environment
  const minY = Math.min(...Object.values(verts).map((p) => p[1]));
  let floor = null;
  if (toggles.grid) {
    const mesh = floorMesh(maxDim, camDist, colours);
    mesh.position.y = minY - maxDim * 0.01;
    env.add(mesh);
    floor = mesh.material;
  }
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(maxDim * 1.6, maxDim * 1.6),
    new THREE.MeshBasicMaterial({ map: groundTex, transparent: true, depthWrite: false }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = minY - maxDim * 0.005;
  env.add(ground);

  // Body
  const faceMat = new THREE.MeshStandardMaterial({
    color: blue,
    transparent: true,
    opacity: showFaces ? 0.14 : 0.0,
    side: THREE.DoubleSide,
    depthWrite: false,
    roughness: 0.6,
  });
  let solidEdges;
  if (built.curved) {
    model.add(new THREE.Mesh(curvedGeometry(built.curved), faceMat));
    (built.circles || []).forEach(([y, r]) => model.add(circleLine(y, r, ink)));
    solidEdges = built.edges || [];
  } else {
    model.add(new THREE.Mesh(polyGeometry(verts, built.faces), faceMat));
    solidEdges = uniqueEdges(built.faces);
  }
  solidEdges.forEach(([a, b]) => model.add(lineSeg(verts[a], verts[b], ink, false, maxDim)));
  (built.dashed || []).forEach(([a, b]) =>
    model.add(lineSeg(verts[a], verts[b], ink, true, maxDim)),
  );

  // Selectable lines: every edge, dashed line and diagonal gets an invisible fat tube to click.
  const dimKeys = new Set(built.dims.map(([a, b]) => edgeKey(a, b)));
  const showDims = toggles.dims;
  built.allEdges.concat(built.diags).forEach(([a, b]) => {
    const k = edgeKey(a, b),
      hit = tube(verts[a], verts[b], 0x000000, maxDim * 0.028, 0);
    hit.userData = { a, b, k };
    model.add(hit);
    hitMeshes.push(hit);
    if (!hiEdges.has(k)) return;
    model.add(tube(verts[a], verts[b], teal, thick * 1.3));
    if (showDims && dimKeys.has(k)) return;
    labelItems.push({
      pos: lengthLabelPos(verts[a], verts[b], maxDim),
      text: `${nm(renames, a)}${nm(renames, b)} = ${fmt(V(verts[a]).distanceTo(V(verts[b])))} ${unit}`,
      cls: 'len',
    });
  });

  // Dimension labels
  if (showDims) {
    const mode = MODES[shapeKey][modeIdx];
    const place = (a, b, text, cls) => {
      labelItems.push({ pos: dimLabelPos(verts[a], verts[b], maxDim), text, cls });
    };
    built.dims.forEach(([a, b, k]) =>
      place(
        a,
        b,
        `${k} = ${fmt(dimVals[k])} ${unit}`,
        'dim ' + (k in entered ? 'given' : 'derived'),
      ),
    );
    (mode.extra || []).forEach(([a, b, k]) => {
      if (!hiEdges.has(edgeKey(a, b))) {
        model.add(lineSeg(verts[a], verts[b], teal, true, maxDim));
        place(a, b, `${k} = ${fmt(entered[k])} ${unit}`, 'dim given');
      }
    });
  }

  // Triangle
  const tri = built.tris[triIdx];
  if (tri) {
    const [P, Q, R] = tri.pts.map((n) => verts[n]);
    const tg = new THREE.BufferGeometry().setFromPoints([V(P), V(Q), V(R)]);
    tg.computeVertexNormals();
    model.add(
      new THREE.Mesh(
        tg,
        new THREE.MeshBasicMaterial({
          color: accent,
          transparent: true,
          opacity: 0.42,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      ),
    );
    model.add(tube(P, Q, accent, thick));
    model.add(tube(Q, R, accent, thick));
    model.add(tube(P, R, accent, thick * 1.4));
    // The right angle at Q
    const q = V(Q),
      u1 = V(P).sub(q).normalize(),
      u2 = V(R).sub(q).normalize(),
      sz = maxDim * 0.06;
    const c1 = q.clone().add(u1.clone().multiplyScalar(sz)),
      c2 = q.clone().add(u2.clone().multiplyScalar(sz)),
      c3 = c1.clone().add(u2.clone().multiplyScalar(sz));
    model.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([c1, c3, c2]),
        new THREE.LineBasicMaterial({ color: accent }),
      ),
    );
    // The arc at P, and θ
    const p = V(P),
      a1 = V(Q).sub(p).normalize(),
      a2 = V(R).sub(p).normalize(),
      ang = a1.angleTo(a2),
      ar = maxDim * 0.11,
      arc = [];
    for (let i = 0; i <= 24; i++) {
      const t = (ang * i) / 24;
      arc.push(
        p.clone().add(
          a1
            .clone()
            .multiplyScalar(Math.sin(ang - t))
            .add(a2.clone().multiplyScalar(Math.sin(t)))
            .divideScalar(Math.sin(ang) || 1)
            .normalize()
            .multiplyScalar(ar),
        ),
      );
    }
    model.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(arc),
        new THREE.LineBasicMaterial({ color: accent }),
      ),
    );
    labelItems.push({ pos: thetaLabelPos(P, Q, R, maxDim), text: 'θ', cls: 'theta' });
  }

  // Corner letters
  if (toggles.labels)
    Object.entries(verts).forEach(([n, pt]) => {
      labelItems.push({
        pos: cornerLabelPos(pt, maxDim),
        text: nm(renames, n),
        cls: tri && tri.pts.includes(n) ? 'hot' : '',
      });
    });

  return { built, labelItems, hitMeshes, maxDim, camDist, floor };
}
