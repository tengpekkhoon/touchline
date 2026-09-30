// Lint config (ESLint flat config). Game code is plain browser scripts sharing window.FM; tools are Node ES modules.
import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/', 'dist/', 'android/', 'ios/'] },
  js.configs.recommended,
  {
    files: ['js/**/*.js'],
    languageOptions: { sourceType: 'script', globals: { ...globals.browser } },
  },
  { files: ['js/sim-worker.js'], languageOptions: { globals: { ...globals.worker } } },
  { files: ['sw.js'], languageOptions: { sourceType: 'script', globals: { ...globals.serviceworker } } },
  { files: ['tools/**/*.mjs', 'eslint.config.mjs'], languageOptions: { sourceType: 'module', globals: { ...globals.node } } },
  {
    rules: {
      'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none' }],
      'no-empty': ['error', { allowEmptyCatch: true }],
      // House style: `let body = ''` then filled in by each branch; and user-facing errors deliberately replace the cause
      'no-useless-assignment': 'off',
      'preserve-caught-error': 'off',
    },
  },
];
