import { Entity } from '../entity.js';
import type { SapiResponse } from '../response.js';
import type { Listable } from '../contracts/listable.js';
import type { Gettable } from '../contracts/gettable.js';
import type { Creatable } from '../contracts/creatable.js';
import type { Updatable } from '../contracts/updatable.js';
import type { Deletable } from '../contracts/deletable.js';
import type { PlayoutProps } from '../types/playout-props.js';
import { buildQuery } from '../util/query-params.js';

export class Playout extends Entity implements Listable, Gettable, Creatable<PlayoutProps>, Updatable<PlayoutProps>, Deletable {
  async list(limit: number = 15, offset: number = 0, sort: string = 'createddate desc'): Promise<SapiResponse> {
    return this.sdk.sendRequest('GET', '/sapi/playout', {
      query: buildQuery({ limit, offset, sort }),
    });
  }

  async get(id: number | string): Promise<SapiResponse> {
    return this.sdk.sendRequest('GET', `/sapi/playout/${id}`);
  }

  async create(props: PlayoutProps): Promise<SapiResponse> {
    return this.sdk.sendRequest('PUT', '/sapi/playout', { json: props });
  }

  async update(id: number | string, props: PlayoutProps): Promise<SapiResponse> {
    return this.sdk.sendRequest('PUT', `/sapi/playout/${id}`, { json: props });
  }

  async delete(id: number | string): Promise<SapiResponse> {
    return this.sdk.sendRequest('DELETE', `/sapi/playout/${id}`);
  }
}
