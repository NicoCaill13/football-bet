import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UpsertXgDto } from "./dto/upsert-xg.dto";

@Injectable()
export class XgService {
  constructor(private prisma: PrismaService) {}

  async upsert(dto: UpsertXgDto) {
    let teamId = dto.teamId;
    if (!teamId && dto.teamSlug) {
      const t = await this.prisma.team.findUnique({ where: { slug: dto.teamSlug } });
      if (!t) throw new NotFoundException("Team not found by slug");
      teamId = t.id;
    }
    if (!teamId) throw new NotFoundException("teamSlug or teamId required");

    return this.prisma.xgTeamRolling.upsert({
      where: { teamId_span: { teamId, span: dto.span } },
      update: { xgFor: dto.xgFor, xgAgainst: dto.xgAgainst, updatedAt: new Date() },
      create: { teamId, span: dto.span, xgFor: dto.xgFor, xgAgainst: dto.xgAgainst },
    });
  }

  get(teamId: number, span: string) {
    return this.prisma.xgTeamRolling.findUnique({ where: { teamId_span: { teamId, span } } });
  }
}
