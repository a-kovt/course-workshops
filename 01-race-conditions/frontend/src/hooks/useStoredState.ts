import { useEffect, useState } from 'react';

import { load, save } from '@/lib/storage';

export function useStoredState(key: string, initial: string | (() => string)) {
  const [value, setValue] = useState(() => {
    const stored = load(key);

    if (stored !== null && stored !== '') {
      return stored;
    }

    return typeof initial === 'function' ? initial() : initial;
  });

  useEffect(() => {
    save(key, value);
  }, [key, value]);

  return [value, setValue] as const;
}
