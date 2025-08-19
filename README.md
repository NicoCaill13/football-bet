# ⚽️ SportsBot API — Football 1N2 (NestJS, PostgreSQL, Prisma, Docker)

Moteur **1N2** prêt à l’emploi : ingestion de cotes, calcul de **probas implicites** (dé-vig), **EV**, décision 1/N/2 avec **tilts Elo/xG/blessures**, **stake** (Kelly plafonné) et **journalisation**.

## 🧰 Stack
- **NestJS** (TypeScript) + **Swagger**
- **PostgreSQL** (Docker Compose)
- **Prisma** ORM
- **Docker** (dev & prod images)

---

## 🚀 Démarrage rapide

```bash
# 0) Copier l'environnement
cp .env.example .env

# 1) Lancer la base + API (dev)
docker compose up -d db
docker compose up -d api

# 2) Migrations + seed
docker compose exec api npx prisma migrate dev --name init
docker compose exec api npm run db:seed

# 3) Sanity checks
curl -s http://localhost:3000/health
open http://localhost:3000/docs

