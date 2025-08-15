// generalizedCollatz.test.js
import { calculateCollatzSequence } from '../utils.js';



// ==========================================================

/**
 * /**
 /**
  *
  *  
 * Calculates the full Collatz sequence and returns a detailed analysis object.
 /*
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

    // Directly read from localStorage inside the function
    const exploreNegativeNumbers = localStorage.getItem('exploreNegativeNumbers') === 'true';

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
    */
function testStandardCollatz() {
  const result = calculateCollatzSequence(6, 1000, 2, 3, 1);
  const expectedSequence = [6, 3, 10, 5, 16, 8, 4, 2, 1];

  // Check if the sequence matches
  if (JSON.stringify(result.sequence) === JSON.stringify(expectedSequence)) {
    console.log("Test Passed: Standard Collatz sequence is correct.");
  } else {
    console.error("Test Failed: Standard Collatz sequence is incorrect.");
    console.error("Expected:", expectedSequence);
    console.error("Received:", result.sequence);
  }
}

// Call the test function to run it
testStandardCollatz();


/**
 * Calculates the standard deviation of a numerical sequence.
 * @param {Array<number>} sequence - The array of numbers.
 * @param {number} mean - The pre-calculated mean of the sequence.
 * @returns {number} The standard deviation.
 */
export function calculateStandardDeviation(sequence, mean) {
    if (sequence.length < 2) return 0; // Standard deviation is 0 for less than 2 elements
    const variance = sequence.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / sequence.length;
    return Math.sqrt(variance);
}

/**
 * Calculates the sum of a numerical sequence.
 * @param {Array<number>} sequence - The array of numbers.
 * @returns {number} The sum of the sequence.
 */
export function calculateSum(sequence) {
    return sequence.reduce((acc, val) => acc + val, 0);
}

// ==========================================================
// UI & Canvas Utilities
// ==========================================================

// === Helper function to save to history (example, customize as needed) ===
export function saveToHistory(data) {
    // In a real application, you might save this to localStorage or a database
    // For now, we'll just log it or add to a simple in-memory array if `calculatedRuns` is global.
    // Assuming `calculatedRuns` is defined at the top of utils.js as a global.
    calculatedRuns.push(data);
    // You might also want to update a history display in the UI here.
    // Example: appendToHistoryDisplay(data);
    console.log("Sequence saved to history:", data); // For debugging

}

/**
 * Displays a custom message in a designated message area.
 * @param {string} message - The message to display.
 * @param {string} type - 'info', 'success', or 'error' to determine styling.
 * @param {string} messageBoxId - The ID of the message box element.
 * @param {number} duration - How long the message should be visible in ms.
 * @param {string} initialClasses - Base classes for the message box.
 */
let messageTimer = null; // Declare globally for displayMessage
export function showMessage(message, type = 'info', messageBoxId = 'message-box', duration = 3000, initialClasses = 'mb-4 p-3 rounded-md text-center text-white') {
    const messageArea = document.getElementById(messageBoxId);
    if (!messageArea) {
        if (DEBUG_MODE) console.error(`Message box with ID '${messageBoxId}' not found.`);
        return;
    }

    if (messageTimer) {
        clearTimeout(messageTimer);
    }

    messageArea.textContent = message;
    let typeClass = '';
    if (type === 'success') typeClass = 'bg-green-500';
    else if (type === 'error') typeClass = 'bg-red-500';
    else typeClass = 'bg-blue-500'; // Default info

    messageArea.className = `${initialClasses} ${typeClass}`;
    messageArea.classList.remove('hidden');

    messageTimer = setTimeout(() => {
        messageArea.classList.add('hidden');
    }, duration);
}

// Keeping displayMessage as an alias for compatibility where used
export const displayMessage = showMessage;
// === Helper function to format sequence output ===
export function formatSequenceOutput(sequence) {
    // Limits the number of elements shown to prevent performance issues and clutter
    const displayLimit = 100;
    let formattedHtml = '';


    if (sequence.length > displayLimit) {
        formattedHtml = sequence.slice(0, displayLimit).join(', ') + '... (truncated, total: ' + sequence.length + ' numbers)';
    } else {
        formattedHtml = sequence.join(', ');
    }
    return formattedHtml;
}


/**
 * Generates a link URL with parameters for different visualizations.
 * @param {string} visualizationKey - Key indicating the visualization type (e.g., 'collatz-dragon', 'boxviewer').
 * @param {Object} [params={}] - Optional parameters to append to the URL.
 * @returns {string} The generated URL.
 */
export function generateLinkURL(visualizationKey, params = {}) {
    const baseUrl = window.location.origin + window.location.pathname;
    const urlMap = {
        'collatz-dragon': 'collatz-dragon.html',
        'boxviewer': 'box-universe-viewer.html',
        'slicer3d_fps': 'box-universe-fps.html', // Corresponds to Box Universe Slicer 3D
        'collatz-lines-explorer': 'collatz-lines-explorer.html',
        'slicer2d': 'slicer.html', // 2D pseudo-3D slicer
        'radial-animator': 'radial-animator.html', // 2D pseudo-3D slicer (Radial)
        'radial-viewer': 'radial-viewer.html', // Collatz Radial Viewer
        'index': 'index.html' // Main hub
    };

    const targetFile = urlMap[visualizationKey];
    if (!targetFile) {
        console.warn(`Unknown visualization key: ${visualizationKey}`);
        return '#';
    }

    let queryString = new URLSearchParams(params).toString();
    if (queryString) {
        queryString = `?${queryString}`;
    }
    return `${baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1)}${targetFile}${queryString}`;
}

