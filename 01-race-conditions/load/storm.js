import { check } from 'k6';
import exec from 'k6/execution';
import http from 'k6/http';
import { Counter } from 'k6/metrics';

const USERS = Number(__ENV.USERS ?? 200);
const CLICKS = Number(__ENV.CLICKS ?? 1);
const BASE = __ENV.BASE ?? 'http://nginx';

const results = {
  won: new Counter('prize_won'),
  sold_out: new Counter('prize_sold_out'),
  duplicate: new Counter('prize_duplicate'),
  queued: new Counter('prize_queued'),
};

export const options = {
  scenarios: {
    storm: {
      executor: 'per-vu-iterations',
      vus: USERS,
      iterations: 1,
      maxDuration: '2m',
    },
  },
};

export default function () {
  const user = `bot-${String(exec.vu.idInTest).padStart(3, '0')}`;
  const params = {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'claim' },
  };
  const body = JSON.stringify({ user });
  const requests = Array.from({ length: CLICKS }, () => [
    'POST',
    `${BASE}/api/game/claims`,
    body,
    params,
  ]);

  for (const response of http.batch(requests)) {
    const accepted = check(response, {
      'accepted (200/202)': (r) => r.status === 200 || r.status === 202,
    });
    if (accepted) {
      results[response.json('result')]?.add(1);
    }
  }
}
