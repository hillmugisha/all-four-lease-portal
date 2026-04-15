#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# sync-to-obsidian.sh
# Copies source .md files from "Obsidian files/" into the Obsidian vault.
# Always overwrites — Obsidian will pick up changes immediately.
#
# Usage:  bash scripts/sync-to-obsidian.sh
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ─── Config ──────────────────────────────────────────────────────────────────

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_DIR="$PROJECT_ROOT/Obsidian files"
VAULT="C:/Users/hill.mugisha/OneDrive - Pritchard Companies/Documents/Obsidian Vault/All Four & NIE"

# ─── Manifest ────────────────────────────────────────────────────────────────
# Format: "source filename|vault subfolder/destination filename"
# Source files live in "Obsidian files/" in the project root.
# Destination paths are relative to the vault root.
# Add new lines here as you create more docs.

declare -a MANIFEST=(
  "Document Statuses.md|Lifecycle/Document Statuses.md"
  "Lease Statuses.md|Lifecycle/Lease Statuses.md"
  "Schemas/Active Leases Schema.md|Schemas/Active Leases.md"
  "Schemas/Expired Leases Schema.md|Schemas/Expired Leases.md"
  "Schemas/Sold Leases Schema.md|Schemas/Sold Leases.md"
  "Calculations.md|Calculations.md"
)

# ─── Helpers ─────────────────────────────────────────────────────────────────

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
RESET='\033[0m'

ok()   { echo -e "${GREEN}  ✔${RESET}  $*"; }
warn() { echo -e "${YELLOW}  ⚠${RESET}  $*"; }
fail() { echo -e "${RED}  ✘${RESET}  $*"; }

# ─── Pre-flight checks ───────────────────────────────────────────────────────

echo ""
echo "All Four Lease → Obsidian Sync"
echo "────────────────────────────────"

if [ ! -d "$VAULT" ]; then
  fail "Vault not found: $VAULT"
  exit 1
fi

if [ ! -d "$SOURCE_DIR" ]; then
  fail "Source folder not found: $SOURCE_DIR"
  exit 1
fi

# ─── Sync ────────────────────────────────────────────────────────────────────

SYNCED=0
SKIPPED=0
ERRORS=0

for entry in "${MANIFEST[@]}"; do
  SRC_NAME="${entry%%|*}"
  DEST_REL="${entry##*|}"

  SRC="$SOURCE_DIR/$SRC_NAME"
  DEST="$VAULT/$DEST_REL"
  DEST_DIR="$(dirname "$DEST")"

  # Source file must exist
  if [ ! -f "$SRC" ]; then
    warn "Source not found, skipping: $SRC_NAME"
    (( SKIPPED++ )) || true
    continue
  fi

  # Create destination subfolder if needed
  mkdir -p "$DEST_DIR"

  # Update last_synced date in the file before copying
  TODAY="$(date +%Y-%m-%d)"
  TMPFILE="$(mktemp)"
  sed "s/^last_synced:.*/last_synced: $TODAY/" "$SRC" > "$TMPFILE"

  # Copy to vault (overwrite)
  if cp "$TMPFILE" "$DEST"; then
    ok "Synced: $SRC_NAME  →  ${DEST_REL}"
    (( SYNCED++ )) || true
  else
    fail "Failed to copy: $SRC_NAME"
    (( ERRORS++ )) || true
  fi

  rm -f "$TMPFILE"
done

# ─── Summary ─────────────────────────────────────────────────────────────────

echo ""
echo "────────────────────────────────"
echo -e "  Synced:  ${GREEN}${SYNCED}${RESET}"
[ "$SKIPPED" -gt 0 ] && echo -e "  Skipped: ${YELLOW}${SKIPPED}${RESET}"
[ "$ERRORS"  -gt 0 ] && echo -e "  Errors:  ${RED}${ERRORS}${RESET}"
echo ""

[ "$ERRORS" -gt 0 ] && exit 1 || exit 0
