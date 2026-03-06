/** Strategy interface for authenticating outgoing SAPI requests. */
export interface Authenticator {
  /** Returns headers to add to the outgoing request for authentication. */
  authenticate(): Record<string, string>;
}
