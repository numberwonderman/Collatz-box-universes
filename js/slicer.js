import { generateCollatzSequence } from './collatz-dragon.js';

// Constants for the simulation.
const MAX_ITERATIONS = 1000;

/**
 * Calculates and aggregates all necessary data for a single "Collatz Universe".
 * This includes the sequence, number of steps, statistical data, and final status.
 * @param {number} n The starting number.
 * @param {number} x The even divisor.
 * @param {number} y The odd multiplier.
 * @param {number} z The odd addend.
 * @returns {object} An object containing the processed sequence data.
 */
function getCollatzUniverseData(n, x, y, z) {
    const { sequence, status } = generateCollatzSequence(n, x, y, z);

    if (status !== 'Convergent') {
        // Return a simple object indicating failure, as the test expects.
        return { type: status };
    }

    const steps = sequence.length - 1;
    const finalNum = sequence[steps];
    const minVal = Math.min(...sequence);
    const maxVal = Math.max(...sequence);
    const sumVal = sequence.reduce((a, b) => a + b, 0);
    const avgVal = sumVal / sequence.length;

    // Calculate standard deviation for the sequence.
    const avg = avgVal;
    const squaredDifferences = sequence.map(val => Math.pow(val - avg, 2));
    const variance = squaredDifferences.reduce((a, b) => a + b, 0) / sequence.length;
    const stdDev = Math.sqrt(variance);

    return {
        sequence,
        steps,
        type: status,
        minVal,
        maxVal,
        sumVal,
        avgVal,
        stdDev,
        finalNum
    };
}

/**
 * Generates an array of "Box Universes" based on a range of parameters.
 * A Box Universe represents a single Collatz sequence and its metadata.
 * @param {number} nMin The minimum N value.
 * @param {number} nMax The maximum N value.
 * @param {number} xMin The minimum X value.
 * @param {number} xMax The maximum X value.
 * @param {number} yMin The minimum Y value.
 * @param {number} yMax The maximum Y value.
 * @param {number} zMin The minimum Z value.
 * @param {number} zMax The maximum Z value.
 * @returns {Array<object>} An array of universe objects.
 */
export function generateBoxUniverses(nMin, nMax, xMin, xMax, yMin, yMax, zMin, zMax) {
    const tempUniverses = [];
    const maxUniversesToGenerate = 100; // Limit to prevent performance issues
    let generatedCount = 0;

    for (let n = nMin; n <= nMax && generatedCount < maxUniversesToGenerate; n++) {
        for (let x = xMin; x <= xMax && generatedCount < maxUniversesToGenerate; x++) {
            if (x === 0) continue;
            for (let y = yMin; y <= yMax && generatedCount < maxUniversesToGenerate; y++) {
                for (let z = zMin; z <= zMax && generatedCount < maxUniversesToGenerate; z++) {
                    const result = getCollatzUniverseData(n, x, y, z);
                    
                    // Only push a universe if the sequence successfully converged.
                    if (result.type === "Convergent") {
                        tempUniverses.push({
                            N: n, X: x, Y: y, Z: z,
                            sequence: result.sequence,
                            steps: result.steps,
                            type: result.type,
                            minVal: result.minVal,
                            maxVal: result.maxVal,
                            sumVal: result.sumVal,
                            avgVal: result.avgVal,
                            stdDev: result.stdDev,
                            finalNum: result.finalNum
                        });
                        generatedCount++;
                    }
                }
            }
        }
    }
    return tempUniverses;
}
