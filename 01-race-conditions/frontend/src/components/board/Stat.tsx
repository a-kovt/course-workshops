import { cn } from 'cn';

interface Props {
  value: number | undefined;
  caption: string;
  alert?: boolean;
}

export function Stat({ value, caption, alert = false }: Props) {
  return (
    <div>
      <div
        key={value}
        className={cn(
          'text-4xl font-extrabold tabular-nums motion-safe:animate-pop sm:text-5xl',
          alert && 'text-destructive',
        )}
      >
        {value ?? '–'}
      </div>
      <div className="text-xs text-muted-foreground">{caption}</div>
    </div>
  );
}
