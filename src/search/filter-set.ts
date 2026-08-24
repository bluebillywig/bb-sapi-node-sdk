/**
 * The filterset: the structure the OVP builds in its filter UI, and the shape
 * SAPI's `filterset` parameter takes.
 *
 * Deliberately NOT compiled to a Solr query here. SAPI compiles filtersets
 * itself, using the same SearchRequestHelper that serves the OVP, so compiling
 * client-side would be a second implementation of semantics the server owns —
 * free to drift, with a failure mode that is invisible: a filter SAPI cannot
 * read is ignored, and the response is HTTP 200 with neither `numfound` nor
 * `items`, which reads exactly like an empty library.
 *
 * Mirrors `app/services/filter-set.types.ts` in OVP6, so a filterset moves
 * between the UI, the API and any SDK unchanged.
 *
 * Server-side quirks a caller inherits (the compiler is formatengine's):
 *  - A filter whose value is the string '0' is dropped by the backend's
 *    empty-value guard, so "views is 0" cannot be expressed as a filterset.
 *  - In values, '+' becomes a space and '"' is stripped before compilation.
 *  - An unknown FIELD is not an error: it queries a non-existent index field
 *    and returns numfound=0 — a typo'd field name looks like an empty library.
 */

/** Operators SAPI understands. */
export type FilterOperator =
  | 'is'
  | 'isNot'
  | 'isAnyOf'
  | 'isNotAnyOf'
  | 'isEmpty'
  | 'isNotEmpty'
  | 'contains'
  | 'containsAnyOf'
  | 'containsAllOf'
  | 'doesNotContain'
  | 'doesNotContainAnyOf'
  | 'isBefore'
  | 'isAfter'
  | 'isSmallerThan'
  | 'isGreaterThan'
  | 'isInTheLast'
  | 'isNotInTheLast';

/** Operators that test presence, so they are meaningful without a value. */
const VALUELESS_OPERATORS: ReadonlySet<string> = new Set(['isEmpty', 'isNotEmpty']);

/**
 * One value in a filter. Numbers and booleans are accepted and normalised to
 * strings on the wire: the backend's compiler mangles a JSON `true` into "1"
 * (which matches nothing, silently) and its empty-value guard drops `false`
 * outright, while numbers work but only ever appear as strings in what OVP6
 * sends. Normalising here keeps an ingested OVP/Automations filterset working.
 */
export type FilterScalar = string | number | boolean;
export type FilterValue = FilterScalar | FilterScalar[];

export interface Filter {
  field: string;
  operator: FilterOperator;
  value?: FilterValue;
  /** Constrain to an entity type: mediaclip, project, search. */
  type?: string;
}

export interface FilterGroup {
  filters: Filter[];
}

/** A filterset is groups of filters: groups are AND-ed, filters within one OR-ed. */
export type FilterSetData = FilterGroup[];

/** The envelope OVP6 sends. */
export interface SearchRequestEnvelope {
  type: 'SearchRequest';
  filterSet: FilterSetData;
}

function hasValue(filter: Filter): boolean {
  if (VALUELESS_OPERATORS.has(filter.operator)) {
    return true;
  }
  const values = Array.isArray(filter.value) ? filter.value : [filter.value];

  return values.some(
    (value) =>
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      (typeof value === 'string' && value.trim() !== ''),
  );
}

function isScalar(value: unknown): value is FilterScalar {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}

function normalizeScalar(value: FilterScalar): string {
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  return String(value);
}

/**
 * Build a filterset.
 *
 *     const filterSet = FilterSet.create()
 *       .where('status', 'is', 'published')
 *       .where('title', 'contains', 'koert');
 *
 *     await sdk.mediaclip.search(filterSet);
 */
export class FilterSet {
  private constructor(private readonly groups: FilterSetData = []) {}

  static create(): FilterSet {
    return new FilterSet();
  }

  /**
   * Accepts either a bare list of groups or the `SearchRequest` envelope OVP6
   * sends.
   */
  static from(filterSet: FilterSetData | SearchRequestEnvelope): FilterSet {
    const groups = Array.isArray(filterSet) ? filterSet : filterSet.filterSet;

    return new FilterSet(groups ?? []);
  }

  /** Add a condition as its own group, so it is AND-ed with the rest. */
  where(field: string, operator: FilterOperator, value?: string | string[], type?: string): FilterSet {
    return this.andGroup({ field, operator, value, type });
  }

  /** Add several conditions as one group, so they are OR-ed with each other. */
  andGroup(...filters: Filter[]): FilterSet {
    return new FilterSet([...this.groups, { filters }]);
  }

  /** The wire format: what SAPI's `filterset` parameter expects. */
  toArray(): FilterSetData {
    return this.groups
      // from() ingests external data; a group without a filters array is junk,
      // not a crash.
      .map((group) => ({
        filters: (Array.isArray(group?.filters) ? group.filters : []).filter(hasValue).map(strip),
      }))
      .filter((group) => group.filters.length > 0);
  }

  toJSON(): FilterSetData {
    return this.toArray();
  }

  toString(): string {
    return JSON.stringify(this.toArray());
  }

  isEmpty(): boolean {
    return this.toArray().length === 0;
  }
}

/** Normalise to the wire shape: what the OVP sends and the backend can read. */
function strip(filter: Filter): Filter {
  const stripped: Filter = { field: filter.field, operator: filter.operator };
  if (VALUELESS_OPERATORS.has(filter.operator)) {
    // The backend's compiler skips ANY filter whose value is empty — presence
    // tests included — so isEmpty/isNotEmpty must carry a placeholder or they
    // silently never fire (verified live: a bare isEmpty returned the full
    // unfiltered publication). '*' is what OVP6 sends ("backend needs a value
    // to work"), and it overrides whatever the caller supplied.
    stripped.value = '*';
  } else if (filter.value !== undefined) {
    stripped.value = Array.isArray(filter.value)
      ? filter.value.filter(isScalar).map(normalizeScalar)
      : normalizeScalar(filter.value);
  }
  if (filter.type) {
    stripped.type = filter.type;
  }

  return stripped;
}
