import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';

export default tseslint.config({
  extends: [
    js.configs.recommended,
    ...tseslint.configs.recommended,
    eslintPluginPrettierRecommended,
  ],
  files: ['**/*.{ts,tsx}'],
  ignores: ['dist', 'node_modules'],
  languageOptions: {
    ecmaVersion: 2020,
    globals: globals.browser,
  },
  plugins: {
    // "react-hooks": reactHooks,
    // "react-refresh": reactRefresh,
  },
  rules: {
    'prettier/prettier': 'warn',
    'arrow-body-style': 'off',
    'prefer-arrow-callback': 'off',
    'no-unused-vars': 0,
    '@typescript-eslint/no-explicit-any': ['off'],
    'explicit-module-boundary-types': 0,
    'no-non-null-assertion': 0,
    'no-non-null-asserted-optional-chain': 0,
  },
});
