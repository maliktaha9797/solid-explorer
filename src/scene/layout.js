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

// [x, y, width, height], with y counted up from the bottom edge of the canvas.
export const mainViewport = (w, h) => [0, 0, w, h];
export const gizmoViewport = (w) => [
  w - GIZMO_SIZE - GIZMO_PAD,
  STATUS_BAR + GIZMO_PAD,
  GIZMO_SIZE,
  GIZMO_SIZE,
];
