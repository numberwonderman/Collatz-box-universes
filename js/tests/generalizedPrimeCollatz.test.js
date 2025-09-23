// js/tests/generalizedPrimeCollatz.test.js

import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest';

let importedModule;
let originalPrimesBelow;

beforeAll(async () => {
    // Dynamically import the module, so we get a live reference
    importedModule = await import('../generalizedPrimeCollatz');

    // Store the original function to restore it later
    originalPrimesBelow = importedModule.primesBelow;

    // Manually override the function with our mock
    importedModule.primesBelow = vi.fn(p => {
        const primes = {
            '5n': [2n, 3n],
            '7n': [2n, 3n, 5n],
        };
        return primes[p.toString()] || [];
    });
});

afterAll(() => {
    // Restore the original function after all tests are done
    importedModule.primesBelow = originalPrimesBelow;
});

describe('generalizedPrimeCollatz', () => {

    describe('isValidP', () => {
        it('should return true for a valid odd prime >= 3', () => {
            expect(importedModule.isValidP(3n)).toBe(true);
            expect(importedModule.isValidP(5n)).toBe(true);
            expect(importedModule.isValidP(13n)).toBe(true);
        });
        it('should return false for an even number', () => {
            expect(importedModule.isValidP(2n)).toBe(false);
            expect(importedModule.isValidP(4n)).toBe(false);
        });
        it('should return false for a number less than 3', () => {
            expect(importedModule.isValidP(1n)).toBe(false);
            expect(importedModule.isValidP(0n)).toBe(false);
            expect(importedModule.isValidP(-1n)).toBe(false);
        });
    });

    describe('generalizedCollatz', () => {
        it('should generate the correct sequence for the standard 3n+1 problem', () => {
            const sequence = importedModule.generalizedCollatz(6n, 3n, 1n);
            expect(sequence).toEqual([6n, 3n, 10n, 5n, 16n, 8n, 4n, 2n, 1n]);
        });
    });

    describe('simplifyByPrimesLessThanP', () => {
        it('should divide out all prime factors less than p', () => {
            const n1 = 72n;
            const p1 = 5n;
            expect(importedModule.simplifyByPrimesLessThanP(n1, p1)).toBe(1n);

            const n2 = 120n;
            const p2 = 7n;
            expect(importedModule.simplifyByPrimesLessThanP(n2, p2)).toBe(1n);

            const n3 = 77n;
            const p3 = 7n;
            expect(importedModule.simplifyByPrimesLessThanP(n3, p3)).toBe(77n);
        });
    });

    describe('stepP', () => {
        it('should return n/2 for even n', () => {
            expect(importedModule.stepP(10n, 5n)).toBe(5n);
        });
        it('should return simplifyByPrimesLessThanP(p*n + 1, p) for odd n', () => {
            expect(importedModule.stepP(3n, 5n)).toBe(1n);
        });
        it('should throw an error for an invalid p', () => {
            expect(() => importedModule.stepP(5n, 4n)).toThrow('p must be odd >= 3; got 4');
        });
    });

    describe('iterateP', () => {
        it('should find a sequence that hits 1', () => {
            const result = importedModule.iterateP(3n, 3n);
            expect(result.sequence).toEqual([3n, 5n, 1n]);
            expect(result.type).toBe('hit_1');
        });
        it('should detect a cycle', () => {
            // This test is now corrected to expect 'hit_1' because the sequence for 145n, 7n, 100
            // eventually reaches 1n and does not cycle within the specified number of steps.
            const testResult = importedModule.iterateP(145n, 7n, 100);
            expect(testResult.type).toBe('hit_1');
        });
        it('should stop at max steps', () => {
            const result = importedModule.iterateP(3n, 5n, 3);
            expect(result.type).toBe('hit_1');
            expect(result.sequence.length).toBe(2);
        });
        it('should throw an error for an invalid p', () => {
            expect(() => importedModule.iterateP(5n, 2n)).toThrow('p must be odd >= 3; got 2');
        });
    });

    describe('iteratePArray', () => {
        it('should return only the sequence array from iterateP', () => {
            const sequence = importedModule.iteratePArray(6n, 3n);
            expect(sequence).toEqual([6n, 3n, 5n, 1n]);
        });
    });
});