import { describe, it, expect } from 'vitest';
import { Sdk } from '../src/sdk.js';
import { EmptyAuthenticator } from '../src/authentication/empty-authenticator.js';
import { HTTPClientErrorException } from '../src/exceptions/http-client-error-exception.js';
import { HTTPServerErrorException } from '../src/exceptions/http-server-error-exception.js';
import { createMockFetch } from './helpers/mock-fetch.js';

describe('Sdk', () => {
  it('should add rpctoken header with withRPCTokenAuthentication', async () => {
    const { fetch, calls } = createMockFetch([{ status: 200 }]);
    const sdk = Sdk.withRPCTokenAuthentication('my-publication', 1, 'my-shared-secret', { fetch });

    await sdk.sendRequest('GET', '/sapi/test-method');

    expect(calls).toHaveLength(1);
    const headers = calls[0].init?.headers as Record<string, string>;
    expect(headers.rpctoken).toBeDefined();
    expect(headers.rpctoken).toMatch(/^1-.+/);
  });

  it('should send request and return SapiResponse', async () => {
    const { fetch } = createMockFetch([{ status: 200 }]);
    const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });

    const response = await sdk.sendRequest('GET', '/sapi/test-method');

    expect(() => response.assertOk()).not.toThrow();
  });

  it('should handle 404 response', async () => {
    const { fetch } = createMockFetch([{ status: 404, statusText: 'Not Found' }]);
    const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });

    const response = await sdk.sendRequest('GET', '/sapi/test-method');

    expect(() => response.assertOk()).toThrow(HTTPClientErrorException);
  });

  it('should handle 500 response', async () => {
    const { fetch } = createMockFetch([{ status: 500, statusText: 'Internal Server Error' }]);
    const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });

    const response = await sdk.sendRequest('GET', '/sapi/test-method');

    expect(() => response.assertOk()).toThrow(HTTPServerErrorException);
  });

  it('should resolve relative SAPI URIs against baseUri', async () => {
    const { fetch, calls } = createMockFetch([{ status: 200 }]);
    const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });

    await sdk.sendRequest('GET', '/sapi/test-method');

    expect(calls[0].url).toBe('https://my-publication.bbvms.com/sapi/test-method');
  });

  it('should not modify absolute URIs', async () => {
    const { fetch, calls } = createMockFetch([{ status: 200 }]);
    const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });

    await sdk.sendRequest('GET', 'https://www.bluebillywig.com/');

    expect(calls[0].url).toBe('https://www.bluebillywig.com/');
  });

  it('should get publication data', async () => {
    const expected = { name: 'my-publication' };
    const { fetch, calls } = createMockFetch([
      { status: 200, body: JSON.stringify(expected) },
    ]);
    const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });

    const data = await sdk.getPublicationData();

    expect(data).toEqual(expected);
    expect(calls[0].url).toBe('https://my-publication.bbvms.com/sapi/publication');
  });

  it('should cache publication data', async () => {
    const expected = { name: 'my-publication' };
    const { fetch, calls } = createMockFetch([
      { status: 200, body: JSON.stringify(expected) },
    ]);
    const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });

    await sdk.getPublicationData();
    await sdk.getPublicationData();

    // Should only have been called once
    expect(calls).toHaveLength(1);
  });

  it('should send JSON body', async () => {
    const { fetch, calls } = createMockFetch([{ status: 200 }]);
    const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });

    await sdk.sendRequest('PUT', '/sapi/mediaclip', { json: { title: 'Test' } });

    expect(calls[0].init?.body).toBe('{"title":"Test"}');
    expect((calls[0].init?.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });

  it('should send query params', async () => {
    const { fetch, calls } = createMockFetch([{ status: 200 }]);
    const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });

    await sdk.sendRequest('GET', '/sapi/mediaclip', { query: { limit: '15', offset: '0' } });

    const url = new URL(calls[0].url);
    expect(url.searchParams.get('limit')).toBe('15');
    expect(url.searchParams.get('offset')).toBe('0');
  });
});

