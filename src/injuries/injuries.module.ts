import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ApiFootballClient } from 'src/common/api-football.client';
import { InjuriesImportController } from './injuries.controller';
import { InjuriesImportService } from './injuries.service';

@Module({
  controllers: [InjuriesImportController],
  providers: [PrismaService, ApiFootballClient, InjuriesImportService],
  exports: [InjuriesImportService],
})
export class InjuriesImportModule {}
