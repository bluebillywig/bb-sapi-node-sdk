import type { Authenticator } from './authenticator.js';

/** An authenticator that performs no authentication (pass-through). Useful for testing. */
export class EmptyAuthenticator implements Authenticator {
  authenticate(): Record<string, string> {
    return {};
  }
}
