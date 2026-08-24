import { describe, it, expect } from 'vitest';
import { FilterSet } from '../../src/search/filter-set.js';
import { Sdk } from '../../src/sdk.js';
import { EmptyAuthenticator } from '../../src/authentication/empty-authenticator.js';
import { createMockFetch } from '../helpers/mock-fetch.js';

/**
 * The filterset wire format.
 *
 * These pin the SHAPE, because the shape is the contract — the semantics are
 * SAPI's to own. Equivalence was checked against a live publication of 5777
 * clips: sending a filterset and sending a hand-compiled `fq` return identical
 * counts (published 4361, title contains "koert" 1, hasInteractivity 868,
 * published AND video 3679).
 */
describe('FilterSet', () => {
  it('turns one condition into a group of one', () => {
    expect(FilterSet.create().where('status', 'is', 'published').toArray()).toEqual([
      { filters: [{ field: 'status', operator: 'is', value: 'published' }] },
    ]);
  });

  it('gives each where() its own group, so they are AND-ed', () => {
    const filterSet = FilterSet.create()
      .where('status', 'is', 'published')
      .where('mediatype', 'is', 'video');

    expect(filterSet.toArray()).toHaveLength(2);
  });

  it('keeps filters passed together in one group, so they are OR-ed', () => {
    const filterSet = FilterSet.create().andGroup(
      { field: 'status', operator: 'is', value: 'published' },
      { field: 'status', operator: 'is', value: 'draft' },
    );

    const groups = filterSet.toArray();
    expect(groups).toHaveLength(1);
    expect(groups[0].filters).toHaveLength(2);
  });

  it('carries an entity type but omits it when absent', () => {
    expect(
      FilterSet.create().where('status', 'is', 'published', 'mediaclip').toArray()[0].filters[0].type,
    ).toBe('mediaclip');
    expect(
      FilterSet.create().where('status', 'is', 'published').toArray()[0].filters[0],
    ).not.toHaveProperty('type');
  });

  it('carries several values as a list', () => {
    expect(
      FilterSet.create().where('status', 'isAnyOf', ['published', 'draft']).toArray()[0].filters[0].value,
    ).toEqual(['published', 'draft']);
  });

  it('drops a filter with nothing to match on', () => {
    expect(FilterSet.create().where('status', 'is', '   ').toArray()).toEqual([]);
    expect(FilterSet.create().where('status', 'is').isEmpty()).toBe(true);
  });

  it('sends the placeholder the backend requires for presence operators', () => {
    // The backend's compiler skips ANY filter whose value is empty — presence
    // tests included — so a bare isEmpty silently never fires (verified live:
    // it returned the full unfiltered publication). OVP6 sends '*' with the
    // comment "backend needs a value to work"; the SDK must do the same.
    const filterSet = FilterSet.create().where('author', 'isEmpty');

    expect(filterSet.isEmpty()).toBe(false);
    expect(filterSet.toArray()[0].filters[0].value).toBe('*');
  });

  it('lets the placeholder override whatever value a caller supplied', () => {
    expect(
      FilterSet.create().where('author', 'isNotEmpty', 'anything').toArray()[0].filters[0].value,
    ).toBe('*');
  });

  it('normalises numbers and booleans to the strings the backend understands', () => {
    // Verified live: a JSON number works, but a JSON boolean gets mangled into
    // "1" by the backend and matches NOTHING (hasInteractivity true as a
    // boolean returned 0 results; as the string 'true', 868). Previously these
    // values were silently DROPPED here, which returned the full result set —
    // the exact failure class this SDK exists to remove.
    expect(
      FilterSet.create().where('views', 'isGreaterThan', 100).toArray()[0].filters[0].value,
    ).toBe('100');
    expect(
      FilterSet.create().where('hasInteractivity', 'is', true).toArray()[0].filters[0].value,
    ).toBe('true');
    expect(
      FilterSet.create().where('isImported', 'is', false).toArray()[0].filters[0].value,
    ).toBe('false');
    expect(
      FilterSet.create().where('views', 'isAnyOf', [1, 2.5, true]).toArray()[0].filters[0].value,
    ).toEqual(['1', '2.5', 'true']);
  });

  it('drops non-scalar array members instead of serialising garbage', () => {
    const groups = [
      {
        filters: [
          { field: 'status', operator: 'is' as const, value: ['published', { nested: true }] },
        ],
      },
    ];

    expect(
      FilterSet.from(groups as never).toArray()[0].filters[0].value,
    ).toEqual(['published']);
  });

  it('skips a group without a filters array instead of crashing', () => {
    // from() ingests external JSON; a malformed group is junk, not a TypeError.
    const junk = [{ notFilters: true }, { filters: [{ field: 'status', operator: 'is', value: 'published' }] }];

    expect(FilterSet.from(junk as never).toArray()).toEqual([
      { filters: [{ field: 'status', operator: 'is', value: 'published' }] },
    ]);
  });

  it('drops a group left with no filters', () => {
    const filterSet = FilterSet.create()
      .andGroup({ field: 'status', operator: 'is', value: '' })
      .where('mediatype', 'is', 'video');

    const groups = filterSet.toArray();
    expect(groups).toHaveLength(1);
    expect(groups[0].filters[0].field).toBe('mediatype');
  });

  it('serialises to the JSON SAPI expects', () => {
    expect(FilterSet.create().where('status', 'is', 'published').toString()).toBe(
      '[{"filters":[{"field":"status","operator":"is","value":"published"}]}]',
    );
  });

  it('round-trips from the OVP envelope and from a bare list', () => {
    const groups = [{ filters: [{ field: 'status', operator: 'is' as const, value: 'published' }] }];

    expect(FilterSet.from({ type: 'SearchRequest', filterSet: groups }).toArray()).toEqual(groups);
    expect(FilterSet.from(groups).toArray()).toEqual(groups);
  });

  it('serialises through JSON.stringify as the wire format', () => {
    // toJSON() is what makes `JSON.stringify(filterSet)` work, which is how a
    // caller embedding a filterset in a larger body will reach for it.
    const filterSet = FilterSet.create().where('status', 'is', 'published');

    expect(JSON.stringify({ filterset: filterSet })).toBe(
      '{"filterset":[{"filters":[{"field":"status","operator":"is","value":"published"}]}]}',
    );
    expect(filterSet.toJSON()).toEqual(filterSet.toArray());
  });

  it('treats an envelope with no groups as empty', () => {
    expect(
      FilterSet.from({ type: 'SearchRequest' } as unknown as { type: 'SearchRequest'; filterSet: [] })
        .isEmpty(),
    ).toBe(true);
  });
});

