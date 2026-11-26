import { RotateCcw, Timer } from 'lucide-react';

import type { GameState } from '@/api/types';
import { OversoldAlert } from '@/components/board/OversoldAlert';
import { PrizeBar } from '@/components/board/PrizeBar';
import { Stat } from '@/components/board/Stat';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { oversold, type BoardState } from '@/model/board';
import { MODES } from '@/model/labels';

interface Props {
  game: GameState | null;
  counts: BoardState['counts'];
  onCountdown: () => void;
  onRestart: () => void;
}

export function RoundPanel({ game, counts, onCountdown, onRestart }: Props) {
  const over = oversold(game);
  const { won = 0, sold_out: soldOut = 0, duplicate = 0 } = counts;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Round {game?.round ?? '–'}</CardTitle>
        <CardDescription>
          Attempts {won + soldOut + duplicate} · won {won} · sold out {soldOut} · duplicate{' '}
          {duplicate}
        </CardDescription>
        {game ? (
          <CardAction>
            <Badge variant="secondary">{MODES[game.mode]}</Badge>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat value={game?.prizes_left} caption="prizes left" />
          <Stat value={game?.winners} caption="winners" alert={over > 0} />
          <Stat value={game?.prizes_total} caption="prizes total" />
        </div>
        {game ? <PrizeBar game={game} /> : null}
        <OversoldAlert over={over} />
      </CardContent>
      <CardFooter className="grid gap-2 sm:grid-cols-2">
        <Button variant="outline" onClick={onCountdown}>
          <Timer data-icon="inline-start" />
          3-2-1 countdown for everyone
        </Button>
        <Button variant="ghost" onClick={onRestart}>
          <RotateCcw data-icon="inline-start" />
          Reset round for everyone
        </Button>
      </CardFooter>
    </Card>
  );
}
