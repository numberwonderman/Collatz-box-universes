import { describe, it, expect } from 'vitest';
import { calculateCollatzSequence, getPredecessorsShortcuts } from '../collatzLogic.js';

describe('collatzLogic', () => {
    // Computes the standard sequence (3n+1) starting at 6, which converges to 1.
    it('computes sequence correctly for positive input that converges', () => {
        const result = calculateCollatzSequence(6, 2, 3, 1);
        const expectedSequence = [6, 3, 10, 5, 16, 8, 4, 2, 1];
        expect(result.sequence).toEqual(expectedSequence);
        expect(result.status).toBe("Converged to 1");
    });

    // Tests for an invalid starting number, like 0.
    it('returns "Invalid input" for non-positive numbers', () => {
        const result = calculateCollatzSequence(0, 2, 3, 1);
        expect(result.sequence).toEqual([]);
        expect(result.status).toBe("Invalid input");
    });

    // Tests for a sequence that enters a cycle and does not converge to 1.
    it('detects a cycle when the sequence returns to its start', () => {
        const result = calculateCollatzSequence(6, 2, 3, 3);
        // The sequence would be 6 -> 3 -> 12 -> 6 (a cycle)
        expect(result.sequence.length).toBeGreaterThan(1);
        expect(result.status).toBe("Cycle detected");
    });

    // Tests for a sequence that does not converge within a set number of steps.
    it('detects non-convergence after a certain number of steps', () => {
        const result = calculateCollatzSequence(5, 2, 3, 2);
        expect(result.sequence.length).toBeGreaterThanOrEqual(1000);
        expect(result.status).toBe("Did not converge after 1000 steps");
    });
});

describe('getPredecessorsShortcuts', () => {
    it('generates predecessors with shortcuts', () => {
        const getShortcutsFor = getPredecessorsShortcuts(2n, 3n, 1n);
        const preds = [...getShortcutsFor(4n)];
        expect(preds).toContain(8n);
        expect(preds).toContain(1n);
    });
});