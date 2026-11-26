import { gameApi } from '@/api/game';
import { failureText, type Reply } from '@/api/http';
import type { RoundReply } from '@/api/types';
import type { Message } from '@/model/labels';

export function useBoardCommands(show: (message: Message) => void) {
  async function run(label: string, request: Promise<Reply<RoundReply>>) {
    const reply = await request;

    if (reply.ok) {
      return;
    }

    const text =
      reply.status === 403
        ? `${label} is allowed only from the host console`
        : `${label} failed – ${failureText(reply)}`;

    show({ text, tone: 'destructive' });
  }

  return {
    startCountdown: () => {
      void run('Countdown', gameApi.startCountdown());
    },
    restartRound: () => {
      void run('Reset', gameApi.restartRound());
    },
  };
}
