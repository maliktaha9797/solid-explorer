// The model builder and its label positions. Runs in Node: three's geometry classes need no WebGL,
// and rebuild() takes its colours and ground texture as arguments, so it needs no DOM either.
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { MODES } from '../src/modes.js';
import { createState } from '../src/state.js';
import { freshDims } from '../src/ui/dims-model.js';
import {
  boundingRadius,
  cornerLabelPos,
  dimLabelPos,
  FIT_DISTANCE,
  lengthLabelPos,
  maxDimOf,
  rebuild,
  thetaLabelPos,
} from '../src/scene/model.js';

const colours = {
  ink: new THREE.Color('#0f1b2d'),
  accent: new THREE.Color('#ee7a1c'),
  teal: new THREE.Color('#0d9b96'),
  blue: new THREE.Color('#3b7dd8'),
  line: new THREE.Color('#d8e0ea'),
  line2: new THREE.Color('#c1ccd9'),
};

// A state the way the UI leaves it after mount: the shape at its mode's default dimensions.
function stateFor(shapeKey = 'cuboid', modeIdx = 0, patch = {}) {
  const base = createState({ shapeKey, modeIdx, ...freshDims(MODES[shapeKey][modeIdx], null) });
  return { ...base.get(), ...patch };
}

function build(s, groups = null) {
  const g = groups || { model: new THREE.Group(), env: new THREE.Group() };
  const out = rebuild(s, { ...g, colours, groundTex: new THREE.Texture() });
  return { ...g, ...out };
}

const close = (a, b) => a.forEach((v, i) => expect(v).toBeCloseTo(b[i], 10));

describe('label positions', () => {
  it('maxDimOf is twice the largest absolute coordinate', () => {
    expect(maxDimOf({ A: [-4, -2, 2.5], B: [4, 3, -1] })).toBe(8);
    expect(maxDimOf({ A: [0, -3.5, 0], B: [0, 3.5, 0] })).toBe(7);
  });

  it('a corner letter sits 0.055 maxDim outward from its vertex', () => {
    const p = cornerLabelPos([3, 4, 0], 10);
    close(p.toArray(), [3 + 0.6 * 0.55, 4 + 0.8 * 0.55, 0]);
  });

  it('a corner letter at the origin goes along +x by 0.05 maxDim', () => {
    close(cornerLabelPos([0, 0, 0], 10).toArray(), [0.5, 0, 0]);
  });

  it('a length pill sits 0.07 maxDim outward from the midpoint', () => {
    // midpoint (0, 3, 4), outward unit (0, 0.6, 0.8)
    const p = lengthLabelPos([0, 3, 0], [0, 3, 8], 10);
    close(p.toArray(), [0, 3 + 0.6 * 0.7, 4 + 0.8 * 0.7]);
  });

  it('a length pill at the origin goes along +y instead', () => {
    close(lengthLabelPos([-2, 0, 0], [2, 0, 0], 10).toArray(), [0, 0.7, 0]);
  });

  it('a dimension label sits 0.08 maxDim outward from the midpoint', () => {
    // The line runs along x, the midpoint (0, 3, 4) is outward along (0, 0.6, 0.8): not parallel.
    const p = dimLabelPos([-2, 3, 4], [2, 3, 4], 10);
    close(p.toArray(), [0, 3 + 0.6 * 0.8, 4 + 0.8 * 0.8]);
  });

  it('a dimension label goes along +x when the midpoint is the origin', () => {
    close(dimLabelPos([0, -3, 0], [0, 3, 0], 10).toArray(), [0.8, 0, 0]);
  });

  it('a dimension label goes along +x when the line runs along the outward direction', () => {
    // midpoint (2, 2, 0), direction (1, 1, 0): parallel to the outward direction, so |dot| > 0.9.
    close(dimLabelPos([1, 1, 0], [3, 3, 0], 10).toArray(), [2 + 0.8, 2, 0]);
    // Just under the 0.9 limit it stays outward: direction (1, 0, 0) against outward (0.6, 0.8, 0).
    const p = dimLabelPos([1, 4, 0], [5, 4, 0], 10); // midpoint (3, 4, 0), dot = 0.6
    close(p.toArray(), [3 + 0.6 * 0.8, 4 + 0.8 * 0.8, 0]);
  });

  it('θ sits 1.5 arc radii from the corner along the bisector', () => {
    // P at the origin, 3-4-5 triangle: a1 = (1, 0, 0), a2 = (0.6, 0.8, 0).
    const p = thetaLabelPos([0, 0, 0], [3, 0, 0], [3, 4, 0], 10);
    const len = Math.hypot(1.6, 0.8);
    close(p.toArray(), [(1.6 / len) * 1.65, (0.8 / len) * 1.65, 0]); // ar = 0.11 * 10, times 1.5
  });
});

