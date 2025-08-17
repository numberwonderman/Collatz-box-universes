// Inside utils.js (or the new collatz-core.js file)
import { getExplorationSetting } from './state.js';
import { calculateSum, calculateStandardDeviation } from './utils.js';
/**
 * /**
 /**
 * Calculates the full Collatz sequence and returns a detailed analysis object.
 * @param {number} startN - The starting number.
 * @param {number} maxIterations - The maximum number of steps to take.
 * @param {number} x_param - The divisor (for n/x).
 * @param {number} y_param - The multiplier (for yn + z).
 * @param {number} z_param - The adder (for yn + z).
 * @returns {object} An object containing the sequence and all its statistical properties.
 */
/**
 * Calculates the full Collatz sequence and returns a detailed analysis object.
 * @param {number} startN - The starting number.
 * @param {number} maxIterations - The maximum number of steps to take.
 * @param {number} x_param - The divisor (for n/x).
 * @param {number} y_param - The multiplier (for yn + z).
 * @param {number} z_param - The adder (for yn + z).
 * @returns {object} An object containing the sequence and all its statistical properties.
 */
export function calculateCollatzSequence(startN, maxIterations, x_param, y_param, z_param) {
    let sequence = [startN];
    let current = startN;
    let steps = 0;
    let odd_operations = 0;
    let maxVal = startN;
    let minVal = startN;

    let stoppingTime_t = 'N/A';
    let firstDescentStep = 'N/A';
    let paradoxicalOccurrences = [];

   // ... inside the function
const exploreNegativeNumbers = getExplorationSetting();

    if (x_param === 0) {
        return { startN, sequence: [startN], steps: 0, maxVal: startN, minVal: startN, sumVal: startN, avgVal: startN, stdDev: 0, type: "Invalid Parameters (X is 0)", converges_to_1: false, stoppingTime_t, coefficientStoppingTime_tau: 0, paradoxicalOccurrences, firstDescentStep };
    }
    if (startN === 1) {
        return { startN, sequence: [1], steps: 0, maxVal: 1, minVal: 1, sumVal: 1, avgVal: 1, stdDev: 0, type: "Converges to 1", converges_to_1: true, stoppingTime_t: 0, coefficientStoppingTime_tau: 0, paradoxicalOccurrences, firstDescentStep: 0 };
    }

    while (current !== 1 && steps < maxIterations) {
        if (current % x_param === 0) {
            current = current / x_param;
        } else {
            current = (y_param * current + z_param);
            odd_operations++;
        }

        steps++;

        if (firstDescentStep === 'N/A' && current < startN) {
            firstDescentStep = steps;
        }

        if (!Number.isFinite(current) || Math.abs(current) > Number.MAX_SAFE_INTEGER || (!exploreNegativeNumbers && current <= 0)) {
            let errorType = "Exceeded Max Safe Integer";
            if (current <= 0) errorType = "Reached Non-Positive Value";
            return {
                startN, sequence: sequence, steps: steps, maxVal: maxVal, minVal: minVal, sumVal: sumVal,
                avgVal: sumVal / sequence.length, stdDev: 0, type: errorType, converges_to_1: false, stoppingTime_t, coefficientStoppingTime_tau: odd_operations, paradoxicalOccurrences, firstDescentStep
            };
        }

        if (sequence.includes(current)) {
            paradoxicalOccurrences.push({ value: current, step: steps, reason: "Cycle detected" });
            const q_cycle = odd_operations;
            const j_cycle = steps;
            const coefficient = (y_param ** q_cycle) / (x_param ** j_cycle);
            if (coefficient < 1 && current >= startN) {
                paradoxicalOccurrences.push({ value: current, step: steps, reason: "Cycle meets paradoxical definition" });
            }
            // Use the helper functions for final calculations before returning
            const finalSum = calculateSum(sequence);
            const finalMean = finalSum / sequence.length;
            const finalStdDev = calculateStandardDeviation(sequence, finalMean);

            return {
                startN, sequence: sequence, steps: steps, maxVal: maxVal, minVal: minVal, sumVal: finalSum,
                avgVal: finalMean, stdDev: finalStdDev, type: "Cycle Detected", converges_to_1: false, stoppingTime_t, coefficientStoppingTime_tau: odd_operations, paradoxicalOccurrences, firstDescentStep
            };
        }

        sequence.push(current);

        if (current > maxVal) maxVal = current;
        if (current < minVal) minVal = current;
    }

    if (current === 1 && sequence[sequence.length - 1] !== 1) {
        sequence.push(1);
    }

    let type = "Unknown";
    let converges_to_1 = false;
    if (current === 1) {
        type = "Converges to 1";
        converges_to_1 = true;
        stoppingTime_t = steps;
    } else if (steps >= maxIterations) {
        type = "Max Iterations Reached";
    }

    const finalCoefficient = (y_param ** odd_operations) / (x_param ** steps);
    if (finalCoefficient < 1 && current >= startN) {
        paradoxicalOccurrences.push({ value: current, step: steps, reason: "Paradoxical behavior detected" });
    }

    // Use the helper functions for final calculations
    const finalSum = calculateSum(sequence);
    const finalMean = finalSum / sequence.length;
    const finalStdDev = calculateStandardDeviation(sequence, finalMean);

    return {
        startN, sequence: sequence, steps: steps, maxVal: maxVal, minVal: minVal, sumVal: finalSum,
        avgVal: finalMean, stdDev: finalStdDev, type: type, converges_to_1: converges_to_1,
        x_param: x_param, y_param: y_param, z_param: z_param,
        stoppingTime_t: stoppingTime_t,
        coefficientStoppingTime_tau: odd_operations,
        paradoxicalOccurrences: paradoxicalOccurrences,
        firstDescentStep: firstDescentStep
    };
}
