import { describe, it, expect } from 'vitest';
import { generateHotpByCounter, generateHotpByTime, generateHotpByTimeWindow } from '../../src/util/hotp.js';

describe('HOTP', () => {
  it('should generate consistent HOTP for same inputs', () => {
    const token1 = generateHotpByCounter('test-key', 42);
    const token2 = generateHotpByCounter('test-key', 42);
    expect(token1).toBe(token2);
  });

  it('should generate different HOTP for different counters', () => {
    const token1 = generateHotpByCounter('test-key', 1);
    const token2 = generateHotpByCounter('test-key', 2);
    expect(token1).not.toBe(token2);
  });

  it('should generate 40-char hex string (full HMAC-SHA1)', () => {
    const token = generateHotpByCounter('my-secret', 100);
    expect(token).toMatch(/^[0-9a-f]{40}$/);
  });

  it('should generate by time with explicit timestamp', () => {
    const token = generateHotpByTime('my-secret', 120, 1000);
    // counter = floor(1000 / 120) = 8
    const expected = generateHotpByCounter('my-secret', 8);
    expect(token).toBe(expected);
  });

  it('should generate time window tokens with default timestamp', () => {
    const tokens = generateHotpByTimeWindow('my-secret', 120);
    expect(tokens.size).toBe(3);
    expect(tokens.has(-1)).toBe(true);
    expect(tokens.has(0)).toBe(true);
    expect(tokens.has(1)).toBe(true);
  });

  it('should generate time window tokens', () => {
    const timestamp = 1000;
    const window = 120;
    const tokens = generateHotpByTimeWindow('my-secret', window, -1, 1, timestamp);

    expect(tokens.size).toBe(3);

    const counter = Math.floor(timestamp / window); // 8
    expect(tokens.get(-1)).toBe(generateHotpByCounter('my-secret', counter - 1));
    expect(tokens.get(0)).toBe(generateHotpByCounter('my-secret', counter));
    expect(tokens.get(1)).toBe(generateHotpByCounter('my-secret', counter + 1));
  });
});
