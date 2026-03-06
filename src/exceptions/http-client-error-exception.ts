import { HTTPRequestException } from './http-request-exception.js';

/** Exception for 4xx (client error) HTTP responses. */
export class HTTPClientErrorException extends HTTPRequestException {
  constructor(message: string, statusCode: number, responseBody: string | null = null) {
    super(message, statusCode, responseBody);
    this.name = 'HTTPClientErrorException';
  }
}
