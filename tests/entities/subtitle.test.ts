import { describe, it, expect } from 'vitest';
import { Sdk } from '../../src/sdk.js';
import { EmptyAuthenticator } from '../../src/authentication/empty-authenticator.js';
import { createMockFetch } from '../helpers/mock-fetch.js';

describe('Subtitle', () => {
  it('should list subtitles', async () => {
    const { fetch, calls } = createMockFetch([{ status: 200 }]);
    const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });

    await sdk.subtitle.list(10, 5, 'createddate asc');

    const url = new URL(calls[0].url);
    expect(url.searchParams.get('limit')).toBe('10');
    expect(url.searchParams.get('offset')).toBe('5');
    expect(url.searchParams.get('sort')).toBe('createddate asc');
    expect(url.pathname).toBe('/sapi/subtitle');
    expect(calls[0].init?.method).toBe('GET');
  });

  it('should get a subtitle', async () => {
    const { fetch, calls } = createMockFetch([{ status: 200 }]);
    const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });

    await sdk.subtitle.get(1);

    expect(calls[0].url).toBe('https://my-publication.bbvms.com/sapi/subtitle/1');
    expect(calls[0].init?.method).toBe('GET');
  });

  it('should create a subtitle', async () => {
    const { fetch, calls } = createMockFetch([{ status: 200 }]);
    const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });

    const props = {
      mediaclipId: 1,
      isocode: 'en',
    };
    await sdk.subtitle.create(props);

    expect(calls[0].url).toBe('https://my-publication.bbvms.com/sapi/subtitle');
    expect(calls[0].init?.method).toBe('PUT');
    expect(JSON.parse(calls[0].init?.body as string)).toEqual(props);
  });

  it('should update a subtitle', async () => {
    const { fetch, calls } = createMockFetch([{ status: 200 }]);
    const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });

    const props = { status: 'published' };
    await sdk.subtitle.update(1, props);

    expect(calls[0].url).toBe('https://my-publication.bbvms.com/sapi/subtitle/1');
    expect(calls[0].init?.method).toBe('PUT');
    expect(JSON.parse(calls[0].init?.body as string)).toEqual(props);
  });

  it('should delete a subtitle', async () => {
    const { fetch, calls } = createMockFetch([{ status: 200 }]);
    const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });

    await sdk.subtitle.delete(1);

    expect(calls[0].url).toBe('https://my-publication.bbvms.com/sapi/subtitle/1');
    expect(calls[0].init?.method).toBe('DELETE');
  });
});
