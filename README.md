# ⚽️ SportsBot API — Football 1N2 (NestJS · PostgreSQL · Prisma · Docker)

Moteur **1N2** prêt à l’emploi : ingestion de **cotes**, calcul de **probas implicites** (dé-vig), **EV**, décision **1/N/2** avec **tilts Elo/xG/blessures**, **stake** (Kelly plafonné).  
Phase 3 ajoute **Compétitions/Saisons/Rounds**, **Calendrier/Fixtures**, **reports & changements** et **import officiel** des matches (Ligue 1 via football-data.org v4).

---

## 🧱 Prérequis

- Docker & Docker Compose
- Node 18+ (pour scripts locaux) — l’API tourne dans Docker
- Token **API-FOOTBALL v3**  : `API_FOOTBALL_KEY`

---

## Environnement

Créez `.env` à partir de `.env.example`, puis ajoutez :
```ini
# --- API-FOOTBALL / RapidAPI ---
AF_API_KEY=<TA_CLE_RAPIDAPI>
AF_API_HOST=v3.football.api-sports.io

# --- DB ---
DATABASE_URL=postgresql://postgres:postgres@db:5432/sportsbot?schema=public

# --- Choix des cotes (latest|best|book:NAME) ---
DECISION_USE_BEST_ODDS=true

# --- Elo ---
DECISION_ALPHA_ELO=0.30
ELO_HOME_ADV=70

# --- xG (forme récente) ---
DECISION_ALPHA_XG=0.20
XG_SPAN=5m

# --- Blessures (volumétrique, en attendant impact OUT) ---
DECISION_ALPHA_INJ=0.15
INJ_LOOKBACK_DAYS=14

# --- Repos & Draw bump (si activés dans ton code) ---
DECISION_ALPHA_REST=0.05
DECISION_ALPHA_DRAW=0.05

# --- Stake (Kelly plafonné) ---
STAKE_BANKROLL_CAP=0.02

# --- Player Impact (rolling) ---
IMPACT_WEIGHT_MINUTES=0.55
IMPACT_WEIGHT_STARTS=0.15
IMPACT_WEIGHT_GOALINV=0.30
PLAYER_IMPACT_SPAN=10m

```


## Docker & Compose

```bash
# Build
docker compose build

# Up
docker compose up -d

# Logs API
docker compose logs -f api

# Shell dans le conteneur API
docker compose exec api sh

# psql
docker compose exec db psql -U postgres -d sportsbot

# Down
docker compose down

``` 

## Prisma (exécuter dans le conteneur API)

```bash
# Mise en forme du schéma
npx prisma format

# Créer/appliquer une migration (dev)
npx prisma migrate dev --name <nom>

# Générer le client Prisma
npx prisma generate

# Appliquer migrations (dev)
npx prisma migrate dev --name init

# (Dev uniquement) Reset complet (drop DB + reapply + seed)
npx prisma migrate reset --force

# Récupérer d’une migration échouée (ex: P3018)
# Remplacer par le dossier exact de la migration en échec
npx prisma migrate resolve --rolled-back 20250819154045_import_l1_fd

npx jest --clearCach
npm run test:unit

``` 

***Depuis l’hôte, préfixez par docker compose exec api (ex : docker compose exec api npx prisma format).***

## 🚀 Démarrage rapide

```bash 
# 1) Démarrer DB + API
docker compose up -d

# 2) Appliquer les migrations
docker compose exec api npx prisma migrate dev --name init

# 4) Healthcheck & Swagger
curl -s http://localhost:3000/health
open http://localhost:3000/docs

```
## Import officiel des matches

