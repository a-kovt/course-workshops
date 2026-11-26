import { RotateCcw, Timer, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface Props {
  onCountdown: () => void;
  onRestart: () => void;
  onWipe: () => void;
}

export function RoundCommands({ onCountdown, onRestart, onWipe }: Props) {
  function wipe() {
    if (window.confirm('Delete all winners and attempts and empty the queue?')) {
      onWipe();
    }
  }

  return (
    <div className="grid gap-2 sm:grid-cols-3">
      <Button variant="secondary" onClick={onCountdown}>
        <Timer data-icon="inline-start" />
        Countdown
      </Button>
      <Button variant="outline" onClick={onRestart}>
        <RotateCcw data-icon="inline-start" />
        Reset round
      </Button>
      <Button variant="destructive" onClick={wipe}>
        <Trash2 data-icon="inline-start" />
        Wipe all
      </Button>
    </div>
  );
}
