import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from "@nestjs/common";
import { OddsService } from "./odds.service";
import { CreateOddsDto } from "./dto/create-odds.dto";
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags, ApiNotFoundResponse } from "@nestjs/swagger";
import { FairOddsResponseDto, OddsSnapshotEnrichedDto, BestOddsDto } from "../common/api-types";
import { OddsImportService } from "./odds.import.service";
import { PrismaService } from "../prisma/prisma.service";

@ApiTags("Odds")
@Controller("matches/:matchId/odds")
export class OddsController {
  constructor(private readonly service: OddsService) {}

  @Post()
  @ApiOperation({ summary: "Ajouter un snapshot de cotes" })
  @ApiParam({ name: "matchId", type: Number })
  @ApiCreatedResponse({ type: OddsSnapshotEnrichedDto })
  add(@Param("matchId", ParseIntPipe) matchId: number, @Body() dto: CreateOddsDto) {
    return this.service.addSnapshot(matchId, dto);
  }

  @Get()
  @ApiOperation({ summary: "Lister les snapshots de cotes (enrichis)" })
  @ApiParam({ name: "matchId", type: Number })
  @ApiOkResponse({ type: OddsSnapshotEnrichedDto, isArray: true })
  list(@Param("matchId", ParseIntPipe) matchId: number) {
    return this.service.list(matchId);
  }

  @Get("latest")
  @ApiOperation({ summary: "Dernier snapshot de cotes (enrichi)" })
  @ApiNotFoundResponse({ description: "No odds snapshot for this match" })
  @ApiParam({ name: "matchId", type: Number })
  @ApiOkResponse({ type: OddsSnapshotEnrichedDto})
  latest(@Param("matchId", ParseIntPipe) matchId: number) {
    return this.service.latest(matchId);
  }

  @Get("best")
  @ApiOperation({ summary: "Meilleures cotes par issue (o1/oX/o2 max) + probas" })
  @ApiNotFoundResponse({ description: "No odds snapshot for this match" })
  @ApiParam({ name: "matchId", type: Number })
  @ApiOkResponse({ type: BestOddsDto })
  best(@Param("matchId", ParseIntPipe) matchId: number) {
    return this.service.best(matchId);
  }

  @Get("fair")
  @ApiOperation({ summary: "Vue fair odds + EV + double chance", description: "Source = latest ou best via query 'use'" })
  @ApiNotFoundResponse({ description: "No odds snapshot for this match" })
  @ApiParam({ name: "matchId", type: Number })
  @ApiQuery({ name: "use", required: false, enum: ["latest", "best"], example: "latest" })
  @ApiOkResponse({ type: FairOddsResponseDto })
  async fair(@Param("matchId", ParseIntPipe) matchId: number, @Query("use") use: "latest" | "best" = "latest") {
    const base = use === "best" ? await this.service.best(matchId) : await this.service.latest(matchId);
    if (!base) return null;
    const p = base.impliedNormalized;
    return {
      using: use,
      odds: { o1: base.o1, oX: base.oX, o2: base.o2 },
      probabilities: p,
      fair: { f1: 1 / p.p1, fX: 1 / p.pX, f2: 1 / p.p2 },
      ev: { "1": +(p.p1 * base.o1 - 1).toFixed(4), "X": +(p.pX * base.oX - 1).toFixed(4), "2": +(p.p2 * base.o2 - 1).toFixed(4) },
      doubleChance: (() => {
        const arr = [{ k: "1", v: p.p1 }, { k: "X", v: p.pX }, { k: "2", v: p.p2 }].sort((a, b) => b.v - a.v);
        const prob = arr[0].v + arr[1].v;
        return { legs: arr[0].k + arr[1].k, probability: prob, fairOdds: +(1 / prob).toFixed(3) };
      })(),
    }
  }
}