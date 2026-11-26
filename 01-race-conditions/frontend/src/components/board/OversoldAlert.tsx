import { TriangleAlert } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface Props {
  over: number;
}

export function OversoldAlert({ over }: Props) {
  if (over <= 0) {
    return null;
  }

  return (
    <Alert key={over} variant="destructive" className="motion-safe:animate-shake">
      <TriangleAlert />
      <AlertTitle>Oversold</AlertTitle>
      <AlertDescription>{over} more handed out than there were prizes!</AlertDescription>
    </Alert>
  );
}
