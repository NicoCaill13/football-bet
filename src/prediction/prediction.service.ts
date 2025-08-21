import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { getDecisionConfig, OddsMode } from 'src/prediction/prediction.config'


function safeLog(x: number) { 
  return Math.log(Math.max(x, 1e-9)); 
}

function clamp(x: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, x));
}

function normalizeFromOdds(o1: number, oX: number, o2: number) {
  const q1 = 1 / o1, qX = 1 / oX, q2 = 1 / o2;
  const s = q1 + qX + q2;
  return { p1: q1 / s, pX: qX / s, p2: q2 / s };
}

function logitsFromPX(p1: number, pX: number, p2: number) {
  return { l1: safeLog(p1 / pX), l2: safeLog(p2 / pX) };
}

function probsFromLogits(l1: number, l2: number) {
  const e1 = Math.exp(l1), e2 = Math.exp(l2);
  const Z = 1 + e1 + e2;
  return { p1: e1 / Z, p2: e2 / Z, pX: 1 - (e1 + e2) / Z };
}

@Injectable()
export class PredictionService {
  private readonly cfg = getDecisionConfig();
  constructor(private readonly prisma: PrismaService) {}


  private async getOdds(matchId: number, mode: OddsMode) {
    if (mode === 'latest') {
      const row = await this.prisma.odds.findFirst({
        where: { matchId },
        orderBy: { sampledAt: 'desc' },
      });
      if (!row || row.o1 == null || row.oX == null || row.o2 == null) return null;
      return { mode, o1: row.o1, oX: row.oX, o2: row.o2, book: row.book, sampledAt: row.sampledAt };
    }
    // best
    const rows = await this.prisma.odds.findMany({ where: { matchId } });
    if (!rows.length) return null;
    let o1 = 0, oX = 0, o2 = 0;
    for (const r of rows) {
      if (r.o1 != null) o1 = Math.max(o1, r.o1);
      if (r.oX != null) oX = Math.max(oX, r.oX);
      if (r.o2 != null) o2 = Math.max(o2, r.o2);
    }
    if (o1 === 0 || oX === 0 || o2 === 0) return null;
    return { mode, o1, oX, o2 };
  }

  private async getElo(teamId: number) {
    const e = await this.prisma.eloRating.findFirst({
      where: { teamId }, orderBy: { ratedAt: 'desc' },
    });
    return e?.rating ?? 1500;
  }

  private async getXgDelta(homeId: number, awayId: number) {
    const spanKey = this.cfg.xgSpanKey; // ex: "5"
    const [h, a] = await Promise.all([
      this.prisma.xgTeamRolling.findUnique({ where: { teamId_span: { teamId: homeId, span: spanKey } } }),
      this.prisma.xgTeamRolling.findUnique({ where: { teamId_span: { teamId: awayId, span: spanKey } } }),
    ]);
    const hx = (h?.xgFor ?? 0) - (h?.xgAgainst ?? 0);
    const ax = (a?.xgFor ?? 0) - (a?.xgAgainst ?? 0);
    return hx - ax; // + => avantage home
  }

  private async getInjuryCounts(homeId: number, awayId: number) {
    const since = new Date(Date.now() - this.cfg.injLookbackDays * 86400000);
    const [outHome, outAway] = await Promise.all([
      this.prisma.injuryReport.count({ where: { teamId: homeId, status: 'out', reportedAt: { gte: since } } }),
      this.prisma.injuryReport.count({ where: { teamId: awayId, status: 'out', reportedAt: { gte: since } } }),
    ]);
    return { outHome, outAway };
  }

  private async getRestDiff(homeId: number, awayId: number, startsAt: Date) {
    const lastHome = await this.prisma.match.findFirst({
      where: { startsAt: { lt: startsAt }, OR: [{ homeTeamId: homeId }, { awayTeamId: homeId }] },
      orderBy: { startsAt: 'desc' },
      select: { startsAt: true },
    });
    const lastAway = await this.prisma.match.findFirst({
      where: { startsAt: { lt: startsAt }, OR: [{ homeTeamId: awayId }, { awayTeamId: awayId }] },
      orderBy: { startsAt: 'desc' },
      select: { startsAt: true },
    });
    const dh = lastHome ? Math.max(0, (startsAt.getTime() - lastHome.startsAt.getTime()) / 86400000) : 10;
    const da = lastAway ? Math.max(0, (startsAt.getTime() - lastAway.startsAt.getTime()) / 86400000) : 10;
    return dh - da; // + => avantage home
  }

