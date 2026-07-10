import type { Authenticator } from './authentication/authenticator.js';
import { RPCTokenAuthenticator } from './authentication/rpc-token-authenticator.js';
import { SapiResponse } from './response.js';
import { createEntityProxy, type EntityRegistration } from './entity-register.js';
import { MediaClip } from './entities/media-clip.js';
import { Playlist } from './entities/playlist.js';
import { Channel } from './entities/channel.js';
import { Playout } from './entities/playout.js';
import { Subtitle } from './entities/subtitle.js';
import { Thumbnail } from './entities/thumbnail.js';
import type { SdkOptions } from './types/sdk-options.js';
import { HTTPConnectionException } from './exceptions/http-connection-exception.js';

export interface RequestOptions {
  query?: Record<string, string>;
  json?: unknown;
  body?: BodyInit | null;
  headers?: Record<string, string>;
  /**
   * Force-skip the SAPI auth headers for this request. By default auth is
   * attached only to same-origin (SAPI) requests; cross-origin URLs (e.g. S3
   * presigned upload/progress URLs) are never sent the rpctoken. Set this to
   * also suppress auth on a same-origin request.
   */
  skipAuth?: boolean;
  /**
   * Per-request timeout in ms, overriding `SdkOptions.timeoutMs`. Pass `0` to
   * disable the timeout for this request (used by streaming uploads).
   */
  timeoutMs?: number;
}

interface EntityMap {
  mediaclip: MediaClip;
  mediacliplist: Playlist;
  playlist: Playlist;
  channel: Channel;
  playout: Playout;
  subtitle: Subtitle;
  thumbnail: Thumbnail;
}

const ENTITY_REGISTRATIONS: EntityRegistration[] = [
  { name: 'mediaclip', factory: (parent) => new MediaClip(parent) },
  { name: 'mediacliplist', factory: (parent) => new Playlist(parent) },
  { name: 'playlist', factory: (parent) => new Playlist(parent) },
  { name: 'channel', factory: (parent) => new Channel(parent) },
  { name: 'playout', factory: (parent) => new Playout(parent) },
  { name: 'subtitle', factory: (parent) => new Subtitle(parent) },
  { name: 'thumbnail', factory: (parent) => new Thumbnail(parent) },
];

/**
 * Main entry point for the Blue Billywig SAPI SDK.
 * Provides authenticated access to SAPI entities and handles HTTP communication.
 */
export class Sdk {
  public readonly publication: string;
  private readonly authenticator: Authenticator;
  private readonly _baseUri: string;
  private readonly _fetch: typeof fetch;
  private readonly _timeoutMs: number;
  private readonly _entities: EntityMap;
  private _publicationDataPromise: Promise<Record<string, unknown>> | null = null;

  constructor(publication: string, authenticator: Authenticator, options: SdkOptions = {}) {
    this.publication = publication;
    this.authenticator = authenticator;
    this._baseUri = options.baseUri ?? `https://${publication}.bbvms.com`;
    this._fetch = options.fetch ?? globalThis.fetch;
    this._timeoutMs = options.timeoutMs ?? 30000;
    this._entities = createEntityProxy<EntityMap>(ENTITY_REGISTRATIONS, () => this);
  }

  /**
   * True when `url` targets the same origin as the SAPI base URI. Used to gate
   * auth-header attachment: cross-origin URLs (presigned S3/CloudFront upload
   * and progress URLs) must never receive the rpctoken, or the credential ends
   * up in CDN access logs. An unparseable URL is treated as cross-origin (fail
   * closed — don't leak auth to something we can't reason about).
   */
  private _isSameOrigin(url: string): boolean {
    try {
      return new URL(url).origin === new URL(this._baseUri).origin;
    } catch {
      return false;
    }
  }

  /**
   * Creates an SDK instance configured with RPC token authentication.
   * @param publication - The publication name.
   * @param tokenId - The RPC token ID.
   * @param sharedSecret - The shared secret for HOTP token generation.
   * @param options - Optional SDK configuration.
   */
  static withRPCTokenAuthentication(
    publication: string,
    tokenId: number,
    sharedSecret: string,
    options: SdkOptions = {},
  ): Sdk {
    return new Sdk(publication, new RPCTokenAuthenticator(tokenId, sharedSecret), options);
  }

  /** Self-reference for entity parent resolution. */
  get sdk(): Sdk {
    return this;
  }

  /** The base URI used for resolving relative SAPI paths. */
  get baseUri(): string {
    return this._baseUri;
  }

