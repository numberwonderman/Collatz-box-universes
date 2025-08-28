// Binary-rotation-style reverse Collatz helpers and "shortcut" predecessors.
// ES module; requires Node ≥18 for BigInt + node:test in the test file.

/**
 * Return the immediate reverse predecessors of m under the classic Collatz map:
 *   - always 2m
 *   - (m-1)/3 if that is a positive odd integer (i.e., m ≡ 4 (mod 6))
 *
 * Numbers are BigInt to avoid overflow for large inputs.
 */
export function reversePredecessors(m) {
  m = BigInt(m);
  const preds = [m << 1n]; // even predecessor (left shift)
  // Odd predecessor condition
  if ((m - 1n) % 3n === 0n) {
    const p = (m - 1n) / 3n;
    if (p > 0n && (p & 1n) === 1n) preds.push(p);
  }
  return preds;
}

/**
 * v2(n): exponent of 2 in n (number of trailing zero bits).
 */
export function v2(n) {
  n = BigInt(n);
  if (n === 0n) return 0n;
  let c = 0n;
  while ((n & 1n) === 0n) {
    n >>= 1n;
    c += 1n;
  }
  return c;
}

/**
 * Accelerated forward Collatz step (aka "shortcut"):
 * T(n) = (3n + 1) / 2^k, where 2^k divides (3n+1) and result is odd.
 */
export function acceleratedForward(n) {
  n = BigInt(n);
  let x = 3n * n + 1n;
  const k = v2(x);
  return { next: x >> k, k };
}

/**
 * Binary helpers (for introspection/visualization in your UI).
 */
export const toBinary = (n) => BigInt(n).toString(2);
export const fromBinary = (s) => BigInt('0b' + s);

/**
 * Left "rotation-like" shift helper used in explanations:
 * In reverse, the even predecessor of m is 2m, which is binary(m) + '0'.
 * This is not a true cyclic rotation; it's a left shift. We keep the name
 * "rotation" here because some literature frames these as digit manipulations.
 */
export function evenPredecessorBinary(m) {
  const s = toBinary(m);
  return s + '0';
}

/**
 * Shortcut odd predecessors:
 * We bundle k even edges at once. For any k ≥ 1, a candidate odd predecessor is
 *    p_k = (2^k * m - 1) / 3,
 * valid iff p_k is a positive odd integer.
 *
 * Each valid p_k satisfies:  T^(-1) with k bundled divisions =>
 *    (3*p_k + 1) = 2^k * m  and then dividing by 2^k gives m.
 *
 * Returns an array of { k, p, proof } objects up to kMax.
 */
export function shortcutOddPredecessors(m, kMax = 64) {
  m = BigInt(m);
  const out = [];
  for (let k = 1n; k <= BigInt(kMax); k++) {
    const pow2 = 1n << k; // 2^k
    const numer = pow2 * m - 1n;
    if (numer % 3n !== 0n) continue;
    const p = numer / 3n;
    if (p > 0n && (p & 1n) === 1n) {
      out.push({
        k: Number(k),
        p,
        proof: {
          lhs: 3n * p + 1n,         // equals 2^k * m
          rhs: pow2 * m,
          binary: {
            m: toBinary(m),
            twoPowKTimesM: (pow2 * m).toString(2),
            p: toBinary(p)
          }
        }
      });
    }
  }
  return out;
}

/**
 * Convenience: all reverse predecessors up to a bundling limit.
 * Includes the immediate predecessors plus all valid shortcut odd predecessors.
 */
export function reversePredecessorsWithShortcuts(m, kMax = 64) {
  const immed = reversePredecessors(m);
  const shorts = shortcutOddPredecessors(m, kMax).map(x => x.p);
  // Deduplicate while preserving BigInt type
  const set = new Set(immed.concat(shorts));
  return Array.from(set);
}
