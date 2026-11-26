import type { GameState, RaceEvent, Result, Winner } from '@/api/types';

const WINNERS_MAX = 50;
const FEED_MAX = 15;

export interface Row {
  key: number;
  user: string;
  text: string;
  note: string;
  result?: Result;
}

export interface BoardState {
  game: GameState | null;
  winners: Row[];
  feed: Row[];
  counts: Partial<Record<Result, number>>;
  nextKey: number;
}

export const initialBoard: BoardState = {
  game: null,
  winners: [],
  feed: [],
  counts: {},
  nextKey: 0,
};

const winnerRow = (winner: Winner, key: number): Row => ({
  key,
  user: winner.user_name,
  text: winner.user_name,
  note: `${winner.instance} · ${winner.mode}`,
});

export function applyEvent(board: BoardState, event: RaceEvent): BoardState {
  switch (event.type) {
    case 'snapshot':
    case 'reset': {
      const winners = event.type === 'snapshot' ? event.winners : [];
      const sameRound = event.type === 'snapshot' && board.game?.round === event.state.round;

      return {
        game: event.state,
        winners: winners.map((winner, i) => winnerRow(winner, board.nextKey + i)),
        feed: sameRound ? board.feed : [],
        counts: sameRound ? board.counts : {},
        nextKey: board.nextKey + winners.length,
      };
    }

    case 'countdown':
      return { ...board, game: event.state };

    case 'claim': {
      if (event.round !== event.state.round) {
        return board;
      }

      const key = board.nextKey;
      const winners =
        event.result === 'won'
          ? [
              winnerRow({ user_name: event.user, instance: event.instance, mode: event.mode }, key),
              ...board.winners,
            ].slice(0, WINNERS_MAX)
          : board.winners;
      const attempt: Row = {
        key: key + 1,
        user: event.user,
        text: `${event.user} → ${event.result}`,
        note: event.instance,
        result: event.result,
      };

      return {
        game: event.state,
        winners,
        feed: [attempt, ...board.feed].slice(0, FEED_MAX),
        counts: { ...board.counts, [event.result]: (board.counts[event.result] ?? 0) + 1 },
        nextKey: key + 2,
      };
    }
  }
}

export const applyEvents = (board: BoardState, batch: RaceEvent[]): BoardState =>
  batch.reduce(applyEvent, board);

export function oversold(game: GameState | null): number {
  return game ? Math.max(0, game.winners - game.prizes_total) : 0;
}
