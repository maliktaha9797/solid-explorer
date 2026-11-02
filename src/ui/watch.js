// Re-render only when something a module draws has changed.
//
// state.set() notifies every subscriber on every write, and some writes are frequent and of no
// interest to the panel (the scene writes `view` when the student rotates by hand). Each module
// lists the state keys it draws, and the wrapped render runs on the first call and then only when
// one of those values has a new identity. State values are replaced, never mutated, so comparing
// by reference is enough.
//
//   const onState = watch(['shapeKey', 'hiEdges'], render);
//   onState(state.get());       // first draw
//   state.subscribe(onState);   // later draws, only when needed
export function watch(keys, render) {
  let last = null;
  return (s) => {
    const next = keys.map((k) => s[k]);
    if (last && next.every((v, i) => v === last[i])) return;
    last = next;
    render(s);
  };
}
