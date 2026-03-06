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
});
