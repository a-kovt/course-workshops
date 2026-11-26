import { useRef } from 'react';

import { BoardHeader } from '@/components/board/BoardHeader';
import { ClaimPanel } from '@/components/board/ClaimPanel';
import { CountdownOverlay } from '@/components/board/CountdownOverlay';
import { RaceLists } from '@/components/board/RaceLists';
import { RoundPanel } from '@/components/board/RoundPanel';
import { useBoardCommands } from '@/hooks/useBoardCommands';
import { useClaim } from '@/hooks/useClaim';
import { useClaimRate } from '@/hooks/useClaimRate';
import { useCountdown } from '@/hooks/useCountdown';
import { useFlashMessage } from '@/hooks/useFlashMessage';
import { useRaceEvents } from '@/hooks/useRaceEvents';
import { useStoredState } from '@/hooks/useStoredState';
import { celebrate } from '@/lib/effects';

const randomGuest = () => `guest-${Math.floor(100 + Math.random() * 900)}`;

export function Board() {
  const [name, setName] = useStoredState('prize-name', randomGuest);
  const claimButton = useRef<HTMLButtonElement>(null);

  const { message, show } = useFlashMessage();
  const countdown = useCountdown();
  const claimRate = useClaimRate();
  const claims = useClaim({
    show,
    onWin: () => {
      void celebrate(claimButton.current);
    },
  });
  const commands = useBoardCommands(show);

  const { board, connection } = useRaceEvents((event) => {
    countdown.handleEvent(event);
    claimRate.track(event);
    claims.handleEvent(event);
  });

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-4 p-4">
      <title>Prize Race</title>
      <BoardHeader rate={claimRate.rate} connection={connection} />
      <CountdownOverlay left={countdown.left} />
      <ClaimPanel
        name={name}
        onNameChange={setName}
        onClaim={claims.claim}
        message={message}
        buttonRef={claimButton}
      />
      <RoundPanel
        game={board.game}
        counts={board.counts}
        onCountdown={commands.startCountdown}
        onRestart={commands.restartRound}
      />
      <RaceLists winners={board.winners} feed={board.feed} me={name.trim()} />
    </main>
  );
}
