export type Mode = 'naive' | 'lock' | 'for_update' | 'atomic' | 'queue';
export type Result = 'won' | 'sold_out' | 'duplicate' | 'stale';

export interface GameState {
  round: number;
  mode: Mode;
  prizes_total: number;
  prizes_left: number;
  delay_ms: number;
  winners: number;
}

export interface Winner {
  user_name: string;
  instance: string;
  mode: string;
}

export interface ClaimEvent {
  type: 'claim';
  state: GameState;
  round: number;
  user: string;
  result: Result;
  previous: Result | null;
  instance: string;
  mode: string;
  claim_id: string | null;
}

export type RaceEvent =
  | { type: 'snapshot'; state: GameState; winners: Winner[] }
  | { type: 'reset'; state: GameState; wiped: boolean }
  | { type: 'countdown'; state: GameState; seconds: number }
  | ClaimEvent;

export const RACE_EVENT_TYPES: readonly RaceEvent['type'][] = [
  'snapshot',
  'reset',
  'claim',
  'countdown',
];

export interface ClaimOutcome {
  result: Result | 'queued' | 'error';
  previous?: Result | null;
  instance?: string;
  detail?: string | null;
}

export interface RoundReply {
  state: GameState;
  purged?: number | null;
}

export interface RoundSettings {
  mode: Mode;
  prizes: number;
  delay_ms: number;
}
