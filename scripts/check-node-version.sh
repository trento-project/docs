#!/usr/bin/env bash

# SPDX-FileCopyrightText: SUSE LLC
# SPDX-License-Identifier: Apache-2.0

# Keeps the Node.js version consistent across development and every container.
#
# versions.yml holds the container image and is imported by docker-compose.yml
# and by the CI workflows. .tool-versions holds the version used by the local
# toolchain (asdf/mise). This script verifies that both agree with each other
# and with the Node.js actually running, and can report the newest image tag
# published in the registry.
#
# The registry, repository, version and flavour are never written down here:
# they are all derived from the single image reference in versions.yml.
#
# Usage:
#   check-node-version.sh [check]   verify versions.yml, .tool-versions and the
#                                   running Node.js all match (default)
#   check-node-version.sh version   print the pinned version, e.g. 24.18.1
#   check-node-version.sh image     print the pinned image reference
#   check-node-version.sh latest    print the newest matching tag in the registry

set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
versions_file="$root/versions.yml"
tool_versions_file="$root/.tool-versions"

die() {
  echo "check-node-version: $*" >&2
  exit 1
}

# Compose silently refuses to load a file that is not valid YAML, and a text
# scan of it would not notice. Catch the mistake that is easy to make here:
# Dockerfile directives such as `ARG NAME=value`, which YAML reads as a bare
# scalar and which make the whole file unparseable.
lint_versions_file() {
  local offenders
  offenders="$(grep -nE '^[^[:space:]#]' "$versions_file" |
    grep -vE '^[0-9]+:[A-Za-z0-9_.-]+:' || true)"

  [ -z "$offenders" ] || die "$versions_file is not valid YAML, Compose cannot load it.
Unexpected top-level line(s):
$offenders
ARG and ENV are Dockerfile directives; use \${NAME:-default} interpolation instead."
}

# Resolve Compose interpolation the way Compose does: an environment variable
# wins, otherwise the :- default written in the file is used.
resolve_interpolation() {
  local text="$1" name default value

  while [[ "$text" =~ \$\{([A-Za-z_][A-Za-z0-9_]*)(:?-([^}]*))?\} ]]; do
    name="${BASH_REMATCH[1]}"
    default="${BASH_REMATCH[3]}"
    value="${!name:-$default}"
    text="${text/"${BASH_REMATCH[0]}"/$value}"
  done

  echo "$text"
}

# The single image reference in versions.yml, with interpolation applied.
pinned_image() {
  [ -f "$versions_file" ] || die "$versions_file not found"
  lint_versions_file

  local image
  image="$(awk '/^[[:space:]]+image:[[:space:]]*/ {
    sub(/^[[:space:]]*image:[[:space:]]*/, "")
    gsub(/["'\'']/, "")
    print
    exit
  }' "$versions_file")"

  [ -n "$image" ] || die "no image found in $versions_file"

  image="$(resolve_interpolation "$image")"

  case "$image" in
  *:) die "the image tag in $versions_file resolved to an empty value: $image" ;;
  esac

  echo "$image"
}

# Tag of the pinned image, e.g. 24.18.1-base
pinned_tag() {
  local image last
  image="$(pinned_image)"
  last="${image##*/}"

  case "$last" in
  *:*) echo "${last##*:}" ;;
  *) die "the image in $versions_file has no tag: $image" ;;
  esac
}

# Registry host of the pinned image, e.g. registry.suse.com
pinned_registry() {
  local image
  image="$(pinned_image)"
  echo "${image%%/*}"
}

# Repository of the pinned image, e.g. bci/nodejs
pinned_repository() {
  local image name tag
  image="$(pinned_image)"
  tag="$(pinned_tag)"
  name="${image%:"$tag"}"
  echo "${name#*/}"
}

# Version part of the tag, e.g. 24.18.1 out of 24.18.1-base
pinned_version() {
  local tag version
  tag="$(pinned_tag)"
  version="${tag%%-*}"

  [ -n "$version" ] || die "the version in the $versions_file image tag is empty (tag: $tag).
An interpolated variable resolved to nothing; give it a default, as in \${NAME:-24.18.1}."

  echo "$version"
}

