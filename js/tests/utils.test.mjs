// ==========================================================
// File: utils.test.mjs
// Description: This test suite validates the core utility functions
// in the project's central utils.js file.
// ==========================================================
import { describe, it, expect, vi } from 'vitest';

// --- Core Function Imports ---
// This imports all the necessary functions from the consolidated utils.js file.
// The path is corrected to go up one directory level.
import {
    calculateCollatzSequence,
    calculateStandardDeviation,
    calculateSum,
    hexToRgb,
    isLight
} from '../utils.js';

// --- State and Mocking ---
// This imports the state management functions. The path is corrected to go up one directory.
import { getExplorationSetting } from '../state.js';

// Mocking localStorage for a Node.js test environment.
// This is necessary because Vitest runs in a Node.js environment which does
// not have a built-in localStorage object.
global.localStorage = {
    getItem: vi.fn((key) => {
        // Mocked value for the exploration setting, which is used by calculateCollatzSequence
        if (key === 'exploreNegativeNumbers') return 'false';
        return null;
    }),
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
        const result = calculateCollatzSequence(6, 2, 3, 1, 1000);
        const expectedSequence = [6, 3, 10, 5, 16, 8, 4, 2, 1];
        expect(result.sequence).toEqual(expectedSequence);
    });

    // Test for invalid parameters (x_param === 0)
    it('should handle invalid parameters (x_param === 0)', () => {
        const result = calculateCollatzSequence(6, 0, 3, 1, 1000);
        expect(result.type).toBe("Invalid Parameters (X is 0)");
    });

    // Test for max iterations reached
    it('should correctly handle reaching max iterations', () => {
        const result = calculateCollatzSequence(27, 2, 3, 1, 10);
        expect(result.steps).toBe(10);
        expect(result.type).toBe("Max Iterations Reached");
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
        expect(lightResult).toBe(true);
    });

    it('should correctly identify a dark color', () => {
        const darkResult = isLight('#000066');
        expect(darkResult).toBe(false);
    });
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
    });

    it('should correctly calculate the standard deviation of a sequence', () => {
        const sequence = [6, 3, 10, 5, 16, 8, 4, 2, 1];
        const mean = 55 / 9;
        const expectedStdDev = 4.408;
        const result = calculateStandardDeviation(sequence, mean);
        expect(result).toBeCloseTo(expectedStdDev, 2);
    });
});