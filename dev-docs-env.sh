#!/usr/bin/env bash

# SPDX-FileCopyrightText: SUSE LLC
# SPDX-License-Identifier: Apache-2.0

set -euo pipefail

# Start all services
docker compose up -d --force-recreate --wait

# ------------------------------------------------------------------------------
# Environment Info
# ------------------------------------------------------------------------------
echo -e "
──────────────────────────────────────────────
  📘 Docs environment ready
──────────────────────────────────────────────
  • Trento docs hub:  http://localhost:3000
  • SUSE HTML build:  http://localhost:3001
  • SUSE PDF build:   http://localhost:3002/SLES-SAP-trento_en.pdf
──────────────────────────────────────────────
"