  async predictMatchSummary(matchId: number, oddsMode?: OddsMode) {
    const cfg = this.cfg;
    const mode: OddsMode = oddsMode ?? (cfg.useBestOdds ? 'best' : 'latest');

    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: { homeTeam: true, awayTeam: true },
    });
    if (!match) throw new BadRequestException(`Match ${matchId} introuvable`);
    const odds = await this.getOdds(matchId, mode);
    if (!odds) throw new BadRequestException(`Cotes 1X2 indisponibles pour match ${matchId}`);

    // 1) Probas marché "fair"
    const base = normalizeFromOdds(odds.o1, odds.oX, odds.o2);

    // 2) Signaux (tilts)
    const [eloH, eloA, xgDelta, inj, restDelta] = await Promise.all([
      this.getElo(match.homeTeamId),
      this.getElo(match.awayTeamId),
      this.getXgDelta(match.homeTeamId, match.awayTeamId),
      this.getInjuryCounts(match.homeTeamId, match.awayTeamId),
      this.getRestDiff(match.homeTeamId, match.awayTeamId, match.startsAt),
    ]);
    const injDelta = inj.outAway - inj.outHome; // + => avantage home

    // Elo : on ajoute l’avantage domicile (pts) côté home
    const eloDeltaPts = (eloH + cfg.eloHomeAdv) - eloA;
    const eloTilt  = cfg.alphaElo  * (eloDeltaPts / 100);
    const xgTilt   = cfg.alphaXg   * clamp(xgDelta, -2, 2);
    const injTilt  = cfg.alphaInj  * injDelta;
    const restTilt = cfg.alphaRest * restDelta;
    const totalDelta = eloTilt + xgTilt + injTilt + restTilt;

    // Draw bump : +pX si match équilibré ; négatif si déséquilibré
    const drawBump = cfg.alphaDraw * (1 - Math.abs(base.p1 - base.p2) / 0.5);

    // 3) Log-odds -> probas ajustées
    const baseLog = logitsFromPX(base.p1, base.pX, base.p2);
    const l1p = baseLog.l1 + totalDelta - drawBump;
    const l2p = baseLog.l2 - totalDelta - drawBump;
    const adj = probsFromLogits(l1p, l2p);

    // 4) vainqueur
    const arr: { key: '1' | 'X' | '2'; p: number }[] = [
      { key: '1', p: adj.p1 },
      { key: 'X', p: adj.pX },
      { key: '2', p: adj.p2 },
    ];
    arr.sort((a, b) => b.p - a.p);

    const winner = arr[0].key;
    const winnerTeam =
      winner === '1' ? (match.homeTeam?.name ?? 'Home') :
      winner === '2' ? (match.awayTeam?.name ?? 'Away') :
      'Draw';

    return {
      match: {
        id: match.id,
        home: match.homeTeam?.name ?? null,
        away: match.awayTeam?.name ?? null,
        startsAt: match.startsAt,
      },
      usingOdds: { mode, o1: odds.o1, oX: odds.oX, o2: odds.o2 },
      probabilities: { market: base, adjusted: adj },
      prediction: { winner, winnerTeam, probability: arr[0].p },
      drivers: {
        weights: {
          elo: cfg.alphaElo, xg: cfg.alphaXg, inj: cfg.alphaInj, rest: cfg.alphaRest, draw: cfg.alphaDraw,
        },
        elo:  { home: eloH, away: eloA, delta: eloH - eloA, homeAdv: cfg.eloHomeAdv, tilt: eloTilt },
        xg:   { delta: xgDelta, tilt: xgTilt, span: cfg.xgSpanKey },
        injuries: { outHome: inj.outHome, outAway: inj.outAway, delta: injDelta, tilt: injTilt, lookbackDays: cfg.injLookbackDays },
        rest: { diffDays: restDelta, tilt: restTilt },
        drawBump,
        totalDelta,
      },
    };
  }
}

