# Parity checklist

This is the list of behaviours Solid Explorer must keep. It was used to check that this version behaves like the original single-file prototype, which is kept unchanged in `reference/solid-explorer.html`.

Use it when a change could alter what a student sees or does: a new shape, a new "Define by" mode, a change to the controls, or anything in `src/scene/` or `src/ui/`. The pull request template asks you to list the items you ran.

## How to run it

Run each item your change could affect on **both** builds:

- the development server (`npm run dev`), and
- the single file, `dist/index.html`, opened from your disk by double-clicking it (`npm run build` makes it).

Do it at desktop width and at 390 pixels wide. For anything in the 3D view, also do it on a display with a pixel ratio of 2: on a Retina Mac, or in Chrome's DevTools with the device pixel ratio set to 2. Open `reference/solid-explorer.html` beside it when you want to compare, remembering that the changelog lists where this version differs on purpose.

An item is green only if you saw it working. "Not run" is a fair answer. Write it down instead of ticking the box. The releases so far were checked in Chrome only, with emulated touch, and from 1.0.2 on a pixel ratio of 1 and an emulated pixel ratio of 2. Safari, Firefox, a real Retina screen and real touch devices have not been checked, so a report from any of them is welcome.

If you find a behaviour that is not on this list and matters, add it here in the same pull request.

## Shapes and dimensions

- [ ] All 7 shapes render with the right vertex letters, edges, dashed construction lines, and circles for the cone and cylinder
- [ ] Every "Define by" mode exists for each shape with its name, inputs, defaults and error messages
- [ ] The defaults of every mode make the same solid as the first mode's defaults (within 0.01)
- [ ] Invalid inputs show the red message and keep the last valid shape
- [ ] Typed values show solid teal labels. Values the app works out show dashed labels. A mode's extra lines are drawn dashed teal with the entered value
- [ ] The units select changes all the labels, and angle inputs keep the degree sign
- [ ] Changing shape resets the mode, the selections and the renamed corners

## Selection

- [ ] Nothing is selected on load
- [ ] Edge chips, diagonal chips and clicking a line on the model all toggle the same selection
- [ ] The hover tooltip shows `AB = x unit` on desktop, and the cursor changes to a pointer
- [ ] Selected lengths draw as teal tubes with a pill label, unless a dimension label already covers that edge
- [ ] A triangle card shades the triangle, draws the right-angle marker at `pts[1]`, draws the arc and θ at `pts[0]`, and switches to the Working tab. Selecting it again deselects it
- [ ] The Clear button and Esc clear everything, and the tab badges update

## Working panel

- [ ] The flattened triangle has its right angle at the bottom left, θ at the correct vertex, and side labels
- [ ] Every label of the flattened triangle shows in full, the one on the left side included: `CG = 4`, not `G = 4`. Try a corner renamed to two letters and a long number such as 1234.57. This is a deliberate difference from the prototype, which cut the left label off
- [ ] The Pythagoras, tan⁻¹, and sin and cos check lines show the right numbers. Spot-check a cuboid with l = 3 and w = 4: AC = 5
- [ ] Hide answers turns every answer into a `?`, including the ones inside √ and tan⁻¹
- [ ] Renaming corners changes the titles, notes, chips, labels, flattened triangle and working

## View and controls

- [ ] Left-drag rotates with momentum. Right-drag, Shift and drag, the Pan tool and a two-finger drag all move the solid. Pinch and the wheel zoom. Double-click resets the view
- [ ] Iso, Front, Top and Right animate, and Reset re-centres the pan and zoom
- [ ] Keys: 1 to 4 for the views, R to reset, Esc to clear, `]` to toggle the panel, `+` and `-` to zoom. The keys do nothing while you are typing in a box
- [ ] The axis gizmo turns with the model and sits above the status bar
- [ ] The floor is one 3D grid that goes all the way round the solid and fades out towards the horizon, in all four views, and there is no flat grid in the page behind it. The Ground grid switch removes the floor only. The soft shadow under the model stays. The Transparent faces switch fades the faces in and out

## Page and saved settings

- [ ] The panel collapses from the edge handle, the toolbar button and the key, and its state survives a reload
- [ ] The arrow on the edge handle points at the edge when the panel is open and out into the page when it is closed. On a phone-width screen it points down when the sheet is open and up when it is closed
- [ ] The theme toggle works, follows the device when nothing is saved, and is remembered
- [ ] The shape and unit are remembered
- [ ] On a phone-width screen the panel becomes a sheet at the bottom, its handle moves to the top edge, and the legend and key hints are hidden
- [ ] The single file makes no network requests (check the Network tab in DevTools)
- [ ] There are no console errors

## More behaviours of the prototype