describe('framing: the default camera distance', () => {
  const SIN_HALF_LENS = Math.sin((18 * Math.PI) / 180); // the lens is 36 degrees

  it('boundingRadius is the distance to the furthest corner, or the rim of a curved base', () => {
    expect(boundingRadius({ verts: { A: [3, 4, 0], B: [-1, 0, 0] } })).toBe(5);
    expect(
      boundingRadius({
        verts: { A: [0, 3.5, 0], B: [4, -3.5, 0] },
        curved: { kind: 'cone', r: 4, h: 7 },
      }),
    ).toBeCloseTo(Math.hypot(4, 3.5), 12);
    // a curved solid whose rim is wider than any listed vertex
    expect(
      boundingRadius({ verts: { V: [0, 3, 0] }, curved: { kind: 'cylinder', r: 5, h: 6 } }),
    ).toBeCloseTo(Math.hypot(5, 3), 12);
  });

  it('the default cuboid starts a little further out than it used to (18)', () => {
    const r = build(stateFor('cuboid'));
    expect(r.camDist).toBeGreaterThan(18);
    expect(r.camDist).toBeLessThan(18 * 1.1);
    expect(r.camDist).toBeCloseTo(FIT_DISTANCE * boundingRadius(r.built), 9);
  });

  it('every solid in every mode, at its default size, fits inside the lens with room to spare', () => {
    for (const shapeKey of Object.keys(MODES)) {
      MODES[shapeKey].forEach((_, modeIdx) => {
        const r = build(stateFor(shapeKey, modeIdx));
        const radius = boundingRadius(r.built);
        expect(radius / r.camDist, `${shapeKey} mode ${modeIdx}`).toBeLessThan(SIN_HALF_LENS * 0.9);
        // and never nearer than the old distance
        expect(r.camDist, `${shapeKey} mode ${modeIdx}`).toBeGreaterThanOrEqual(r.maxDim * 2 + 2);
        expect(r.camDist).toBeGreaterThanOrEqual(FIT_DISTANCE * radius - 1e-9);
      });
    }
  });

  it('the cube, which used to lose its lower corner, is now framed like the other solids', () => {
    const r = build(stateFor('cube'));
    expect(r.camDist).toBeGreaterThan(r.maxDim * 2 + 2); // 14 before
    expect(boundingRadius(r.built) / r.camDist).toBeLessThan(SIN_HALF_LENS);
  });

  it('a large solid is framed the same way (the distance follows its size)', () => {
    const small = build(stateFor('cuboid'));
    const big = build(stateFor('cuboid', 0, { dimVals: { l: 800, w: 500, h: 400 } }));
    expect(big.camDist / small.camDist).toBeGreaterThan(90);
    expect(boundingRadius(big.built) / big.camDist).toBeLessThan(SIN_HALF_LENS);
  });
});

