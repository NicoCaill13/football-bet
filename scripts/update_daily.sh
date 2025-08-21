#!/usr/bin/env bash
set -euo pipefail

BASE="http://localhost:3000"

# === Détermine la saison Europe (août -> juillet) ===
Y=$(date +%Y)
M=$(date +%m)
if [ "$M" -ge 8 ]; then SEASON=$Y; else SEASON=$((Y-1)); fi

# === Leagues à maintenir ===
LEAGUES=("L1" "PL" "SA" "LL" "BUN")
EURO=("UCL" "UEL" "UECL")

echo "== Daily update @ $(date) | season=$SEASON =="

# 1) (Idempotent) — Import/refresh fixtures pour chaque compétition
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

# 2) Cotes pré-match pour les matches à venir (par “fixture”, couvre ~30 prochains jours côté API)
#    Paramètre 'next=40' = scanne les 40 prochains fixtures dans la saison (idempotent: insert/update)
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

# 3) Player Impact (utilise effectifs/statistiques API-FOOTBALL)
#    À faire 1x/jour (ou 2-3x/semaine si tu veux économiser tes quotas)
for L in "${LEAGUES[@]}"; do
  echo "-- Player Impact build $L --"
  curl -s -X POST "$BASE/import/players-impact/api-football/build?league=$L&season=$SEASON" | jq .
  sleep 0.5
done

# 4) Sanity checks rapides
echo "-- Sanity upcoming L1 (avec prédictions & best odds) --"
curl -s "$BASE/matches?league=L1&scope=upcoming&with=prediction&odds=best" | jq 'length, .[0]'
