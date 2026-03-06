import { describe, it, expect } from 'vitest';
import { SapiResponse } from '../src/response.js';
import { HTTPRequestException } from '../src/exceptions/http-request-exception.js';
import { HTTPClientErrorException } from '../src/exceptions/http-client-error-exception.js';
import { HTTPServerErrorException } from '../src/exceptions/http-server-error-exception.js';
import { HTTPStatusCodeCategory, getStatusCodeCategory } from '../src/util/http-status-code-category.js';

function makeResponse(statusCode: number, body: string = '', headers: Record<string, string> = {}): SapiResponse {
  return new SapiResponse('https://www.bluebillywig.com/', 'GET', statusCode, '', headers, body);
}

describe('SapiResponse', () => {
  describe('ok', () => {
    it('should return true for 2xx status codes', () => {
      for (let code = 200; code <= 299; code++) {
        expect(makeResponse(code).ok).toBe(true);
      }
    });

    it.each([
      [100, 199],
      [300, 399],
      [400, 499],
      [500, 599],
    ])('should return false for %i-%i status codes', (start, end) => {
      for (let code = start; code <= end; code++) {
        expect(makeResponse(code).ok).toBe(false);
      }
    });
  });

  describe('assertOk', () => {
    it('should not throw for 2xx status codes', () => {
      for (let code = 200; code <= 299; code++) {
        expect(() => makeResponse(code).assertOk()).not.toThrow();
      }
    });

    it('should throw HTTPRequestException for 1xx', () => {
      for (let code = 100; code <= 199; code++) {
        expect(() => makeResponse(code).assertOk()).toThrow(HTTPRequestException);
      }
    });

    it('should throw HTTPRequestException for 3xx', () => {
      for (let code = 300; code <= 399; code++) {
        expect(() => makeResponse(code).assertOk()).toThrow(HTTPRequestException);
      }
    });

    it('should throw HTTPClientErrorException for 4xx', () => {
      for (let code = 400; code <= 499; code++) {
        expect(() => makeResponse(code).assertOk()).toThrow(HTTPClientErrorException);
      }
    });

    it('should throw HTTPServerErrorException for 5xx', () => {
      for (let code = 500; code <= 599; code++) {
        expect(() => makeResponse(code).assertOk()).toThrow(HTTPServerErrorException);
      }
    });

    it('should include response body in exception when non-empty', () => {
      try {
        makeResponse(400, 'error details').assertOk();
        expect.unreachable('Should have thrown');
      } catch (error) {
        expect((error as HTTPClientErrorException).responseBody).toBe('error details');
      }
    });

    it('should set responseBody to null when body is empty', () => {
      try {
        makeResponse(400, '').assertOk();
        expect.unreachable('Should have thrown');
      } catch (error) {
        expect((error as HTTPClientErrorException).responseBody).toBeNull();
      }
    });
  });

  describe('statusCategory', () => {
    it.each([
      [100, 199, HTTPStatusCodeCategory.Informational],
      [200, 299, HTTPStatusCodeCategory.Successful],
      [300, 399, HTTPStatusCodeCategory.Redirection],
      [400, 499, HTTPStatusCodeCategory.ClientError],
      [500, 599, HTTPStatusCodeCategory.ServerError],
    ])('should return correct category for %i-%i', (start, end, expected) => {
      for (let code = start; code <= end; code++) {
        expect(makeResponse(code).statusCategory).toBe(expected);
      }
    });

    it('should throw RangeError for out-of-range status codes', () => {
      expect(() => getStatusCodeCategory(0)).toThrow(RangeError);
      expect(() => getStatusCodeCategory(600)).toThrow(RangeError);
      expect(() => getStatusCodeCategory(99)).toThrow(RangeError);
    });
  });

  describe('allOk', () => {
    it('should return true when all responses are 2xx', () => {
      const responses = [200, 201, 204].map((code) => makeResponse(code));
      expect(SapiResponse.allOk(responses)).toBe(true);
    });

    it('should return false when any response is not 2xx', () => {
      const responses = [
        makeResponse(200),
        makeResponse(200),
        makeResponse(404),
        makeResponse(200),
      ];
      expect(SapiResponse.allOk(responses)).toBe(false);
    });
  });

  describe('assertAllOk', () => {
    it('should not throw when all are ok', () => {
      const responses = [200, 201].map((code) => makeResponse(code));
      expect(() => SapiResponse.assertAllOk(responses)).not.toThrow();
    });

    it('should throw on first failed response', () => {
      const responses = [makeResponse(200), makeResponse(404), makeResponse(200)];
      expect(() => SapiResponse.assertAllOk(responses)).toThrow(HTTPClientErrorException);
    });
  });

  describe('failedResponses', () => {
    it('should yield only failed responses', () => {
      const responses = [
        makeResponse(200),
        makeResponse(200),
        makeResponse(404),
        makeResponse(200),
        makeResponse(500),
        makeResponse(200),
      ];
      const failed = [...SapiResponse.failedResponses(responses)];
      expect(failed).toHaveLength(2);
    });
  });

  describe('body', () => {
    it('should expose the raw body string', () => {
      const response = makeResponse(200, 'hello world');
      expect(response.body).toBe('hello world');
    });
  });

  describe('json', () => {
    it('should parse JSON body', () => {
      const data = {
        object1: { field1: 'value1', field2: 'value2' },
        object2: {
          object3: { field3: 'value3', field4: 'value4' },
          list1: ['listValue1', 'listValue2', 'listValue3'],
        },
      };
      const response = makeResponse(200, JSON.stringify(data));
      expect(response.json()).toEqual(data);
    });

    it('should return null for empty body', () => {
      const response = makeResponse(200, '');
      expect(response.json()).toBeNull();
    });

    it('should throw SyntaxError for non-JSON body', () => {
      const response = makeResponse(200, 'some incorrect value');
      expect(() => response.json()).toThrow(SyntaxError);
    });
  });

  describe('header', () => {
    it('should return header value case-insensitively', () => {
      const response = makeResponse(200, '', { 'Content-Type': 'application/json' });
      expect(response.header('content-type')).toBe('application/json');
      expect(response.header('Content-Type')).toBe('application/json');
    });

    it('should return undefined for missing header', () => {
      const response = makeResponse(200);
      expect(response.header('X-Missing')).toBeUndefined();
    });
  });

  describe('queryParam', () => {
    it('should return query param from URL', () => {
      const response = new SapiResponse(
        'https://example.com/path?foo=bar&baz=qux',
        'GET', 200, '', {}, '',
      );
      expect(response.queryParam('foo')).toBe('bar');
      expect(response.queryParam('baz')).toBe('qux');
    });

    it('should return null for missing query param', () => {
      const response = new SapiResponse(
        'https://example.com/path?foo=bar',
        'GET', 200, '', {}, '',
      );
      expect(response.queryParam('missing')).toBeNull();
    });
  });
});
