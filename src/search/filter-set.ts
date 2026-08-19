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

export interface Filter {
  field: string;
  operator: FilterOperator;
  value?: string | string[];
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

  return values.some((value) => typeof value === 'string' && value.trim() !== '');
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
      .map((group) => ({ filters: group.filters.filter(hasValue).map(strip) }))
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

/** Drop keys with no value so the JSON matches what the OVP sends. */
function strip(filter: Filter): Filter {
  const stripped: Filter = { field: filter.field, operator: filter.operator };
  if (filter.value !== undefined && !VALUELESS_OPERATORS.has(filter.operator)) {
    stripped.value = filter.value;
  }
  if (filter.type) {
    stripped.type = filter.type;
  }

  return stripped;
}
