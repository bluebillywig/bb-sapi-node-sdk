import { Entity } from '../entity.js';
import type { SapiResponse } from '../response.js';
import type { Listable } from '../contracts/listable.js';
import type { Gettable } from '../contracts/gettable.js';
import type { Creatable } from '../contracts/creatable.js';
import type { Updatable } from '../contracts/updatable.js';
import type { Deletable } from '../contracts/deletable.js';
import type { SubtitleProps } from '../types/subtitle-props.js';
import { buildQuery } from '../util/query-params.js';

export class Subtitle extends Entity implements Listable, Gettable, Creatable<SubtitleProps>, Updatable<SubtitleProps>, Deletable {
  async list(limit: number = 15, offset: number = 0, sort: string = 'createddate desc'): Promise<SapiResponse> {
    return this.sdk.sendRequest('GET', '/sapi/subtitle', {
      query: buildQuery({ limit, offset, sort }),
    });
  }

  async get(id: number | string): Promise<SapiResponse> {
    return this.sdk.sendRequest('GET', `/sapi/subtitle/${encodeURIComponent(id)}`);
  }

  async create(props: SubtitleProps): Promise<SapiResponse> {
    return this.sdk.sendRequest('PUT', '/sapi/subtitle', { json: props });
  }

  async update(id: number | string, props: SubtitleProps): Promise<SapiResponse> {
    return this.sdk.sendRequest('PUT', `/sapi/subtitle/${encodeURIComponent(id)}`, { json: props });
  }

  async delete(id: number | string): Promise<SapiResponse> {
    return this.sdk.sendRequest('DELETE', `/sapi/subtitle/${encodeURIComponent(id)}`);
  }
}
