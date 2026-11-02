import { pyramid } from './helpers.js';

// Rectangular pyramid: the shared pyramid with its own dims (length, width, height).
export const rectpyramid = {
  name: 'Rectangular pyramid',
  dims: [
    ['l', 'Base length', 8],
    ['w', 'Base width', 5],
    ['h', 'Height', 6],
  ],
  build({ l, w, h }) {
    return pyramid(l, w, h);
  },
};
