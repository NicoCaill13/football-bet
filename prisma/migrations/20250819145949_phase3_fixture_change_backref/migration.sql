-- CreateEnum
CREATE TYPE "CompetitionType" AS ENUM ('league', 'cup', 'europe');

-- CreateEnum
CREATE TYPE "ChangeType" AS ENUM ('reschedule', 'postpone', 'cancel', 'venue');

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "competitionId" INTEGER,
ADD COLUMN     "roundId" INTEGER,
ADD COLUMN     "seasonId" INTEGER;

-- CreateTable
CREATE TABLE "Competition" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "country" TEXT,
    "type" "CompetitionType" NOT NULL,
    "organizer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Competition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Season" (
    "id" SERIAL NOT NULL,
    "competitionId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Round" (
    "id" SERIAL NOT NULL,
    "seasonId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "roundNo" INTEGER,
    "stage" TEXT,
    "leg" INTEGER,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),

    CONSTRAINT "Round_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FixtureChangeLog" (
    "id" SERIAL NOT NULL,
    "matchId" INTEGER NOT NULL,
    "changeType" "ChangeType" NOT NULL,
    "prevStartsAt" TIMESTAMP(3),
    "newStartsAt" TIMESTAMP(3),
    "prevVenue" TEXT,
    "newVenue" TEXT,
    "reason" TEXT,
    "sourceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FixtureChangeLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Season_competitionId_idx" ON "Season"("competitionId");

-- CreateIndex
CREATE INDEX "Round_seasonId_idx" ON "Round"("seasonId");

-- CreateIndex
CREATE INDEX "FixtureChangeLog_matchId_createdAt_idx" ON "FixtureChangeLog"("matchId", "createdAt");

-- CreateIndex
CREATE INDEX "Match_homeTeamId_startsAt_idx" ON "Match"("homeTeamId", "startsAt");

-- CreateIndex
CREATE INDEX "Match_awayTeamId_startsAt_idx" ON "Match"("awayTeamId", "startsAt");

-- CreateIndex
CREATE INDEX "Match_competitionId_seasonId_roundId_idx" ON "Match"("competitionId", "seasonId", "roundId");

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Season" ADD CONSTRAINT "Season_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Round" ADD CONSTRAINT "Round_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FixtureChangeLog" ADD CONSTRAINT "FixtureChangeLog_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
