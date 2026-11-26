import { useState } from 'react';

import { hostApi } from '@/api/host';
import { failureText, type Reply } from '@/api/http';
import type { RoundReply, RoundSettings } from '@/api/types';

function summary(label: string, { state, purged }: RoundReply): string {
  const dropped = purged != null ? `, ${purged} queued messages dropped` : '';

  return `${label} – round ${state.round}, ${state.mode}, prizes ${state.prizes_total}${dropped}`;
}

export function useHostCommands(token: string) {
  const [output, setOutput] = useState('');

  async function run(label: string, request: Promise<Reply<RoundReply>>) {
    const reply = await request;

    setOutput(reply.ok ? summary(label, reply.data) : `${label} failed – ${failureText(reply)}`);
  }

  return {
    output,
    startRound: (settings: RoundSettings) => {
      void run('Started', hostApi.startRound(token, settings));
    },
    startCountdown: () => {
      void run('Countdown', hostApi.startCountdown(token));
    },
    restartRound: () => {
      void run('Reset', hostApi.restartRound(token));
    },
    wipeAll: () => {
      void run('Wiped', hostApi.wipeAll(token));
    },
  };
}
