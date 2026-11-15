import { ApiError } from './api-error';

/** A fresh `Idempotency-Key`: one per user action, kept for that action's retries. */
export const newIdempotencyKey = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}-${Math.random().toString(36).slice(2, 12)}`;

/** Gateway and request timeouts: the API may still have done the work behind them. */
const MAYBE_DONE = [408, 502, 503, 504];

/**
 * Whether a failed write may still have gone through, so the retry must send the same key: no answer at all (offline or
 * timed out), a gateway or request timeout, or the first try still running. The API replays a real refusal (any other 4xx)
 * to the same key and forgets a 500, so after those the caller makes a new one.
 */
export const keepIdempotencyKey = (err: unknown) =>
  err instanceof ApiError && (err.kind === 'network' || err.kind === 'timeout' || err.code === 'IDEMPOTENCY_IN_PROGRESS' || MAYBE_DONE.includes(err.status));

/**
 * The key for an action whose inputs can change between tries, such as a checkout. The same inputs keep their key while
 * the last try may have gone through; other inputs get a new one, since the API refuses a key sent with a different body.
 */
export class IdempotentAttempt {
  private current: { inputs: string; key: string } | null = null;

  /** The key to send with these inputs. */
  keyFor(inputs: unknown): string {
    const sig = JSON.stringify(inputs) ?? '';
    if (this.current?.inputs !== sig) this.current = { inputs: sig, key: newIdempotencyKey() };
    return this.current.key;
  }

  /** After a try: nothing (it worked) or its error. Only an error that may have gone through keeps the key. */
  settle(err?: unknown) {
    if (!keepIdempotencyKey(err)) this.current = null;
  }
}
