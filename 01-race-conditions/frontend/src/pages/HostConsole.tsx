import { ExternalLink } from 'lucide-react';

import { Console } from '@/components/host/Console';
import { NewRoundForm } from '@/components/host/NewRoundForm';
import { ObservabilityCard } from '@/components/host/ObservabilityCard';
import { RoundCommands } from '@/components/host/RoundCommands';
import { buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useHostCommands } from '@/hooks/useHostCommands';
import { useStoredState } from '@/hooks/useStoredState';

export function HostConsole() {
  const [token, setToken] = useStoredState('prize-token', '');
  const commands = useHostCommands(token);

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-4 p-4">
      <title>Host Console · Prize Race</title>
      <header className="flex items-center justify-between gap-3 pt-2">
        <h1 className="font-heading text-2xl font-bold tracking-tight">Host console</h1>
        <a href="/" target="_blank" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
          <ExternalLink data-icon="inline-start" />
          Board
        </a>
      </header>

      <div className="grid gap-4 md:grid-cols-[3fr_2fr]">
        <Card>
          <CardHeader>
            <CardTitle>New round</CardTitle>
            <CardDescription>Mode, prizes and delay apply from the next round.</CardDescription>
          </CardHeader>
          <CardContent>
            <NewRoundForm onStart={commands.startRound}>
              <Field>
                <FieldLabel htmlFor="token">Host token</FieldLabel>
                <Input
                  id="token"
                  type="password"
                  autoComplete="off"
                  value={token}
                  onChange={(e) => {
                    setToken(e.target.value);
                  }}
                />
              </Field>
            </NewRoundForm>
          </CardContent>
          <CardFooter className="flex flex-col items-stretch gap-4">
            <RoundCommands
              onCountdown={commands.startCountdown}
              onRestart={commands.restartRound}
              onWipe={commands.wipeAll}
            />
            <Console>{commands.output}</Console>
          </CardFooter>
        </Card>
        <ObservabilityCard />
      </div>
    </main>
  );
}
