import type { Entity } from './entity.js';
import type { Sdk } from './sdk.js';

export interface EntityRegistration {
  name: string;
  factory: (parent: { sdk: Sdk }) => Entity;
}

/**
 * Creates a Proxy-based entity register that lazily instantiates entities
 * when accessed by name.
 */
export function createEntityProxy<T>(
  registrations: EntityRegistration[],
  getParent: () => { sdk: Sdk },
): T {
  const cache = new Map<string, Entity>();

  const factoryMap = new Map<string, (parent: { sdk: Sdk }) => Entity>();
  for (const reg of registrations) {
    factoryMap.set(reg.name, reg.factory);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Proxy({} as any, {
    get(_target, prop: string | symbol): Entity | undefined {
      if (typeof prop !== 'string') return undefined;
      if (cache.has(prop)) return cache.get(prop)!;
      const factory = factoryMap.get(prop);
      if (!factory) return undefined;
      const instance = factory(getParent());
      cache.set(prop, instance);
      return instance;
    },

    has(_target, prop: string | symbol): boolean {
      if (typeof prop !== 'string') return false;
      return factoryMap.has(prop);
    },

    ownKeys(): string[] {
      return [...factoryMap.keys()];
    },

    getOwnPropertyDescriptor(_target, prop: string | symbol) {
      if (typeof prop === 'string' && factoryMap.has(prop)) {
        return { configurable: true, enumerable: true, writable: false };
      }
      return undefined;
    },
  });
}
