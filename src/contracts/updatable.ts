import type { SapiResponse } from '../response.js';

export interface Updatable<TProps = Record<string, unknown>> {
  update(id: number | string, props: TProps): Promise<SapiResponse>;
}