describe('rebuild: what is built', () => {
  it('the default cuboid has 12 edges, 16 diagonals, 3 dimension labels and 8 corner letters', () => {
    const r = build(stateFor('cuboid'));
    expect(r.hitMeshes).toHaveLength(12 + 16);
    expect(r.labelItems.filter((l) => l.cls.startsWith('dim'))).toHaveLength(3);
    expect(r.labelItems.filter((l) => l.cls === '')).toHaveLength(8);
    expect(r.labelItems).toHaveLength(11);
    expect(r.maxDim).toBe(8);
    expect(r.camDist).toBeGreaterThan(18); // fitted to the solid, see the framing tests
  });

  it('hit tubes are invisible but raycastable: opacity 0, transparent, no depth write, visible', () => {
    const r = build(stateFor('cuboid'));
    r.hitMeshes.forEach((m) => {
      expect(m.material.opacity).toBe(0);
      expect(m.material.transparent).toBe(true);
      expect(m.material.depthWrite).toBe(false);
      expect(m.visible).toBe(true);
      expect(m.geometry.parameters.radiusTop).toBeCloseTo(8 * 0.028, 12);
      expect(r.model.children).toContain(m);
    });
    expect(r.hitMeshes[0].userData).toEqual({ a: 'A', b: 'D', k: 'AD' });
  });

  it('the cone is a closed cone and the cylinder an open tube, 72 segments each', () => {
    const cone = build(stateFor('cone')).model.children[0].geometry;
    expect(cone).toBeInstanceOf(THREE.ConeGeometry);
    expect(cone.parameters).toMatchObject({
      radius: 4,
      height: 7,
      radialSegments: 72,
      openEnded: false,
    });
    const cyl = build(stateFor('cylinder')).model.children[0].geometry;
    expect(cyl).toBeInstanceOf(THREE.CylinderGeometry);
    expect(cyl.parameters).toMatchObject({
      radiusTop: 3,
      radiusBottom: 3,
      height: 8,
      radialSegments: 72,
      heightSegments: 1,
      openEnded: true,
    });
  });

  it('polygon bodies are fan-triangulated: a cuboid has 6 quads, so 12 triangles', () => {
    const geo = build(stateFor('cuboid')).model.children[0].geometry;
    expect(geo.getAttribute('position').count).toBe(36);
    expect(geo.getAttribute('normal')).toBeDefined();
  });

  it('the face material is transparent blue at 0.14, or fully transparent with faces off', () => {
    const on = build(stateFor('cuboid')).model.children[0].material;
    expect(on.opacity).toBe(0.14);
    expect(on.transparent).toBe(true);
    expect(on.depthWrite).toBe(false);
    expect(on.side).toBe(THREE.DoubleSide);
    expect(on.roughness).toBe(0.6);
    const off = build(stateFor('cuboid', 0, { toggles: { ...stateFor().toggles, faces: false } }));
    expect(off.model.children[0].material.opacity).toBe(0);
  });

  it('the floor is built unless Ground grid is off, and the ground shadow always is', () => {
    const on = build(stateFor('cuboid'));
    expect(on.env.children).toHaveLength(2);
    const floor = on.env.children[0];
    expect(floor).toBeInstanceOf(THREE.Mesh);
    expect(floor.material).toBeInstanceOf(THREE.ShaderMaterial);
    expect(on.floor).toBe(floor.material);
    expect(floor.material.uniforms.uOpacity.value).toBe(0.7);
    expect(floor.position.y).toBeCloseTo(-2 - 8 * 0.01, 12);
    expect(on.env.children[1].position.y).toBeCloseTo(-2 - 8 * 0.005, 12);
    const off = build(stateFor('cuboid', 0, { toggles: { ...stateFor().toggles, grid: false } }));
    expect(off.env.children).toHaveLength(1);
    expect(off.env.children[0].geometry).toBeInstanceOf(THREE.PlaneGeometry);
    expect(off.floor).toBeNull();
  });

  it('the floor is one grid that reaches the horizon: fine lines a quarter of maxDim apart, and so wide that it fades out long before its edge', () => {
    const r = build(stateFor('cuboid'));
    const floor = r.env.children[0];
    expect(r.floor.uniforms.uStep.value).toBe(8 / 4); // the old 12-division grid on 3 maxDim
    expect(r.floor.transparent).toBe(true);
    expect(r.floor.depthWrite).toBe(false);
    expect(r.floor.extensions.derivatives).toBe(true); // the lines are anti-aliased with fwidth
    expect(floor.renderOrder).toBeLessThan(0); // drawn before the faces
    floor.geometry.computeBoundingBox();
    const half = floor.geometry.boundingBox.max.x;
    // the floor fades out between 2 and 5 camera distances, and the camera can sit 3 times further out
    expect(half).toBeGreaterThanOrEqual(r.camDist * 3 * 5);
    // it lies flat (all of it at one height)
    expect(floor.geometry.boundingBox.min.y).toBeCloseTo(0, 9);
    expect(floor.geometry.boundingBox.max.y).toBeCloseTo(0, 9);
  });

  it('dashed lines are real dashes: they carry line distances', () => {
    const r = build(stateFor('cone'));
    const dashed = r.model.children.filter((c) => c.material instanceof THREE.LineDashedMaterial);
    expect(dashed).toHaveLength(2);
    dashed.forEach((l) => {
      expect(l.material.dashSize).toBeCloseTo(r.maxDim * 0.04, 12);
      expect(l.material.gapSize).toBeCloseTo(r.maxDim * 0.025, 12);
      expect(l.geometry.getAttribute('lineDistance')).toBeDefined();
    });
  });
});

