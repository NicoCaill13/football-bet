import { Controller, Get, Param, Query, ParseIntPipe } from '@nestjs/common';
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PredictionService } from './prediction.service';
import { getDecisionConfig } from 'src/prediction/prediction.config'


@ApiTags('prediction')
@Controller()
export class PredictionController {
  constructor(private readonly svc: PredictionService) {}

  @Get('matches/:id/prediction/summary')
  @ApiQuery({ name: 'odds', required: false, enum: ['best','latest'], example: 'best' })
  @ApiOkResponse({ description: 'Prédiction 1X2 simple (vainqueur + probas + paramètres)' })
  predictSummary(
    @Param('id', ParseIntPipe) id: number,
    @Query('odds') odds?: 'best'|'latest',
  ){
    const cfg = getDecisionConfig();
    const mode = odds === 'latest' || odds === 'best'
      ? odds
      : (cfg.useBestOdds ? 'best' : 'latest');
    return this.svc.predictMatchSummary(id, mode);
  }

}