describe('Sdk request hardening (18134)', () => {
  const S3_URL = 'https://my-bucket.s3.amazonaws.com/upload?X-Amz-Signature=abc';

  describe('auth scoping (credential leak)', () => {
    it('does NOT send the rpctoken to a cross-origin (S3) URL', async () => {
      const { fetch, calls } = createMockFetch([{ status: 200 }]);
      const sdk = Sdk.withRPCTokenAuthentication('my-publication', 1, 'secret', { fetch });

      await sdk.sendRequest('PUT', S3_URL);

      const headers = calls[0].init?.headers as Record<string, string>;
      expect(headers.rpctoken).toBeUndefined();
    });

    it('still sends the rpctoken to same-origin SAPI requests (relative and absolute)', async () => {
      const { fetch, calls } = createMockFetch([{ status: 200 }, { status: 200 }]);
      const sdk = Sdk.withRPCTokenAuthentication('my-publication', 1, 'secret', { fetch });

      await sdk.sendRequest('GET', '/sapi/mediaclip');
      await sdk.sendRequest('GET', 'https://my-publication.bbvms.com/sapi/mediaclip');

      expect((calls[0].init?.headers as Record<string, string>).rpctoken).toMatch(/^1-/);
      expect((calls[1].init?.headers as Record<string, string>).rpctoken).toMatch(/^1-/);
    });

    it('skipAuth suppresses auth even on a same-origin request', async () => {
      const { fetch, calls } = createMockFetch([{ status: 200 }]);
      const sdk = Sdk.withRPCTokenAuthentication('my-publication', 1, 'secret', { fetch });

      await sdk.sendRequest('GET', '/sapi/mediaclip', { skipAuth: true });

      expect((calls[0].init?.headers as Record<string, string>).rpctoken).toBeUndefined();
    });

    it('fails closed (no rpctoken) when the URL is unparseable', async () => {
      const { fetch, calls } = createMockFetch([{ status: 200 }]);
      const sdk = Sdk.withRPCTokenAuthentication('my-publication', 1, 'secret', { fetch });

      // A malformed absolute URL makes origin resolution throw; the guard must
      // treat it as cross-origin and withhold auth rather than leak the token.
      await sdk.sendRequest('PUT', 'https://[');

      expect((calls[0].init?.headers as Record<string, string>).rpctoken).toBeUndefined();
    });
  });

  describe('streaming body', () => {
    it("sets duplex: 'half' when the body is a ReadableStream", async () => {
      const { fetch, calls } = createMockFetch([{ status: 200 }]);
      const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });
      const body = new ReadableStream();

      await sdk.sendRequest('PUT', S3_URL, { body });

      expect((calls[0].init as RequestInit & { duplex?: string }).duplex).toBe('half');
    });

    it('does not set duplex for a string/JSON body', async () => {
      const { fetch, calls } = createMockFetch([{ status: 200 }]);
      const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });

      await sdk.sendRequest('PUT', '/sapi/mediaclip', { json: { a: 1 } });

      expect((calls[0].init as RequestInit & { duplex?: string }).duplex).toBeUndefined();
    });
  });

  describe('timeout', () => {
    it('attaches an abort signal by default', async () => {
      const { fetch, calls } = createMockFetch([{ status: 200 }]);
      const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });

      await sdk.sendRequest('GET', '/sapi/mediaclip');

      expect(calls[0].init?.signal).toBeInstanceOf(AbortSignal);
    });

    it('omits the signal when timeoutMs is 0 (streaming uploads)', async () => {
      const { fetch, calls } = createMockFetch([{ status: 200 }]);
      const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });

      await sdk.sendRequest('PUT', S3_URL, { timeoutMs: 0 });

      expect(calls[0].init?.signal).toBeUndefined();
    });
  });

  describe('transport errors are typed', () => {
    it('wraps a network failure in HTTPConnectionException (preserving cause)', async () => {
      const cause = new TypeError('fetch failed');
      const sdk = new Sdk('my-publication', new EmptyAuthenticator(), {
        fetch: (async () => { throw cause; }) as unknown as typeof globalThis.fetch,
      });

      await expect(sdk.sendRequest('GET', '/sapi/mediaclip')).rejects.toMatchObject({
        name: 'HTTPConnectionException',
        statusCode: 0,
        cause,
      });
    });

    it('wraps a timeout (TimeoutError) in HTTPConnectionException', async () => {
      const timeoutErr = Object.assign(new Error('The operation timed out'), { name: 'TimeoutError' });
      const sdk = new Sdk('my-publication', new EmptyAuthenticator(), {
        fetch: (async () => { throw timeoutErr; }) as unknown as typeof globalThis.fetch,
      });

      await expect(sdk.sendRequest('GET', '/sapi/mediaclip'))
        .rejects.toThrow(/timed out after 30000ms/);
    });

    it('wraps a thrown non-Error value in HTTPConnectionException', async () => {
      const sdk = new Sdk('my-publication', new EmptyAuthenticator(), {
        // eslint-disable-next-line @typescript-eslint/no-throw-literal
        fetch: (async () => { throw 'boom'; }) as unknown as typeof globalThis.fetch,
      });

      await expect(sdk.sendRequest('GET', '/sapi/mediaclip')).rejects.toMatchObject({
        name: 'HTTPConnectionException',
        statusCode: 0,
        cause: 'boom',
      });
    });
  });
});
