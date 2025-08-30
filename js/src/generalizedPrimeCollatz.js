// generalizedPrimeCollatz.js
// BigInt throughout

import { primesBelow } from './PrimeService.js';

function isValidP(p) {
  p = BigInt(p);
  return p >= 3n && (p & 1n) === 1n; // odd and >= 3
}

export function simplifyByPrimesLessThanP(n, p) {
  n = BigInt(n); p = BigInt(p);
  for (const q of primesBelow(p)) {
    while (n % q === 0n) n /= q;
  }
  return n;
}

/**
 * One generalized step for parameter p:
 * - even n: n/2
 * - odd  n: x = p*n + 1; then divide out ALL primes < p
 */
export function stepP(n, p) {
  n = BigInt(n); p = BigInt(p);
  if (!isValidP(p)) throw new Error(`p must be odd >= 3; got ${p}`);
  if ((n & 1n) === 0n) return n >> 1n;
  const x = p * n + 1n;
  return simplifyByPrimesLessThanP(x, p);
}

/**
 * Iterate with guards.
 * Returns { sequence, steps, type } where type ∈ 'hit_1' | 'cycle' | 'max_steps'
 */
export function iterateP(n, p, maxSteps = 10000) {
  n = BigInt(n); p = BigInt(p);
  if (!isValidP(p)) throw new Error(`p must be odd >= 3; got ${p}`);

  const seq = [n];
  const seen = new Set([n.toString()]); // string keys for BigInt

  for (let i = 0; i < maxSteps; i++) {
    n = stepP(n, p);
    seq.push(n);

    if (n === 1n) return { sequence: seq, steps: i + 1, type: 'hit_1' };
    const key = n.toString();
    if (seen.has(key)) return { sequence: seq, steps: i + 1, type: 'cycle' };
    seen.add(key);
  }
  return { sequence: seq, steps: maxSteps, type: 'max_steps' };
}

// Convenience: array-only result (if you need it in UI)
export function iteratePArray(n, p, maxSteps = 10000) {
  return iterateP(n, p, maxSteps).sequence;
}