describe('rebuild: labels', () => {
  it('a typed dimension is given and a worked-out one is derived', () => {
    const r = build(stateFor('cuboid', 1)); // Length, width, space diagonal: height is derived
    const byText = Object.fromEntries(r.labelItems.map((l) => [l.text.split(' ')[0], l.cls]));
    expect(byText.l).toBe('dim given');
    expect(byText.w).toBe('dim given');
    expect(byText.h).toBe('dim derived');
  });

  it('a mode extra line is drawn dashed teal and labelled with the entered value', () => {
    const r = build(stateFor('cuboid', 1));
    const extra = r.labelItems.find((l) => l.text.startsWith('d ='));
    expect(extra).toMatchObject({ text: 'd = 10.25 cm', cls: 'dim given' });
    const teal = r.model.children.filter(
      (c) =>
        c.material instanceof THREE.LineDashedMaterial && c.material.color.equals(colours.teal),
    );
    expect(teal).toHaveLength(1);
  });

  it('selecting the extra line replaces its dashes and label with a tube and a pill', () => {
    const r = build(stateFor('cuboid', 1, { hiEdges: new Set(['AG']) }));
    expect(r.labelItems.find((l) => l.text.startsWith('d ='))).toBeUndefined();
    const pill = r.labelItems.find((l) => l.cls === 'len');
    expect(pill.text).toMatch(/^AG = 10\.25 cm$/);
    expect(
      r.model.children.filter(
        (c) =>
          c.material instanceof THREE.LineDashedMaterial && c.material.color.equals(colours.teal),
      ),
    ).toHaveLength(0);
  });

  it('a selected line gets a teal tube and a pill, unless a dimension label already covers it', () => {
    const covered = build(stateFor('cuboid', 0, { hiEdges: new Set(['AB']) }));
    expect(covered.labelItems.filter((l) => l.cls === 'len')).toHaveLength(0);
    const tubes = covered.model.children.filter(
      (c) => c.material.color?.equals(colours.teal) && c.geometry instanceof THREE.CylinderGeometry,
    );
    expect(tubes).toHaveLength(1);
    expect(tubes[0].geometry.parameters.radiusTop).toBeCloseTo(8 * 0.008 * 1.3, 12);

    const alsoCovered = build(stateFor('cuboid', 0, { hiEdges: new Set(['BC']) }));
    expect(alsoCovered.labelItems.filter((l) => l.cls === 'len')).toHaveLength(0); // BC carries w
    const diag = build(stateFor('cuboid', 0, { hiEdges: new Set(['AC']) }));
    expect(diag.labelItems.find((l) => l.cls === 'len').text).toBe('AC = 9.43 cm');

    const noDims = build(
      stateFor('cuboid', 0, {
        hiEdges: new Set(['AB']),
        toggles: { ...stateFor().toggles, dims: false },
      }),
    );
    // The edge is listed as [B, A] (the order the faces traverse it), and the pill follows that order.
    expect(noDims.labelItems.find((l) => l.cls === 'len').text).toBe('BA = 8 cm');
  });

  it('the Dimension labels switch removes dimension labels and the extra lines', () => {
    const r = build(stateFor('cuboid', 1, { toggles: { ...stateFor().toggles, dims: false } }));
    expect(r.labelItems.filter((l) => l.cls.startsWith('dim'))).toHaveLength(0);
    expect(r.model.children.some((c) => c.material instanceof THREE.LineDashedMaterial)).toBe(
      false,
    );
  });

  it('the Corner letters switch removes the letters', () => {
    const r = build(stateFor('cuboid', 0, { toggles: { ...stateFor().toggles, labels: false } }));
    expect(r.labelItems.filter((l) => l.cls === '')).toHaveLength(0);
    expect(r.labelItems).toHaveLength(3);
  });

  it('renamed letters appear on corners, pills and the unit follows the state', () => {
    const r = build(
      stateFor('cuboid', 0, { renames: { A: 'P', G: 'ZZ' }, hiEdges: new Set(['AG']), unit: 'mm' }),
    );
    expect(r.labelItems.filter((l) => l.cls === '').map((l) => l.text)).toContain('ZZ');
    expect(r.labelItems.find((l) => l.cls === 'len').text).toMatch(/^PZZ = 10\.25 mm$/);
    expect(r.labelItems.find((l) => l.text.startsWith('l ='))?.text).toBe('l = 8 mm');
  });

  it('a selected triangle adds its shading, three tubes, the marker, the arc, θ and hot corners', () => {
    const plain = build(stateFor('cuboid'));
    const r = build(stateFor('cuboid', 0, { triIdx: 1 }));
    expect(r.model.children.length - plain.model.children.length).toBe(1 + 3 + 2);
    expect(r.labelItems.filter((l) => l.cls === 'theta')).toHaveLength(1);
    const hot = r.labelItems.filter((l) => l.cls === 'hot').map((l) => l.text);
    expect(hot).toHaveLength(3);
    const shade = r.model.children.find(
      (c) => c.material instanceof THREE.MeshBasicMaterial && c.material.opacity === 0.42,
    );
    expect(shade.material.color.equals(colours.accent)).toBe(true);
    expect(shade.material.side).toBe(THREE.DoubleSide);
  });

  it('θ is placed at pts[0] and the hot corners are the triangle vertices', () => {
    const r = build(stateFor('prism', 0, { triIdx: 1 }));
    const [P, Q, R] = r.built.tris[1].pts;
    const v = r.built.verts;
    const theta = r.labelItems.find((l) => l.cls === 'theta');
    expect(theta.text).toBe('θ');
    expect(theta.pos.toArray()).toEqual(thetaLabelPos(v[P], v[Q], v[R], r.maxDim).toArray());
    expect(
      r.labelItems
        .filter((l) => l.cls === 'hot')
        .map((l) => l.text)
        .sort(),
    ).toEqual([P, Q, R].sort());
  });
});

