# Changelog

All notable changes to Solid Explorer are recorded here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- **Rectangular pyramid, "Base and slant edge":** the starting slant edge was 8.73, which made a
  pyramid 7.35 tall. Every other way of defining the rectangular pyramid starts with a height of 6,
  so switching to this one made the solid change shape for no reason. The starting slant edge is now
  7.63, which gives a height of 6 (to within 0.01), so the pyramid stays the same when you switch.
- **Cone, "Radius and angle at the base":** the starting angle was 60.3 degrees, which made a cone
  7.013 tall instead of 7. It is now 60.26 degrees, which gives a height of 7 (to within 0.01).
  Switching between the ways of defining the cone no longer nudges its height.
