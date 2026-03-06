import type { SapiResponse } from '../response.js';

export interface Listable {
  list(limit?: number, offset?: number, sort?: string): Promise<SapiResponse>;
}
