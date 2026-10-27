// SPDX-FileCopyrightText: SUSE LLC
// SPDX-License-Identifier: Apache-2.0

'use strict'

const { ESLint } = require('eslint')
const log = require('fancy-log')

module.exports = (files) => async () => {
  const eslint = new ESLint({ fix: true })
  const results = await eslint.lintFiles(files)
  await ESLint.outputFixes(results)
  const changed = results.filter((result) => result.output != null).length
  log(`eslint --fix: formatted ${changed} file${changed === 1 ? '' : 's'}`)
}
