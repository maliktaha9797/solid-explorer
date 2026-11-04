// Where the scene draws. three.js multiplies the sizes given to setViewport and setScissor by the
// pixel ratio, so they must be in CSS pixels. The prototype passed sizes read from canvas.width
// and multiplied by the pixel ratio, so on a 2x display the scene came out twice as big and shifted
// to the top right, and the axis gizmo was drawn off the screen. These tests keep that from coming back.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  GIZMO_PAD,
  GIZMO_SIZE,
  STATUS_BAR,
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
