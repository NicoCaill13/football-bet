import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

type OddsMode = 'best' | 'latest';

const WEIGHTS = { elo: 0.30, xg: 0.15, inj: 0.10, rest: 0.05, draw: 0.05 };
const CAP_KELLY = 0.02;
const INJ_SINCE_DAYS = 14;
const XG_SPAN = '5' as const;

function safeLog(x: number) { return Math.log(Math.max(x, 1e-9)); }

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

function kellyFraction(p: number, odds: number) {
  const b = Math.max(odds - 1, 0);
  if (b <= 0) return 0;
  const f = (p * b - (1 - p)) / b;
  return Math.max(0, Math.min(f, CAP_KELLY));
}

function clamp(x: number, lo: number, hi: number) {
    return Math.max(lo, Math.min(hi, x));
  }
  

@Injectable()
export class PredictionService {
  constructor(private readonly prisma: PrismaService) {}

  private async getInjuryCounts(homeId: number, awayId: number) {
    const since = new Date(Date.now() - INJ_SINCE_DAYS * 24 * 3600 * 1000);
    const [outHome, outAway] = await Promise.all([
      this.prisma.injuryReport.count({ where: { teamId: homeId, status: 'out', reportedAt: { gte: since } } }),
      this.prisma.injuryReport.count({ where: { teamId: awayId, status: 'out', reportedAt: { gte: since } } }),
    ]);
    return { outHome, outAway };
  }
  
