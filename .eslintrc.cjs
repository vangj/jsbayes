// .eslintrc.js
module.exports = {
  'env': {
    'browser': true,
    'es2021': true,
  },
  'extends': 'eslint:recommended',
  'parserOptions': {
    'ecmaVersion': 'latest',
    'sourceType': 'module',
  },
  'globals': {
    'module': true,
    'process': true,
  },
  'rules': {
    'indent': [
      'warn',
      2,
    ],
    'linebreak-style': [
      'warn',
      'unix',
    ],
    'quotes': [
      'warn',
      'single',
    ],
    'semi': [
      'warn',
      'always',
    ],
  },
};