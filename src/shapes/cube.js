import { cuboid } from './cuboid.js';

// Cube: a cuboid with equal sides, with the dimension label moved to the one edge shown.
export const cube = {
  name: 'Cube',
  dims: [['a', 'Side', 6]],
  build({ a }) {
    const r = cuboid.build({ l: a, w: a, h: a });
    r.dims = [['A', 'B', 'a']];
    return r;
  },
};
