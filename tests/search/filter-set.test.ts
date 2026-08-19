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

  it('keeps presence operators, which are meaningful without a value', () => {
    const filterSet = FilterSet.create().where('author', 'isEmpty');

    expect(filterSet.isEmpty()).toBe(false);
    expect(filterSet.toArray()[0].filters[0]).not.toHaveProperty('value');
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
