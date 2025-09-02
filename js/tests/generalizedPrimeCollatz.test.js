// js/tests/generalizedPrimeCollatz.test.js
import { describe, it, expect } from 'vitest';
import { generalizedCollatz} from "../collatzLogic.js";

describe('Generalized Collatz', () => {
  it('should produce the sequence for 3n+1', () => {
    const start = 6n;
    const alpha = 3n;
    const beta = 1n;
    const expected = [6n, 3n, 10n, 5n, 16n, 8n, 4n, 2n, 1n];
    const result = generalizedCollatz(start, alpha, beta);
    expect(result).toEqual(expected);
  });
});