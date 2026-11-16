// The phone layout lives in CSS and in the page head, so these tests read the files. They check
// that the pieces that make a phone work are still there: a page as wide as the screen, a toolbar
// that wraps, a panel that is a sheet only on a tall screen, and fields big enough for a finger.
// (The real check is in a browser: see "Phones and small screens" in docs/parity-checklist.md.)
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const html = read('index.html');
const css = Object.fromEntries(
  ['layout', 'toolbar', 'panel', 'stage', 'tokens'].map((n) => [n, read(`src/styles/${n}.css`)]),
);

// The text inside every @media block of a file whose query contains `query`.
function media(file, query) {
  const text = css[file];
  const found = [];
  const re = /@media ([^{]+)\{/g;
  let m;
  while ((m = re.exec(text))) {
    if (!m[1].includes(query)) continue;
    let depth = 1,
      i = re.lastIndex;
    while (depth && i < text.length) {
      if (text[i] === '{') depth++;
      else if (text[i] === '}') depth--;
      i++;
    }
    found.push(text.slice(re.lastIndex, i - 1));
  }
  return found.join('\n');
}

describe('the page head', () => {
  const viewport = html.match(/<meta name="viewport" content="([^"]+)"/)[1];

  it('is as wide as the screen, uses all of it round a notch, and shrinks for the keyboard', () => {
    expect(viewport).toContain('width=device-width');
    expect(viewport).toContain('initial-scale=1');
    expect(viewport).toContain('viewport-fit=cover');
    expect(viewport).toContain('interactive-widget=resizes-content');
  });

  it('never stops people zooming the page', () => {
    expect(viewport).not.toMatch(/maximum-scale|user-scalable/);
  });

  it('gives the browser a colour for its own bars, light and dark', () => {
    expect(html).toMatch(/name="theme-color"[^>]*prefers-color-scheme: light/);
    expect(html).toMatch(/name="theme-color"[^>]*prefers-color-scheme: dark/);
  });
});

describe('the page', () => {
  it('is as tall as the screen really is (not the screen with its address bar hidden), and stays inside a notch', () => {
    expect(css.layout).toMatch(/\.app \{[^}]*height: 100dvh/);
    expect(css.layout).toMatch(/\.app \{[^}]*env\(safe-area-inset-left/);
    expect(css.layout).toMatch(/body \{[^}]*overflow: hidden/);
    expect(css.layout).toMatch(/body \{[^}]*overscroll-behavior: none/);
  });

  it('gives the toolbar as many rows as it needs up to 960 px wide', () => {
    expect(media('layout', 'max-width: 960px')).toMatch(/grid-template-rows: auto/);
    expect(media('toolbar', 'max-width: 960px')).toMatch(/\.toolbar \{[^}]*flex-wrap: wrap/);
  });
});

describe('the panel', () => {
  it('is a sheet under the 3D view only on a screen that is narrow and not short', () => {
    expect(media('layout', 'max-width: 860px) and (min-height: 521px')).toMatch(/var\(--sheet\)/);
    // no other query makes a sheet, so a phone held sideways keeps the side panel
    const sheetQueries = [...css.layout.matchAll(/@media ([^{]+)\{[^@]*?var\(--sheet\)/g)].map(
      (m) => m[1],
    );
    expect(sheetQueries.length).toBeGreaterThan(0);
    for (const query of sheetQueries) expect(query).toContain('min-height: 521px');
    expect(media('panel', 'max-width: 860px) and (min-height: 521px')).toMatch(/border-top/);
    expect(media('stage', 'max-width: 860px) and (min-height: 521px')).toMatch(/\.edge-toggle/);
  });

  it('is narrower beside the 3D view on a short screen, and the toolbar is a little lower', () => {
    expect(media('tokens', 'max-height: 520px')).toMatch(/--pw: min\(44vw, 340px\)/);
    expect(media('tokens', 'max-height: 520px')).toMatch(/--tb: 44px/);
  });
});

describe('the toolbar on a phone', () => {
  const phone = media('toolbar', 'max-width: 600px');

  it('puts the shape and the three buttons on the right on the first row, and the rest below', () => {
    expect(phone).toMatch(/\.spacer \+ \.tool-group \{ order: 2/);
    expect(phone).toMatch(/\.tool-group \{ order: 3/);
    expect(phone).toMatch(/select\.shape-select \{ order: 1/);
  });

  it('drops the labels, the title and, on the smallest screens, the drag tool', () => {
    expect(media('toolbar', 'max-width: 960px')).toMatch(/\.tool-group \.tbtn \.txt/);
    expect(media('toolbar', 'max-width: 800px')).toMatch(/\.brand > div:last-child/);
    expect(media('toolbar', 'max-width: 340px')).toMatch(/Drag tool/);
  });
});

describe('touch screens', () => {
  const panel = media('panel', 'pointer: coarse');
  const toolbar = media('toolbar', 'pointer: coarse');

  it('use a text size of 16 px or more in every field, so iOS does not zoom in when one is tapped', () => {
    expect(panel).toMatch(/\.field input \{[^}]*font-size: 16px/);
    expect(panel).toMatch(/select\.mini \{[^}]*font-size: 16px/);
    expect(toolbar).toMatch(/select\.shape-select \{[^}]*font-size: 16px/);
  });

  it('make buttons, tabs and fields big enough for a finger', () => {
    const px = (text, selector, prop) =>
      +new RegExp(`${selector} \\{[^}]*${prop}: (\\d+)px`).exec(text)[1];
    expect(px(toolbar, '\\.tbtn', 'height')).toBeGreaterThanOrEqual(40);
    expect(px(panel, '\\.field input', 'height')).toBeGreaterThanOrEqual(44);
    expect(px(panel, '\\.tab', 'height')).toBeGreaterThanOrEqual(48);
  });

  it('have a bigger area to tap round the panel handle', () => {
    expect(media('stage', 'pointer: coarse')).toMatch(/\.edge-toggle::before/);
  });
});
