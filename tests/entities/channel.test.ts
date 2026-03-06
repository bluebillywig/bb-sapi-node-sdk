import { describe, it, expect } from 'vitest';
import { Sdk } from '../../src/sdk.js';
import { EmptyAuthenticator } from '../../src/authentication/empty-authenticator.js';
import { createMockFetch } from '../helpers/mock-fetch.js';

describe('Channel', () => {
  it('should list channels', async () => {
    const { fetch, calls } = createMockFetch([{ status: 200 }]);
    const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });

    await sdk.channel.list(15, 1, 'createddate asc');

    const url = new URL(calls[0].url);
    expect(url.searchParams.get('limit')).toBe('15');
    expect(url.searchParams.get('offset')).toBe('1');
    expect(url.searchParams.get('sort')).toBe('createddate asc');
    expect(url.pathname).toBe('/sapi/channel');
    expect(calls[0].init?.method).toBe('GET');
  });

  it('should get a channel', async () => {
    const { fetch, calls } = createMockFetch([{ status: 200 }]);
    const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });

    await sdk.channel.get(1);

    expect(calls[0].url).toBe('https://my-publication.bbvms.com/sapi/channel/1');
    expect(calls[0].init?.method).toBe('GET');
  });

  it('should create a channel', async () => {
    const { fetch, calls } = createMockFetch([{ status: 200 }]);
    const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });

    const props = { config: { playIn: 'inline' } };
    await sdk.channel.create(props);

    expect(calls[0].url).toBe('https://my-publication.bbvms.com/sapi/channel');
    expect(calls[0].init?.method).toBe('PUT');
    expect(JSON.parse(calls[0].init?.body as string)).toEqual(props);
  });

  it('should update a channel', async () => {
    const { fetch, calls } = createMockFetch([{ status: 200 }]);
    const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });

    const props = { config: { playIn: 'overlay' } };
    await sdk.channel.update(1, props);

    expect(calls[0].url).toBe('https://my-publication.bbvms.com/sapi/channel/1');
    expect(calls[0].init?.method).toBe('PUT');
    expect(JSON.parse(calls[0].init?.body as string)).toEqual(props);
  });

  it('should delete a channel', async () => {
    const { fetch, calls } = createMockFetch([{ status: 200 }]);
    const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });

    await sdk.channel.delete(1);

    expect(calls[0].url).toBe('https://my-publication.bbvms.com/sapi/channel/1');
    expect(calls[0].init?.method).toBe('DELETE');
  });
});
