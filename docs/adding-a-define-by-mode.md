# Adding a "Define by" mode

The Shape tab has a **Define by** menu. Each entry in it is a _mode_: one way of describing a solid. A cone can be defined by its radius and height, or by its radius and slant height, and so on. Whatever the student types, the mode turns it into the shape's _canonical_ dimensions (the ones the shape itself is built from), or says why there is no such solid.

This page adds one mode from start to finish: a cone defined by its **diameter and slant height**. A textbook question often gives exactly those two lengths, and the cone does not have that mode yet. The cone's other five modes stay as they are.

The code on this page is real. `tests/docs-examples.test.js` runs it, and fails if the code in this page and the code in `docs/examples/cone-diameter-slant.js` ever differ. The mode is not in the app: the example lives in `docs/examples/` so that the app is unchanged. To add a mode for real, the steps are the same.

## What a mode is

A mode is a plain object in `src/modes.js`. It holds data and one pure function. It never imports three.js and never touches the page.

| Part                          | What it does                                                                                                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`                        | Shown in the Define by menu. Must be unique within the shape.                                                                                                             |
| `inputs`                      | `[key, label, default]` for each field. A `°` in the label marks an angle: the field then shows `°` instead of the unit and steps by 1 (other fields step by 0.5).        |
| `extra`                       | Optional. `[a, b, inputKey]` for an input that is not one of the shape's labelled lines. The line from `a` to `b` is drawn dashed teal with the number the student typed. |
| `toCanon(values)`             | Returns the shape's canonical dimensions as an object, or `{ error: 'message' }`.                                                                                         |
| `needGT(big, small, message)` | A helper already in `src/modes.js`. Returns `{ error: message }` when `big <= small` and `null` otherwise. It is strict: equal is an error.                               |

To check more than one thing, chain the checks with `||`. The first one that fails wins, and if none fails the next part gives the dimensions.

The app does a few things for you, so `toCanon` can stay simple:

- A field that is blank, zero, negative or not a number is quietly replaced by that input's default before `toCanon` runs. So `toCanon` only ever sees positive numbers.
- If `toCanon` returns an error, the red message shows under the fields and the last good solid stays on screen. If there was no good solid yet, the mode's own defaults are used.
- Changing the mode keeps the selected lengths and the selected triangle. It fills the fields with the new mode's defaults.

The first mode of every shape is the _canonical_ mode. Its input keys are the shape's own dimension keys, and it returns them unchanged. Every other mode, like the one below, maps to those keys.

## Step 1: Write the sums

The cone is built from a radius `r` and a height `h`. The new mode is given a diameter `d` and a slant height `l`.

The radius, the height and the slant height of a cone make a right-angled triangle, so Pythagoras gives:

- `r = d ÷ 2`
- `h = √(l² − r²)`

Now list every input that has no solution. The square root needs `l² − r²` to be more than zero, so the slant height must be longer than the radius. If `l` equals `r` the cone is flat, and if `l` is shorter there is no cone at all. That is one check.

## Step 2: Write the error message

Say what must be true, not what went wrong, as one full sentence with a full stop:

> The slant height must be longer than the radius.

This is the same sentence the cone's "Radius and slant height" mode uses, because it is the same rule. See `.claude/skills/teaching-copy.md` for the voice rules.

## Step 3: Decide what needs an `extra` line

The cone labels two lines: the radius `OP` and the height `VO`. The slant height `VP` is a real edge of the cone that is not labelled, so it gets an `extra` entry: `['V', 'P', 'l']`. The student then sees "l = 8.06 cm" on that edge, in the solid style that means "you typed this".

The diameter is not a line the cone draws, so it gets no `extra` line. The existing "Diameter and height" mode does the same.

Check that your `extra` letters are real vertices of the shape. The tests do.

## Step 4: Work out the defaults

Never type defaults from memory. Every mode's defaults must describe the same solid as the canonical mode's defaults, to within 0.01. Start from the canonical defaults (cone: `r = 4`, `h = 7`) and work forwards:

- `d = 2 × 4 = 8`
- `l = √(4² + 7²) = √65 = 8.0623…`, which is **8.06** to two decimal places

Then check by working backwards from the rounded numbers: `h = √(8.06² − 4²) = 6.9974…`, which is within 0.01 of 7. Two decimal places are usually enough. If they are not, use more, as the cone's angle mode does (it needs 60.26).

## Step 5: Write the mode

<!-- docs-example: docs/examples/cone-diameter-slant.js -->

```js
// A new "Define by" mode for the cone: diameter and slant height.
//
// This is the worked example in docs/adding-a-define-by-mode.md. It is not part of the app. In the
// app this object goes at the end of the MODES.cone list in src/modes.js, where sq, rt and needGT
// already exist. They are repeated here so that this file can run on its own.

const sq = (x) => x * x,
  rt = Math.sqrt;
// Strict: equal is an error too. Chain with || so the first failing check wins.
const needGT = (big, small, msg) => (big <= small ? { error: msg } : null);

