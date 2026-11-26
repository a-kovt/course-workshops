import type { ClaimOutcome, Mode } from '@/api/types';

export type Tone = 'success' | 'warning' | 'destructive';

export interface Message {
  text: string;
  tone?: Tone;
}

export interface FlashMessage extends Message {
  id: number;
}

export const MODES: Record<Mode, string> = {
  naive: 'Naive read → check → write',
  lock: 'Local asyncio.Lock (2 instances)',
  for_update: 'SELECT … FOR UPDATE',
  atomic: 'Atomic UPDATE + one attempt',
  queue: 'RabbitMQ queue (broker profile)',
};

type Outcome = ClaimOutcome['result'];

const RESULTS: Record<Outcome, string> = {
  won: 'The prize is yours!',
  sold_out: 'Sold out',
  duplicate: 'You have already played this round',
  stale: 'Claim from a previous round',
  queued: 'Claim queued…',
  error: 'Request failed',
};

const TONES: Record<Outcome, Tone> = {
  won: 'success',
  sold_out: 'destructive',
  error: 'destructive',
  duplicate: 'warning',
  stale: 'warning',
  queued: 'warning',
};

export function describeOutcome(outcome: ClaimOutcome): Message {
  const parts = [
    outcome.result === 'error' && outcome.detail ? outcome.detail : RESULTS[outcome.result],
  ];

  if (outcome.result === 'duplicate' && outcome.previous) {
    parts.push(`(first attempt – ${RESULTS[outcome.previous]})`);
  }
  if (outcome.instance) {
    parts.push(`· handled by ${outcome.instance}`);
  }

  return { text: parts.join(' '), tone: TONES[outcome.result] };
}
