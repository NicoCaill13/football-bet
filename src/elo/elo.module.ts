import { Module } from "@nestjs/common";
import { EloService } from "./elo.service";
import { EloController } from "./elo.controller";

@Module({
  controllers: [EloController],
  providers: [EloService],
})
export class EloModule {}