/**
 * Updates the visibility of the gold star icon based on specific Collatz parameters (N=27, X=2, Y=3, Z=1).
 * @param {number} n - The current N value.
 * @param {number} x - The current X value.
 * @param {number} y - The current Y value.
 * @param {number} z - The current Z value.
 * @param {string} starId - The ID of the gold star icon element.
 */
export function updateGoldStarVisibility(n, x, y, z, starId = 'goldStar') {
    const goldStar = document.getElementById(starId);
    if (goldStar) {
        if (n === 27 && x === 2 && y === 3 && z === 1) {
            goldStar.classList.remove('hidden');
        } else {
            goldStar.classList.add('hidden');
        }
    }
}

// Keeping updateGoldStar and updateGoldStarVisibilitySlicer as aliases for compatibility where used
export const updateGoldStar = updateGoldStarVisibility;
export const updateGoldStarVisibilitySlicer = updateGoldStarVisibility;


/**
 * Converts a hex color string to an RGB object.
 * @param {string} hex - The hex color string (e.g., "#RRGGBB").
 * @returns {{r: number, g: number, b: number}} RGB object.
 */
export function hexToRgb(hex) {
    const r = parseInt(hex.substring(1, 3), 16);
    const g = parseInt(hex.substring(3, 5), 16);
    const b = parseInt(hex.substring(5, 7), 16);
    return { r, g, b };
}

/**
 * Checks if a color is light or dark based on its RGB components.
 * Useful for determining text color contrast.
 * @param {string} hexColor - The hex color string.
 * @returns {boolean} True if the color is light, false otherwise.
 */
export function isLight(hexColor) {
    const rgb = hexToRgb(hexColor);
    // HSP (Highly Sensitive Pooled) equation for perceived brightness
    const hsp = Math.sqrt(
        0.299 * (rgb.r * rgb.r) +
        0.587 * (rgb.g * rgb.g) +
        0.114 * (rgb.b * rgb.b)
    );
    // Use a threshold (e.g., 127.5 for 0-255 range)
    return hsp > 180; // Adjusted threshold for better contrast
}

// Function to render the 9-net (Original layout logic)
/**
 * Draws the 9-net visualization of the sequence on a canvas using the original layout.
 * @param {HTMLCanvasElement} canvas - The canvas element to draw on.
 * @param {Array<number>} sequence - The sequence of numbers to visualize.
 * @param {number} xVal - The X parameter used in the Collatz rule for color determination.
 * @param {string} divColor - Color for divisible numbers.
 * @param {string} mulColor - Color for multiply/add numbers.
 */
export function drawNineNetCanvasSecondary(canvas, sequence, xVal, divColor, mulColor) {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);


    // Use the global constants for drawing logic
    const faceSize = FACE_SIZE;
    const padding = PADDING;
    const stepSize = STEP_SIZE;


    // Define the layout of the 9-net (a 3x3 grid of 3x3 faces)
    const layout = [
        { r: 0, c: 1 }, // Top
        { r: 1, c: 0 }, // Left
        { r: 1, c: 1 }, // Center-Left (main sequence starts here)
        { r: 1, c: 2 }, // Center
        { r: 1, c: 3 }, // Center-Right
        { r: 2, c: 1 }  // Bottom
    ];


    let sequenceIndex = 0; // Tracks the current position in the Collatz sequence


    // Iterate through each 'face' in the predefined layout
    for (const pos of layout) {
        // Iterate through the 3x3 grid of small squares within each face
        for (let i = 0; i < stepSize; i++) { // Row within the face
            for (let j = 0; j < stepSize; j++) { // Column within the face
                // Calculate the x and y coordinates for the current small square
                const x = padding + (pos.c * stepSize + j) * faceSize;
                const y = padding + (pos.r * stepSize + i) * faceSize;


                let color = "#444"; // Default color for squares not representing a sequence number
                let label = ""; // Optional label for the number


                // Check if there's a corresponding number in the sequence for this square
                if (sequenceIndex < sequence.length) {
                    const num = sequence[sequenceIndex];
                    color = (num % xVal === 0) ? divColor : mulColor; // Color based on divisibility
                    label = num; // Set the number as label
                    sequenceIndex++; // Move to the next number in the sequence
                }


                ctx.fillStyle = color;
                ctx.fillRect(x, y, faceSize, faceSize);
                ctx.strokeStyle = "#222"; // Darker border for separation
                ctx.lineWidth = 1;
                ctx.strokeRect(x, y, faceSize, faceSize);


                // Optional: Draw the number inside the square
                if (label !== "") {
                    ctx.fillStyle = isLight(color) ? "#000" : "#fff"; // Text color contrast
                    ctx.font = `${faceSize * 0.4}px Inter, sans-serif`; // Adjust font size
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillText(label, x + faceSize / 2, y + faceSize / 2);
                }
            }
        }
    }
}








// === Helper function to parse URL parameters ===
export function getUrlParams() {
    const params = {};
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    for (const [key, value] of urlParams) {
        params[key] = value;
    }
    return params;
}


