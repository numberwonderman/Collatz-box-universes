// Run with: npx vitest
import { describe, it, expect } from 'vitest';
import {
  reversePredecessors,
  shortcutOddPredecessors,
  v2,
} from '../binaryRotation.js'; // Correct path

describe('reversePredecessors', () => {
  it('should find 2m predecessor', () => {
    expect(reversePredecessors(1n)).toEqual([2n]);
    expect(reversePredecessors(2n)).toEqual([4n]);
  });

  it('should find (m-1)/3 predecessor for m = 4 (mod 6)', () => {
    // 10 -> (10-1)/3 = 3
    expect(reversePredecessors(10n)).toEqual([20n, 3n]);
    // 16 -> (16-1)/3 = 5
    expect(reversePredecessors(16n)).toEqual([32n, 5n]);
  });

  it('should only return positive predecessors', () => {
    expect(reversePredecessors(1n)).toEqual([2n]);
    // (1-1)/3 = 0, which is not positive
  });
});

describe('shortcutOddPredecessors', () => {
  it('should find a known shortcut predecessor', () => {
    // The previous test expected 33n, which is not a valid output for the function.
    // Let's test for a value we know is correct, like 53n.
    const result = shortcutOddPredecessors(5n, 5n);
    expect(result.map(x => x.p)).toContain(53n);
  });

  it('should return multiple predecessors if they exist', () => {
    // For m=1, p_k=(2^k-1)/3. k=2, p=1; k=4, p=5; etc
    // With kMax=6, the expected output is [1n, 5n, 21n].
    const result = shortcutOddPredecessors(1n, 6);
    expect(result.map(x => x.p)).toEqual([1n, 5n, 21n]);
  });

  it('should be empty for invalid inputs', () => {
    expect(shortcutOddPredecessors(3n)).toEqual([]);
  });
});

describe('v2', () => {
  it('should return the correct exponent of 2', () => {
    expect(v2(12n)).toBe(2n);
    expect(v2(10n)).toBe(1n);
    expect(v2(16n)).toBe(4n);
    expect(v2(5n)).toBe(0n);
  });
});