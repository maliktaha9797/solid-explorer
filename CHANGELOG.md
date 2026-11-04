# Changelog

All notable changes to Solid Explorer are recorded here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- **Working tab, the flattened triangle:** the label on the left side lost its first letters, so
  `CG = 4` showed as `G = 4`. The prototype did the same. The triangle now starts far enough in for
  the whole label to show, whatever the letters and the number are (a corner renamed to two letters
  or a length such as 1234.57 included), and the angle label no longer slips off the left edge of a
  tall, thin triangle. The triangle is a little narrower to make room, about 7 per cent for an
  ordinary one.

## [1.0.0] - 2026-11-04

### Added

- **Solid Explorer, version 1.0.** A teaching tool for Pythagoras' theorem and trigonometry in 3D
  solids, made by porting a single-file prototype into a tested, modular project. Behaviour matches
  the prototype, apart from the entries under Changed and Fixed below.
- **Seven solids** (cuboid, cube, square pyramid, rectangular pyramid, triangular prism, cone and
  cylinder) and **27 "Define by" modes** that set them from the lengths and angles a textbook gives.
- **20 right-angled triangles**, each shaded inside the solid, flattened to 2D, and worked through
  step by step: Pythagoras, then the angle with tan⁻¹, then a check with sin and cos. "Hide answers
  for practice" turns every answer into a question mark.
- **Controls:** rotate with momentum, pan, zoom and pinch, Iso, Front, Top and Right views, hover
  tooltips, keyboard shortcuts, corner letters you can rename, units, and light and dark themes.
- **One self-contained `index.html`** that works when opened from disk with no internet, with the
  Manrope font inlined, and the same app on GitHub Pages.
- **Tests for the maths**, and guides for adding a shape and a "Define by" mode, each with a worked
  example that the tests run so the guide cannot drift from the code.
- **Project files:** README, contributing guide, Code of Conduct, issue forms, a pull request
  template, and GitHub Actions workflows for checks, Pages and Releases.

### Changed

- **No console warning on view changes.** The prototype logged "THREE.Quaternion: Static .slerp() has
  been deprecated" on every frame of an Iso, Front, Top or Right animation. The build calls
  `slerpQuaternions`, which does the same sums, so the camera moves exactly as before and the
  console stays quiet.

### Fixed

- **Rectangular pyramid, "Base and slant edge":** the starting slant edge was 8.73, which made a
  pyramid 7.35 tall. Every other way of defining the rectangular pyramid starts with a height of 6,
  so switching to this one made the solid change shape for no reason. The starting slant edge is now
  7.63, which gives a height of 6 (to within 0.01), so the pyramid stays the same when you switch.
- **Cone, "Radius and angle at the base":** the starting angle was 60.3 degrees, which made a cone
  7.013 tall instead of 7. It is now 60.26 degrees, which gives a height of 7 (to within 0.01).
  Switching between the ways of defining the cone no longer nudges its height.
- **A saved shape that is not one of the seven** now falls back to the cuboid. In the prototype a
  few odd values, such as `"constructor"`, stopped the panel from drawing at all. This can only
  happen if browser storage is edited by hand.
