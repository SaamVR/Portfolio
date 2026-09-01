#!/usr/bin/env bash
set -u

CANONICAL_PROJECT_ID="prj_PQVPlfPZCmHicvEcqDsIQT0vWdIF"
LEGACY_PROJECT_ID_ONE="prj_lHzMV1KlUFZxW8bnhQ2URGdmjHkc"
LEGACY_PROJECT_ID_TWO="prj_eyHSFXjl5GQ6Ik5OJNcJ04jEDWkr"

case "${VERCEL_PROJECT_ID:-}" in
  "$CANONICAL_PROJECT_ID")
    echo "Canonical EZComo Vercel project; build allowed."
    exit 1
    ;;
  "$LEGACY_PROJECT_ID_ONE"|"$LEGACY_PROJECT_ID_TWO")
    echo "Legacy duplicate EcomCMS Vercel project; build ignored."
    exit 0
    ;;
  *)
    echo "Unknown or unset Vercel project; build allowed."
    exit 1
    ;;
esac
