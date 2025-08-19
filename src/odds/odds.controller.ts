import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from "@nestjs/common";
import { OddsService } from "./odds.service";
import { CreateOddsDto } from "./dto/create-odds.dto";
import { fairFromProb } from "../common/odds.util";

@Controller("matches/:matchId/odds")
export class OddsController {
  constructor(private readonly service: OddsService) {}

  @Post()
  add(@Param("matchId", ParseIntPipe) matchId: number, @Body() dto: CreateOddsDto) {
    return this.service.addSnapshot(matchId, dto);
  }

  @Get()
  list(@Param("matchId", ParseIntPipe) matchId: number) {
    return this.service.list(matchId);
  }

  @Get("latest")
  latest(@Param("matchId", ParseIntPipe) matchId: number) {
    return this.service.latest(matchId);
  }

  @Get("best")
  best(@Param("matchId", ParseIntPipe) matchId: number) {
    return this.service.best(matchId);
  }

  @Get("fair")
  async fair(
    @Param("matchId", ParseIntPipe) matchId: number,
    @Query("use") use: "latest" | "best" = "latest",
  ) {
    const base = use === "best" ? await this.service.best(matchId) : await this.service.latest(matchId);
    if (!base) return null;
    const p = base.impliedNormalized;
    return {
      using: use,
      odds: { o1: base.o1, oX: base.oX, o2: base.o2 },
      probabilities: p,
      fair: { f1: fairFromProb(p.p1), fX: fairFromProb(p.pX), f2: fairFromProb(p.p2) },
      ev: {
        "1": Number((p.p1 * base.o1 - 1).toFixed(4)),
        "X": Number((p.pX * base.oX - 1).toFixed(4)),
        "2": Number((p.p2 * base.o2 - 1).toFixed(4)),
      },
      doubleChance: (() => {
        const arr = [
          { k: "1", v: p.p1 },
          { k: "X", v: p.pX },
          { k: "2", v: p.p2 },
        ].sort((a, b) => b.v - a.v);
        const prob = arr[0].v + arr[1].v;
        return { legs: arr[0].k + arr[1].k, probability: prob, fairOdds: Number((1 / prob).toFixed(3)) };
      })(),
    };
  }
}