describe('MediaClip.search', () => {
  it('sends the filterset as JSON for SAPI to compile', async () => {
    const { fetch, calls } = createMockFetch([{ status: 200 }]);
    const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });

    await sdk.mediaclip.search(
      FilterSet.create().where('status', 'is', 'published'),
      25,
      50,
      'title asc',
      'holiday',
    );

    const url = new URL(calls[0].url);
    expect(url.pathname).toBe('/sapi/mediaclip');
    expect(url.searchParams.get('q')).toBe('holiday');
    expect(url.searchParams.get('limit')).toBe('25');
    expect(url.searchParams.get('offset')).toBe('50');
    expect(url.searchParams.get('sort')).toBe('title asc');
    expect(url.searchParams.get('filterset')).toBe(
      '[{"filters":[{"field":"status","operator":"is","value":"published"}]}]',
    );
  });

  it('sends no filter parameters when nothing is filtered', async () => {
    const { fetch, calls } = createMockFetch([{ status: 200 }]);
    const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });

    await sdk.mediaclip.search(FilterSet.create());

    const url = new URL(calls[0].url);
    expect(url.searchParams.get('filterset')).toBeNull();
    expect(url.searchParams.get('fq[0]')).toBeNull();
  });

  it('encodes raw filter queries as indexed parameters', async () => {
    const { fetch, calls } = createMockFetch([{ status: 200 }]);
    const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });

    await sdk.mediaclip.search(FilterSet.create(), 15, 0, 'createddate desc', '*', [
      'statusSort:"published"',
    ]);

    const url = new URL(calls[0].url);
    // SAPI accepts fq[0]=; it ignores a nested fq[][0]= and a plain fq=, in both
    // cases silently, so this encoding is pinned.
    expect(url.searchParams.get('fq[0]')).toBe('statusSort:"published"');
    expect(url.searchParams.get('fq')).toBeNull();
  });
});
