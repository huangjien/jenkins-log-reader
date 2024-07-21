// {
//   "root": true,
//   "parser": "@typescript-eslint/parser",
//   "parserOptions": {
//     "ecmaVersion": 6,
//     "sourceType": "module"
//   },
//   "plugins": ["@typescript-eslint"],
//   "rules": {
//     "@typescript-eslint/naming-convention": [
//       "warn",
//       {
//         "selector": "import",
//         "format": ["camelCase", "PascalCase"]
//       }
//     ],
//     "@typescript-eslint/semi": "warn",
//     "curly": "warn",
//     "eqeqeq": "warn",
//     "no-throw-literal": "warn",
//     "semi": "off"
//   },
//   "ignorePatterns": ["out", "dist", "**/*.d.ts"]
// }

module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 12,
    sourceType: 'module',
  },
  plugins: [
    'react',
    '@typescript-eslint',
  ],
  rules: {
    // Your custom rules
  },
};

