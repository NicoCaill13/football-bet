import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { InjuryReportDto } from "./dto/report.dto";

@Injectable()
export class InjuriesService {
  constructor(private prisma: PrismaService) {}

  async report(dto: InjuryReportDto) {
    let teamId = dto.teamId;
    if (!teamId && dto.teamSlug) {
      const t = await this.prisma.team.findUnique({ where: { slug: dto.teamSlug } });
      if (!t) throw new NotFoundException("Team not found by slug");
      teamId = t.id;
    }
    if (!teamId) throw new NotFoundException("teamSlug or teamId required");

    return this.prisma.injuryReport.create({
      data: { teamId, player: dto.player, status: dto.status, source: dto.source },
    });
  }

  recentOutCount(teamId: number, days = 14) {
    const since = new Date(Date.now() - days * 86400000);
    return this.prisma.injuryReport.count({ where: { teamId, status: "out", reportedAt: { gte: since } } });
  }
}
