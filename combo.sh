#!/bin/bash
# combo.sh — command+flag combo purpose lookup
# Usage: ./combo.sh '<command with flags>'
# Example: ./combo.sh 'inxi -Fxi'

declare -A purpose=(
  ['inxi -Fxi']="Shows a full system info summary with extra detail and network info"
  ['ls -a']="Lists directory contents including hidden files"
  ['grep -a']="Searches binary files as if they were text"
  ['tar -xvzf']="Extracts a gzip-compressed archive, showing progress"
)

cmd="$*"

if [[ -z "$cmd" ]]; then
  echo "Usage: bcombo '<command with flags>'   show purpose"
  echo "       bcombo summary                  list all known combos"
  exit 1
fi

if [[ "$cmd" == "summary" ]]; then
  entries=("${!purpose[@]}")
  IFS=$'\n' sorted=($(sort <<<"${entries[*]}"))
  unset IFS
  printf '%s, ' "${sorted[@]}" | sed 's/, $//'
  echo ""
  echo ""
  echo "${#purpose[@]} entries:"
  exit 0
fi

if [[ -n "${purpose[$cmd]}" ]]; then
  echo "Purpose: ${purpose[$cmd]}"
else
  echo "No entry for '$cmd' yet."
fi
