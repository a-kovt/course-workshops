import { cn } from 'cn';

interface Props {
  left: number | null;
}

export function CountdownOverlay({ left }: Props) {
  if (left === null) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
      <span
        key={left}
        className={cn(
          'text-[9rem] leading-none font-black tabular-nums select-none motion-safe:animate-count sm:text-[14rem]',
          left === 0 && 'text-success',
        )}
      >
        {left > 0 ? left : 'GO!'}
      </span>
    </div>
  );
}
