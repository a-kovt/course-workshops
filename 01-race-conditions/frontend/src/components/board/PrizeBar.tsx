import type { GameState } from '@/api/types';
import { Progress, ProgressLabel, ProgressValue } from '@/components/ui/progress';
import { oversold } from '@/model/board';

function describe(left: number, total: number, isOversold: boolean) {
  if (isOversold) {
    return { label: 'Oversold!', variant: 'destructive' } as const;
  }
  if (left <= 0) {
    return { label: 'Sold out', variant: 'default' } as const;
  }
  if (left === 1) {
    return { label: 'Last prize!', variant: 'warning' } as const;
  }

  return { label: `${left} of ${total} left`, variant: 'success' } as const;
}

function percentLeft(left: number, total: number): number {
  if (total <= 0) {
    return 0;
  }

  return (Math.max(0, left) / total) * 100;
}

interface Props {
  game: GameState;
}

export function PrizeBar({ game }: Props) {
  const { prizes_left: left, prizes_total: total } = game;
  const isOversold = oversold(game) > 0;
  const { label, variant } = describe(left, total, isOversold);
  const share = isOversold ? 100 : percentLeft(left, total);

  return (
    <Progress value={share} variant={variant}>
      <ProgressLabel>Prizes</ProgressLabel>
      <ProgressValue>{() => label}</ProgressValue>
    </Progress>
  );
}
