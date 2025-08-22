#!/usr/bin/env bash
set -euo pipefail

BASE="http://localhost:3000"

# === Détermine la saison Europe (août -> juillet) ===
Y=$(date +%Y)
M=$(date +%m)
if [ "$M" -ge 8 ]; then SEASON=$Y; else SEASON=$((Y-1)); fi

LEAGUES=("L1" "PL" "SA" "LL" "BUN")
EURO=("UCL" "UEL" "UECL")

echo "== Daily update @ $(date) | season=$SEASON =="

for L in "${LEAGUES[@]}"; do
  echo "-- Fixtures $L --"
  echo "$BASE/import/matchesl/$L/$SEASON"
  curl -s -X POST "$BASE/import/matches/$L/$SEASON" | jq .
  sleep 0.3
done
for C in "${EURO[@]}"; do
  echo "-- Fixtures $C --"
  echo "$BASE/import/matches/$C/$SEASON"
  curl -s -X POST "$BASE/import/matches/$C/$SEASON" | jq .
  
  sleep 0.3
done


for L in "${LEAGUES[@]}"; do
  echo "-- Odds upcoming $L --"
  curl -s -X POST "$BASE/odds/import/upcoming?league=$L&season=$SEASON&next=40" | jq .
  sleep 0.5
done
for C in "${EURO[@]}"; do
  echo "-- Odds upcoming $C --"
  curl -s -X POST "$BASE/odds/import/upcoming?league=$C&season=$SEASON&next=40" | jq .
  sleep 0.5
done

for L in "${LEAGUES[@]}"; do
  echo "-- Injuries sync $L (last ${INJ_DAYS}d) --"
  curl -s -X POST "$BASE/import/injuries/sync?league=$L&season=$SEASON&days=$INJ_DAYS" | jq .
  sleep 0.4
done

for L in "${LEAGUES[@]}"; do
  echo "-- Player Impact build $L --"
  curl -s -X POST "$BASE/import/players-impact/api-football/build?league=$L&season=$SEASON" | jq .
  sleep 0.5
done

echo "-- Sanity upcoming L1 (avec prédictions & best odds) --"
curl -s "$BASE/matches?league=L1&scope=upcoming&with=prediction&odds=best" | jq 'length, .[0]'
