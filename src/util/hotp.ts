import { createHmac } from 'node:crypto';

/**
 * Generates a full HMAC-SHA1 HOTP token (40-char hex) for a given counter.
 * Unlike standard HOTP which truncates to 6-8 digits, this returns the full digest.
 * @param key - The shared secret key (ASCII).
 * @param counter - The counter value.
 */
export function generateHotpByCounter(key: string, counter: number): string {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  return createHmac('sha1', Buffer.from(key, 'ascii'))
    .update(counterBuffer)
    .digest('hex');
}

/**
 * Generates an HOTP token based on a timestamp and window size.
 * The counter is derived as `Math.floor(timestamp / window)`.
 *
 * **Clock synchronization**: Both client and server clocks must be within
 * the `window` period for tokens to match. Significant clock drift will
 * cause authentication failures.
 *
 * @param key - The shared secret key.
 * @param window - Time window in seconds (e.g. 120 for 2-minute windows).
 * @param timestamp - Unix timestamp in seconds. Defaults to the current time.
 */
export function generateHotpByTime(
  key: string,
  window: number,
  timestamp?: number,
): string {
  if (timestamp === undefined) {
    timestamp = Math.floor(Date.now() / 1000);
  }
  const counter = Math.floor(timestamp / window);
  return generateHotpByCounter(key, counter);
}

/**
 * Generates HOTP tokens for a range of time windows around the current counter.
 * Useful for server-side validation to account for minor clock drift.
 * @param key - The shared secret key.
 * @param window - Time window in seconds.
 * @param min - Minimum shift offset (default: -1).
 * @param max - Maximum shift offset (default: 1).
 * @param timestamp - Unix timestamp in seconds. Defaults to the current time.
 * @returns A Map from shift offset to hex HMAC string.
 */
export function generateHotpByTimeWindow(
  key: string,
  window: number,
  min: number = -1,
  max: number = 1,
  timestamp?: number,
): Map<number, string> {
  if (timestamp === undefined) {
    timestamp = Math.floor(Date.now() / 1000);
  }
  const counter = Math.floor(timestamp / window);
  const result = new Map<number, string>();
  for (let shift = min; shift <= max; shift++) {
    result.set(shift, generateHotpByCounter(key, counter + shift));
  }
  return result;
}
