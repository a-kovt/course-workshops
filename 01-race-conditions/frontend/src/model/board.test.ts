import { describe, expect, it } from 'vitest';

import type { ClaimEvent, GameState } from '@/api/types';
import { applyEvent, applyEvents, initialBoard, oversold } from '@/model/board';

const state = (overrides: Partial<GameState> = {}): GameState => ({
  round: 1,
  mode: 'naive',
  prizes_total: 2,
  prizes_left: 2,
  delay_ms: 200,
  winners: 0,
  ...overrides,
});

const claim = (overrides: Partial<ClaimEvent> = {}): ClaimEvent => ({
  type: 'claim',
  state: state(),
  round: 1,
  user: 'alice',
  result: 'won',
  previous: null,
  instance: 'app1',
  mode: 'naive',
  claim_id: null,
  ...overrides,
});

describe('applyEvent', () => {
  it('fills the board from a snapshot', () => {
    const board = applyEvent(initialBoard, {
      type: 'snapshot',
      state: state(),
      winners: [{ user_name: 'bob', instance: 'app2', mode: 'naive' }],
    });

    expect(board.game).toEqual(state());
    expect(board.winners.map((row) => row.user)).toEqual(['bob']);
  });

  it('adds a winner and an attempt for a won claim', () => {
    const board = applyEvent(initialBoard, claim());

    expect(board.winners.map((row) => row.user)).toEqual(['alice']);
    expect(board.feed[0]?.text).toBe('alice → won');
    expect(board.counts).toEqual({ won: 1 });
  });

  it('gives every new row a fresh key', () => {
    const board = applyEvents(initialBoard, [claim(), claim({ user: 'carol' })]);
    const keys = [...board.winners, ...board.feed].map((row) => row.key);

    expect(new Set(keys).size).toBe(keys.length);
  });

  it('ignores a claim from an earlier round', () => {
    const event = claim({ round: 1, state: state({ round: 2 }) });

    expect(applyEvent(initialBoard, event)).toBe(initialBoard);
  });

  it('clears the round on reset', () => {
    const played = applyEvent(initialBoard, claim());
    const board = applyEvent(played, { type: 'reset', state: state({ round: 2 }), wiped: false });

    expect(board.winners).toEqual([]);
    expect(board.feed).toEqual([]);
    expect(board.counts).toEqual({});
  });

  it('keeps the feed when reconnecting within the same round', () => {
    const played = applyEvent(applyEvent(initialBoard, claim()), {
      type: 'snapshot',
      state: state(),
      winners: [],
    });

    expect(played.feed).toHaveLength(1);
  });
});

describe('oversold', () => {
  it('counts prizes handed out beyond the total', () => {
    expect(oversold(state({ prizes_total: 2, winners: 5 }))).toBe(3);
    expect(oversold(state({ prizes_total: 2, winners: 1 }))).toBe(0);
    expect(oversold(null)).toBe(0);
  });
});
