import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { predictionConfig as C } from './prediction.config';

type Prob = { p1: number; pX: number; p2: number };
type OddsSet = { o1: number; oX: number; o2: number };

@Injectable()
export class PredictionService {
  private readonly log = new Logger('PredictionService');

  constructor(private readonly prisma: PrismaService) {}

  // -------- Public summary --------
  async getSummary(matchId: number, oddsMode?: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        homeTeam: true,
        awayTeam: true,
        round: { include: { season: { include: { competition: true } } } },
      },
    });
    if (!match) throw new Error(`Match ${matchId} not found`);

    const homeId = match.homeTeamId;
    const awayId = match.awayTeamId;
    const startsAt = match.startsAt;
    const seasonId = match.round?.season?.id ?? null;

    // 1) Odds → proba marché
    const use = oddsMode ?? (C.odds.useBest ? 'best' : 'latest');
    const odds = await this.getOddsForMatch(matchId, use);
    const market: Prob = this.oddsToProb(odds);

    // 2) Tilts
    const eloDelta = await this.tiltElo(homeId, awayId);
    const xgDelta = await this.tiltXg(homeId, awayId);
    const restDelta = await this.tiltRest(homeId, awayId, startsAt);
    const injDelta = await this.tiltInjuries(
      homeId,
      awayId,
      seasonId,
      startsAt,
    );
    const congDelta = await this.tiltCongestion(homeId, awayId, startsAt);
    const lookDelta = await this.tiltLookaheadEurope(homeId, awayId, startsAt);

    const totalDelta =
      eloDelta + xgDelta + restDelta + injDelta + congDelta + lookDelta;

    // 3) Draw bump
    const drawBump = await this.computeDrawBump(congDelta);

    // 4) Ajustement
    const adjusted = this.applyDeltaAndDraw(market, totalDelta, drawBump);

    // 5) Pick + Stake (Kelly cap)
    const ev = this.expectedValues(adjusted, odds);
    const pick =
      C.pickRule === 'prob' ? this.pickByProb(adjusted) : this.pickFromEV(ev);
    const kelly = this.kellyFraction(adjusted, odds, pick);

    const suggested = Math.min(C.stake.cap, Math.max(0, kelly));

    const winnerTeam =
      pick === '1'
        ? match.homeTeam?.name
        : pick === '2'
          ? match.awayTeam?.name
          : 'Draw';

    return {
      match: {
        id: match.id,
        home: match.homeTeam?.name,
        away: match.awayTeam?.name,
        startsAt,
      },
      usingOdds: { mode: use, ...odds },
      probabilities: { market, adjusted },
      prediction: {
        winner: pick,
        winnerTeam,
        probability: adjusted[pick === '1' ? 'p1' : pick === '2' ? 'p2' : 'pX'],
      },
      drivers: {
        weights: { ...C.weights },
        elo: { homeAdv: C.elo.homeAdv, delta: eloDelta },
        xg: { span: C.xg.spanKey, delta: xgDelta },
        injuries: {
          lookbackDays: C.injuries.lookbackDays,
          span: C.injuries.impactSpanKey,
          delta: injDelta,
        },
        rest: { capDays: C.rest.capDays, delta: restDelta },
        congestion: { windowDays: C.congestion.windowDays, delta: congDelta },
        lookaheadEurope: { days: C.lookahead.days, delta: lookDelta },
        drawBump,
        totalDelta,
      },
      stake: {
        suggestedFraction: suggested,
        note: suggested === C.stake.cap ? `kelly cap=${C.stake.cap}` : 'kelly',
      },
    };
  }

  // -------- Tilts --------

  private async tiltElo(homeId: number, awayId: number) {
    const [eh, ea] = await Promise.all([
      this.prisma.eloRating.findFirst({
        where: { teamId: homeId },
        orderBy: { ratedAt: 'desc' },
      }),
      this.prisma.eloRating.findFirst({
        where: { teamId: awayId },
        orderBy: { ratedAt: 'desc' },
      }),
    ]);
    const rh = (eh?.rating ?? 1500) + C.elo.homeAdv;
    const ra = ea?.rating ?? 1500;
    const deltaPts = rh - ra; // + → avantage home
    const norm = deltaPts / 400; // borne douce
    return C.weights.elo * norm;
  }

  private async tiltXg(homeId: number, awayId: number) {
    const span = C.xg.spanKey;
    const [xh, xa] = await Promise.all([
      this.prisma.xgTeamRolling.findUnique({
        where: { teamId_span: { teamId: homeId, span } },
      }),
      this.prisma.xgTeamRolling.findUnique({
        where: { teamId_span: { teamId: awayId, span } },
      }),
    ]);
    const h = (xh?.xgFor ?? 0) - (xh?.xgAgainst ?? 0);
    const a = (xa?.xgFor ?? 0) - (xa?.xgAgainst ?? 0);
    const diff = h - a; // + → avantage home
    const norm = diff / 2; // ~[-1..1]
    return C.weights.xg * norm;
  }

  private async tiltRest(homeId: number, awayId: number, ref: Date) {
    const last = async (tid: number) =>
      this.prisma.match.findFirst({
        where: {
          OR: [{ homeTeamId: tid }, { awayTeamId: tid }],
          startsAt: { lt: ref },
        },
        orderBy: { startsAt: 'desc' },
        select: { startsAt: true },
      });
    const [mh, ma] = await Promise.all([last(homeId), last(awayId)]);
    const dh = mh?.startsAt
      ? (ref.getTime() - mh.startsAt.getTime()) / 86400000
      : C.rest.capDays;
    const da = ma?.startsAt
      ? (ref.getTime() - ma.startsAt.getTime()) / 86400000
      : C.rest.capDays;
    const diff = Math.max(-C.rest.capDays, Math.min(C.rest.capDays, dh - da)); // + → home plus reposé
    const norm = diff / C.rest.capDays;
    return C.weights.rest * norm;
  }

  /** Blessures (volumétrique) : somme des OUT récents * impact par défaut */
  private async tiltInjuries(
    homeId: number,
    awayId: number,
    seasonId: number | null,
    ref: Date,
  ) {
    // on n'utilise pas seasonId pour l’instant (pas de playerId exploitable)
    const since = new Date(ref.getTime() - C.injuries.lookbackDays * 86400000);

    const teamImpact = async (teamId: number) => {
      const nOut = await this.prisma.injuryReport.count({
        where: { teamId, status: 'out', reportedAt: { gte: since } },
      });
      // pondération simple : nOut * impact par défaut, bornée
      const sum = nOut * C.injuries.defaultImpact;
      return Math.min(2, sum); // borne douce pour éviter des deltas extrêmes
    };

    const [ih, ia] = await Promise.all([
      teamImpact(homeId),
      teamImpact(awayId),
    ]);
    const diff = ia - ih; // + => plus d'impact OUT côté away => avantage home
    const norm = Math.max(-1, Math.min(1, diff));
    return C.weights.inj * norm;
  }

  /** Congestion: matches récents ⇒ pénalise l’équipe la plus chargée */
  private async tiltCongestion(homeId: number, awayId: number, ref: Date) {
    const from = new Date(ref.getTime() - C.congestion.windowDays * 86400000);
    const count = (tid: number) =>
      this.prisma.match.count({
        where: {
          OR: [{ homeTeamId: tid }, { awayTeamId: tid }],
          startsAt: { gte: from, lt: ref },
        },
      });
    const [nh, na] = await Promise.all([count(homeId), count(awayId)]);

    const score = (n: number) =>
      Math.max(
        0,
        Math.min(
          1,
          (n - C.congestion.baseline) /
            Math.max(1, C.congestion.softMax - C.congestion.baseline),
        ),
      );
    const sh = score(nh);
    const sa = score(na);

    return C.weights.congestion * (sa - sh); // away plus congestionné ⇒ +delta (home)
  }

  /** Lookahead Europe: match européen imminent ⇒ léger malus */
  private async tiltLookaheadEurope(homeId: number, awayId: number, ref: Date) {
    const to = new Date(ref.getTime() + C.lookahead.days * 86400000);
    const hasEuroSoon = async (tid: number) =>
      !!(await this.prisma.match.findFirst({
        where: {
          OR: [{ homeTeamId: tid }, { awayTeamId: tid }],
          startsAt: { gt: ref, lte: to },
          round: { season: { competition: { type: 'europe' as any } } },
        },
        select: { id: true },
      }));
    const [eh, ea] = await Promise.all([
      hasEuroSoon(homeId),
      hasEuroSoon(awayId),
    ]);
    return C.weights.lookahead * ((ea ? 1 : 0) - (eh ? 1 : 0));
  }

  /** Draw bump: base + bonus si congestion forte et symétrique */
  private async computeDrawBump(congDelta: number) {
    let bump = C.weights.draw * -0.18; // base légère (ajuste si besoin)
    const sym = 1 - Math.min(1, Math.abs(congDelta) / 0.5); // 0..1
    const extra = C.draw.congestionBump * sym;
    return bump + extra;
  }

  // -------- Ajustement des proba --------
  private applyDeltaAndDraw(
    market: Prob,
    delta: number,
    drawBump: number,
  ): Prob {
    let { p1, pX, p2 } = market;

    // Conserver masse p1+p2
    const base = p1 + p2;
    const dNow = p1 - p2;
    const dTarget = Math.max(-base, Math.min(base, dNow + delta));
    let p1p = (base + dTarget) / 2;
    let p2p = (base - dTarget) / 2;

    // Bump nul
    let pXp = Math.max(0, pX + drawBump);

    // Renormalise
    const s = p1p + p2p + pXp;
    if (s <= 0) return market;
    return { p1: p1p / s, pX: pXp / s, p2: p2p / s };
  }

  // -------- Odds & EV & stake --------
  private oddsToProb(odds: OddsSet): Prob {
    const q1 = 1 / odds.o1,
      qX = 1 / odds.oX,
      q2 = 1 / odds.o2;
    const s = q1 + qX + q2;
    return { p1: q1 / s, pX: qX / s, p2: q2 / s };
  }

  private expectedValues(p: Prob, o: OddsSet) {
    return { '1': p.p1 * o.o1 - 1, X: p.pX * o.oX - 1, '2': p.p2 * o.o2 - 1 };
  }

  private pickByProb(p: Prob): '1' | 'X' | '2' {
    if (p.p1 >= p.pX && p.p1 >= p.p2) return '1';
    if (p.p2 >= p.pX && p.p2 >= p.p1) return '2';
    return 'X';
  }

  private pickFromEV(ev: Record<'1' | 'X' | '2', number>): '1' | 'X' | '2' {
    let best: '1' | 'X' | '2' = '1';
    let v = ev['1'];
    if (ev['X'] > v) {
      best = 'X';
      v = ev['X'];
    }
    if (ev['2'] > v) {
      best = '2';
      v = ev['2'];
    }
    return best;
  }

  private kellyFraction(p: Prob, o: OddsSet, pick: '1' | 'X' | '2') {
    const prob = pick === '1' ? p.p1 : pick === '2' ? p.p2 : p.pX;
    const odd = pick === '1' ? o.o1 : pick === '2' ? o.o2 : o.oX;
    const b = odd - 1;
    const q = 1 - prob;
    const k = (b * prob - q) / b;
    return Math.max(0, k || 0);
  }

  // -------- Odds provider (best/latest/book:NAME) --------
  private async getOddsForMatch(
    matchId: number,
    mode: string,
  ): Promise<OddsSet> {
    if (mode.startsWith('book:')) {
      const book = mode.slice(5);
      const row = await this.prisma.odds.findFirst({
        where: { matchId, book },
        orderBy: { sampledAt: 'desc' },
        select: { o1: true, oX: true, o2: true },
      });
      if (row) return { o1: row.o1, oX: row.oX, o2: row.o2 };
    }

    if (mode === 'latest') {
      const row = await this.prisma.odds.findFirst({
        where: { matchId },
        orderBy: { sampledAt: 'desc' },
        select: { o1: true, oX: true, o2: true },
      });
      if (row) return { o1: row.o1, oX: row.oX, o2: row.o2 };
    }

    // default: 'best'
    const agg = await this.prisma.odds.aggregate({
      where: { matchId },
      _max: { o1: true, oX: true, o2: true },
    });
    const o1 = agg._max.o1 ?? 1.01;
    const oX = agg._max.oX ?? 1.01;
    const o2 = agg._max.o2 ?? 1.01;
    return { o1, oX, o2 };
  }
}
