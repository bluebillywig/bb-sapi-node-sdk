import { describe, it, expect } from 'vitest';
import { RPCTokenAuthenticator } from '../../src/authentication/rpc-token-authenticator.js';
import { generateHotpByTimeWindow } from '../../src/util/hotp.js';

describe('RPCTokenAuthenticator', () => {
  it('should return headers with rpctoken in correct format', () => {
    const authenticator = new RPCTokenAuthenticator(1, 'some-secret');

    const headers = authenticator.authenticate();

    expect(headers.rpctoken).toBeDefined();

    const [tokenId, token] = headers.rpctoken.split('-');
    expect(tokenId).toBe('1');
    expect(token).toBeTruthy();

    // Verify the token is in the valid time window
    const now = Math.floor(Date.now() / 1000);
    const validTokens = generateHotpByTimeWindow('some-secret', 120, -1, 1, now);
    const tokenValues = [...validTokens.values()];
    expect(tokenValues).toContain(token);
  });

  it('should only return the rpctoken header', () => {
    const authenticator = new RPCTokenAuthenticator(1, 'some-secret');

    const headers = authenticator.authenticate();

    expect(Object.keys(headers)).toEqual(['rpctoken']);
  });
});
