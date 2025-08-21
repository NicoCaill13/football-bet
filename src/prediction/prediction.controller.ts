import { Controller, Get, Param, Query, ParseIntPipe } from '@nestjs/common';
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PredictionService } from './prediction.service';

@ApiTags('prediction')
@Controller()
export class PredictionController {
  constructor(private readonly svc: PredictionService) {}

  @Get('matches/:id/prediction')
  @ApiQuery({ name: 'odds', required: false, enum: ['best','latest'], example: 'best' })
  @ApiOkResponse({ description: 'Prédiction vainqueur 1X2 pour un match' })
  predictOne(
    @Param('id', ParseIntPipe) id: number,
    @Query('odds') odds?: 'best'|'latest',
  ){
    return this.svc.predictMatch(id, (odds === 'latest' ? 'latest' : 'best'));
  }

  @Get('matches/:id/prediction/summary')
@ApiQuery({ name: 'odds', required: false, enum: ['best','latest'], example: 'best' })
@ApiOkResponse({ description: 'Prédiction simple 1X2 avec paramètres (sans EV / stake)' })
predictSummary(
  @Param('id', ParseIntPipe) id: number,
  @Query('odds') odds?: 'best'|'latest',
){
  return this.svc.predictMatchSummary(id, (odds === 'latest' ? 'latest' : 'best'));
}
}
