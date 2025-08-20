import { Module } from '@nestjs/common';
import { ApiFootballClient } from './api-football.client';

@Module({
  providers: [ApiFootballClient],
  exports:   [ApiFootballClient],
})
export class ApiFootballModule {}

