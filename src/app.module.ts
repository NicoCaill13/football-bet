import { Module } from "@nestjs/common";
import { HealthModule } from "./health/health.module";
import { PrismaModule } from "./prisma/prisma.module";
import { TeamsModule } from "./teams/teams.module";
import { MatchesModule } from "./matches/matches.module";
import { OddsModule } from "./odds/odds.module";
import { DecisionModule } from "./decision/decision.module";
import { EloModule } from "./elo/elo.module";
import { XgModule } from "./xg/xg.module";
import { InjuriesModule } from "./injuries/injuries.module";
import { CompetitionsModule } from "./competitions/competitions.module";
import { FixturesModule } from "./fixtures/fixtures.module";
import { ImportModule } from "./import/import.module";


@Module({
  imports: [
    HealthModule,
    PrismaModule,
    TeamsModule,
    MatchesModule,
    OddsModule,
    EloModule,
    XgModule,
    InjuriesModule,
    DecisionModule,
    CompetitionsModule,
    FixturesModule,
    ImportModule
  ],
})
export class AppModule {}
