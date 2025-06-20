#!/usr/bin/env bash

# Accepts generic-attributes.adoc from doc-unversioned and generates antora.yml with asciidoc attributes
INPUT_FILE="$1"
OUTPUT_FILE="$2"

if [[ ! -f "$INPUT_FILE" ]]; then
  echo "File not found: $INPUT_FILE"
  exit 1
fi

# Generate output directory
TEMP_DIR="antora_tmp"
mkdir -p "$TEMP_DIR"

# Keys to ignore (space-separated) from generic-attributes.adoc
IGNORE_KEYS=("toc" "toc-placement" "toc-title" "numbered" "sectnums")

is_ignored() {
  local key="$1"
  for ignore in "${IGNORE_KEYS[@]}"; do
    if [[ "$ignore" == "$key" ]]; then
      return 0
    fi
  done
  return 1
}

echo "asciidoc:" > "$OUTPUT_FILE"
echo "  attributes:" >> "$OUTPUT_FILE"

declare -A seen

# Read all keys from generic-attributes.adoc
grep '^:' "$INPUT_FILE" | while read -r line; do
  key=$(echo "$line" | sed -E 's/^:([^:]+):.*/\1/' | xargs)
  
  # skip key if seen or in ignore list
  if [[ -n "${seen[$key]}" ]] || is_ignored "$key"; then
    continue
  fi

  value=$(echo "$line" | sed -E 's/^:[^:]+:\s*(.*)/\1/' | xargs)
  value="${value//\"/\\\"}"

  echo "    $key: \"$value\"" >> "$OUTPUT_FILE"
  seen["$key"]=1
done

echo "✅ Generated output file: $OUTPUT_FILE"