import { Module } from "@nestjs/common";
import { MatchesController } from "./matches.controller";
import { MatchesService } from "./matches.service";
import { PrismaService } from 'src/prisma/prisma.service';
import { PredictionModule } from 'src/prediction/prediction.module';

@Module({
  imports: [PredictionModule], // <<< pour injecter PredictionService
  controllers: [MatchesController],
  providers: [MatchesService, PrismaService],
  exports: [MatchesService],
})
export class MatchesModule {}