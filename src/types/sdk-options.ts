export interface SdkOptions {
  /** Override the base URI (e.g. for testing). */
  baseUri?: string;
  /** Injectable fetch function for testing. Defaults to global fetch. */
  fetch?: typeof fetch;
  /**
   * Default per-request timeout in milliseconds. A request that produces no
   * response within this window is aborted and surfaces as an
   * `HTTPConnectionException`. Pass `0` to disable the default timeout.
   * Defaults to 30000 (30s). Override per request via `RequestOptions.timeoutMs`
   * (streaming uploads pass `0`, since their duration scales with file size).
   */
  timeoutMs?: number;
}
