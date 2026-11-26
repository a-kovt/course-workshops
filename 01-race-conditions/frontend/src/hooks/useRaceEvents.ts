import { useEffect, useEffectEvent, useReducer, useState } from 'react';

import { subscribeToRace, type Connection } from '@/api/events';
import type { RaceEvent } from '@/api/types';
import { applyEvents, initialBoard } from '@/model/board';

const FLUSH_MS = 50;

export function useRaceEvents(onEvent: (event: RaceEvent) => void) {
  const [board, dispatch] = useReducer(applyEvents, initialBoard);
  const [connection, setConnection] = useState<Connection>('connecting');
  const handleEvent = useEffectEvent(onEvent);

  useEffect(() => {
    let batch: RaceEvent[] = [];
    let flushTimer: ReturnType<typeof setTimeout> | undefined;

    const flush = () => {
      flushTimer = undefined;
      dispatch(batch);
      batch = [];
    };

    const close = subscribeToRace({
      onConnection: setConnection,
      onEvent: (event) => {
        handleEvent(event);
        batch.push(event);
        flushTimer ??= setTimeout(flush, FLUSH_MS);
      },
    });

    return () => {
      close();
      clearTimeout(flushTimer);
    };
  }, []);

  return { board, connection };
}
