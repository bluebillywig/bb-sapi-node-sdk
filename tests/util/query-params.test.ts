import { describe, it, expect } from 'vitest';
import { buildQuery } from '../../src/util/query-params.js';

describe('buildQuery', () => {
  it('should convert string values as-is', () => {
    expect(buildQuery({ key: 'value' })).toEqual({ key: 'value' });
  });

  it('should convert numbers to strings', () => {
    expect(buildQuery({ limit: 15, offset: 0 })).toEqual({ limit: '15', offset: '0' });
  });

  it('should convert booleans to "true"/"false"', () => {
    expect(buildQuery({ active: true, deleted: false })).toEqual({
      active: 'true',
      deleted: 'false',
    });
  });

  it('should omit null values', () => {
    expect(buildQuery({ key: 'value', empty: null })).toEqual({ key: 'value' });
  });

  it('should omit undefined values', () => {
    expect(buildQuery({ key: 'value', empty: undefined })).toEqual({ key: 'value' });
  });

  it('should handle mixed types', () => {
    expect(
      buildQuery({
        name: 'test',
        count: 42,
        active: true,
        missing: null,
        also_missing: undefined,
      }),
    ).toEqual({
      name: 'test',
      count: '42',
      active: 'true',
    });
  });

  it('should return empty object for all-null input', () => {
    expect(buildQuery({ a: null, b: undefined })).toEqual({});
  });
});
