/*
  Warnings:

  - A unique constraint covering the columns `[seasonId,homeTeamId,awayTeamId,startsAt]` on the table `Match` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Match_seasonId_homeTeamId_awayTeamId_startsAt_key" ON "Match"("seasonId", "homeTeamId", "awayTeamId", "startsAt");
