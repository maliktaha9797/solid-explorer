# Contributing to Solid Explorer

Thank you for wanting to help. Solid Explorer is a teaching tool, so the people who use it are teachers and students of about fourteen. Most of the rules below come from that.

Everyone taking part is asked to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Ways to help

- **Report a bug.** Use the "Bug report" form when you [open an issue](https://github.com/maliktaha9797/solid-explorer/issues/new/choose). Say which browser and device you used, and what you expected to see.
- **Suggest a shape.** Use the "New shape" form. Say which solid, which lengths a textbook gives for it, and which right-angled triangles a student would look for.
- **Suggest anything else** with the "Feature request" form.
- **Add a shape or a "Define by" mode.** These are the easiest code contributions, because each is plain data with tests. Follow the guides: [adding a shape](docs/adding-a-shape.md) and [adding a "Define by" mode](docs/adding-a-define-by-mode.md).
- **Test in Safari or Firefox, or on a real phone or tablet.** The app has only been tested in Chrome, with emulated touch. Tell us what you find.
- **Improve the words.** Teachers and students read every word on the screen. See "Writing" below.

For anything bigger than a small fix, please open an issue first so we can agree the plan before you spend the time.

## Setting up

You need [Node.js](https://nodejs.org/) 22 or newer. The repository has a `.nvmrc` file, so `nvm use` picks the right version.

```bash
git clone https://github.com/maliktaha9797/solid-explorer.git
cd solid-explorer
npm install
npm run dev
```

| Command           | What it does                                                                                               |
| ----------------- | ---------------------------------------------------------------------------------------------------------- |
| `npm run dev`     | Starts the development server                                                                              |
| `npm run build`   | Makes the single file, `dist/index.html`                                                                   |
| `npm run preview` | Serves the built file                                                                                      |
| `npm test`        | Runs the tests                                                                                             |
| `npm run lint`    | Runs ESLint                                                                                                |
| `npm run format`  | Runs Prettier. `.prettierignore` leaves the stylesheets in `src/styles` and `index.html` alone on purpose. |
| `npm run check`   | Lint, then the tests, then the build. Run this before you open a pull request.                             |

Open `dist/index.html` from your disk (double-click it) before you finish. The single file behaves differently from the development server in ways that matter, and it is the file people download.

## How the code is arranged

```text
src/
  shapes/       one file per solid, plus the registry (pure data)
  modes.js      the "Define by" modes (pure data)
  geometry/     the right-triangle solver and the diagonals (pure)
  format.js     number and letter formatting (pure)
  state.js      the one state object everything subscribes to
  storage.js    the only code that touches localStorage
  persistence.js  which settings are saved
  scene/        the three.js view: renderer, model, labels, views, controls
  ui/           the panel and toolbar, one module for each part
  styles/       the stylesheets and the fonts
  main.js       wires it all together
tests/          Vitest tests, mostly for the maths
docs/           the guides, with their runnable examples in docs/examples/
```

The modules keep to these boundaries:

| Layer                              | May import                                    | Must not                                 |
| ---------------------------------- | --------------------------------------------- | ---------------------------------------- |
| `shapes/`, `modes.js`, `geometry/` | each other                                    | `three`, the DOM                         |
| `scene/`                           | `three`, `state.js`, the shape output         | `ui/`, another module's DOM              |
| `ui/`                              | `state.js`, shape and mode data, `storage.js` | `scene/` internals, another module's DOM |
| `state.js`                         | nothing                                       | the DOM                                  |

Every part of the page and the scene listens to the one state object. No module reaches into another module's page elements.

## Rules that are easy to trip over

These are not matters of taste. Each protects something.

- **No framework, no TypeScript, no CSS preprocessor.** It is vanilla JavaScript with ES modules, on purpose, so that anyone can read all of it.
- **three.js stays at exactly `0.128.0`.** Do not change the version as a side effect of something else. Do not use `OrbitControls` or anything from three.js's `examples` folder. The controls are written by hand.
- **Nothing is loaded from the network at runtime.** No CDN script, no web font link. The single file must work from your disk with no internet.
- **`localStorage` is used only through `src/storage.js`**, and its keys start with `se:`. The saved shape names (`cuboid`, `cube`, `sqpyramid`, `rectpyramid`, `prism`, `cone`, `cylinder`) are permanent, because they are saved in students' browsers.
- **Shapes and modes are pure data and pure functions.** No `three` import and no DOM in `src/shapes`, `src/modes.js` or `src/geometry`. A test reads the files and fails if you slip.
- **In every triangle, the right angle is at `pts[1]` and the angle you are finding is at `pts[0]`.** The Working tab draws and calculates on that basis. A test checks every triangle.
- **Write vertex letters in square brackets** in titles and notes, such as `[AB]`, so that renamed corners are followed.
- **Do not change a default, a colour, a label position or a shortcut** unless that is the point of your change.

## Writing

Words on the screen, in the README and in the docs follow `.claude/skills/teaching-copy.md`. The short version:

- Short sentences, one idea in each.
- **British spelling:** centre, metre, colour.
- **No em dashes, anywhere.** Use a comma, a full stop or a colon. The same goes for en dashes.
- Name lines by their letters and say what they are: "Slant height VM", not "the slant".
- An error message says what must be true: "The slant height must be longer than the radius." It does not say what went wrong.
- Read it aloud as if to a fourteen-year-old.

## Tests

The tests are in `tests/` and run with `npm test`. Most check the maths without a browser. When you change a shape, a mode or the solver, change the tests with it. The guides say which tests to touch.

A bug fix should come with a test that fails without the fix, where the bug is in the maths.

## Commits and pull requests

- Write commit messages as [Conventional Commits](https://www.conventionalcommits.org/): `feat(shapes): add frustum`, `fix(modes): correct a default`, `docs: explain the controls`.
- Keep a pull request to one thing.
- Fill in the pull request template. It asks which items of the parity checklist your change touches. The checklist is [`.claude/skills/parity-checklist.md`](https://github.com/maliktaha9797/solid-explorer/blob/main/.claude/skills/parity-checklist.md). Run those items by hand, in the browser, on `npm run dev` and on `dist/index.html` from your disk, and write down what you saw. Green means you saw it working.
- Add a line to `CHANGELOG.md` under **Unreleased**, in the style of [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
- `npm run check` must pass. The same checks run on every pull request.

## The `.claude` folder

The `.claude/` folder holds the project's notes, written for working with [Claude Code](https://claude.com/claude-code): decisions, the parity checklist and its results, and the guides it follows. You do not need it, and you do not need Claude Code, to contribute. Some of it is useful reading, especially the parity checklist and the decisions log (`.claude/context/decisions.md`), which explains why things are the way they are.

## Licence

By contributing, you agree that your work is released under the [MIT licence](LICENSE), like the rest of the project.
