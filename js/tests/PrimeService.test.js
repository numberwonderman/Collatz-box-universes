import { describe, it, expect } from 'vitest';
import { primesBelow } from '../PrimeService.js';

describe('PrimeService', () => {
  it('primesBelow returns empty array for p less than 2', () => {
    expect(primesBelow(1n).length).toBe(0);
    expect(primesBelow(0n).length).toBe(0);
  });

  it('primesBelow returns all small primes less than p when p in small prime range', () => {
    const result = primesBelow(10n);
    expect(result).toEqual([2n, 3n, 5n, 7n]);
  });

  it('primesBelow returns primes including large numbers using sieve when p > small primes', () => {
    const p = 1100n;
    const result = primesBelow(p);
    expect(result).toContain(997n);
    expect(result).not.toContain(1100n);
    expect(result.every(x => typeof x === 'bigint')).toBe(true);
  });

  it('primesBelow caches results for repeated calls', () => {
    const p = 50n;
    const firstCall = primesBelow(p);
    const secondCall = primesBelow(p);
    expect(secondCall).toBe(firstCall); // cached reference
  });
});