  /** Access the MediaClip entity for CRUD operations on media clips. */
  get mediaclip(): MediaClip {
    return this._entities.mediaclip;
  }

  /** Access the Playlist entity via the legacy `mediacliplist` alias. */
  get mediacliplist(): Playlist {
    return this._entities.mediacliplist;
  }

  /** Access the Playlist entity for CRUD operations on playlists. */
  get playlist(): Playlist {
    return this._entities.playlist;
  }

  /** Access the Channel entity for CRUD operations on channels. */
  get channel(): Channel {
    return this._entities.channel;
  }

  /** Access the Playout entity for CRUD operations on playouts. */
  get playout(): Playout {
    return this._entities.playout;
  }

  /** Access the Subtitle entity for CRUD operations on subtitles. */
  get subtitle(): Subtitle {
    return this._entities.subtitle;
  }

  /** Access the Thumbnail entity for thumbnail path resolution. */
  get thumbnail(): Thumbnail {
    return this._entities.thumbnail;
  }

  /**
   * Sends an authenticated HTTP request to the SAPI.
   * Relative paths are resolved against the SDK's base URI.
   * @param method - HTTP method (GET, PUT, DELETE, etc.).
   * @param path - URL path or absolute URL.
   * @param options - Optional query parameters, JSON body, raw body, or extra headers.
   */
  async sendRequest(method: string, path: string, options: RequestOptions = {}): Promise<SapiResponse> {
    // Resolve URL first: relative paths get resolved against baseUri, and the
    // resolved origin decides whether auth headers may be attached.
    let url: string;
    if (path.startsWith('http://') || path.startsWith('https://')) {
      url = path;
    } else {
      url = `${this._baseUri}${path}`;
    }

    // Add query params
    if (options.query && Object.keys(options.query).length > 0) {
      const urlObj = new URL(url);
      for (const [key, value] of Object.entries(options.query)) {
        urlObj.searchParams.set(key, value);
      }
      url = urlObj.toString();
    }

    // Attach SAPI auth ONLY to same-origin requests. Presigned S3/CloudFront
    // upload + progress URLs are cross-origin; sending the rpctoken there leaks
    // the credential into CDN access logs. `skipAuth` can also suppress it on a
    // same-origin request.
    const skipAuth = options.skipAuth ?? !this._isSameOrigin(url);
    const authHeaders = skipAuth ? {} : this.authenticator.authenticate();

    // Build fetch options
    const headers: Record<string, string> = { ...authHeaders, ...options.headers };
    const fetchOptions: RequestInit = { method, headers };

    if (options.json !== undefined) {
      fetchOptions.body = JSON.stringify(options.json);
      headers['Content-Type'] = 'application/json';
    } else if (options.body != null) {
      fetchOptions.body = options.body;
      // Node's fetch requires `duplex: 'half'` to stream a request body; without
      // it, a ReadableStream body throws "RequestInit: duplex option is required".
      if (options.body instanceof ReadableStream) {
        (fetchOptions as RequestInit & { duplex?: 'half' }).duplex = 'half';
      }
    }

    // Per-request timeout (SdkOptions default, overridable; 0 disables). Without
    // this a stalled connection hangs the call forever.
    const timeoutMs = options.timeoutMs ?? this._timeoutMs;
    if (timeoutMs > 0) {
      fetchOptions.signal = AbortSignal.timeout(timeoutMs);
    }

    // Wrap transport errors (network failure / timeout) in the SDK exception
    // hierarchy instead of letting a raw TypeError/TimeoutError escape.
    let fetchResponse: Response;
    try {
      fetchResponse = await this._fetch(url, fetchOptions);
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new HTTPConnectionException(
          `Request to ${url} timed out after ${timeoutMs}ms`,
          { cause: error },
        );
      }
      throw new HTTPConnectionException(
        `Network request to ${url} failed: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      );
    }

    // Collect response headers
    const responseHeaders: Record<string, string> = {};
    fetchResponse.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    const bodyText = await fetchResponse.text();

    return new SapiResponse(
      url,
      method,
      fetchResponse.status,
      fetchResponse.statusText,
      responseHeaders,
      bodyText,
    );
  }

  /**
   * Fetches and caches publication data from the SAPI.
   * Subsequent calls return the cached result.
   */
  async getPublicationData(): Promise<Record<string, unknown>> {
    if (!this._publicationDataPromise) {
      this._publicationDataPromise = this.sendRequest('GET', '/sapi/publication')
        .then(response => {
          response.assertOk();
          return response.json<Record<string, unknown>>()!;
        });
    }
    return this._publicationDataPromise;
  }
}
