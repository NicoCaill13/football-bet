import { Module } from "@nestjs/common";
import { XgService } from "./xg.service";
import { XgController } from "./xg.controller";

@Module({ controllers: [XgController], providers: [XgService] })
export class XgModule {}
