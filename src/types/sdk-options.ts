export interface SdkOptions {
  /** Override the base URI (e.g. for testing). */
  baseUri?: string;
  /** Injectable fetch function for testing. Defaults to global fetch. */
  fetch?: typeof fetch;
}
