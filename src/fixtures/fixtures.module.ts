import { Module } from '@nestjs/common';
import { FixturesService } from './fixtures.service';
import { FixturesController } from './fixtures.controller';

@Module({
  providers: [FixturesService],
  controllers: [FixturesController],
})
export class FixturesModule {}
