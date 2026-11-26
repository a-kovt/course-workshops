import { Play } from 'lucide-react';
import { useState, type ReactNode, type SubmitEvent } from 'react';

import type { Mode, RoundSettings } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MODES } from '@/model/labels';

const MODE_ITEMS = (Object.entries(MODES) as [Mode, string][]).map(([value, label], i) => ({
  value,
  label: `${i + 1}. ${label}`,
}));

interface Props {
  onStart: (settings: RoundSettings) => void;
  children?: ReactNode;
}

export function NewRoundForm({ onStart, children }: Props) {
  const [mode, setMode] = useState<Mode>('naive');
  const [prizes, setPrizes] = useState('5');
  const [delay, setDelay] = useState('200');

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    onStart({ mode, prizes: Number(prizes), delay_ms: Number(delay) });
  }

  return (
    <form onSubmit={submit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="mode">Mode</FieldLabel>
          <Select
            items={MODE_ITEMS}
            value={mode}
            onValueChange={(value) => {
              if (value) {
                setMode(value);
              }
            }}
          >
            <SelectTrigger id="mode" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {MODE_ITEMS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor="prizes">Prizes</FieldLabel>
            <Input
              id="prizes"
              type="number"
              required
              min={1}
              max={1000}
              value={prizes}
              onChange={(e) => {
                setPrizes(e.target.value);
              }}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="delay">Delay check → write, ms</FieldLabel>
            <Input
              id="delay"
              type="number"
              required
              min={0}
              max={5000}
              value={delay}
              onChange={(e) => {
                setDelay(e.target.value);
              }}
            />
          </Field>
        </div>
        {children}
        <Button type="submit" size="lg">
          <Play data-icon="inline-start" />
          Start round
        </Button>
      </FieldGroup>
    </form>
  );
}
