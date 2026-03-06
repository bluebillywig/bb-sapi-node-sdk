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
