// Generalized “p-Collatz”: on odd n do x = p*n + 1, then divide out all primes < p.
// On even n, halve. BigInt throughout.

import { removePrimesBelow, isPrime } from './primeService.js';

const asBI = (x) => (typeof x === 'bigint' ? x : BigInt(x));

export function isValidP(p) {
  p = asBI(p);
  // “deceive-aware”: p must be odd, >= 3, and (optionally) prime-like.
  if (p < 3n || (p & 1n) === 0n) return false;
  // Optional: require p to be prime; toggle if you want composite p allowed.
  // return isPrime(Number(p));
  return true;
}

export function stepP(n, p) {
  n = asBI(n); p = asBI(p);
  if (!isValidP(p)) throw new Error(`stepP: p must be odd >= 3; got ${p}`);
  if ((n & 1n) === 0n) return n >> 1n;
  const x = p * n + 1n;
  return removePrimesBelow(x, p);
}

/**
 * Iterate with guards. Returns { sequence, steps, type }
 * type ∈ 'hit_1' | 'cycle' | 'max_steps'
 */
export function iterateP(n, p, maxSteps = 10000) {
  n = asBI(n); p = asBI(p);
  if (!isValidP(p)) throw new Error(`iterateP: p must be odd >= 3; got ${p}`);

  const seq = [n];
  const seen = new Set([n.toString()]);
  for (let i = 0; i < maxSteps; i++) {
    n = stepP(n, p);
    seq.push(n);

    if (n === 1n) return { sequence: seq, steps: i + 1, type: 'hit_1' };

    const k = n.toString();
    if (seen.has(k)) return { sequence: seq, steps: i + 1, type: 'cycle' };
    seen.add(k);
  }
  return { sequence: seq, steps: maxSteps, type: 'max_steps' };
}
