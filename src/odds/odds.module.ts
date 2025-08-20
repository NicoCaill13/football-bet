import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { OddsService } from "./odds.service";
import { OddsImportService } from "./odds.import.service";
import { OddsUpcomingController } from "./odds-upcoming.controller";
import { OddsController } from "./odds.controller"; 
import { ApiFootballModule } from "src/common/api-football.module"

@Module({
  imports: [PrismaModule, ApiFootballModule],
  controllers: [OddsUpcomingController, OddsController],
  providers: [OddsService, OddsImportService],
  exports: [OddsService],
})
export class OddsModule {}
