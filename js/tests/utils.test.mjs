import { describe, it, expect } from 'vitest';

// generalizedCollatz.test.js
import { expect } from 'vitest';
import {
    calculateCollatzSequence,
    calculateStandardDeviation,
    calculateSum,
    hexToRgb,
    isLight
} from '../utils.js';
import{calculateCollatzSequence} from "../collatzLogic.js";
// Mocking localStorage for a Node.js environment
import { vi } from 'vitest';
global.localStorage = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
// ==========================================================
// Test Suite for Core Collatz Calculation & Utilities
// ==========================================================
// A describe block to group all tests related to the core Collatz function
describe('calculateCollatzSequence', () => {

    // Test case for the standard Collatz sequence
    it('should correctly calculate the standard Collatz sequence for n=6', () => {
        const result = calculateCollatzSequence(6, 1000, 2, 3, 1);
        const expectedSequence = [6, 3, 10, 5, 16, 8, 4, 2, 1];
        
        // Use Vitest's assertion library to check the result
        expect(result.sequence).toEqual(expectedSequence);
    });

    // You can add more test cases here for different scenarios
    it('should handle invalid parameters (x_param === 0)', () => {
        const result = calculateCollatzSequence(6, 1000, 0, 3, 1);

        // Use Vitest's assertion library to check the result
        expect(result.type).toBe("Invalid Parameters (X is 0)");
    });
});

// ==========================================================
// Test Suite for UI & Color Utilities
// ==========================================================

describe('Color Utilities', () => {

    it('should correctly convert a hex color to an RGB object', () => {
        const result = hexToRgb('#34d399');
        const expected = { r: 52, g: 211, b: 153 };
       expect(result).toEqual(expected);
    });

    it('should correctly identify a light color', () => {
        const lightResult = isLight('#FFFF99');
        expect(lightResult).toBe(true) ;
        }
    );

    it('should correctly identify a dark color', () => {
        const darkResult = isLight('#000066');
        expect(darkResult).toBe(false);;
        })
});

// ==========================================================
// Test Suite for Statistical Utilities
// ==========================================================

describe('Statistical Utilities', () => {
    it('should correctly calculate the sum of a sequence', () => {
        const sequence = [6, 3, 10, 5, 16, 8, 4, 2, 1];
        const expectedSum = 55;
        const result = calculateSum(sequence);

        expect(result).toBe(expectedSum);
        }
    );

    it('should correctly calculate the standard deviation of a sequence', () => {
        const sequence = [6, 3, 10, 5, 16, 8, 4, 2, 1];
        const mean = 55 / 9;
        const expectedStdDev = 4.408
        const result = calculateStandardDeviation(sequence, mean);

        expect(result).toBeCloseTo(expectedStdDev, 2);
        
    });
});

// Note: The `getUrlParams` function is highly dependent on the browser's
// window object, making it difficult to test in a standard test runner
// like Node.js. It's generally considered low priority for unit testing.

// ==========================================================
// Test Strategy:
// This test suite is focused on validating the core "pure" utility functions
// that perform mathematical calculations and data transformations.
//
// We intentionally do not test functions that directly manipulate the DOM
// (e.g., showMessage, drawNineNetCanvasSecondary) or rely heavily on the
// browser's global state (e.g., window.location). This ensures our test
// suite is robust, fast, and not susceptible to breaking with minor
// UI or browser environment changes.
// ==========================================================