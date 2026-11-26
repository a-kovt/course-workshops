import { send } from '@/api/http';
import type { RoundReply, RoundSettings } from '@/api/types';

export const hostApi = {
  startRound: (token: string, settings: RoundSettings) =>
    send<RoundReply>('/rounds', { body: settings, token }),

  restartRound: (token: string) => send<RoundReply>('/rounds', { token }),

  startCountdown: (token: string) => send<RoundReply>('/countdowns', { token }),

  wipeAll: (token: string) => send<RoundReply>('/results', { method: 'DELETE', token }),
};
