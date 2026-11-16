// Where the scene draws, in CSS pixels.
//
// three.js multiplies the numbers given to setViewport and setScissor by the renderer's pixel
// ratio itself. So these must stay in CSS pixels: never read them from canvas.width, and never
// multiply them by the pixel ratio. (The prototype did both, which drew the whole scene twice as
// big, and shifted, on a display with a pixel ratio of 2.)

// The axis gizmo sits in the bottom-right corner, above the 30 px status bar.
export const GIZMO_SIZE = 84,
  GIZMO_PAD = 14,
  STATUS_BAR = 30;

// The camera's vertical field of view is 36 degrees. A stage that is taller than it is wide (a phone
// held upright, or the panel folded away on one) would show less of the solid sideways than it
// does a screen that is wider than tall, and cut it off. Below an aspect ratio of 1, the lens is
// widened so that the width it shows stays what it is at 1.
export const FOV = 36;
export function fovFor(aspect) {
  if (!(aspect > 0) || aspect >= 1) return FOV;
  const half = (FOV / 2) * (Math.PI / 180);
  return (2 * Math.atan(Math.tan(half) / aspect) * 180) / Math.PI;
}

// [x, y, width, height], with y counted up from the bottom edge of the canvas.
export const mainViewport = (w, h) => [0, 0, w, h];
export const gizmoViewport = (w) => [
  w - GIZMO_SIZE - GIZMO_PAD,
  STATUS_BAR + GIZMO_PAD,
  GIZMO_SIZE,
  GIZMO_SIZE,
];
