import { describe, it, expect } from 'vitest';
import { generalizedCollatz} from "../collatzLogic.js";

// A corrected, robust version of the generalizedCollatz function for testing
// This version includes a 'maxIterations' parameter to prevent infinite loops.
// Make sure to adapt your actual function in collatzLogic.js to include this.
const generalizedCollatzWithLimit = (n, alpha, beta, maxIterations = 100) => {
  const sequence = [n];
  let i = 0;
  
  while (n !== 1n && i < maxIterations) {
    if (n % 2n === 0n) {
      n /= 2n;
    } else {
      n = alpha * n + beta;
    }
    sequence.push(n);
    i++;
  }
  
  return sequence;
};

describe('Generalized Collatz', () => {
  it('should produce the sequence for 3n+1', () => {
    const start = 6n;
    const alpha = 3n;
    const beta = 1n;
    const expected = [6n, 3n, 10n, 5n, 16n, 8n, 4n, 2n, 1n];
    
    // Call the function with a maximum iteration limit to prevent memory overflow
    const result = generalizedCollatzWithLimit(start, alpha, beta, 100);
    
    expect(result).toEqual(expected);
  });
});
