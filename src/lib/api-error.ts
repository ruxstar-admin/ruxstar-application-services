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
    case 429:
      return 'rate_limited';
    default:
      return 'unknown';
  }
};

export class ApiError extends Error {
  status: number;
  kind: ApiErrorKind;

  constructor(status: number, message: string, kind: ApiErrorKind = kindFromStatus(status)) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.kind = kind;
  }

  static network() {
    return new ApiError(0, 'Network request failed', 'network');
  }

  static timeout() {
    return new ApiError(0, 'Request timed out', 'timeout');
  }
}
