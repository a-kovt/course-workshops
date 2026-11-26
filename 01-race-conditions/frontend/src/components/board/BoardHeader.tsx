import { Flame, Trophy } from 'lucide-react';
import type { ComponentProps } from 'react';

import type { Connection } from '@/api/events';
import { Badge } from '@/components/ui/badge';
import { cn } from 'cn';

const HOT_RATE = 20;

const CONNECTION_BADGES: Record<
  Connection,
  { text: string; variant: ComponentProps<typeof Badge>['variant'] }
> = {
  connecting: { text: 'connecting…', variant: 'outline' },
  online: { text: 'online', variant: 'success' },
  reconnecting: { text: 'reconnecting…', variant: 'warning' },
};

interface Props {
  rate: number;
  connection: Connection;
}

export function BoardHeader({ rate, connection }: Props) {
  const status = CONNECTION_BADGES[connection];

  return (
    <header className="flex items-center justify-between gap-3 pt-2">
      <h1 className="flex items-center gap-2 font-heading text-2xl font-bold tracking-tight">
        <Trophy className="size-6" /> Prize Race
      </h1>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="tabular-nums" title="Claims per second, everyone">
          <Flame
            className={cn(
              'transition-colors',
              rate >= HOT_RATE && 'text-destructive motion-safe:animate-pulse',
              rate > 0 && rate < HOT_RATE && 'text-warning',
            )}
          />
          {rate}/s
        </Badge>
        <Badge variant={status.variant}>{status.text}</Badge>
      </div>
    </header>
  );
}
