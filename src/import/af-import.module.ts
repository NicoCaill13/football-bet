import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AfImportController } from "./af-import.controller";
import { AfImportService } from "./af-import.service";

@Module({
  imports: [PrismaModule],
  controllers: [AfImportController],
  providers: [AfImportService],
})
export class AfImportModule {}
