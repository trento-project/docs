// SPDX-FileCopyrightText: SUSE LLC
// SPDX-License-Identifier: Apache-2.0

'use strict'

const { ESLint } = require('eslint')
const log = require('fancy-log')

module.exports = (files) => async () => {
  const eslint = new ESLint()
  const results = await eslint.lintFiles(files)
  const formatter = await eslint.loadFormatter('stylish')
  const output = formatter.format(results)
  if (output) log(output)
  const errorCount = results.reduce((count, result) => count + result.errorCount, 0)
  if (errorCount > 0) throw new Error(`eslint found ${errorCount} error${errorCount === 1 ? '' : 's'}`)
}
