import { describe, expect, it } from 'vitest';

import { describeOutcome } from '@/model/labels';

describe('describeOutcome', () => {
  it('names the instance that handled the claim', () => {
    expect(describeOutcome({ result: 'won', instance: 'app2' })).toEqual({
      text: 'The prize is yours! · handled by app2',
      tone: 'success',
    });
  });

  it('shows the first result for a repeated claim', () => {
    expect(describeOutcome({ result: 'duplicate', previous: 'sold_out' }).text).toBe(
      'You have already played this round (first attempt – Sold out)',
    );
  });

  it('prefers the server error detail', () => {
    expect(describeOutcome({ result: 'error', detail: 'Message broker is not running' })).toEqual({
      text: 'Message broker is not running',
      tone: 'destructive',
    });
  });
});
