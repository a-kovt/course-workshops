import { ExternalLink } from 'lucide-react';

import { Console } from '@/components/host/Console';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

const TOOLS = [
  { text: 'Grafana dashboard', port: 3000, path: '/' },
  { text: 'Jaeger traces', port: 16686, path: '/search?service=race-conditions-api' },
  { text: 'RabbitMQ queues (guest / guest)', port: 15672, path: '/#/queues' },
  { text: 'Prometheus', port: 9090, path: '/query' },
];

const STORM_COMMANDS = `docker compose run --rm k6 run /scripts/storm.js
docker compose run --rm -e USERS=300 -e CLICKS=3 \\
  k6 run /scripts/storm.js`;

export function ObservabilityCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Observability</CardTitle>
        <CardDescription>Tools run on the host machine.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ul className="flex flex-col gap-1 text-sm">
          {TOOLS.map(({ text, port, path }) => (
            <li key={port}>
              <a
                className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
                href={`http://${window.location.hostname}:${port}${path}`}
                target="_blank"
                rel="noreferrer"
              >
                {text}
                <ExternalLink className="size-3" />
              </a>
            </li>
          ))}
        </ul>
        <Separator />
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium">Bot storm</h2>
          <Console>{STORM_COMMANDS}</Console>
        </div>
      </CardContent>
    </Card>
  );
}
