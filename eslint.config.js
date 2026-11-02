import js from '@eslint/js';
import globals from 'globals';

export default [
  // .claude/ holds the workflow docs and any nested git worktrees, which carry their own copy of src/.
  { ignores: ['dist/', 'reference/', 'node_modules/', 'coverage/', '.claude/'] },
  js.configs.recommended,
  {
    files: ['src/**/*.js'],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['tests/**/*.js', '*.config.js'],
    languageOptions: { globals: globals.node },
  },
];
