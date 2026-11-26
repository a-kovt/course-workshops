import { API_BASE } from '@/api/http';
import { RACE_EVENT_TYPES, type RaceEvent } from '@/api/types';

const REOPEN_MS = 2000;

export type Connection = 'connecting' | 'online' | 'reconnecting';

interface Handlers {
  onEvent: (event: RaceEvent) => void;
  onConnection: (connection: Connection) => void;
}

export function subscribeToRace({ onEvent, onConnection }: Handlers): () => void {
  let source: EventSource;
  let reopenTimer: ReturnType<typeof setTimeout> | undefined;

  const receive = (message: MessageEvent<string>) => {
    onEvent(JSON.parse(message.data) as RaceEvent);
  };

  const open = () => {
    source = new EventSource(`${API_BASE}/events`);

    for (const type of RACE_EVENT_TYPES) {
      source.addEventListener(type, receive);
    }

    source.onopen = () => {
      onConnection('online');
    };
    source.onerror = () => {
      onConnection('reconnecting');

      // EventSource gives up after an HTTP error such as a 502 during a restart.
      if (source.readyState === EventSource.CLOSED) {
        reopenTimer = setTimeout(open, REOPEN_MS);
      }
    };
  };

  open();

  return () => {
    clearTimeout(reopenTimer);
    source.close();
  };
}
