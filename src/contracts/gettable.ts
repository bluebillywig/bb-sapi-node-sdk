import type { SapiResponse } from '../response.js';

export interface Gettable {
  get(id: number | string): Promise<SapiResponse>;
}
