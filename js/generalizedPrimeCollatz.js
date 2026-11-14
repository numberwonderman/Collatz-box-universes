// generalizedPrimeCollatz.js
// BigInt throughout

import { primesBelow } from './PrimeService.js';

/**
 * Validates the parameter p.
 * p must be an odd BigInt >= 3.
 * @param {BigInt} p - The parameter.
 * @returns {boolean} - True if valid, false otherwise.
 */
export function isValidP(p) {
  p = BigInt(p);
  return p >= 3n && (p % 2n) === 1n;
}

/**
 * Generates the sequence for a generalized Collatz problem.
 * @param {BigInt} n - The starting number.
 * @param {BigInt} alpha - The multiplier for the odd step (alpha*n + beta).
 * @param {BigInt} beta - The constant for the odd step (alpha*n + beta).
 * @param {number} [maxSteps=10000] - Safety cap on the number of steps.
 * @returns {BigInt[]} The sequence. If the orbit enters a cycle that does not
 *   contain 1, the sequence ends with the first repeated value (so the last
 *   element also appears earlier). If maxSteps is hit, it is simply truncated.
 */
export function generalizedCollatz(n, alpha, beta, maxSteps = 10000) {
  const sequence = [n];
  // Previously this looped forever (and grew `sequence` without bound) for any
  // orbit that never reaches 1, e.g. (5n, 3n, -1n) or (13n, 5n, 1n).
  const seen = new Set([n]);
  let steps = 0;
  while (n !== 1n && steps < maxSteps) {
    if (n % 2n === 0n) {
      n = n / 2n;
    } else {
      n = alpha * n + beta;
    }
    sequence.push(n);
    steps++;
    if (seen.has(n)) break; // cycle not through 1
    seen.add(n);
  }
  return sequence;
}

/**
 * Divides out all prime factors less than p.
 * @param {BigInt} n - The number to simplify.
 * @param {BigInt} p - The prime parameter.
 * @returns {BigInt} The simplified number.
 */
export function simplifyByPrimesLessThanP(n, p) {
  n = BigInt(n);
  p = BigInt(p);
  const primes = primesBelow(p);

  // 0 is divisible by every prime, so the loop below would never terminate.
  if (primes.length === 0 || n === 0n) {
    return n;
  }

  for (const q of primes) {
    while (n % q === 0n) {
      n /= q;
    }
  }

  return n;
}

/**
 * One generalized step for parameter p:
 * - even n: n/2
 * - odd  n: x = p*n + 1; then divide out ALL primes < p
 * @param {BigInt} n - The current number.
 * @param {BigInt} p - The prime parameter.
 * @returns {BigInt} The next number in the sequence.
 */
export function stepP(n, p) {
  n = BigInt(n);
  p = BigInt(p);
  if (!isValidP(p)) {
    throw new Error(`p must be odd >= 3; got ${p}`);
  }
  if ((n % 2n) === 0n) {
    return n / 2n;
  }
  const x = p * n + 1n;
  return simplifyByPrimesLessThanP(x, p);
}

/**
 * Iterates the generalized Collatz sequence with guards.
 * @param {BigInt} n - The starting number.
 * @param {BigInt} p - The prime parameter.
 * @param {number} maxSteps - The maximum number of steps to iterate.
 * @returns {{ sequence: BigInt[], steps: number, type: 'hit_1' | 'cycle' | 'max_steps' }}
 */
export function iterateP(n, p, maxSteps = 10000) {
    n = BigInt(n);
    p = BigInt(p);
    if (!isValidP(p)) {
        throw new Error(`p must be odd >= 3; got ${p}`);
    }

    const seq = [n];
    const seen = new Set([n.toString()]);
    let currentN = n;
    let steps = 0;

    // Loop until we reach 1 or hit max steps
    while (currentN !== 1n && steps < maxSteps) {
        currentN = stepP(currentN, p);
        const key = currentN.toString();

        // Check for cycle before pushing to sequence
        if (seen.has(key)) {
            seq.push(currentN);
            steps++; // count the step that closed the cycle (was off by one vs. 'hit_1')
            return { sequence: seq, steps, type: 'cycle' };
        }

        seen.add(key);
        seq.push(currentN);
        steps++;
    }

    // Determine return type based on loop termination
    if (currentN === 1n) {
        return { sequence: seq, steps, type: 'hit_1' };
    } else {
        return { sequence: seq, steps, type: 'max_steps' };
    }
}

/**
 * Convenience function to return only the sequence array.
 * @param {BigInt} n - The starting number.
 * @param {BigInt} p - The prime parameter.
 * @param {number} maxSteps - The maximum number of steps to iterate.
 * @returns {BigInt[]} The sequence array.
 */
export function iteratePArray(n, p, maxSteps = 10000) {
    return iterateP(n, p, maxSteps).sequence;
}