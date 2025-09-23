/**
 * Computes the Collatz sequence for a number.
 * @param {number} n The starting number.
 * @param {number} p The divisor.
 * @param {number} q The multiplier.
 * @param {number} r The additive constant.
 * @returns {object} The sequence and its status.
 */
export function calculateCollatzSequence(n, p, q, r) {
    // Check for invalid input
    if (isNaN(n) || n <= 0) {
        return {
            sequence: [],
            status: "Invalid input"
        };
    }

    const sequence = [n];
    const seen = new Set([n]); // Use a Set for efficient cycle detection
    let status = "";

    while (n !== 1) {
        if (n % p === 0) {
            n = n / p;
        } else {
            n = n * q + r;
        }

        // Check for a cycle
        if (seen.has(n)) {
            status = "Cycle detected";
            break;
        }
        seen.add(n);

        // Add number to the sequence
        sequence.push(n);

        // Stop after a certain number of steps to prevent infinite loops
        if (sequence.length > 1000) {
            status = "Did not converge after 1000 steps";
            break;
        }
    }

    // Set the status based on the loop's outcome if not already set by a cycle detection
    if (status === "" && n === 1) {
        status = "Converged to 1";
    }

    return {
        sequence,
        status
    };
}

/**
 * Generates the predecessors of a number, including a two-step odd predecessor shortcut.
 *
 * @param {bigint} p The divisor from the forward function.
 * @param {bigint} q The multiplier from the forward function.
 * @param {bigint} r The additive constant from the forward function.
 * @returns {function(bigint): bigint[]} A function that, given a number, returns its predecessors.
 */
export function getPredecessorsShortcuts(p = 2n, q = 3n, r = 1n) {
    return function* (n) {
        // 1. Standard Even Predecessor
        yield n * p;

        // 2. Standard Odd Predecessor (x -> (xq+r) -> n)
        if ((n - r) % q === 0n) {
            const predecessor = (n - r) / q;
            if (predecessor % p !== 0n) {
                yield predecessor;
            }
        }

        // 3. Two-Step Odd Predecessor (x -> (xq+r) -> (xq+r)/p -> n)
        if ((n * p - r) % q === 0n) {
            const predecessor2 = (n * p - r) / q;
            if (predecessor2 % p !== 0n) {
                yield predecessor2;
            }
        }
    };
}