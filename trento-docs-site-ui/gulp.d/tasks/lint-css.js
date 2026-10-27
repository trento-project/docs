// SPDX-FileCopyrightText: SUSE LLC
// SPDX-License-Identifier: Apache-2.0

'use strict'

const stylelint = require('stylelint')
const log = require('fancy-log')

module.exports = (files) => async () => {
  const { report, errored } = await stylelint.lint({
    files,
    formatter: 'string',
  })
  if (report) log(report)
  if (errored) throw new Error('stylelint found errors')
}
