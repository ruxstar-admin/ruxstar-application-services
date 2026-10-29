export type ApiErrorKind =
  | 'network'
  | 'timeout'
  | 'validation'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'rate_limited'
  | 'server'
  | 'unknown';

/** status 0 means the request never got an HTTP response (offline, DNS, timeout). */
const kindFromStatus = (status: number): ApiErrorKind => {
  if (status >= 500) return 'server';
  switch (status) {
    case 400:
    case 422:
      return 'validation';
    case 401:
      return 'unauthorized';
    case 403:
      return 'forbidden';
    case 404:
      return 'not_found';
    case 409:
      return 'conflict';
    case 423:
    case 429:
      return 'rate_limited';
    default:
      return 'unknown';
  }
};

/** One entry of the API's `error.details`. `path` is like `body/password`. */
export interface ApiErrorDetail {
  path?: string;
  message: string;
  retryAfterSeconds?: number;
  attemptsLeft?: number;
  [key: string]: unknown;
}

export class ApiError extends Error {
  status: number;
  kind: ApiErrorKind;
  /** The API's stable `error.code`, for example `OTP_INVALID`. Empty for network failures and old mocks. */
  code: string;
  details: ApiErrorDetail[];

  constructor(status: number, message: string, kind: ApiErrorKind = kindFromStatus(status), code = '', details: ApiErrorDetail[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.kind = kind;
    this.code = code;
    this.details = details;
  }

  /** How long the API asked us to wait, from `details[].retryAfterSeconds`. */
  get retryAfterSeconds(): number | undefined {
    return this.details.find((d) => typeof d.retryAfterSeconds === 'number')?.retryAfterSeconds;
  }

  /** The first detail for a field, matched on the end of its path (`password` matches `body/password`). */
  detailFor(field: string): ApiErrorDetail | undefined {
    return this.details.find((d) => d.path === field || d.path?.endsWith(`/${field}`));
  }

  static network() {
    return new ApiError(0, 'Network request failed', 'network');
  }

  static timeout() {
    return new ApiError(0, 'Request timed out', 'timeout');
  }
}
