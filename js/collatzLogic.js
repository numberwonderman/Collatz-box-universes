/**
 * Computes a generalized Collatz sequence for a given number.
 * The sequence is defined by the parameters p, q, and r.
 *
 * @param {bigint} n The starting number.
 * @param {bigint} p The divisor for even numbers.
 * @param {bigint} q The multiplier for odd numbers.
 * @param {bigint} r The additive constant for odd numbers.
 * @returns {{sequence: bigint[], length: number}} The computed sequence and its length.
 */
export function generalizedCollatz(n, p = 2n, q = 3n, r = 1n) {
  if (n <= 0n) {
    throw new Error("Input must be a positive number.");
  }
  const sequence = [n];
  let current = n;
  while (current !== 1n) {
    if (current % 2n === 0n) {
      current /= p;
    } else {
      current = current * q + r;
    }
    sequence.push(current);
  }
  return {
    sequence,
    length: sequence.length
  };
}

/**
 * Generates the predecessors of a number in the generalized Collatz graph.
 * This is the standard reverse function.
 *
 * @param {bigint} n The number to find predecessors for.
 * @param {bigint} p The divisor from the forward function.
 * @param {bigint} q The multiplier from the forward function.
 * @param {bigint} r The additive constant from the forward function.
 * @returns {bigint[]} An array of predecessor numbers.
 */
export function* getPredecessors(n, p = 2n, q = 3n, r = 1n) {
  // Even predecessor
  yield n * p;

  // Odd predecessor
  if ((n - r) % q === 0n) {
    const predecessor = (n - r) / q;
    // Check if the predecessor is odd
    if (predecessor % 2n !== 0n) {
      yield predecessor;
    }
  }
}

/**
 * Generates the predecessors of a number in the generalized Collatz graph,
 * but uses a shortcut for numbers divisible by 4.
 *
 * @param {bigint} p The divisor from the forward function.
 * @param {bigint} q The multiplier from the forward function.
 * @param {bigint} r The additive constant from the forward function.
 * @returns {function(bigint): bigint[]} A function that, given a number, returns its predecessors.
 */
export function getPredecessorsShortcuts(p = 2n, q = 3n, r = 1n) {
  return function* (n) {
    // Standard predecessors
    yield n * p;
    if ((n - r) % q === 0n && ((n - r) / q) % 2n !== 0n) {
      yield (n - r) / q;
    }

    // New shortcut: 4n + 2 precursor (from (2n+1)*3+1 / 2)
    // The previous number in the sequence that leads to `n` could be
    // either 2n (even) or (2n-1)/3 (odd).
    // The shortcut for `4n + 2` predecessor: `4n + 2 -> 2n + 1 -> (6n+3+1)/2 = 3n+2 -> n`.
    // We are looking for numbers that lead to `n` in two steps.
    // The form is `(4n + 2)`. Let's test this backwards.
    // `(4n+2)/2 = 2n+1`. This is odd.
    // `(2n+1)*3+1 = 6n+4`. This is even.
    // `(6n+4)/2 = 3n+2`. This is not n. The shortcut is for something else.
    // Let's rethink. A shortcut is for a sequence like `x -> y -> n`.
    // The "shortcut" predecessor of `n` is `2n`. What if `n` is reached from a number that is not `2n`?
    // Let's analyze the sequence `x -> (3x+1)/2 -> n`. For this to work, `x` must be odd.
    // `3x+1 = 2n`. So `x = (2n-1)/3`.
    // This is the odd predecessor.
    // What if we have `x -> (3x+1) -> 2n -> n`?
    // `x` is odd. `3x+1` is even. `(3x+1)/2 = 2n`.
    // `3x+1 = 4n`. `3x = 4n-1`. For this to have an integer solution, `4n-1` must be divisible by 3.
    // `4n-1 = 4n-1+3-3 = 4(n-1)+3`. This is divisible by 3 if `n-1` is.
    // So, if `n-1` is divisible by 3, then `x = (4n-1)/3` is an odd predecessor that
    // leads to `n` in two steps.
    if ((4n - 1n) % 3n === 0n) {
      const p2 = (4n - 1n) / 3n;
      if (p2 % 2n !== 0n) {
        yield p2;
      }
    }
  };
}
