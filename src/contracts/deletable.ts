import type { SapiResponse } from '../response.js';

export interface Deletable {
  delete(id: number | string): Promise<SapiResponse>;
}
