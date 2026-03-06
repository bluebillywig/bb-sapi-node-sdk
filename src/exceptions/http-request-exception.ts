/** Base exception for non-successful HTTP responses from the SAPI. */
export class HTTPRequestException extends Error {
  public readonly statusCode: number;
  public readonly responseBody: string | null;

  constructor(message: string, statusCode: number, responseBody: string | null = null) {
    super(message);
    this.name = 'HTTPRequestException';
    this.statusCode = statusCode;
    this.responseBody = responseBody;
  }
}
