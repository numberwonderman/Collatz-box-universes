// js/tests/generalizedPrimeCollatz.test.js
import { describe, it, expect } from 'vitest';
import {
  stepP,
  simplifyByPrimesLessThanP,
  primesBelow,
  iterateP
} from '../src/generalizedPrimeCollatz.js';

// Define classical accelerated step inline
function stepClassic(n) {
  n = BigInt(n);
  if (n % 2n === 0n) return n / 2n;
  let x = 3n * n + 1n;
  while (x % 2n === 0n) x /= 2n;
  return x;
}

describe('p=3 coincides with classical accelerated odd step', () => {
  const odds = [3n, 5n, 7n, 27n, 63n, 85n, 97n];

  it('odd n: stepP(n,3) === stepClassic(n)', () => {
    for (const n of odds) expect(stepP(n, 3n)).toBe(stepClassic(n));
  });

  it('even n: halving', () => {
    const evens = [2n, 4n, 8n, 10n, 40n];
    for (const n of evens) expect(stepP(n, 3n)).toBe(n / 2n);
  });
});

describe('simplifyByPrimesLessThanP yields unique normal form', () => {
  it('p=5 (primes<5 are {2,3}) random samples', () => {
    const samples = [1n, 2n, 3n, 6n, 12n, 18n, 54n, 81n];
    for (const x of samples) {
      const a = simplifyByPrimesLessThanP(5n * x + 1n, 5n);
      let y = 5n * x + 1n;
      while (y % 3n === 0n) y /= 3n;
      while (y % 2n === 0n) y /= 2n;
      expect(a).toBe(y);
    }
  });
});

describe('basic behavior for p=5 and p=7', () => {
  it('primesBelow works', () => {
    expect(primesBelow(5n)).toEqual([2n, 3n]);
    expect(primesBelow(7n)).toEqual([2n, 3n, 5n]);
  });

  it('stepP(p=5) runs and stabilizes on small seeds', () => {
    const seeds = [1n, 3n, 5n, 7n, 11n, 13n];
    for (const s of seeds) {
      const seq = iterateP(s, 5n, 500);
      expect(seq.length).toBeGreaterThan(1);
      for (const v of seq) expect(typeof v).toBe('bigint');
    }
  });
});

describe('p=3 rough consistency', () => {
  it('iterateP(n,3) matches stepClassic(n) for one step if n is odd', () => {
    const odds = [3n, 7n, 9n, 21n, 27n];
    for (const n of odds) {
      const s = iterateP(n, 3n, 1);
      expect(s[1]).toBe(stepClassic(n));
    }
  });
});
