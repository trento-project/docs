// SPDX-FileCopyrightText: SUSE LLC
// SPDX-License-Identifier: Apache-2.0

'use strict'

const TAG_ALL_RX = /<[^>]+>/g

module.exports = (html) => html && html.replace(TAG_ALL_RX, '')
