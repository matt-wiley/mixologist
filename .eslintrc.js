module.exports = {
  "extends": [
    "eslint:recommended"
  ],
  "env": {
    "browser": true,
    "es6": true,
    "webextensions": true,
    "node": true,
    "jest": true
  },
  "parserOptions": {
    "ecmaVersion": 2018,
    "sourceType": "module"
  },
  "rules": {
    "no-console": "off",
    "no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "prefer-const": "error",
    "no-var": "error",
  },
  "globals": {
    "browser": "readonly",
    "chrome": "readonly"
  }
};