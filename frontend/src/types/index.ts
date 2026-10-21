export type PersonaMode = 'coach' | 'recruiter';

export interface PlayerFrame {
  nflId: number | null;
  team: string;
  jersey: number | null;
  x: number;
  y: number;
  s_mph: number;
  a: number;
  o: number;
  dir: number;
  distBall: number | null;
  distOpp: number | null;
  event: string | null;
}

export interface FrameData {
  frameId: number;
  events: string[];
  players: PlayerFrame[];
}

export interface EventMarker {
  frameId: number;
  event: string;
}

export interface PlayerCombine {
  forty: number | null;
  vertical: number | null;
  broadJump: number | null;
  cone: number | null;
  shuttle: number | null;
  bench: number | null;
  draftRound: number | null;
  draftOvr: number | null;
  percentiles: Record<string, number | null>;
}

export interface SeasonalStats {
  pocket_time?: number | null;
  times_pressured?: number | null;
  times_blitzed?: number | null;
  rec_yac?: number | null;
  rec_brk_tkl?: number | null;
  rush_brk_tkl?: number | null;
  rush_yac?: number | null;
  pressures_def?: number | null;
}

export interface ActivePlayer {
  nflId: number;
  displayName: string;
  jerseyNumber: number | null;
  team: string;
  position: string;
  pffRole: string;
  pffPositionLinedUp: string;
  pffSack: boolean;
  pffHit: boolean;
  pffHurry: boolean;
  headshotUrl: string | null;
  college: string;
  height: string;
  weight: number | null;
  combine: PlayerCombine;
  seasonalStats: SeasonalStats;
  playPeakSpeedMph: number;
  playPeakAccel: number;
}

export interface PlayContext {
  gameId: number;
  playId: number;
  season: number;
  week: number;
  homeTeam: string;
  visitorTeam: string;
  possessionTeam: string;
  defensiveTeam: string;
  down: number;
  yardsToGo: number;
  yardlineNumber: number;
  yardlineSide: string;
  quarter: number;
  gameClock: string;
  preSnapHomeScore: number;
  preSnapVisitorScore: number;
  playDescription: string;
  playResult: number;
  epa: number | null;
  wpa: number | null;
  wp: number | null;
  cpoe: number | null;
  airYards: number | null;
  yac: number | null;
  success: boolean;
  passResult: string;
  passer: string;
  receiver: string;
  offenseFormation: string;
  personnelO: string;
  personnelD: string;
  defendersInBox: number | null;
  coverage: string;
  coverageType: string;
  dropBackType: string;
  snapFrameId: number;
}

export interface SpeedScatterPoint {
  nflId: number;
  displayName: string;
  position: string;
  forty: number;
  maxGameSpeedMph: number;
  vertical?: number | null;
  broadJump?: number | null;
}

export interface FormationMatrixCell {
  formation: string;
  coverage: string;
  playCount: number;
  avgEpa: number;
  avgCpoe: number;
  successRate: number;
}

export interface PlayBundle {
  meta: {
    id: string;
    gameId: number;
    playId: number;
    title: string;
    badge: string;
    subtitle: string;
    focusNflId: number | null;
    focusPlayerName: string;
    focusJersey: number;
    keyFrame: number;
    description: string;
  };
  context: PlayContext;
  events: EventMarker[];
  players: ActivePlayer[];
  frames: FrameData[];
  speedScatterBenchmark: SpeedScatterPoint[];
  formationMatrix: FormationMatrixCell[];
}

export interface GameItem {
  gameId: number;
  season: number;
  week: number;
  gameDate: string;
  gameTimeEastern: string;
  homeTeamAbbr: string;
  visitorTeamAbbr: string;
  dayOfWeek: string;
  formattedDate: string;
  timeDisplay: string;
  matchup: string;
  fullTitle: string;
}

export interface PlaySummary {
  gameId: number;
  playId: number;
  quarter: number;
  down: number;
  yardsToGo: number;
  possessionTeam: string;
  defensiveTeam: string;
  yardlineSide: string;
  yardlineNumber: number;
  gameClock: string;
  playDescription: string;
  playResult: number;
  passResult: string;
  epa: number | null;
  wpa: number | null;
  cpoe: number | null;
  success: boolean;
  offenseFormation: string;
  coverage: string;
}