  async predictMatchSummary(matchId: number, oddsMode: 'best' | 'latest' = 'best') {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: { homeTeam: true, awayTeam: true },
    });
    if (!match) throw new BadRequestException(`Match ${matchId} introuvable`);
  
    // cotes 1X2
    const odds = await this.getOdds(matchId, oddsMode);
    if (!odds) throw new BadRequestException(`Cotes 1X2 indisponibles pour match ${matchId}`);
  
    // 1) base marché (fair)
    const base = normalizeFromOdds(odds.o1, odds.oX, odds.o2);
  
    // 2) signaux (tilts)
    const [eloH, eloA, xgDelta, injCounts, restDelta] = await Promise.all([
      this.getElo(match.homeTeamId),
      this.getElo(match.awayTeamId),
      this.getXgDelta(match.homeTeamId, match.awayTeamId),
      this.getInjuryCounts(match.homeTeamId, match.awayTeamId),
      this.getRestDiff(match.homeTeamId, match.awayTeamId, match.startsAt),
    ]);
    const injDelta = injCounts.outAway - injCounts.outHome; // + => avantage domicile
  
    const eloTilt  = WEIGHTS.elo  * ((eloH - eloA) / 100);
    const xgTilt   = WEIGHTS.xg   * clamp(xgDelta, -2, 2);
    const injTilt  = WEIGHTS.inj  * injDelta;
    const restTilt = WEIGHTS.rest * restDelta;
    const totalDelta = eloTilt + xgTilt + injTilt + restTilt;
  
    // bump nul optionnel (plus le match est équilibré, plus on gonfle pX)
    const drawBump = WEIGHTS.draw * (1 - Math.abs(base.p1 - base.p2) / 0.5);
  
    // 3) logits & ré-agrégation
    const baseLog = logitsFromPX(base.p1, base.pX, base.p2);
    const l1p = baseLog.l1 + totalDelta - drawBump;
    const l2p = baseLog.l2 - totalDelta - drawBump;
    const adj = probsFromLogits(l1p, l2p);
  
    const arr: { key: '1' | 'X' | '2'; p: number }[] = [
        { key: '1', p: adj.p1 },
        { key: 'X', p: adj.pX },
        { key: '2', p: adj.p2 },
      ];
      arr.sort((a, b) => b.p - a.p);

    const winner = arr[0].key;
    const winnerTeam =
      winner === '1' ? (match.homeTeam?.name ?? 'Home')
      : winner === '2' ? (match.awayTeam?.name ?? 'Away')
      : 'Draw';
  
    return {
      match: {
        id: match.id,
        home: match.homeTeam?.name ?? null,
        away: match.awayTeam?.name ?? null,
        startsAt: match.startsAt,
      },
      usingOdds: { mode: oddsMode, o1: odds.o1, oX: odds.oX, o2: odds.o2 },
      probabilities: {
        market: base,
        adjusted: adj,
      },
      prediction: {
        winner,           // "1" | "X" | "2"
        winnerTeam,       // libellé
        probability: arr[0].p,
      },
      drivers: {
        weights: WEIGHTS,
        elo:  { home: eloH, away: eloA, delta: eloH - eloA, tilt: eloTilt },
        xg:   { delta: xgDelta, tilt: xgTilt },
        injuries: { outHome: injCounts.outHome, outAway: injCounts.outAway, delta: injDelta, tilt: injTilt },
        rest: { diffDays: restDelta, tilt: restTilt },
        drawBump,
        totalDelta,
      },
    };
  }

  /** Récupère les cotes (best|latest) pour un match; renvoie null si absent/incomplet */
  private async getOdds(matchId: number, mode: OddsMode) {
    if (mode === 'latest') {
      const row = await this.prisma.odds.findFirst({
        where: { matchId },
        orderBy: { sampledAt: 'desc' },
      });
      if (!row || row.o1 == null || row.oX == null || row.o2 == null) return null;
      return { mode, o1: row.o1, oX: row.oX, o2: row.o2, book: row.book, sampledAt: row.sampledAt };
    }
    // best: on récupère toutes les lignes et on prend le max par issue
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
    const [h, a] = await Promise.all([
      this.prisma.xgTeamRolling.findUnique({ where: { teamId_span: { teamId: homeId, span: XG_SPAN } } }),
      this.prisma.xgTeamRolling.findUnique({ where: { teamId_span: { teamId: awayId, span: XG_SPAN } } }),
    ]);
    const hx = (h?.xgFor ?? 0) - (h?.xgAgainst ?? 0);
    const ax = (a?.xgFor ?? 0) - (a?.xgAgainst ?? 0);
    return hx - ax; // positif => avantage home
  }

  private async getInjuryDiff(homeId: number, awayId: number) {
    const since = new Date(Date.now() - INJ_SINCE_DAYS * 24 * 3600 * 1000);
    const [outH, outA] = await Promise.all([
      this.prisma.injuryReport.count({ where: { teamId: homeId, status: 'out', reportedAt: { gte: since } } }),
      this.prisma.injuryReport.count({ where: { teamId: awayId, status: 'out', reportedAt: { gte: since } } }),
    ]);
    return outA - outH; // positif => avantage home
  }

  private async getRestDiff(homeId: number, awayId: number, startsAt: Date) {
    const lastHome = await this.prisma.match.findFirst({
      where: {
        startsAt: { lt: startsAt },
        OR: [{ homeTeamId: homeId }, { awayTeamId: homeId }],
      },
      orderBy: { startsAt: 'desc' },
      select: { startsAt: true },
    });
    const lastAway = await this.prisma.match.findFirst({
      where: {
        startsAt: { lt: startsAt },
        OR: [{ homeTeamId: awayId }, { awayTeamId: awayId }],
      },
      orderBy: { startsAt: 'desc' },
      select: { startsAt: true },
    });
    const dh = lastHome ? Math.max(0, (startsAt.getTime() - lastHome.startsAt.getTime()) / 86400000) : 10;
    const da = lastAway ? Math.max(0, (startsAt.getTime() - lastAway.startsAt.getTime()) / 86400000) : 10;
    return dh - da; // positif => avantage home
  }

  async predictMatch(matchId: number, oddsMode: OddsMode = 'best') {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: { homeTeam: true, awayTeam: true },
    });
    if (!match) throw new BadRequestException(`Match ${matchId} introuvable`);
    const odds = await this.getOdds(matchId, oddsMode);
    if (!odds) throw new BadRequestException(`Cotes 1X2 indisponibles pour match ${matchId}`);

    // 1) Base marché (fair probs)
    const base = normalizeFromOdds(odds.o1, odds.oX, odds.o2);

    // 2) Log-odds
    const baseLog = logitsFromPX(base.p1, base.pX, base.p2);

    // 3) Tilts
    const [eloH, eloA, xgDelta, injDelta, restDelta] = await Promise.all([
      this.getElo(match.homeTeamId),
      this.getElo(match.awayTeamId),
      this.getXgDelta(match.homeTeamId, match.awayTeamId),
      this.getInjuryDiff(match.homeTeamId, match.awayTeamId),
      this.getRestDiff(match.homeTeamId, match.awayTeamId, match.startsAt),
    ]);

    const delta =
      WEIGHTS.elo * ((eloH - eloA) / 100) +
      WEIGHTS.xg  * Math.max(-2, Math.min(2, xgDelta)) +
      WEIGHTS.inj * (injDelta) +
      WEIGHTS.rest* (restDelta);

    // bump nul optionnel
    const tDraw = WEIGHTS.draw * (1 - Math.abs(base.p1 - base.p2) / 0.5);

    const l1p = baseLog.l1 + delta - tDraw;
    const l2p = baseLog.l2 - delta - tDraw;

    // 4) Probas ajustées
    const adj = probsFromLogits(l1p, l2p);

    // 5) EV & pick
    const ev1 = adj.p1 * odds.o1 - 1;
    const evX = adj.pX * odds.oX - 1;
    const ev2 = adj.p2 * odds.o2 - 1;

    const entries: Array<{ key: '1'|'X'|'2'; p: number; o: number; ev: number }> = [
      { key: '1', p: adj.p1, o: odds.o1, ev: ev1 },
      { key: 'X', p: adj.pX, o: odds.oX, ev: evX },
      { key: '2', p: adj.p2, o: odds.o2, ev: ev2 },
    ];
    entries.sort((a,b)=> b.ev - a.ev);
    const pick = entries[0];

    // Confiance simple : gap proba top2 + bonus EV
    const sortedByP = [...entries].sort((a,b)=> b.p - a.p);
    const gapP = sortedByP[0].p - sortedByP[1].p;
    const confidence = Math.max(1, Math.min(100, Math.round(100*(0.6*gapP + 0.4*Math.max(0, pick.ev)))) );

    const stake = kellyFraction(pick.p, pick.o);

    return {
      match: {
        id: match.id,
        home: match.homeTeam?.name ?? null,
        away: match.awayTeam?.name ?? null,
        startsAt: match.startsAt,
      },
      usingOdds: { mode: oddsMode, o1: odds.o1, oX: odds.oX, o2: odds.o2 },
      probabilities_market: base,
      probabilities_adjusted: adj,
      ev: { '1': round3(ev1), 'X': round3(evX), '2': round3(ev2) },
      pick: pick.key,
      confidence,
      stake: { suggestedFraction: round4(stake), note: `kelly cap=${CAP_KELLY}` },
      rationale: [
        `ΔElo=${(eloH-eloA)} ⇒ tilt=${round3(WEIGHTS.elo*((eloH-eloA)/100))}`,
        `ΔxG=${round3(xgDelta)} ⇒ tilt=${round3(WEIGHTS.xg*Math.max(-2,Math.min(2,xgDelta)))}`,
        `inj(outA-outH)=${injDelta} ⇒ tilt=${round3(WEIGHTS.inj*injDelta)}`,
        `rest(daysH-daysA)=${round3(restDelta)} ⇒ tilt=${round3(WEIGHTS.rest*restDelta)}`,
        `drawBump=${round3(tDraw)}`,
        `gapP=${round1(100*gapP)} pts, bestEV=${pick.key}:${round3(pick.ev)}`
      ],
    };
  }
}

function round3(x: number){ return Math.round(x*1000)/1000; }
function round4(x: number){ return Math.round(x*10000)/10000; }
function round1(x: number){ return Math.round(x*10)/10; }
