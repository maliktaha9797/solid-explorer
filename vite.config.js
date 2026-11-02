import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
  build: {
    // Inline fonts and images as data URIs so dist/index.html is one self-contained file.
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    chunkSizeWarningLimit: 4000,
  },
  // The maths is pure, so tests run in plain Node.
  test: { environment: 'node' },
});
