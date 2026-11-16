// Where the scene draws. three.js multiplies the sizes given to setViewport and setScissor by the
// pixel ratio, so they must be in CSS pixels. The prototype passed sizes read from canvas.width
// and multiplied by the pixel ratio, so on a 2x display the scene came out twice as big and shifted
// to the top right, and the axis gizmo was drawn off the screen. These tests keep that from coming back.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  FOV,
  GIZMO_PAD,
  GIZMO_SIZE,
  STATUS_BAR,
  fovFor,
  gizmoViewport,
  mainViewport,
} from '../src/scene/layout.js';

describe('the viewports are in CSS pixels', () => {
  it('the main view fills the stage', () => {
    expect(mainViewport(900, 748)).toEqual([0, 0, 900, 748]);
  });

  it('the gizmo is 84 px square, 14 px from the right edge and 14 px above the 30 px status bar', () => {
    expect(GIZMO_SIZE).toBe(84);
    expect(gizmoViewport(900)).toEqual([900 - 84 - 14, 30 + 14, 84, 84]);
    expect(gizmoViewport(1135)).toEqual([1037, 44, 84, 84]); // the numbers the prototype used at 1x
  });

  it('the gizmo always lies inside a stage that is wide enough for it', () => {
    for (const w of [200, 390, 927, 1280, 2560]) {
      const [x, y, gw, gh] = gizmoViewport(w);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x + gw).toBeLessThanOrEqual(w - GIZMO_PAD);
      expect(y).toBe(STATUS_BAR + GIZMO_PAD);
      expect(gh).toBe(gw);
    }
  });
});

describe('the lens follows the shape of the stage', () => {
  const tanHalf = (deg) => Math.tan((deg / 2) * (Math.PI / 180));

  it('is 36 degrees on a stage that is as wide as it is tall, or wider', () => {
    expect(FOV).toBe(36);
    for (const aspect of [1, 1.13, 1.6, 2.5, 4]) expect(fovFor(aspect)).toBe(36);
  });

  it('is wider on a tall stage, so the solid is not cut off at the sides', () => {
    for (const aspect of [0.9, 0.7, 0.53, 0.3]) {
      expect(fovFor(aspect)).toBeGreaterThan(36);
      expect(fovFor(aspect)).toBeLessThan(180);
      // the width it shows is the width it shows at an aspect ratio of 1
      expect(tanHalf(fovFor(aspect)) * aspect).toBeCloseTo(tanHalf(36), 10);
    }
  });

  it('changes smoothly at an aspect ratio of 1', () => {
    expect(fovFor(0.999)).toBeCloseTo(36, 1);
  });

  it('keeps to 36 for a stage with no size yet', () => {
    for (const aspect of [0, NaN, -1, undefined]) expect(fovFor(aspect)).toBe(36);
  });
});

describe('renderer.js hands three.js CSS pixels', () => {
  const src = readFileSync(new URL('../src/scene/renderer.js', import.meta.url), 'utf8')
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n');

  it('never reads a size from canvas.width or canvas.height for a viewport or scissor', () => {
    const calls = src.match(/set(Viewport|Scissor)\([^;]*\)/g) ?? [];
    expect(calls.length).toBeGreaterThanOrEqual(3);
    for (const call of calls)
      expect(call).not.toMatch(/canvas\.|getPixelRatio|devicePixelRatio|\bpr\b/);
  });

  it('takes the viewports from layout.js', () => {
    expect(src).toMatch(/setViewport\(\.\.\.mainViewport\(/);
    expect(src).toMatch(/setScissor\(\.\.\.gizmoViewport\(/);
    expect(src).toMatch(/setViewport\(\.\.\.gizmoViewport\(/);
  });
});
