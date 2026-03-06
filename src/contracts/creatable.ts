import type { SapiResponse } from '../response.js';

export interface Creatable<TProps = Record<string, unknown>> {
  create(props: TProps): Promise<SapiResponse>;
}
