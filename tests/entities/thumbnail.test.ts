import { describe, it, expect } from 'vitest';
import { Sdk } from '../../src/sdk.js';
import { EmptyAuthenticator } from '../../src/authentication/empty-authenticator.js';

describe('Thumbnail', () => {
  it('should generate absolute image path with dimensions', () => {
    const sdk = new Sdk('my-publication', new EmptyAuthenticator());

    const absolutePath = sdk.thumbnail.getAbsoluteImagePath('/some/path/to/an/image', 0, 200);

    expect(absolutePath).toBe('https://my-publication.bbvms.com/image/0/200/some/path/to/an/image');
  });

  it('should handle non-leading-slash relative path', () => {
    const sdk = new Sdk('my-publication', new EmptyAuthenticator());

    const absolutePath = sdk.thumbnail.getAbsoluteImagePath('some/path/to/an/image', 300, 0);

    expect(absolutePath).toBe('https://my-publication.bbvms.com/image/300/0/some/path/to/an/image');
  });

  it('should throw for negative width', () => {
    const sdk = new Sdk('my-publication', new EmptyAuthenticator());

    expect(() => sdk.thumbnail.getAbsoluteImagePath('some/path', -1, 0)).toThrow(
      'Given width is lower than 0.',
    );
  });

  it('should throw for negative height', () => {
    const sdk = new Sdk('my-publication', new EmptyAuthenticator());

    expect(() => sdk.thumbnail.getAbsoluteImagePath('some/path', 0, -1)).toThrow(
      'Given height is lower than 0.',
    );
  });

  it('builds a clip poster URL from the OVP thumbnail route', () => {
    const sdk = new Sdk('my-publication', new EmptyAuthenticator());

    expect(sdk.thumbnail.getMediaClipPosterPath(1234, 320, 180)).toBe(
      'https://my-publication.bbvms.com/mediaclip/1234/spthumbnail/320/180.webp',
    );
  });

  it('lets the service choose the dimensions by default', () => {
    const sdk = new Sdk('my-publication', new EmptyAuthenticator());

    expect(sdk.thumbnail.getMediaClipPosterPath(1234)).toBe(
      'https://my-publication.bbvms.com/mediaclip/1234/spthumbnail/default/default.webp',
    );
  });

  it('carries an RPC token so draft clips resolve', () => {
    const sdk = new Sdk('my-publication', new EmptyAuthenticator());

    expect(sdk.thumbnail.getMediaClipPosterPath(1234, 'default', 'default', '12-345678')).toBe(
      'https://my-publication.bbvms.com/mediaclip/1234/spthumbnail/default/default.webp' +
        '?useSession=true&rpctoken=12-345678',
    );
  });

});
