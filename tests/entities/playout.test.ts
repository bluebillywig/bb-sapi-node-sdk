import { describe, it, expect } from 'vitest';
import { Sdk } from '../../src/sdk.js';
import { EmptyAuthenticator } from '../../src/authentication/empty-authenticator.js';
import { createMockFetch } from '../helpers/mock-fetch.js';

describe('Playout', () => {
  it('should list playouts using /sapi/player', async () => {
    const { fetch, calls } = createMockFetch([{ status: 200 }]);
    const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });

    await sdk.playout.list(10, 5, 'createddate asc');

    const url = new URL(calls[0].url);
    expect(url.searchParams.get('limit')).toBe('10');
    expect(url.searchParams.get('offset')).toBe('5');
    expect(url.searchParams.get('sort')).toBe('createddate asc');
    expect(url.pathname).toBe('/sapi/player');
    expect(calls[0].init?.method).toBe('GET');
  });

  it('should get a playout', async () => {
    const { fetch, calls } = createMockFetch([{ status: 200 }]);
    const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });

    await sdk.playout.get(1);

    expect(calls[0].url).toBe('https://my-publication.bbvms.com/sapi/player/1');
    expect(calls[0].init?.method).toBe('GET');
  });

  it('should create a playout', async () => {
    const { fetch, calls } = createMockFetch([{ status: 200 }]);
    const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });

    const props = { name: 'My Playout' };
    await sdk.playout.create(props);

    expect(calls[0].url).toBe('https://my-publication.bbvms.com/sapi/player');
    expect(calls[0].init?.method).toBe('PUT');
    expect(JSON.parse(calls[0].init?.body as string)).toEqual(props);
  });

  it('should update a playout', async () => {
    const { fetch, calls } = createMockFetch([{ status: 200 }]);
    const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });

    const props = { name: 'My Updated Playout' };
    await sdk.playout.update(1, props);

    expect(calls[0].url).toBe('https://my-publication.bbvms.com/sapi/player/1');
    expect(calls[0].init?.method).toBe('PUT');
    expect(JSON.parse(calls[0].init?.body as string)).toEqual(props);
  });

  it('should delete a playout', async () => {
    const { fetch, calls } = createMockFetch([{ status: 200 }]);
    const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });

    await sdk.playout.delete(1);

    expect(calls[0].url).toBe('https://my-publication.bbvms.com/sapi/player/1');
    expect(calls[0].init?.method).toBe('DELETE');
  });
});
