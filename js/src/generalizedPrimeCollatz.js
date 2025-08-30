const PRIME_CACHE = new Map();
export function primesBelow(p) {
  p = BigInt(p);
  if (PRIME_CACHE.has(p)) return PRIME_CACHE.get(p);
  // ...compute...
  PRIME_CACHE.set(p, out);
  return out;
}// js/src/generalizedPrimeCollatz.js
// BigInt throughout

/** Simple primality (trial division). Fine for small p (3,5,7,11,...) */
function isPrimeBI(n) {
  if (n < 2n) return false;
  for (let d = 2n; d * d <= n; d++) if (n % d === 0n) return false;
  return true;
}

/** Cache small prime lists keyed by p */
const PRIMES_LT_P = new Map();

/** All primes < p (cached) */
export function primesBelow(p) {
  p = BigInt(p);
  if (PRIMES_LT_P.has(p)) return PRIMES_LT_P.get(p);
  const out = [];
  for (let q = 2n; q < p; q++) if (isPrimeBI(q)) out.push(q);
  PRIMES_LT_P.set(p, out);
  return out;
}

/** Divide out all prime factors < p from n (to exhaustion, any order). */
export function simplifyByPrimesLessThanP(n, p) {
  n = BigInt(n); p = BigInt(p);
  const primes = primesBelow(p);
  for (const q of primes) {
    while (n % q === 0n) n /= q;
  }
  return n;
}

/**
 * One generalized step for parameter p:
 * - even n: n/2 (matches classical behavior for p=3 on examples)
 * - odd  n: x = p*n + 1; then divide out ALL primes < p to exhaustion
 */
export function stepP(n, p) {
  n = BigInt(n); p = BigInt(p);
  if (!isValidP(p)) throw new Error(`p must be odd >= 3; got ${p}`);
  if ((n & 1n) === 0n) return n >> 1n;
  const x = p * n + 1n;
  return simplifyByPrimesLessThanP(x, p);
}

/** Quick validity: p odd and >= 3 */
export function isValidP(p) {
  p = BigInt(p);
  return p >= 3n && (p & 1n) === 1n;
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
}export function iterateP(n, p, maxSteps = 10000) {
  n = BigInt(n);
  const seq = [n];
  for (let i = 0; i < maxSteps; i++) {
    n = stepP(n, p);
    seq.push(n);
    if (n === 1n) break; // stop at 1 like classical convention
  }
  return seq;
}
