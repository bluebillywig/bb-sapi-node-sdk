import type { Sdk } from './sdk.js';

/**
 * Abstract base class for all SAPI entities.
 * Provides access to the SDK instance.
 */
export abstract class Entity {
  private readonly _parent: { sdk: Sdk };

  constructor(parent: { sdk: Sdk }) {
    this._parent = parent;
  }

  /** The SDK instance this entity belongs to. */
  get sdk(): Sdk {
    return this._parent.sdk;
  }
}