# Flavour suffix of the tag, e.g. base out of 24.18.1-base, empty if there is none
pinned_flavour() {
  local tag
  tag="$(pinned_tag)"

  case "$tag" in
  *-*) echo "${tag#*-}" ;;
  *) echo "" ;;
  esac
}

# Version pinned for the local toolchain in .tool-versions.
tool_versions_version() {
  [ -f "$tool_versions_file" ] || die "$tool_versions_file not found"

  local version
  version="$(awk '$1 == "nodejs" { print $2; exit }' "$tool_versions_file")"

  [ -n "$version" ] || die "no 'nodejs' entry in $tool_versions_file"
  echo "$version"
}

# Newest X.Y.Z tag published for the pinned repository in the same flavour,
# ignoring the tags that carry a container build suffix such as 24.18.1-base-10.1.
latest_published_version() {
  local registry repository flavour suffix pattern token tags newest

  registry="$(pinned_registry)"
  repository="$(pinned_repository)"
  flavour="$(pinned_flavour)"

  if [ -n "$flavour" ]; then
    suffix="-$flavour"
  else
    suffix=""
  fi
  pattern="^[0-9]+\.[0-9]+\.[0-9]+${suffix}$"

  token="$(curl -fsSL \
    "https://scc.suse.com/api/registry/authorize?service=SUSE+Linux+Docker+Registry&scope=repository:${repository}:pull" |
    sed -n 's/.*"token":"\([^"]*\)".*/\1/p')"

  [ -n "$token" ] || die "could not obtain a $registry pull token"

  tags="$(curl -fsSL -H "Authorization: Bearer $token" \
    "https://$registry/v2/$repository/tags/list" |
    tr ',' '\n' |
    sed -n 's/.*"\([0-9][^"]*\)".*/\1/p' |
    grep -E "$pattern" |
    sort -V)"

  [ -n "$tags" ] || die "no tags matching $pattern found for $repository"

  newest="$(echo "$tags" | tail -n 1)"
  echo "${newest%%-*}"
}

cmd_check() {
  local image pinned tool_version actual status=0

  image="$(pinned_image)"
  pinned="$(pinned_version)"
  tool_version="$(tool_versions_version)"

  echo "versions.yml:     $image"
  echo ".tool-versions:   nodejs $tool_version"

  if [ "$pinned" != "$tool_version" ]; then
    echo >&2
    echo "check-node-version: versions.yml and .tool-versions disagree" >&2
    echo "  versions.yml pins:   $pinned" >&2
    echo "  .tool-versions pins: $tool_version" >&2
    echo "Set both to the same version, then rebuild the containers." >&2
    status=1
  fi

  if command -v node >/dev/null 2>&1; then
    actual="$(node --version)"
    actual="${actual#v}"
    echo "running Node.js:  $actual"

    if [ "$actual" != "$tool_version" ]; then
      echo >&2
      echo "check-node-version: the running Node.js does not match the pin" >&2
      echo "  pinned:   $tool_version" >&2
      echo "  running:  $actual" >&2
      echo "Containers must use $image." >&2
      status=1
    fi
  else
    echo "running Node.js:  not on PATH, runtime check skipped"
  fi

  if [ "$status" -eq 0 ]; then
    echo "check-node-version: OK"
  fi

  return "$status"
}

cmd_latest() {
  local pinned newest registry repository flavour suffix

  pinned="$(pinned_version)"
  newest="$(latest_published_version)"
  registry="$(pinned_registry)"
  repository="$(pinned_repository)"
  flavour="$(pinned_flavour)"

  if [ -n "$flavour" ]; then
    suffix="-$flavour"
  else
    suffix=""
  fi

  echo "pinned:  $pinned"
  echo "latest:  $newest ($registry/$repository:$newest$suffix)"

  if [ "$pinned" = "$newest" ]; then
    echo "check-node-version: the pin is up to date"
  else
    echo "check-node-version: a newer version is available; update versions.yml and .tool-versions"
  fi
}

case "${1:-check}" in
check) cmd_check ;;
version) pinned_version ;;
image) pinned_image ;;
latest) cmd_latest ;;
*) die "unknown command '$1'; use check, version, image or latest" ;;
esac
