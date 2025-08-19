-- CreateTable
CREATE TABLE "Team" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" SERIAL NOT NULL,
    "extId" TEXT,
    "competition" TEXT,
    "venue" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "homeTeamId" INTEGER NOT NULL,
    "awayTeamId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Odds" (
    "id" SERIAL NOT NULL,
    "matchId" INTEGER NOT NULL,
    "book" TEXT NOT NULL,
    "o1" DOUBLE PRECISION NOT NULL,
    "oX" DOUBLE PRECISION NOT NULL,
    "o2" DOUBLE PRECISION NOT NULL,
    "sampledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Odds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EloRating" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "ratedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EloRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "XgTeamRolling" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "span" TEXT NOT NULL,
    "xgFor" DOUBLE PRECISION NOT NULL,
    "xgAgainst" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "XgTeamRolling_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InjuryReport" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "player" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT,

    CONSTRAINT "InjuryReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeatherSnapshot" (
    "id" SERIAL NOT NULL,
    "matchId" INTEGER NOT NULL,
    "tempC" DOUBLE PRECISION,
    "windKph" DOUBLE PRECISION,
    "precipMm" DOUBLE PRECISION,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeatherSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Team_slug_key" ON "Team"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Match_extId_key" ON "Match"("extId");

-- CreateIndex
CREATE INDEX "Match_startsAt_idx" ON "Match"("startsAt");

-- CreateIndex
CREATE INDEX "Odds_matchId_book_sampledAt_idx" ON "Odds"("matchId", "book", "sampledAt");

-- CreateIndex
CREATE INDEX "EloRating_teamId_ratedAt_idx" ON "EloRating"("teamId", "ratedAt");

-- CreateIndex
CREATE UNIQUE INDEX "XgTeamRolling_teamId_span_key" ON "XgTeamRolling"("teamId", "span");

-- CreateIndex
CREATE INDEX "InjuryReport_teamId_reportedAt_idx" ON "InjuryReport"("teamId", "reportedAt");

-- CreateIndex
CREATE UNIQUE INDEX "WeatherSnapshot_matchId_key" ON "WeatherSnapshot"("matchId");

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Odds" ADD CONSTRAINT "Odds_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EloRating" ADD CONSTRAINT "EloRating_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XgTeamRolling" ADD CONSTRAINT "XgTeamRolling_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InjuryReport" ADD CONSTRAINT "InjuryReport_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeatherSnapshot" ADD CONSTRAINT "WeatherSnapshot_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
