import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { Prisma, Match } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateMatchDto } from "./dto/create-match.dto";
import { UpdateMatchDto } from "./dto/update-match.dto";
import { ListMatchesQueryDto } from './dto/list-matches.query';

type OddsMode = 'none' | 'best' | 'latest';

interface MatchListItem {
  id: number;
  startsAt: Date;
  round: string | null;
  season: string | null;
  home: string | null;
  away: string | null;
  odds?: {
    mode: 'best' | 'latest';
    o1: number;
    oX: number;
    o2: number;
    book?: string | null;
    sampledAt?: Date | null;
  } | null;
}

const MAX_TAKE = 200;

const defaultTakeForLeague = (code?: string) => {
  const c = (code || '').toUpperCase();
  return c === 'L1' || c === 'BUN' ? 9 : 10;
}

@Injectable()
export class MatchesService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveCompetitionId(input: { competitionId?: number; competition?: string | null; }) {
    if (typeof input.competitionId === "number") return input.competitionId;
    if (input.competition && input.competition.trim()) {
      const comp = await this.prisma.competition.findFirst({
        where: { OR: [{ code: input.competition }, { name: input.competition }] },
        select: { id: true },
      });
      if (!comp) throw new NotFoundException(`Competition introuvable: ${input.competition}`);
      return comp.id;
    }
    return undefined;
  }

  async create(dto: CreateMatchDto): Promise<Match> {
    const competitionId = await this.resolveCompetitionId(dto);
    const data: Prisma.MatchUncheckedCreateInput = {
      homeTeamId: dto.homeTeamId,
      awayTeamId: dto.awayTeamId,
      startsAt: new Date(dto.startsAt),
      status: dto.status ?? "scheduled",
      venue: dto.venue ?? null,
      ...(competitionId !== undefined ? { competitionId } : {}),
      ...(dto.seasonId !== undefined ? { seasonId: dto.seasonId } : {}),
      ...(dto.roundId !== undefined ? { roundId: dto.roundId } : {}),
      ...(dto.afFixtureId !== undefined ? { afFixtureId: dto.afFixtureId } : {}),
    };
    return this.prisma.match.create({ data });
  }

  async update(id: number, dto: UpdateMatchDto): Promise<Match> {
    let competitionId: number | undefined = undefined;
    if (dto.competitionId !== undefined || (dto.competition && dto.competition.trim())) {
      competitionId = await this.resolveCompetitionId(dto);
    }
    const data: Prisma.MatchUncheckedUpdateInput = {
      ...(competitionId !== undefined ? { competitionId } : {}),
      ...(dto.seasonId !== undefined ? { seasonId: dto.seasonId } : {}),
      ...(dto.roundId !== undefined ? { roundId: dto.roundId } : {}),
      ...(dto.homeTeamId !== undefined ? { homeTeamId: dto.homeTeamId } : {}),
      ...(dto.awayTeamId !== undefined ? { awayTeamId: dto.awayTeamId } : {}),
      ...(dto.startsAt ? { startsAt: new Date(dto.startsAt) } : {}),
      ...(dto.status ? { status: dto.status } : {}),
      ...(dto.venue !== undefined ? { venue: dto.venue } : {}),
      ...(dto.afFixtureId !== undefined ? { afFixtureId: dto.afFixtureId } : {}),
    };
    return this.prisma.match.update({ where: { id }, data });
  }

  async findOne(id: number, opts?: { withImpact?: boolean; impactTop?: number }) {
    const m = await this.prisma.match.findUnique({
      where: { id },
      include: { homeTeam: true, awayTeam: true, season: true }, // ensure 'season' is included if available
    });
    if (!m) throw new NotFoundException(`Match ${id} introuvable`);
  
    let impact: any = undefined;
    if (opts?.withImpact && m.season?.id) {
      const top = Math.max(1, Math.min(10, opts.impactTop ?? 5));
      const [homeImp, awayImp] = await Promise.all([
        this.prisma.playerImpact.findMany({
          where: { teamId: m.homeTeamId, seasonId: m.season.id, span: process.env.PLAYER_IMPACT_SPAN ? String((process.env.PLAYER_IMPACT_SPAN.match(/^(\d+)/)||[])[1] ?? '10') : '10' },
          orderBy: { impact: 'desc' }, take: top,
          include: { player: true },
        }),
        this.prisma.playerImpact.findMany({
          where: { teamId: m.awayTeamId, seasonId: m.season.id, span: process.env.PLAYER_IMPACT_SPAN ? String((process.env.PLAYER_IMPACT_SPAN.match(/^(\d+)/)||[])[1] ?? '10') : '10' },
          orderBy: { impact: 'desc' }, take: top,
          include: { player: true },
        }),
      ]);
      impact = {
        home: homeImp.map(r => ({ playerId: r.playerId, name: r.player.name, pos: r.player.position, impact: r.impact, minutes: r.minutes, starts: r.starts, goalInv: r.goalInv })),
        away: awayImp.map(r => ({ playerId: r.playerId, name: r.player.name, pos: r.player.position, impact: r.impact, minutes: r.minutes, starts: r.starts, goalInv: r.goalInv })),
      };
    }
  
    return {
      id: m.id,
      home: m.homeTeam?.name ?? null,
      away: m.awayTeam?.name ?? null,
      startsAt: m.startsAt,
      ...(impact ? { playerImpact: impact } : {}),
    };
  }
  
  findAll() { return this.prisma.match.findMany({ orderBy: { startsAt: "asc" } }); }
  remove(id: number) { return this.prisma.match.delete({ where: { id } }); }

  async list(query: ListMatchesQueryDto): Promise<MatchListItem[]> {
    try {
      const { where, oddsMode, take, include } = this.buildQueryPieces(query);

      // latest -> un seul round-trip DB
      if (oddsMode === 'latest') {
        const rows = await this.prisma.match.findMany({
          where,
          orderBy: { startsAt: 'asc' },
          take,
          include, // inclut odds triées + take:1
        });
        return rows.map(this.formatWithLatest);
      }

      // none/best -> 1) matches  2) (si best) groupBy Odds
      const rows = await this.prisma.match.findMany({
        where,
        orderBy: { startsAt: 'asc' },
        take,
        include: { homeTeam: true, awayTeam: true, round: true, season: true },
      });

      if (!rows.length) return [];

      if (oddsMode === 'none') {
        return rows.map(this.formatBare);
      }

      // oddsMode === 'best'
      const ids = rows.map((m) => m.id);
      const best = await this.prisma.odds.groupBy({
        by: ['matchId'],
        where: { matchId: { in: ids } },
        _max: { o1: true, oX: true, o2: true },
      });

      const mapBest = new Map<number, { o1: number | null; oX: number | null; o2: number | null }>();
      for (const row of best) {
        mapBest.set(row.matchId, { o1: row._max.o1, oX: row._max.oX, o2: row._max.o2 });
      }

      return rows.map((m) => {
        const b = mapBest.get(m.id);
        return {
          id: m.id,
          startsAt: m.startsAt,
          round: m.round?.name ?? null,
          season: m.season?.label ?? null,
          home: m.homeTeam?.name ?? null,
          away: m.awayTeam?.name ?? null,
          odds:
            b && b.o1 != null && b.oX != null && b.o2 != null
              ? { mode: 'best', o1: b.o1, oX: b.oX, o2: b.o2 }
              : null,
        };
      });
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }
  }

  // ---------- Helpers ----------

  /** Construit where/include/take/oddsMode à partir des query params (casting robuste) */
  private buildQueryPieces(query: ListMatchesQueryDto): {
    where: Prisma.MatchWhereInput;
    include?: Prisma.MatchInclude;
    take: number;
    oddsMode: OddsMode;
  } {
    const code = query.league ? String(query.league).toUpperCase().trim() : undefined;
    const seasonYear = query.season != null ? Number(query.season) : undefined;
    const oddsMode: OddsMode = (query.odds as OddsMode) ?? 'none';
    const scope: 'all' | 'upcoming' | 'past' = (query.scope as any) ?? 'all';

    if (query.season != null && Number.isNaN(seasonYear!)) {
      throw new BadRequestException(`Invalid season year "${query.season}"`);
    }

    // filtre temps
    const timeFilter: Prisma.DateTimeFilter = {};
    const fromDate = query.from ? new Date(String(query.from)) : undefined;
    const toDate = query.to ? new Date(String(query.to)) : undefined;
    if (fromDate && !isNaN(fromDate.getTime())) timeFilter.gte = fromDate;
    if (toDate && !isNaN(toDate.getTime())) timeFilter.lte = toDate;
    if (!fromDate && !toDate && scope !== 'all') {
      const now = new Date();
      if (scope === 'upcoming') timeFilter.gte = now;
      if (scope === 'past') timeFilter.lt = now;
    }

    // filtre relationnel direct (pas de requêtes préalables)
    const seasonRel: Prisma.SeasonRelationFilter | Prisma.SeasonWhereInput = {};
    if (code) (seasonRel as Prisma.SeasonWhereInput).competition = { code };
    if (seasonYear != null) (seasonRel as Prisma.SeasonWhereInput).label = `${seasonYear}-${seasonYear + 1}`;

    const where: Prisma.MatchWhereInput = {};
    if (Object.keys(seasonRel).length) where.season = seasonRel as any;
    if (Object.keys(timeFilter).length) where.startsAt = timeFilter;

    const takeDefault = defaultTakeForLeague(code);
    const take = Math.min(Math.max(Number(query.limit ?? takeDefault), 1), MAX_TAKE);

    // include si latest
    const include: Prisma.MatchInclude | undefined =
      oddsMode === 'latest'
        ? {
            homeTeam: true,
            awayTeam: true,
            round: true,
            season: true,
            odds: {
              orderBy: { sampledAt: 'desc' },
              take: 1,
              select: { o1: true, oX: true, o2: true, book: true, sampledAt: true },
            },
          }
        : undefined;

    return { where, include, take, oddsMode };
  }

  private formatBare = (m: any): MatchListItem => ({
    id: m.id,
    startsAt: m.startsAt,
    round: m.round?.name ?? null,
    season: m.season?.label ?? null,
    home: m.homeTeam?.name ?? null,
    away: m.awayTeam?.name ?? null,
  });

  private formatWithLatest = (m: any): MatchListItem => ({
    id: m.id,
    startsAt: m.startsAt,
    round: m.round?.name ?? null,
    season: m.season?.label ?? null,
    home: m.homeTeam?.name ?? null,
    away: m.awayTeam?.name ?? null,
    odds: Array.isArray(m.odds) && m.odds[0]
      ? { mode: 'latest', ...m.odds[0] }
      : null,
  });
}
