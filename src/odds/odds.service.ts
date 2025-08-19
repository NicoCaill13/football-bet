import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateOddsDto } from "./dto/create-odds.dto";
import { devig, impliedFromOdds } from "../common/odds.util";

@Injectable()
export class OddsService {
  constructor(private prisma: PrismaService) {}

  async addSnapshot(matchId: number, dto: CreateOddsDto) {
    const match = await this.prisma.match.findUnique({ where: { id: matchId } });
    if (!match) throw new NotFoundException("Match not found");

    const rec = await this.prisma.odds.create({
      data: { matchId, book: dto.book, o1: dto.o1, oX: dto.oX, o2: dto.o2 },
    });

    const implied = impliedFromOdds(dto.o1, dto.oX, dto.o2);
    const norm = devig(implied);
    return { ...rec, implied, impliedNormalized: norm };
  }

  async list(matchId: number) {
    const match = await this.prisma.match.findUnique({ where: { id: matchId } });
    if (!match) throw new NotFoundException("Match not found");

    const rows = await this.prisma.odds.findMany({
      where: { matchId },
      orderBy: { sampledAt: "desc" },
    });

    return rows.map((r) => {
      const implied = impliedFromOdds(r.o1, r.oX, r.o2);
      const norm = devig(implied);
      return { ...r, implied, impliedNormalized: norm };
    });
  }

  async latest(matchId: number) {
    const rows = await this.prisma.odds.findMany({
      where: { matchId },
      orderBy: { sampledAt: "desc" },
      take: 1,
    });
    if (!rows.length) return null;
    const r = rows[0];
    const implied = impliedFromOdds(r.o1, r.oX, r.o2);
    const norm = devig(implied);
    return { ...r, implied, impliedNormalized: norm };
  }

  async best(matchId: number) {
    const rows = await this.prisma.odds.findMany({ where: { matchId } });
    if (!rows.length) return null;
  
    const o1 = Math.max(...rows.map(r => r.o1));
    const oX = Math.max(...rows.map(r => r.oX));
    const o2 = Math.max(...rows.map(r => r.o2));
  
    const implied = impliedFromOdds(o1, oX, o2);
    const impliedNormalized = devig(implied);
    return { o1, oX, o2, implied, impliedNormalized };
  }
  
}
