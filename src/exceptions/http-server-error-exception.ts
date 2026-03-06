import { HTTPRequestException } from './http-request-exception.js';

/** Exception for 5xx (server error) HTTP responses. */
export class HTTPServerErrorException extends HTTPRequestException {
  constructor(message: string, statusCode: number, responseBody: string | null = null) {
    super(message, statusCode, responseBody);
    this.name = 'HTTPServerErrorException';
  }
}
