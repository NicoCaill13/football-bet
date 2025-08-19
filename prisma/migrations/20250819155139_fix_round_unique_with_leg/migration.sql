/*
  Warnings:

  - A unique constraint covering the columns `[seasonId,name,leg]` on the table `Round` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Round_seasonId_name_key";

-- CreateIndex
CREATE UNIQUE INDEX "Round_seasonId_name_leg_key" ON "Round"("seasonId", "name", "leg");
