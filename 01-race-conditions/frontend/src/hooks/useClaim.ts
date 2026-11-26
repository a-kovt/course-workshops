import { useRef } from 'react';

import { gameApi } from '@/api/game';
import type { ClaimOutcome, RaceEvent } from '@/api/types';
import { newClaimId } from '@/model/claimId';
import { describeOutcome, type Message } from '@/model/labels';

interface Options {
  show: (message: Message) => void;
  onWin: () => void;
}

export function useClaim({ show, onWin }: Options) {
  const pending = useRef(new Set<string>());
  const round = useRef<number | null>(null);

  function report(outcome: ClaimOutcome) {
    show(describeOutcome(outcome));

    if (outcome.result === 'won') {
      onWin();
    }
  }

  function startRound(next: number) {
    round.current = next;
    pending.current.clear();
    show({ text: 'New round!' });
  }

  function claim(user: string, times: number) {
    const clickRound = round.current;

    for (let i = 0; i < times; i++) {
      const id = newClaimId();

      pending.current.add(id);
      void gameApi.claim(user, id).then((outcome) => {
        if (round.current !== clickRound) {
          return;
        }
        if (outcome.result !== 'queued') {
          pending.current.delete(id);
        } else if (!pending.current.has(id)) {
          return;
        }

        report(outcome);
      });
    }
  }

  function handleEvent(event: RaceEvent) {
    switch (event.type) {
      case 'claim':
        if (event.claim_id && pending.current.delete(event.claim_id)) {
          report(event);
        }
        break;
      case 'reset':
        startRound(event.state.round);
        break;
      case 'snapshot':
        if (round.current === null) {
          round.current = event.state.round;
        } else if (event.state.round !== round.current) {
          startRound(event.state.round);
        } else if (pending.current.size > 0) {
          pending.current.clear();
          show({ text: 'Connection restored – look for your name in the feed', tone: 'warning' });
        }
        break;
      case 'countdown':
        break;
    }
  }

  return { claim, handleEvent };
}
