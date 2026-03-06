export interface MockFetchCall {
  url: string;
  init?: RequestInit;
}

export interface MockResponse {
  status: number;
  statusText?: string;
  headers?: Record<string, string>;
  body?: string;
}

/**
 * Creates a mock fetch function that returns pre-configured responses
 * and records all calls made to it.
 */
export function createMockFetch(responses: MockResponse[]): {
  fetch: typeof globalThis.fetch;
  calls: MockFetchCall[];
} {
  const queue = [...responses];
  const calls: MockFetchCall[] = [];

  const mockFetch = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    calls.push({ url, init });

    const mockResp = queue.shift();
    if (!mockResp) {
      throw new Error(`No more mock responses available (call #${calls.length})`);
    }

    const headers = new Headers(mockResp.headers ?? {});
    return new Response(mockResp.body ?? '', {
      status: mockResp.status,
      statusText: mockResp.statusText ?? '',
      headers,
    });
  };

  return { fetch: mockFetch as typeof globalThis.fetch, calls };
}
