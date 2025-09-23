import { describe, it, expect, vi } from 'vitest';
import { generateBoxUniverses } from '../slicer.js';

// Mock the generateCollatzSequence function from collatz-dragon.js.
// This is crucial for isolating the generateBoxUniverses function for testing.
// The mock simulates the expected behavior without running the full sequence generation.
vi.mock('./collatz-dragon.js', () => ({
    generateCollatzSequence: vi.fn((n, x, y, z) => {
        // Mock a specific case that we know diverges
        if (n === 2 && x === 1) {
            return { sequence: [], binaryPath: [], status: 'Divergent (Cycle or Limit Reached)' };
        }
        // Mock a simple convergent sequence for other cases
        const sequence = [n];
        if (n !== 1) {
            sequence.push(n / x);
        }
        return { sequence, binaryPath: [], status: 'Convergent' };
    })
}));

describe('generateBoxUniverses', () => {

    it('should generate the correct number of universes within the given ranges', () => {
        const nMin = 1;
        const nMax = 2;
        const xMin = 1;
        const xMax = 2;
        const yMin = 1;
        const yMax = 1;
        const zMin = 1;
        const zMax = 1;

        // The total number of permutations is 4, but one combination (N=2, X=1)
        // results in a divergent sequence and is filtered out.
        const universes = generateBoxUniverses(nMin, nMax, xMin, xMax, yMin, yMax, zMin, zMax);
        
        // (nMax - nMin + 1) * (xMax - xMin + 1) * (yMax - yMin + 1) * (zMax - zMin + 1)
        // (2-1+1) * (2-1+1) * (1-1+1) * (1-1+1) = 2 * 2 * 1 * 1 = 4
        // One is filtered out, so we expect 3.
        expect(universes.length).toBe(3);
    });

    it('should generate universes with the correct parameters', () => {
        const nMin = 1;
        const nMax = 1;
        const xMin = 1;
        const xMax = 2;
        const yMin = 1;
        const yMax = 1;
        const zMin = 1;
        const zMax = 1;

        const universes = generateBoxUniverses(nMin, nMax, xMin, xMax, yMin, yMax, zMin, zMax);

        // Check the first generated universe (N=1, X=1, Y=1, Z=1)
        // A sequence starting at 1 has 0 steps and a "Convergent" type from the mock.
        expect(universes[0]).toMatchObject({
            N: 1, 
            X: 1, 
            Y: 1, 
            Z: 1,
            steps: 0,
            type: "Convergent"
        });

        // Check the second generated universe (N=1, X=2, Y=1, Z=1)
        expect(universes[1]).toMatchObject({
            N: 1, 
            X: 2, 
            Y: 1, 
            Z: 1,
            steps: 0,
            type: "Convergent"
        });
    });

    it('should not generate more than 100 universes', () => {
        // Use a large range to test the generation limit
        const nMin = 1;
        const nMax = 50;
        const xMin = 1;
        const xMax = 50;
        const yMin = 1;
        const yMax = 1;
        const zMin = 1;
        const zMax = 1;

        const universes = generateBoxUniverses(nMin, nMax, xMin, xMax, yMin, yMax, zMin, zMax);
        expect(universes.length).toBe(100);
    });

    it('should handle ranges where min > max gracefully', () => {
        const nMin = 5;
        const nMax = 1;
        const xMin = 1;
        const xMax = 1;
        const yMin = 1;
        const yMax = 1;
        const zMin = 1;
        const zMax = 1;

        const universes = generateBoxUniverses(nMin, nMax, xMin, xMax, yMin, yMax, zMin, zMax);
        expect(universes.length).toBe(0);
    });
});
