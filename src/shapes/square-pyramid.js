import { pyramid } from './helpers.js';

// Square pyramid: the shared pyramid with l = w = b, labelling one base edge and the height.
export const sqpyramid = {
  name: 'Square pyramid',
  dims: [
    ['b', 'Base side', 6],
    ['h', 'Height', 7],
  ],
  build({ b, h }) {
    const r = pyramid(b, b, h);
    r.dims = [
      ['A', 'B', 'b'],
      ['V', 'O', 'h'],
    ];
    return r;
  },
};
