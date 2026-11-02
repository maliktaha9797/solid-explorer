// The dimension fields, as pure functions. No DOM and no imports, so they run in plain Node.
// ui/dims.js reads the fields and ui/toolbar.js changes the shape; both use these so that
// entered, dimVals, lastGood and dimError always change together with shapeKey and modeIdx.

// The mode's default values, as { key: default }.
export function defaultsOf(mode) {
  return Object.fromEntries(mode.inputs.map(([k, , d]) => [k, d]));
}

// What the prototype's readDims() works out once it has read the fields.
//   mode      one entry of MODES[shapeKey]
//   values    { key: number } as read from the fields. NaN for a blank or unreadable field, and
//             undefined (or missing) for a field that is not there.
//   lastGood  the last valid canonical dims, or null
// A blank, zero or negative value silently falls back to that input's default, so toCanon only
// ever sees positive numbers. On an error the last valid solid stays, or the mode's own defaults
// if there is none yet. Returns the state patch { entered, dimVals, lastGood, dimError }.
export function resolveDims(mode, values, lastGood) {
  const entered = {};
  mode.inputs.forEach(([k, , def]) => {
    let v = values[k] === undefined ? def : values[k];
    if (!(v > 0)) v = def;
    entered[k] = v;
  });
  const res = mode.toCanon(entered);
  if (res.error) {
    return {
      entered,
      dimVals: lastGood || mode.toCanon(defaultsOf(mode)),
      lastGood,
      dimError: res.error,
    };
  }
  return { entered, dimVals: res, lastGood: res, dimError: null };
}

// The same, for fields that have just been rendered with the mode's defaults in them.
export function freshDims(mode, lastGood) {
  return resolveDims(mode, {}, lastGood);
}