describe('rebuild: lifecycle', () => {
  it('clears the old model and disposes its geometries and materials, but not the shared texture', () => {
    const groups = { model: new THREE.Group(), env: new THREE.Group() };
    const groundTex = new THREE.Texture();
    let texDisposed = 0;
    groundTex.addEventListener('dispose', () => texDisposed++);

    const s = stateFor('cuboid', 0, { hiEdges: new Set(['AB', 'AC']), triIdx: 0 });
    const first = rebuild(s, { ...groups, colours, groundTex });
    const old = [...groups.model.children, ...groups.env.children];
    let geoDisposed = 0,
      matDisposed = 0;
    old.forEach((o) => {
      o.geometry.addEventListener('dispose', () => geoDisposed++);
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
        m.addEventListener('dispose', () => matDisposed++),
      );
    });
    expect(first.hitMeshes.length).toBeGreaterThan(0);

    const second = rebuild(stateFor('cone'), { ...groups, colours, groundTex });
    expect(geoDisposed).toBe(old.length);
    expect(matDisposed).toBe(old.length);
    expect(texDisposed).toBe(0);
    // Nothing from the first build is left in the groups.
    old.forEach((o) => {
      expect(groups.model.children).not.toContain(o);
      expect(groups.env.children).not.toContain(o);
    });
    expect(second.hitMeshes.every((m) => groups.model.children.includes(m))).toBe(true);
  });

  it('the child count does not grow over many rebuilds', () => {
    const groups = { model: new THREE.Group(), env: new THREE.Group() };
    const s = stateFor('prism', 0, { hiEdges: new Set(['AB']), triIdx: 2 });
    rebuild(s, { ...groups, colours, groundTex: null });
    const n = groups.model.children.length + groups.env.children.length;
    for (let i = 0; i < 50; i++) rebuild(s, { ...groups, colours, groundTex: null });
    expect(groups.model.children.length + groups.env.children.length).toBe(n);
  });

  it('builds every shape in every Define by mode without throwing', () => {
    for (const shapeKey of Object.keys(MODES)) {
      MODES[shapeKey].forEach((_, modeIdx) => {
        const built = build(stateFor(shapeKey, modeIdx));
        expect(built.hitMeshes.length).toBeGreaterThan(0);
        expect(Number.isFinite(built.camDist)).toBe(true);
        built.labelItems.forEach((l) => expect(l.pos.toArray().every(Number.isFinite)).toBe(true));
      });
    }
  });
});
