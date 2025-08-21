import axios, { AxiosInstance } from "axios";

 export type AfTeam = {
    team: { id: number; name: string; country?: string | null };
  };
  
  export type AfFixture = {
    fixture: {
      id: number;
      date: string;
      timezone: string;
      venue?: { name?: string | null } | null;
      status?: { long?: string | null; short?: string | null } | null;
    };
    league: { id: number; season: number; round?: string | null };
    teams: { home: { id: number; name: string }, away: { id: number; name: string } };
  };
  
  export type OddsParams = {
    fixture: { id: number };
    league: { id: number; season: number };
    date?: string; 
    update?: string;
    bookmakers: Array<{
      id: number;
      name: string;
      bets: Array<{
        id: number;
        name: string;
        values: Array<{ value: "Home"|"Draw"|"Away"|"1"|"X"|"2"; odd: string }>;
      }>;
    }>;
  };

  export class ApiFootballClient {
    private http: AxiosInstance;
    constructor(baseURL = process.env.API_FOOTBALL_BASE_URL || 'https://v3.football.api-sports.io') {

        const apiKey   = process.env.API_FOOTBALL_KEY;
    
      this.http = axios.create({
        baseURL,
        headers: { "x-apisports-key": apiKey },
        timeout: 20000,
      });
    }

    private clean(obj?: Record<string, any>) {
        if (!obj) return undefined;
        const out: Record<string, any> = {};
        for (const [k, v] of Object.entries(obj)) {
          if (v === undefined || v === null || v === '') continue;
          out[k] = v;
        }
        return out;
      }

    /** GET générique (retourne res.data brut de l’API) */
  public async get<T = any>(path: string, params?: Record<string, any>): Promise<T> {
    const res = await this.http.get(path, { params: this.clean(params) });
    return res.data as T;
  }

  // ---------- TEAMS ----------
  /** Liste les équipes d’une ligue pour une saison */
  public async teams(league: number, season: number, page?: number) {
    return this.get('/teams', { league, season, page });
  }

  // ---------- FIXTURES ----------
  /** Fixtures par ligue/saison */
  public async fixturesSeason(league: number, season: number, page?: number) {
    return this.get('/fixtures', { league, season, page });
  }

  /** Fixtures générique (id, league, team, date, round, status, pagination…) */
  public async fixtures(params: {
    id?: number;
    league?: number;
    season?: number;
    date?: string;      // YYYY-MM-DD
    from?: string;      // YYYY-MM-DD
    to?: string;        // YYYY-MM-DD
    team?: number;
    round?: string;
    status?: string;
    page?: number;
  }) {
    return this.get('/fixtures', params as any);
  }

  // ---------- PRE-MATCH ODDS ----------
  /**
   * /odds (doc v3): fixture | date | league | season | bookmaker | bet | page
   * ⚠️ pas de "days" ici.
   */
  public async odds(params: OddsParams) {
    return this.get('/odds', params as any);
  }

  /** Helper: /odds?fixture={id} */
  public async oddsByFixture(fixtureId: number, page = 1) {
    return this.get('/odds', { fixture: fixtureId, page });
  }

  /** Obsolète: on laisse un message clair si un ancien appel persiste */
  public async oddsRange(_from: string, _to: string) {
    throw new Error('oddsRange is not supported by API-FOOTBALL v3 /odds. Use odds({ fixture }) or odds({ date, league, season }).');
  }

    async fixtureById(id: number): Promise<AfFixture | null> {
      const res = await this.http.get("/fixtures", { params: { id, timezone: "UTC" } });
      const arr: AfFixture[] = res.data?.response ?? [];
      return arr[0] ?? null;
    }

// Effectif (squad) d’une équipe
async playersSquad(params: { team: number }) {
  return this.get('/players/squads', params);
}

// Stats joueurs (paginated)
public async players(team: number, league: number, season: number, page?: number) {
  return this.get('/players', { team, league, season, page });
}
  }
  