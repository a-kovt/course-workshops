import { useEffect, useRef, useState } from 'react';

import type { RaceEvent } from '@/api/types';

export function useCountdown() {
  const [left, setLeft] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    return () => {
      clearInterval(timer.current);
    };
  }, []);

  function handleEvent(event: RaceEvent) {
    if (event.type !== 'countdown') {
      return;
    }

    clearInterval(timer.current);
    let n = event.seconds;

    setLeft(n);
    timer.current = setInterval(() => {
      n -= 1;
      setLeft(n < 0 ? null : n);

      if (n < 0) {
        clearInterval(timer.current);
      }
    }, 1000);
  }

  return { left, handleEvent };
}
