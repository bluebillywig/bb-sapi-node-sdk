import type { Authenticator } from './authenticator.js';
import { generateHotpByTime } from '../util/hotp.js';

/**
 * Default token expiration window in seconds.
 * Tokens are valid within this time window. Both client and server must have
 * reasonably synchronized clocks (within this window) for authentication to succeed.
 */
const DEFAULT_TOKEN_EXPIRATION_SECONDS = 120;

export class RPCTokenAuthenticator implements Authenticator {
  public readonly tokenId: number;
  private readonly sharedSecret: string;
  public readonly tokenExpiration: number;

  constructor(tokenId: number, sharedSecret: string, tokenExpiration: number = DEFAULT_TOKEN_EXPIRATION_SECONDS) {
    this.tokenId = tokenId;
    this.sharedSecret = sharedSecret;
    this.tokenExpiration = tokenExpiration;
  }

  authenticate(): Record<string, string> {
    const token = generateHotpByTime(this.sharedSecret, this.tokenExpiration);
    return { rpctoken: `${this.tokenId}-${token}` };
  }
}