- [ ] A blank, zero or negative dimension falls back to that input's default. No error is shown and the shape stays valid
- [ ] Typing in a dimension field does not lose focus or move the caret (the inputs are not redrawn on each keystroke)
- [ ] Changing the Define by mode keeps the selected lengths and the selected triangle and shows the new mode's defaults. Changing shape clears the selections, the renamed corners and the last valid solid
- [ ] Changing units updates the labels and the unit suffixes without resetting typed values
- [ ] Only the shape, unit, panel state and theme are remembered (the `localStorage` keys `se:shape`, `se:unit`, `se:panel` and `se:theme`). The mode, the dimensions and the display switches are not. An unknown saved shape falls back to the cuboid
- [ ] Choosing a view button shows it pressed, and rotating by hand clears the pressed state
- [ ] Zoom stays between 0.35 times and 3 times the default distance. The wheel and pinch stop at both ends. The zoom buttons and the `+`, `=` and `-` keys stop at one end each: zoom in only floors, zoom out only caps
- [ ] The theme toggle and a change of the device's colour scheme recolour the 3D scene (lines, grid, faces), not just the panel
- [ ] Clicking near a line, not exactly on it, still selects it
- [ ] Right-clicking the canvas shows no browser menu
- [ ] Triangle titles and notes show the renamed letters without square brackets
- [ ] The status bar shows the shape, the size (entered values joined by ×, with ° on angles) and the number selected
- [ ] Hide answers also turns the hypotenuse label inside the flattened triangle into `?`
- [ ] The theme button flips whatever is showing, including the device setting when no choice has been saved
- [ ] Selecting a triangle that is already selected deselects it and stays on the current tab. It does not jump to Working

## The scene

- [ ] The zoom is kept when the model is rebuilt without a new shape or size: selecting or deselecting a line or a triangle, Esc, any display switch including Hide answers, the units, a renamed corner, and the theme. Another shape, or a new size typed into a dimension, puts the camera back to the default distance. Rotation and pan are always kept. (The prototype put the zoom back every time.)
- [ ] On a display with a pixel ratio of 2 the 3D view is the same picture as at 1 but sharper: the solid lines up with its corner letters and labels, it opens in the middle of the view, and the axis arrows show in the bottom right corner
- [ ] Every solid opens fully in view, with room round it, in light and dark and with the panel open and closed. A very large solid, such as a cuboid 1000 by 600 by 400, is drawn too
- [ ] The hover tooltip and the pick cursor appear for a mouse only, not for touch or a pen. The tooltip hides when a press starts and when the pointer leaves the canvas
- [ ] A drag that starts on the canvas and leaves it keeps rotating until you let go
- [ ] A slow drag leaves no momentum. A quick flick keeps spinning and slows to a stop. A new press stops it
- [ ] A press on the canvas stops a view animation that is running
- [ ] A drag that starts on a line and moves more than 4 pixels rotates and does not select. A wobble of 3 pixels still selects
- [ ] Two fingers pinch and pan at the same time

## Saved settings and the console

- [ ] The first load writes `se:shape`, `se:panel` and `se:theme` (as `null`) and no `se:unit`. The unit is written only when it is changed. Compare with the prototype after the same actions
- [ ] A saved shape that cannot be used (an unknown name such as `frustum`, corrupt JSON, a number) falls back to the cuboid and the page works. Hand-edited values that the prototype mishandles are a deliberate difference: `["cone"]` gives a cone in the prototype and a cuboid here, and `"constructor"` makes the prototype throw while this version shows a cuboid
- [ ] Odd saved values for the unit, panel and theme behave as in the prototype, which is a kept quirk: an unknown unit leaves the unit select blank, a saved panel value that is not a boolean leaves the panel open, and an unknown theme name is copied to `data-theme`
- [ ] Collapsing the panel by any route (toolbar button, edge handle, `]`, `[`) writes `se:panel`, reopening writes it again, and a click on a tab while the panel is collapsed reopens it
- [ ] The console shows no message of any level in the single file. The prototype logs a `THREE.Quaternion: Static .slerp()` deprecation warning on every frame of a view animation, and this version must not
- [ ] At 390 pixels wide the page is 927 pixels wide, the toolbar runs off the right edge, and the edge handle sits at x = 427, outside the view. That is how the prototype behaves, so this version matches it until a fix is agreed
- [ ] The toolbar view buttons, Reset and the zoom buttons move the camera in the real app. They reach the scene through closures in `main.js`, so check them on the real page, not on a test harness
- [ ] No leaks: the geometry and texture counts return to the same values on every revisit of a shape, 200 input events add none, and a 3-second rotate notifies subscribers once. The app does not expose its renderer, so this needs a throwaway hook that reads the counts

## Common mistakes

| Mistake                                 | Why it is wrong                     | Do this instead                    |
| --------------------------------------- | ----------------------------------- | ---------------------------------- |
| Ticking an item from reading code       | Green means you saw it working      | Run it and write down what you saw |
| Only the development server             | The download is the single file     | Run both builds                    |
| Skipping 390 pixels wide                | Phones and small windows are in use | Run both widths                    |
| Writing "pass" when you did not run     | It hides the risk                   | Write "not run"                    |
| Finding a new behaviour, saying nothing | The next person misses it           | Add it to this list                |
