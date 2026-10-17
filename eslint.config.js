// Strictest practical setup: type-checked strict + stylistic rules, plus size limits.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'out/**', '.showreel/**', 'examples/gallery/*/site/**', 'eslint.config.js'] },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    rules: {
      'max-lines': ['error', { max: 200 }],
      'max-lines-per-function': ['error', { max: 50, skipBlankLines: true, skipComments: true }],
      'no-console': 'error',
      'no-empty': ['error', { allowEmptyCatch: false }],
      eqeqeq: 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/explicit-function-return-type': ['error', { allowExpressions: true }],
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
    },
  },
  {
    // The demo apps: plain browser scripts, linted without type information.
    files: ['examples/**/*.js'],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: {
      ...tseslint.configs.disableTypeChecked.languageOptions,
      sourceType: 'script',
      globals: { window: 'readonly', document: 'readonly', performance: 'readonly', requestAnimationFrame: 'readonly', setTimeout: 'readonly', innerWidth: 'readonly', innerHeight: 'readonly' },
    },
    rules: { ...tseslint.configs.disableTypeChecked.rules, '@typescript-eslint/explicit-function-return-type': 'off' },
  },
  {
    // Plain Node scripts: linted without type information.
    files: ['scripts/**/*.mjs'],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: { ...tseslint.configs.disableTypeChecked.languageOptions, globals: { process: 'readonly' } },
    rules: { ...tseslint.configs.disableTypeChecked.rules, '@typescript-eslint/explicit-function-return-type': 'off' },
  },
);
