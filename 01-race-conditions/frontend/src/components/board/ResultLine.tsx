import { cn } from 'cn';
import type { FlashMessage, Tone } from '@/model/labels';

const TONE_CLASSES: Record<Tone, string> = {
  success: 'text-success motion-safe:animate-pop',
  warning: 'text-warning motion-safe:animate-wiggle',
  destructive: 'text-destructive motion-safe:animate-shake',
};

interface Props {
  message: FlashMessage;
}

export function ResultLine({ message }: Props) {
  const { id, text, tone } = message;

  return (
    <p
      key={id}
      aria-live="polite"
      className={cn('min-h-6 font-medium', tone && TONE_CLASSES[tone])}
    >
      {text}
    </p>
  );
}
