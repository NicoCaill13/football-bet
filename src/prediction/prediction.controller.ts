import { Controller, Get, Param, Query } from '@nestjs/common';
import { PredictionService } from './prediction.service';
import { predictionConfig } from './prediction.config';

@Controller()
export class PredictionController {
  constructor(private readonly svc: PredictionService) {}

  // GET /matches/:id/prediction/summary?odds=best|latest|book:NAME
  @Get('matches/:id/prediction/summary')
  async summary(
    @Param('id') id: string,
    @Query('odds') mode?: string,
  ) {
    return this.svc.getSummary(Number(id), mode);
  }

  // Optionnel : exposer la config courante (pratique pour le debug UI)
  @Get('prediction/config')
  getConfig() {
    return predictionConfig;
  }
}
