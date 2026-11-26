import { cn } from 'cn';
import { memo } from 'react';

import type { Result } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import { Empty, EmptyDescription } from '@/components/ui/empty';
import type { Row } from '@/model/board';

const RESULT_CLASSES: Partial<Record<Result, string>> = {
  won: 'text-success',
  sold_out: 'text-muted-foreground',
  duplicate: 'text-warning',
};

interface Props {
  variant: 'ranked' | 'feed';
  rows: Row[];
  empty: string;
  me: string;
}

export const RowList = memo(function RowList({ variant, rows, empty, me }: Props) {
  if (rows.length === 0) {
    return (
      <Empty>
        <EmptyDescription>{empty}</EmptyDescription>
      </Empty>
    );
  }

  const items = rows.map((row) => {
    const mine = row.user === me;

    return (
      <li
        key={row.key}
        className={cn(
          'break-words motion-safe:animate-in motion-safe:duration-300 motion-safe:fade-in motion-safe:slide-in-from-top-2',
          row.result && RESULT_CLASSES[row.result],
          mine && 'font-semibold',
        )}
      >
        {row.text} <span className="text-xs font-normal text-muted-foreground">{row.note}</span>
        {mine ? (
          <Badge variant="outline" className="ml-2">
            you
          </Badge>
        ) : null}
      </li>
    );
  });

  const listClasses = 'flex max-h-80 flex-col gap-1 overflow-auto text-sm';

  return variant === 'ranked' ? (
    <ol className={cn(listClasses, 'list-inside list-decimal')}>{items}</ol>
  ) : (
    <ul className={cn(listClasses, 'tabular-nums')}>{items}</ul>
  );
});
