// Number and text formatting shared by the UI and the scene. Pure functions: no `three`, no DOM.
// Copied exactly from the reference, where they are globals.

// A length as shown to the student: rounded to two decimals, with no trailing zeros.
// fmt(5) is '5', fmt(2.5) is '2.5', fmt(3.14159) is '3.14'.
export const fmt = (v) => {
  const r = Math.round(v * 100) / 100;
  return Number.isInteger(r) ? String(r) : r.toFixed(2).replace(/0$/, '');
};

// Radians as degrees, formatted like a length, with the degree sign.
export const deg = (rad) => fmt((rad * 180) / Math.PI) + '°';

// The letter a corner is shown as: the student's chosen letter, or the original if none.
// `renames` is the state's { A: 'P', ... } object.
export const nm = (renames, name) => renames[name] || name;

// Text with vertex letters in brackets, as the student should read it. Each [AB] token has its
// letters renamed one by one and loses its brackets: with { A: 'P' }, 'Space diagonal [AG]'
// becomes 'Space diagonal PG'.
export const tx = (renames, text) =>
  (text || '').replace(/\[([A-Z]+)\]/g, (_, l) =>
    l
      .split('')
      .map((n) => nm(renames, n))
      .join(''),
  );
