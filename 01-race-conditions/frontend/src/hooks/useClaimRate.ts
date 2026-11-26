import { useEffect, useRef, useState } from 'react';

import type { RaceEvent } from '@/api/types';

export function useClaimRate() {
  const [rate, setRate] = useState(0);
  const counted = useRef(0);

  useEffect(() => {
    const meter = setInterval(() => {
      setRate(counted.current);
      counted.current = 0;
    }, 1000);

    return () => {
      clearInterval(meter);
    };
  }, []);

  function track(event: RaceEvent) {
    if (event.type === 'claim') {
      counted.current += 1;
    }
  }

  return { rate, track };
}
