import { RowList } from '@/components/board/RowList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Row } from '@/model/board';

interface Props {
  winners: Row[];
  feed: Row[];
  me: string;
}

export function RaceLists({ winners, feed, me }: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Winners</CardTitle>
        </CardHeader>
        <CardContent>
          <RowList variant="ranked" rows={winners} empty="Nobody has won yet" me={me} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Attempts feed</CardTitle>
        </CardHeader>
        <CardContent>
          <RowList variant="feed" rows={feed} empty="No attempts yet" me={me} />
        </CardContent>
      </Card>
    </div>
  );
}
