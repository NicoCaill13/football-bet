import { Module } from '@nestjs/common';
import { PlayerImpactService } from './player-impact.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ApiFootballClient } from 'src/common/api-football.client';
import { PlayerImpactController } from './player-impact.controller';

@Module({
  providers: [PlayerImpactService, PrismaService, ApiFootballClient],
  controllers: [PlayerImpactController],
  exports: [PlayerImpactService],
})
export class PlayerImpactModule {}
