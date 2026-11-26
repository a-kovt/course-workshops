import { Gift, Zap } from 'lucide-react';
import { useRef, type Ref } from 'react';

import { ResultLine } from '@/components/board/ResultLine';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import type { FlashMessage } from '@/model/labels';

interface Props {
  name: string;
  onNameChange: (name: string) => void;
  onClaim: (user: string, times: number) => void;
  message: FlashMessage;
  buttonRef: Ref<HTMLButtonElement>;
}

export function ClaimPanel({ name, onNameChange, onClaim, message, buttonRef }: Props) {
  const nameInput = useRef<HTMLInputElement>(null);

  function claim(times: number) {
    const user = name.trim();

    if (user) {
      onClaim(user, times);
    } else {
      nameInput.current?.focus();
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <Field>
          <FieldLabel htmlFor="name">Your name</FieldLabel>
          <Input
            id="name"
            ref={nameInput}
            maxLength={40}
            autoComplete="off"
            value={name}
            onChange={(e) => {
              onNameChange(e.target.value);
            }}
          />
        </Field>
        <Button
          ref={buttonRef}
          size="lg"
          className="h-14 w-full transition-transform active:scale-95"
          onClick={() => {
            claim(1);
          }}
        >
          <Gift data-icon="inline-start" />
          Claim prize
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            claim(3);
          }}
        >
          <Zap data-icon="inline-start" />
          Impatient: 3 clicks at once
        </Button>
        <ResultLine message={message} />
      </CardContent>
    </Card>
  );
}
