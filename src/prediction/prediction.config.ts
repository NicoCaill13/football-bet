export interface PredictionConfig {
  odds: { useBest: boolean };
  weights: {
    elo: number; xg: number; inj: number; rest: number;
    draw: number; congestion: number; lookahead: number;
  };
  /** <<< AJOUT >>> */
  pickRule: 'prob' | 'ev';
  // ----------------
  elo: { homeAdv: number };
  xg: { span: string; spanKey: string };
  injuries: { lookbackDays: number; defaultImpact: number; impactSpan: string; impactSpanKey: string };
  rest: { capDays: number };
  congestion: { windowDays: number; baseline: number; softMax: number };
  lookahead: { days: number };
  draw: { congestionBump: number };
  stake: { cap: number };
}


function toBool(v: string | undefined, def: boolean) {
  if (v === undefined) return def;
  return ['1', 'true', 'yes', 'on'].includes(v.toLowerCase());
}
function toNum(v: string | undefined, def: number) {
  const n = v !== undefined ? Number(v) : NaN;
  return Number.isFinite(n) ? n : def;
}
function spanKey(raw: string | undefined, fallback = '5m') {
  const s = raw ?? fallback;
  const m = s.match(/^(\d+)/);
  return m ? m[1] : '5';
}

export const predictionConfig: PredictionConfig = {
  odds: { useBest: toBool(process.env.DECISION_USE_BEST_ODDS, true) },
  weights: {
    elo: toNum(process.env.DECISION_ALPHA_ELO, 0.30),
    xg: toNum(process.env.DECISION_ALPHA_XG, 0.20),
    inj: toNum(process.env.DECISION_ALPHA_INJ, 0.15),
    rest: toNum(process.env.DECISION_ALPHA_REST, 0.05),
    draw: toNum(process.env.DECISION_ALPHA_DRAW, 0.05),
    congestion: toNum(process.env.DECISION_ALPHA_CONGESTION, 0.07),
    lookahead: toNum(process.env.DECISION_ALPHA_LOOKAHEAD, 0.05),
  },
  /** <<< AJOUT >>> */
  pickRule: (process.env.PREDICTION_PICK_RULE === 'ev') ? 'ev' : 'prob',
  // ----------------
  elo: { homeAdv: toNum(process.env.ELO_HOME_ADV, 70) },
  xg: { span: process.env.XG_SPAN ?? '5m', spanKey: spanKey(process.env.XG_SPAN, '5m') },
  injuries: {
    lookbackDays: toNum(process.env.INJ_LOOKBACK_DAYS, 14),
    defaultImpact: toNum(process.env.INJ_DEFAULT_IMPACT, 0.12),
    impactSpan: process.env.PLAYER_IMPACT_SPAN ?? '10m',
    impactSpanKey: spanKey(process.env.PLAYER_IMPACT_SPAN, '10m'),
  },
  rest: { capDays: toNum(process.env.REST_CAP_DAYS, 4) },
  congestion: {
    windowDays: toNum(process.env.CONGESTION_WINDOW_DAYS, 10),
    baseline: toNum(process.env.CONGESTION_BASELINE, 2),
    softMax: toNum(process.env.CONGESTION_SOFT_MAX, 4),
  },
  lookahead: { days: toNum(process.env.LOOKAHEAD_DAYS, 3) },
  draw: { congestionBump: toNum(process.env.DRAW_CONGESTION_BUMP, 0.02) },
  stake: { cap: toNum(process.env.STAKE_BANKROLL_CAP, 0.02) },
};
