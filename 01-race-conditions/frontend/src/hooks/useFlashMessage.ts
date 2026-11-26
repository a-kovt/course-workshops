import { useCallback, useState } from 'react';

import type { FlashMessage, Message } from '@/model/labels';

export function useFlashMessage() {
  const [message, setMessage] = useState<FlashMessage>({ text: '', id: 0 });

  const show = useCallback((next: Message) => {
    setMessage((prev) => ({ ...next, id: prev.id + 1 }));
  }, []);

  return { message, show };
}
