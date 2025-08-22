import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { TeamsModule } from './teams/teams.module';
import { MatchesModule } from './matches/matches.module';
import { EloModule } from './elo/elo.module';
import { XgModule } from './xg/xg.module';
import { InjuriesImportModule } from './injuries/injuries.module';
import { CompetitionsModule } from './competitions/competitions.module';
import { FixturesModule } from './fixtures/fixtures.module';
import { OddsModule } from './odds/odds.module';
import { AfImportModule } from './import/af-import.module';
import { PredictionModule } from './prediction/prediction.module';
import { PlayerImpactModule } from 'src/player-impact/player-impact.module';

@Module({
  imports: [
    HealthModule,
    PrismaModule,
    TeamsModule,
    MatchesModule,
    EloModule,
    XgModule,
    InjuriesImportModule,
    CompetitionsModule,
    FixturesModule,
    OddsModule,
    AfImportModule,
    PredictionModule,
    PlayerImpactModule,
  ],
})
export class AppModule {}
