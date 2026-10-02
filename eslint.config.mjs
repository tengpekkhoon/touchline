// Lint config (ESLint flat config). Game code is plain browser scripts sharing window.FM; tools are Node ES modules.
import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/', 'dist/', 'android/', 'ios/', '.devtools/'] },
  js.configs.recommended,
  {
    files: ['js/**/*.js'],
    languageOptions: { sourceType: 'script', globals: { ...globals.browser } },
  },
  { files: ['js/sim-worker.js'], languageOptions: { globals: { ...globals.worker } } },
  { files: ['sw.js'], languageOptions: { sourceType: 'script', globals: { ...globals.serviceworker } } },
  {
    files: ['tools/**/*.mjs', 'eslint.config.mjs'],
    languageOptions: { sourceType: 'module', globals: { ...globals.node } },
  },
  {
    // Seeded runs must only draw from the simulation's generator (ctx.Math.random from tools/harness.mjs)
    files: ['tools/**/*.mjs'],
    rules: {
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message: "Use the simulation's seeded ctx.Math.random (tools/harness.mjs).",
        },
      ],
    },
  },
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
