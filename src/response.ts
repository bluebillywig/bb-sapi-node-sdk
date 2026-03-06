import { HTTPRequestException } from './exceptions/http-request-exception.js';
import { HTTPClientErrorException } from './exceptions/http-client-error-exception.js';
import { HTTPServerErrorException } from './exceptions/http-server-error-exception.js';
import { HTTPStatusCodeCategory, getStatusCodeCategory } from './util/http-status-code-category.js';

/** Represents an SAPI HTTP response with convenience accessors. */
export class SapiResponse {
  /** The final resolved URL of the request (including query params). */
  public readonly url: string;
  /** The HTTP method used for the request. */
  public readonly method: string;
  /** The HTTP status code. */
  public readonly statusCode: number;
  /** The HTTP status text. */
  public readonly statusText: string;
  /** The response headers. */
  public readonly headers: Record<string, string>;
  /** The raw response body as a string. */
  public readonly body: string;

  constructor(
    url: string,
    method: string,
    statusCode: number,
    statusText: string,
    headers: Record<string, string>,
    body: string,
  ) {
    this.url = url;
    this.method = method;
    this.statusCode = statusCode;
    this.statusText = statusText;
    this.headers = headers;
    this.body = body;
  }

  /** `true` if the response has a 2xx status code. */
  get ok(): boolean {
    return this.statusCategory === HTTPStatusCodeCategory.Successful;
  }

  /** The HTTP status code category (Informational, Successful, etc.). */
  get statusCategory(): HTTPStatusCodeCategory {
    return getStatusCodeCategory(this.statusCode);
  }

  /**
   * Throws an appropriate HTTP exception if the response is not 2xx.
   * @throws {HTTPClientErrorException} for 4xx responses
   * @throws {HTTPServerErrorException} for 5xx responses
   * @throws {HTTPRequestException} for other non-2xx responses
   */
  assertOk(): void {
    if (!this.ok) {
      const responseBody = this.body.length > 0 ? this.body : null;
      switch (this.statusCategory) {
        case HTTPStatusCodeCategory.ClientError:
          throw new HTTPClientErrorException(this.statusText, this.statusCode, responseBody);
        case HTTPStatusCodeCategory.ServerError:
          throw new HTTPServerErrorException(this.statusText, this.statusCode, responseBody);
        default:
          throw new HTTPRequestException(this.statusText, this.statusCode, responseBody);
      }
    }
  }

  /**
   * Parses the response body as JSON.
   * @returns The parsed JSON, or `null` if the body is empty.
   * @throws {SyntaxError} if the body is not valid JSON.
   */
  json<T = Record<string, unknown>>(): T | null {
    if (this.body.length === 0) {
      return null;
    }
    return JSON.parse(this.body) as T;
  }

  /**
   * Returns a response header value by name (case-insensitive lookup).
   * @returns The header value, or `undefined` if not present.
   */
  header(name: string): string | undefined {
    const lower = name.toLowerCase();
    for (const [key, value] of Object.entries(this.headers)) {
      if (key.toLowerCase() === lower) {
        return value;
      }
    }
    return undefined;
  }

  /**
   * Returns a query parameter from the request URL.
   * @returns The parameter value, or `null` if not present.
   */
  queryParam(name: string): string | null {
    const url = new URL(this.url, 'https://placeholder.local');
    return url.searchParams.get(name);
  }

  /** Returns `true` if all responses in the array have 2xx status codes. */
  static allOk(responses: SapiResponse[]): boolean {
    return responses.every((r) => r.ok);
  }

  /**
   * Asserts all responses are 2xx. Throws on the first non-2xx response.
   * @throws {HTTPRequestException} if any response is not 2xx.
   */
  static assertAllOk(responses: SapiResponse[]): void {
    for (const response of responses) {
      response.assertOk();
    }
  }

  /** Yields only the failed (non-2xx) responses from the given array. */
  static *failedResponses(responses: SapiResponse[]): Generator<SapiResponse> {
    for (const response of responses) {
      if (!response.ok) {
        yield response;
      }
    }
  }
}
