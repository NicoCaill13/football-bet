# ⚽️ SportsBot API — Football 1N2 (NestJS · PostgreSQL · Prisma · Docker)

Moteur **1N2** prêt à l’emploi : ingestion de **cotes**, calcul de **probas implicites** (dé-vig), **EV**, décision **1/N/2** avec **tilts Elo/xG/blessures**, **stake** (Kelly plafonné).  
Phase 3 ajoute **Compétitions/Saisons/Rounds**, **Calendrier/Fixtures**, **reports & changements** et **import officiel** des matches (Ligue 1 via football-data.org v4).

---

## 🧱 Prérequis

- Docker & Docker Compose
- Node 18+ (pour scripts locaux) — l’API tourne dans Docker
- Token **football-data.org v4** (gratuit) : `FOOTBALL_DATA_TOKEN`

---

## Environnement

Créez `.env` à partir de `.env.example`, puis ajoutez :
```ini
# DB
DATABASE_URL=postgresql://postgres:postgres@db:5432/sportsbot?schema=public

# API (port conteneur)
PORT=3000

# Import matches — football-data.org (v4)
FOOTBALL_DATA_TOKEN=YOUR_TOKEN_HERE
``` 

## Docker & Compose

```bash
# Build des images
docker compose build

# Démarrage en arrière-plan
docker compose up -d

# Logs API
docker compose logs -f api

# Shell dans le conteneur API
docker compose exec api sh

# Shell psql dans Postgres
docker compose exec db psql -U postgres -d sportsbot

# Stop & clean
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

# (Dev uniquement) Reset complet (drop DB + reapply + seed)
npx prisma migrate reset --force

# ⚠️ Récupérer d’une migration échouée (ex: P3018)
# Remplacer par le dossier exact de la migration en échec
npx prisma migrate resolve --rolled-back 20250819154045_import_l1_fd
``` 

***Depuis l’hôte, préfixez par docker compose exec api (ex : docker compose exec api npx prisma format).***

## 🚀 Démarrage rapide

```bash 
# 1) Démarrer DB + API
docker compose up -d

# 2) Appliquer les migrations
docker compose exec api npx prisma migrate dev --name init

# 3) Seeder les compétitions/saisons/rounds (Phase 3)
docker compose exec api npm run seed:competitions

# 4) Healthcheck & Swagger
curl -s http://localhost:3000/health
open http://localhost:3000/docs

```
## Import officiel des matches (football-data.org v4)

```bash
# LIGUES
curl -s -X POST "http://localhost:3000/import/football-data/PL/2025"  | jq  # Premier League
curl -s -X POST "http://localhost:3000/import/football-data/SA/2025"  | jq  # Serie A
curl -s -X POST "http://localhost:3000/import/football-data/PD/2025"  | jq  # LaLiga
curl -s -X POST "http://localhost:3000/import/football-data/BL1/2025" | jq  # Bundesliga
curl -s -X POST "http://localhost:3000/import/football-data/FL1/2025" | jq  # Ligue 1

# COUPES NATIONALES
curl -s -X POST "http://localhost:3000/import/football-data/FAC/2025" | jq  # FA Cup
curl -s -X POST "http://localhost:3000/import/football-data/ELC/2025" | jq  # EFL Cup
curl -s -X POST "http://localhost:3000/import/football-data/CDF/2025" | jq  # Coupe de France
curl -s -X POST "http://localhost:3000/import/football-data/CDR/2025" | jq  # Copa del Rey
curl -s -X POST "http://localhost:3000/import/football-data/DFB/2025" | jq  # DFB-Pokal

# COUPES D'EUROPE
curl -s -X POST "http://localhost:3000/import/football-data/CL/2025"  | jq  # Champions League
curl -s -X POST "http://localhost:3000/import/football-data/EL/2025"  | jq  # Europa League
curl -s -X POST "http://localhost:3000/import/football-data/ECL/2025" | jq  # Europa Conference League
```