```bash
# LIGUES
curl -s -X POST "http://localhost:3000/import/api-football/L1/2025"  | jq  # Ligue 1
curl -s -X POST "http://localhost:3000/import/api-football/PL/2025"  | jq  # Premier League
curl -s -X POST "http://localhost:3000/import/api-football/SA/2025"  | jq  # Serie A
curl -s -X POST "http://localhost:3000/import/api-football/LL/2025"  | jq  # LaLiga
curl -s -X POST "http://localhost:3000/import/api-football/BUN/2025" | jq  # Bundesliga

# COUPES NATIONALES
curl -s -X POST "http://localhost:3000/import/football-data/FAC/2025" | jq  # FA Cup
curl -s -X POST "http://localhost:3000/import/football-data/ELC/2025" | jq  # EFL Cup
curl -s -X POST "http://localhost:3000/import/football-data/CDF/2025" | jq  # Coupe de France
curl -s -X POST "http://localhost:3000/import/football-data/CDR/2025" | jq  # Copa del Rey
curl -s -X POST "http://localhost:3000/import/football-data/DFB/2025" | jq  # DFB-Pokal

# COUPES D'EUROPE
curl -s -X POST "http://localhost:3000/import/api-football/UCL/2025"  | jq  # Champions League
curl -s -X POST "http://localhost:3000/import/api-football/UEL/2025"  | jq  # Europa League
curl -s -X POST "http://localhost:3000/import/api-football/UECL/2025" | jq  # Europa Conference League
```

## Import cotes

```bash
curl -s -X POST "http://localhost:3000/odds/import/upcoming?league=L1&season=2025&next=40" | jq
curl -s -X POST "http://localhost:3000/odds/import/upcoming?league=PL&season=2025&next=40" | jq
curl -s -X POST "http://localhost:3000/odds/import/upcoming?league=SA&season=2025&next=40" | jq
curl -s -X POST "http://localhost:3000/odds/import/upcoming?league=LL&season=2025&next=40" | jq
curl -s -X POST "http://localhost:3000/odds/import/upcoming?league=BUN&season=2025&next=40" | jq

```


## Impact des joueurs 

```bash
curl -s -X POST \
  "http://localhost:3000/import/players-impact/api-football/build?league=L1&season=2025" | jq
```

## Détails

```bash
curl -s "http://localhost:3000/matches/11?withImpact=1&impactTop=5" | jq
curl -s "http://localhost:3000/matches/11/odds/fair?use=best" | jq
curl -s "http://localhost:3000/matches/11/prediction/summary?odds=best" | jq
```

## 🔮 Prédiction 1X2 (simple)

### Endpoint
`GET /matches/:id/prediction/summary?odds=best|latest`

- `odds` *(optionnel, default: `best`)*  
  - `best` : meilleures cotes par issue (mix de books)
  - `latest` : dernière ligne de cotes importée (photo la plus récente)

### Ce que fait l’API
1. Prend les **cotes 1X2** (1 / N / 2).
2. Retire la **marge bookmaker** ⇒ **probas marché**.
3. Applique des **tilts** (petits ajustements symétriques) :
   - **Elo** : avantage si rating domicile > extérieur  
   - **xG (forme)** : avantage si xG_for - xG_against (rolling 5) plus élevé  
   - **Blessures** : avantage si l’adversaire a plus d’absents “out” (14j)  
   - **Repos** : avantage si plus de jours de repos avant le match  
   - **Draw bump (optionnel)** : gonfle légèrement le nul si match équilibré  
4. Renormalise les probabilités **(p1+pX+p2=1)** et renvoie le **vainqueur prédit**.

### Réponse (exemple)
```json
{
  "match": { "id": 11, "home": "Marseille", "away": "Paris FC", "startsAt": "2025-08-23T15:00:00.000Z" },
  "usingOdds": { "mode": "best", "o1": 1.42, "oX": 5.18, "o2": 9 },
  "probabilities": {
    "market":   { "p1": 0.6984, "pX": 0.1914, "p2": 0.1102 },
    "adjusted": { "p1": 0.7253, "pX": 0.1796, "p2": 0.0951 }
  },
  "prediction": {
    "winner": "1",
    "winnerTeam": "Marseille",
    "probability": 0.7253
  },
  "drivers": {
    "weights": { "elo": 0.30, "xg": 0.15, "inj": 0.10, "rest": 0.05, "draw": 0.05 },
    "elo":      { "home": 1500, "away": 1500, "delta": 0, "tilt": 0 },
    "xg":       { "delta": 0, "tilt": 0 },
    "injuries": { "outHome": 0, "outAway": 0, "delta": 0, "tilt": 0 },
    "rest":     { "diffDays": 1.85, "tilt": 0.093 },
    "drawBump": -0.009,
    "totalDelta": 0.093
  }
}
```