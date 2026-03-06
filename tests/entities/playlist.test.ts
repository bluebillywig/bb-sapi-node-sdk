import { describe, it, expect } from 'vitest';
import { Sdk } from '../../src/sdk.js';
import { EmptyAuthenticator } from '../../src/authentication/empty-authenticator.js';
import { createMockFetch } from '../helpers/mock-fetch.js';

describe('Playlist', () => {
  it('should list playlists', async () => {
    const { fetch, calls } = createMockFetch([{ status: 200 }]);
    const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });

    await sdk.playlist.list(10, 5, 'createddate asc');

    const url = new URL(calls[0].url);
    expect(url.searchParams.get('limit')).toBe('10');
    expect(url.searchParams.get('offset')).toBe('5');
    expect(url.searchParams.get('sort')).toBe('createddate asc');
    expect(url.pathname).toBe('/sapi/playlist');
    expect(calls[0].init?.method).toBe('GET');
  });

  it('should get a playlist', async () => {
    const { fetch, calls } = createMockFetch([{ status: 200 }]);
    const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });

    await sdk.playlist.get(1);

    expect(calls[0].url).toBe('https://my-publication.bbvms.com/sapi/playlist/1');
    expect(calls[0].init?.method).toBe('GET');
  });

  it('should create a playlist', async () => {
    const { fetch, calls } = createMockFetch([{ status: 200 }]);
    const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });

    const props = { title: 'My Playlist' };
    await sdk.playlist.create(props);

    expect(calls[0].url).toBe('https://my-publication.bbvms.com/sapi/playlist');
    expect(calls[0].init?.method).toBe('PUT');
    expect(JSON.parse(calls[0].init?.body as string)).toEqual(props);
  });

  it('should update a playlist', async () => {
    const { fetch, calls } = createMockFetch([{ status: 200 }]);
    const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });

    const props = { title: 'My Updated Playlist' };
    await sdk.playlist.update(1, props);

    expect(calls[0].url).toBe('https://my-publication.bbvms.com/sapi/playlist/1');
    expect(calls[0].init?.method).toBe('PUT');
    expect(JSON.parse(calls[0].init?.body as string)).toEqual(props);
  });

  it('should delete a playlist', async () => {
    const { fetch, calls } = createMockFetch([{ status: 200 }]);
    const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });

    await sdk.playlist.delete(1);

    expect(calls[0].url).toBe('https://my-publication.bbvms.com/sapi/playlist/1');
    expect(calls[0].init?.method).toBe('DELETE');
  });

  it('should support mediacliplist alias', async () => {
    const { fetch, calls } = createMockFetch([{ status: 200 }]);
    const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });

    await sdk.mediacliplist.get(1);

    expect(calls[0].url).toBe('https://my-publication.bbvms.com/sapi/playlist/1');
    expect(calls[0].init?.method).toBe('GET');
  });
});
