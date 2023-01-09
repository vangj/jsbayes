import pkg from './package.json';
import resolve from '@rollup/plugin-node-resolve';
import eslint from '@rollup/plugin-eslint'; 
//import json from '@rollup/plugin-json';

export default [
  {
    input: 'integration-test/test.js',
    output: {
      format: 'es',
      name: pkg.name,
      file: 'integration-test/test_roll.js',
    },
    plugins: [
      resolve(), // so Rollup can find external modules
      eslint({ 
        exclude: ['./node_modules/**', './src/style/**'], 
        fix: true,
      }),
    ],
  }
];
