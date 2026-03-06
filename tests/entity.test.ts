import { describe, it, expect } from 'vitest';
import { Sdk } from '../src/sdk.js';
import { EmptyAuthenticator } from '../src/authentication/empty-authenticator.js';
import { MediaClip } from '../src/entities/media-clip.js';
import { Playlist } from '../src/entities/playlist.js';
import { Channel } from '../src/entities/channel.js';
import { Playout } from '../src/entities/playout.js';
import { Subtitle } from '../src/entities/subtitle.js';
import { Thumbnail } from '../src/entities/thumbnail.js';

describe('Entity access via SDK', () => {
  it('should provide correctly typed entities', () => {
    const sdk = new Sdk('my-publication', new EmptyAuthenticator());
    expect(sdk.mediaclip).toBeInstanceOf(MediaClip);
    expect(sdk.playlist).toBeInstanceOf(Playlist);
    expect(sdk.channel).toBeInstanceOf(Channel);
    expect(sdk.playout).toBeInstanceOf(Playout);
    expect(sdk.subtitle).toBeInstanceOf(Subtitle);
    expect(sdk.thumbnail).toBeInstanceOf(Thumbnail);
  });

  it('should cache entity instances', () => {
    const sdk = new Sdk('my-publication', new EmptyAuthenticator());
    expect(sdk.mediaclip).toBe(sdk.mediaclip);
    expect(sdk.playlist).toBe(sdk.playlist);
    expect(sdk.thumbnail).toBe(sdk.thumbnail);
  });

  it('should support mediacliplist alias for Playlist', () => {
    const sdk = new Sdk('my-publication', new EmptyAuthenticator());
    expect(sdk.mediacliplist).toBeInstanceOf(Playlist);
  });

  it('should support "in" operator on entity proxy', () => {
    const sdk = new Sdk('my-publication', new EmptyAuthenticator());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entities = (sdk as any)._entities;
    expect('mediaclip' in entities).toBe(true);
    expect('nonexistent' in entities).toBe(false);
  });

  it('should support Object.keys on entity proxy', () => {
    const sdk = new Sdk('my-publication', new EmptyAuthenticator());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entities = (sdk as any)._entities;
    const keys = Object.keys(entities);
    expect(keys).toContain('mediaclip');
    expect(keys).toContain('playlist');
    expect(keys).toContain('thumbnail');
  });

  it('should return undefined for unknown entity names', () => {
    const sdk = new Sdk('my-publication', new EmptyAuthenticator());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entities = (sdk as any)._entities;
    expect(entities.nonexistent).toBeUndefined();
  });

  it('should return undefined descriptor for unknown entity names', () => {
    const sdk = new Sdk('my-publication', new EmptyAuthenticator());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entities = (sdk as any)._entities;
    expect(Object.getOwnPropertyDescriptor(entities, 'nonexistent')).toBeUndefined();
  });

  it('should handle Symbol property access gracefully', () => {
    const sdk = new Sdk('my-publication', new EmptyAuthenticator());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entities = (sdk as any)._entities;
    expect(entities[Symbol.toPrimitive]).toBeUndefined();
    expect(Symbol.toPrimitive in entities).toBe(false);
  });
});
