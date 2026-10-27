// SPDX-FileCopyrightText: SUSE LLC
// SPDX-License-Identifier: Apache-2.0

'use strict'

const neostandard = require('neostandard')

module.exports = [
  {
    ignores: ['build/**', 'public/**', 'node_modules/**'],
  },
  ...neostandard({
    env: ['node', 'browser'],
  }),
  {
    rules: {
      '@stylistic/arrow-parens': ['error', 'always'],
      '@stylistic/comma-dangle': ['error', {
        arrays: 'always-multiline',
        objects: 'always-multiline',
        imports: 'always-multiline',
        exports: 'always-multiline',
      }],
      '@stylistic/max-len': ['warn', { code: 120, tabWidth: 2, ignoreUrls: true }],
      // Allow commented-out "NOTE" example lines without a leading space
      '@stylistic/spaced-comment': 'off',
      'no-restricted-properties': ['error', {
        property: 'substr',
        message: 'Use String#slice instead.',
      }],
      radix: ['error', 'always'],
    },
  },
  {
    // Browser scripts are bundled with uglify (ie: true) and intentionally
    // target ES5, so `var` is used deliberately for old-browser support.
    files: ['src/js/**/*.js'],
    rules: {
      'no-var': 'off',
    },
  },
]
