import { HTTPRequestException } from './http-request-exception.js';

/**
 * Exception for transport-level failures — network error, DNS failure,
 * connection reset, or request timeout — where no HTTP response was received.
 *
 * `statusCode` is 0 to signal "no response reached us"; the underlying error
 * (e.g. a `TypeError` from fetch or a `TimeoutError` from `AbortSignal.timeout`)
 * is preserved on `cause`. Without this, a dropped connection surfaced as a raw
 * `TypeError` that bypassed the SDK's exception hierarchy entirely.
 */
export class HTTPConnectionException extends HTTPRequestException {
  constructor(message: string, options: { cause?: unknown } = {}) {
    super(message, 0, null);
    this.name = 'HTTPConnectionException';
    if (options.cause !== undefined) {
      (this as { cause?: unknown }).cause = options.cause;
    }
  }
}