export const coneDiameterSlant = {
  name: 'Diameter and slant height',
  inputs: [
    ['d', 'Diameter', 8],
    ['l', 'Slant height VP', 8.06],
  ],
  extra: [['V', 'P', 'l']],
  toCanon: (v) =>
    needGT(v.l, v.d / 2, 'The slant height must be longer than the radius.') || {
      r: v.d / 2,
      h: rt(sq(v.l) - sq(v.d / 2)),
    },
};
```

Two things to notice:

- The input keys are `d` and `l`. Neither is a canonical dimension of the cone (`r` and `h`). That matters: a label on the model is shown as "typed" when its key is one the student entered. If you reused `r` for something that is not the radius, the radius label would be wrong.
- The label `Slant height VP` names the line by its original letters. Field labels do not follow renamed corners in any mode. Triangle titles and notes do, and the shape guide explains how.

## Step 6: Put it in the list

In `src/modes.js`, paste the object (without the comments and helpers above it) at the **end** of the `cone` array. Put it at the end so that the other modes keep their positions: several tests refer to a mode by its number.

The Define by menu shows modes in list order, so this one appears last.

## Step 7: Update the tests

The existing tests already cover every mode on their own: the shape of the inputs, that the `extra` lines are real, that the defaults match the canonical ones within 0.01, and that no input ever gives `NaN` or a message that is not a full sentence. A new mode is picked up automatically. You add the cases that are specific to your mode, in `tests/modes.test.js`.

**The names and the count.** In `EXPECTED_NAMES`, add `'Diameter and slant height'` at the end of the `cone` list. Change the test that says there are exactly 27 modes to say 28.

**The boundary row.** In `BOUNDARIES`, add one row. Equal is an error, and a hair above is a solid:

<!-- docs-check: boundary-row -->

```js
  {
    where: 'cone "Diameter and slant height"',
    shapeKey: 'cone',
    idx: 5,
    error: 'The slant height must be longer than the radius.',
    bad: [
      { d: 8, l: 4 },
      { d: 8, l: 3 },
    ],
    good: { d: 8, l: 4.5 },
    expected: { r: 4, h: Math.sqrt(20.25 - 16) },
  },
```

The good row works out as `h = √(4.5² − 4²) = 2.06`: a short, wide cone.

**A hand-checked number.** In the "hand-checked numbers" list, add a row whose answer you can do in your head. A diameter of 6 and a slant height of 5 make a 3-4-5 triangle:

<!-- docs-check: hand-checked-row -->

```js
['cone', 5, { d: 6, l: 5 }, { r: 3, h: 4 }, '3-4-5, from the diameter'],
```

If you forget the boundary row, the test called "covers every mode that has a needGT or other validation" fails and tells you which mode is missing.

`tests/reference-parity.test.js` compares the modes with the original prototype and fails on any new mode by design. Before your first new mode or shape, retire it or turn it into a snapshot. See decision D-021 in `.claude/context/decisions.md`.

## Step 8: Look at it in the app

```bash
npm run dev
```

Choose **Cone**, then **Define by**, then **Diameter and slant height**. You should see:

- A Diameter field showing 8 and a Slant height VP field showing 8.06.
- The same cone as before, with the same height of 7. The labels for the radius and height are dashed, which means "worked out".
- A teal label "l = 8.06 cm" on the slant edge.

Now type 4 into the slant height. The red message appears and the cone stays as it was. Type 4.5 and the cone gets short and wide.

Finally, run `npm run check`, and run the parts of the parity checklist (`.claude/skills/parity-checklist.md`) that mention shapes, modes and selection.

## Modes that take an angle

Put `°` in the label, for example `'Angle between slant and base (°)'`. The field then shows `°` and steps by 1. Reject both ends:

```js
v.t <= 0 || v.t >= 90 ? { error: 'The angle must be between 0° and 90°.' } : {/* the dimensions */};
```

The cone's "Radius and angle at the base" and the square pyramid's "Base and face angle" are the examples to copy. Angle defaults often need more decimal places to stay within 0.01.

## Modes that work in two steps

Sometimes a mode finds a middle value first. "Slant height and slant edge" on the square pyramid finds the base from the two lengths, then checks that the pyramid can stand. Check each step, return its own message, and return the first one that fails. The pyramid's mode in `src/modes.js` shows how.

## Common mistakes

| Mistake                                                        | What goes wrong                                         | Do this instead                                                           |
| -------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------- |
| Defaults typed from memory                                     | The solid jumps when you switch modes, and a test fails | Work them out from the canonical defaults and round                       |
| `<` where `<=` is needed                                       | Equal gives a zero or imaginary result                  | `needGT` is strict. Use it                                                |
| "Invalid input."                                               | A 14-year-old does not know what to change              | Say what must be true: "The slant height must be longer than the radius." |
| No `extra` line for an input that is a real edge               | The number the student typed does not show on the model | Add `[a, b, key]`                                                         |
| An input key that is also a canonical key with another meaning | The label is wrongly shown as typed                     | Use a different key                                                       |
| `Math.sqrt` of a number that could be negative                 | `NaN` reaches the renderer                              | Check first, with `needGT`                                                |

## Finishing off

- Add a line under **Added** in `CHANGELOG.md`.
- If the README quotes how many modes there are, update it.
- Check that no sentence you wrote has an em dash, and that the spelling is British.
