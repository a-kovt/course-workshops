import { failureText, send } from '@/api/http';
import type { ClaimOutcome, RoundReply } from '@/api/types';

export const gameApi = {
  async claim(user: string, claimId: string): Promise<ClaimOutcome> {
    const reply = await send<ClaimOutcome>('/claims', { body: { user, claim_id: claimId } });

    return reply.ok ? reply.data : { result: 'error', detail: failureText(reply) };
  },

  restartRound: () => send<RoundReply>('/rounds'),

  startCountdown: () => send<RoundReply>('/countdowns'),
};
