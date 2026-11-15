import { ApiError } from '../api-error';
import { IdempotentAttempt, keepIdempotencyKey, newIdempotencyKey } from '../idempotency';

describe('keepIdempotencyKey', () => {
  it('keeps the key when the server may have done the work', () => {
    expect(keepIdempotencyKey(ApiError.network())).toBe(true);
    expect(keepIdempotencyKey(ApiError.timeout())).toBe(true);
    for (const status of [408, 502, 503, 504]) expect(keepIdempotencyKey(new ApiError(status, 'x'))).toBe(true);
    expect(keepIdempotencyKey(new ApiError(409, 'x', undefined, 'IDEMPOTENCY_IN_PROGRESS'))).toBe(true);
  });

  it('drops the key after a real answer', () => {
    for (const status of [400, 401, 403, 404, 409, 422, 429, 500]) expect(keepIdempotencyKey(new ApiError(status, 'x'))).toBe(false);
    expect(keepIdempotencyKey(new ApiError(422, 'x', undefined, 'IDEMPOTENCY_KEY_REUSED'))).toBe(false);
  });

  it('drops the key on success or a bug in the app', () => {
    expect(keepIdempotencyKey(undefined)).toBe(false);
    expect(keepIdempotencyKey(new TypeError('boom'))).toBe(false);
  });
});

describe('newIdempotencyKey', () => {
  it('makes a different key each time', () => {
    const keys = new Set(Array.from({ length: 50 }, newIdempotencyKey));
    expect(keys.size).toBe(50);
  });
});

describe('IdempotentAttempt', () => {
  it('sends the same key again for the same inputs after a timeout', () => {
    const attempt = new IdempotentAttempt();
    const first = attempt.keyFor({ qty: 2 });
    attempt.settle(ApiError.timeout());
    expect(attempt.keyFor({ qty: 2 })).toBe(first);
    attempt.settle(new ApiError(503, 'x'));
    expect(attempt.keyFor({ qty: 2 })).toBe(first);
  });

  it('uses a new key after a refusal', () => {
    const attempt = new IdempotentAttempt();
    const first = attempt.keyFor({ qty: 2 });
    attempt.settle(new ApiError(422, 'x', undefined, 'COUPON_INVALID'));
    expect(attempt.keyFor({ qty: 2 })).not.toBe(first);
  });

  it('uses a new key after success', () => {
    const attempt = new IdempotentAttempt();
    const first = attempt.keyFor({ qty: 2 });
    attempt.settle();
    expect(attempt.keyFor({ qty: 2 })).not.toBe(first);
  });

  it('uses a new key when the inputs change', () => {
    const attempt = new IdempotentAttempt();
    const first = attempt.keyFor({ qty: 2 });
    attempt.settle(ApiError.network());
    expect(attempt.keyFor({ qty: 3 })).not.toBe(first);
  });

  it('keeps the key across taps before any answer', () => {
    const attempt = new IdempotentAttempt();
    expect(attempt.keyFor(['a', 1])).toBe(attempt.keyFor(['a', 1]));
  });
});
