// ==========================================================
// Consolidate ALL Global Variable Declarations and Constants at the Top
// ==========================================================

// Debug mode flag (set to true to enable console.error messages)
const DEBUG_MODE = true; // Set to false for production if you want to silence these errors

// Default canvas colors (will be updated by color pickers)
export let DEFAULT_LINE_COLOR = '#34d399'; // Green - for divisible operation (matches image's green)
export let DEFAULT_NODE_COLOR = '#fb923c'; // Orange - for multiply/add operation (matches image's orange)
export const DEFAULT_NODE_BORDER_COLOR = '#f00'; // Red (kept fixed, or add picker if needed)
export const DEFAULT_NODE_RADIUS = 5;

// Variables for canvas and rendering context (if still needed as global, consider passing as args)
let centerX;
let centerY;
let nodeRadius;
let maxNodeRadius = 10;
let minNodeRadius = 2;
let maxLineThickness = 3;
let minLineThickness = 0.5;

// Variables for drag and zoom
let isDragging = false;
let lastX, lastY;
let translateX = 0;
let translateY = 0;
let scale = 1;

// Stores the current sequence data for rendering
let currentSequenceData = null;

// Global array to store runs for history (resets on page refresh unless persistence is added)
let calculatedRuns = [];

// NEW: Global padding variable for the unfolded box visualization (kept for other potential uses)
export const PADDING_BETWEEN_GROUPS = 10; // Padding between the large 3x3 remainder groups

// === Constants for 9-Net Dimensions (used by the original layout logic) ===
export const FACE_SIZE = 30; // Size of each small square face
export const PADDING = 10; // Padding around the entire 9-net
export const STEP_SIZE = 3; // Number of small squares per 'face' side (3x3 grid)

// Total internal drawing dimensions for a complete 9-net (based on original layout)
// These are illustrative and might not be strictly used if layout is dynamic.
export const NINE_NET_DRAW_WIDTH = (4 * STEP_SIZE * FACE_SIZE) + (2 * PADDING); // Based on the widest part of the cross
export const NINE_NET_DRAW_HEIGHT = (3 * STEP_SIZE * FACE_SIZE) + (2 * PADDING); // Based on the tallest part of the cross


// ==========================================================
// End of Global Variable Declarations and Constants
// ==========================================================


/**
 * Calculates a generalized Collatz sequence.
 * @param {number} num - The starting number.
 * @param {number} x - The divisor.
 * @param {number} y - The multiplier.
 * @param {number} z - The adder.
 * @param {number} maxIterations - Maximum number of iterations to prevent infinite loops.
 * @returns {{sequence: Array<number>, type: string, message?: string}} Object containing sequence and its type/message.
 */
export function generalizedCollatz(num, x, y, z, maxIterations = MAX_ITERATIONS) {
    if (x === 0) {
        return { sequence: [], type: "error", message: "Error: X (divisor) cannot be zero." };
    }
    const output = [num];
    let iterations = 0;
    let currentNum = num;

    while (currentNum !== 1 && iterations < maxIterations) {
        let nextNum;
        if (currentNum % Math.abs(x) === 0) {
            nextNum = currentNum / x;
        } else {
            nextNum = (Math.abs(y) || 3) * currentNum + (z || 1);
        }

        // Check for cycles
        if (output.includes(nextNum)) {
            output.push(nextNum); // Add the repeating number to show the cycle
            return { sequence: output, type: "cycle", message: `Sequence entered a cycle at ${nextNum}.` };
        }

        currentNum = nextNum;
        output.push(currentNum);
        iterations++;
    }

    if (currentNum === 1) {
        return { sequence: output, type: "converges_to_1", message: `Sequence converged to 1 in ${iterations} iterations.` };
    } else {
        return { sequence: output, type: "reached_max_iterations", message: `Sequence reached max iterations (${maxIterations}) at ${currentNum}.` };
    }
}


// Function to render the Unfolded Box (9-Net) visualization (keeping this function as is)
function drawUnfoldedBoxNineNet(data) {
    // Ensure canvas and ctx are initialized.
    let canvas = document.getElementById('singleNineNetCanvas'); // Assuming this function gets its own canvas
    if (!canvas) {
        if (DEBUG_MODE) console.error("Canvas element 'singleNineNetCanvas' not found for drawUnfoldedBoxNineNet.");
        return;
    }
    let ctx = canvas.getContext('2d');
    if (!ctx) {
        if (DEBUG_MODE) console.error("2D context not available for 'singleNineNetCanvas' in drawUnfoldedBoxNineNet.");
        return;
    }

    // Adjust canvas resolution for sharper drawing on high-DPI screens
    const dpi = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpi;
    canvas.height = canvas.offsetHeight * dpi;
    ctx.scale(dpi, dpi);

    // Clear the entire canvas AND set a solid background color
    ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
    ctx.fillStyle = '#222'; // A solid dark grey background for the canvas to ensure visibility
    ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight); // Fill using CSS dimensions after scaling

    ctx.save(); // Save the current canvas state (transforms)
    // Apply translation and scale AFTER calculating layout, so it works on the "unscaled" canvas dimensions
    ctx.translate(canvas.offsetWidth / 2 / dpi + translateX, canvas.offsetHeight / 2 / dpi + translateY);
    ctx.scale(scale, scale);

    const sequence = data.sequence; // Access sequence from data object
    const xValue = data.x_param; // Get xValue from data object (needed for divisibility check)

    // Define the positions of the 9 "remainder groups" (each is a 3x3 grid of cells)
    // This layout creates the "unfolded box" or "cross" shape
    const layout = [
        {r: 0, c: 1}, // Remainder 0: Top-middle group
        {r: 1, c: 0}, // Remainder 1: Middle-left group
        {r: 1, c: 1}, // Remainder 2: Center group
        {r: 1, c: 2}, // Remainder 3: Middle-right group
        {r: 1, c: 3}, // Remainder 4: Far-right group
        {r: 2, c: 1}, // Remainder 5: Bottom-middle group
        {r: 0, c: 2}, // Remainder 6: Top-right corner (of the cross shape)
        {r: 2, c: 0}, // Remainder 7: Bottom-left corner (of the cross shape)
        {r: 2, c: 2}  // Remainder 8: Bottom-right corner (of the cross shape)
    ];

    // Determine the effective grid dimensions for calculating group size
    const maxLayoutColIndex = Math.max(...layout.map(p => p.c));
    const maxLayoutRowIndex = Math.max(...layout.map(p => p.r));

    const effectiveLayoutCols = maxLayoutColIndex + 1; // e.g., 0,1,2,3 -> 4 columns
    const effectiveLayoutRows = maxLayoutRowIndex + 1; // e.g., 0,1,2 -> 3 rows

    // Calculate the size of each individual *cell* (smallest square)
    const availableWidth = canvas.offsetWidth / dpi - (effectiveLayoutCols - 1) * PADDING_BETWEEN_GROUPS;
    const availableHeight = canvas.offsetHeight / dpi - (effectiveLayoutRows - 1) * PADDING_BETWEEN_GROUPS;

    const potentialCellSizeByWidth = availableWidth / (effectiveLayoutCols * 3);
    const potentialCellSizeByHeight = availableHeight / (effectiveLayoutRows * 3);

    const cellSize = Math.min(potentialCellSizeByWidth, potentialCellSizeByHeight) * 0.9; // Use 90% to add some margin around the entire structure
    const groupSize = cellSize * 3; // Each remainder group is a 3x3 grid of cells

    // Calculate total drawing dimensions for centering
    const totalDrawingWidth = effectiveLayoutCols * groupSize + (effectiveLayoutCols - 1) * PADDING_BETWEEN_GROUPS;
    const totalDrawingHeight = effectiveLayoutRows * groupSize + (effectiveLayoutRows - 1) * PADDING_BETWEEN_GROUPS;

    // Calculate initial offset to center the entire 9-net drawing
    const initialOffsetX = -totalDrawingWidth / 2;
    const initialOffsetY = -totalDrawingHeight / 2;

    // Store the final number for each cell (remainder, cellX, cellY)
    const cellContents = {}; // Structure: {remainder: {cellY: {cellX: num}}}

    // Process the sequence to determine the final content of each cell
    for (let i = 0; i < sequence.length; i++) {
        const num = sequence[i];
        const remainder = num % 9;
        const cellInGroupX = (num % 3);
        const cellInGroupY = 2 - Math.floor((num / 3) % 3); // Invert Y-axis (0=bottom, 2=top)

        if (!cellContents[remainder]) {
            cellContents[remainder] = {};
        }
        if (!cellContents[remainder][cellInGroupY]) {
            cellContents[remainder][cellInGroupY] = {};
        }
        cellContents[remainder][cellInGroupY][cellInGroupX] = num;
    }

    // Now, draw the cells based on the final `cellContents`
    for (let remainder = 0; remainder < layout.length; remainder++) {
        const pos = layout[remainder];
        if (pos) {
            const groupX = initialOffsetX + (pos.c * groupSize) + (pos.c * PADDING_BETWEEN_GROUPS);
            const groupY = initialOffsetY + (pos.r * groupSize) + (pos.r * PADDING_BETWEEN_GROUPS);

            // Draw outline for the 3x3 remainder group
            ctx.beginPath();
            ctx.rect(groupX, groupY, groupSize, groupSize);
            ctx.strokeStyle = '#555'; // Gray outline for the 3x3 groups
            ctx.lineWidth = 1;
            ctx.stroke();

            // Draw content of each cell within this remainder group
            if (cellContents[remainder]) {
                for (let cellInGroupY = 0; cellInGroupY < 3; cellInGroupY++) {
                    if (cellContents[remainder][cellInGroupY]) {
                        for (let cellInGroupX = 0; cellInGroupX < 3; cellInGroupX++) {
                            const num = cellContents[remainder][cellInGroupY][cellInGroupX];
                            if (num !== undefined) {
                                const cellAbsX = groupX + (cellInGroupX * cellSize);
                                const cellAbsY = groupY + (cellInGroupY * cellSize);

                                ctx.beginPath();
                                ctx.rect(cellAbsX, cellAbsY, cellSize, cellSize);

                                // Set fill color based on divisibility by xValue
                                if (num % xValue === 0) { // If divisible by X
                                    ctx.fillStyle = DEFAULT_LINE_COLOR; // Green
                                } else { // If not divisible by X
                                    ctx.fillStyle = DEFAULT_NODE_COLOR; // Orange
                                }
                                ctx.fill();
                                ctx.strokeStyle = DEFAULT_NODE_BORDER_COLOR; // Red border
                                ctx.lineWidth = 1;
                                ctx.stroke();

                                // Draw the number text
                                ctx.fillStyle = '#000'; // Black text color
                                ctx.font = `${Math.max(8, cellSize * 0.4)}px Arial`; // Dynamic font size based on cellSize
                                ctx.textAlign = 'center';
                                ctx.textBaseline = 'middle';
                                ctx.fillText(num.toString(), cellAbsX + cellSize / 2, cellAbsY + cellSize / 2);
                            }
                        }
                    }
                }
            }
        }
    }
    ctx.restore();
}


// Collatz function as per user's definition (kept consistent)
export function calculateCollatzSequence(startN, maxIterations, x_param, y_param, z_param) {
    let sequence = [startN];
    let current = startN;
    let steps = 0;
    let yPlusZ_operations = 0;
    let maxVal = startN;
    let minVal = startN;
    let sumVal = startN;

    let stoppingTime_t = Infinity;
    let coefficientStoppingTime_tau = Infinity;
    let paradoxicalOccurrences = [];

    const initialN = startN;

    if (x_param === 0) {
        return {
            startN, sequence: [startN], steps: 0, maxVal: startN, minVal: startN, sumVal: startN,
            avgVal: startN, stdDev: 0, type: "Invalid Parameters (X is 0)", converges_to_1: false,
            stoppingTime_t: 'N/A', coefficientStoppingTime_tau: 'N/A', paradoxicalOccurrences: []
        };
    }
    if (startN === 1) {
        return {
            startN, sequence: [1], steps: 0, maxVal: 1, minVal: 1, sumVal: 1,
            avgVal: 1, stdDev: 0, type: "Converges to 1", converges_to_1: true,
            stoppingTime_t: 0,
            coefficientStoppingTime_tau: 1,
            paradoxicalOccurrences: []
        };
    }

    while (current !== 1 && steps < maxIterations) {
        if (steps > maxIterations * 2 && maxIterations > 0) {
             return {
                startN, sequence: sequence, steps: steps, maxVal: maxVal, minVal: minVal, sumVal: sumVal,
                avgVal: sumVal / sequence.length, stdDev: 0, type: "Exceeded Max Iterations (Possible Divergence)",
                converges_to_1: false, stoppingTime_t: stoppingTime_t === Infinity ? 'N/A' : stoppingTime_t,
                coefficientStoppingTime_tau: coefficientStoppingTime_tau === Infinity ? 'N/A' : coefficientStoppingTime_tau,
                paradoxicalOccurrences: paradoxicalOccurrences
            };
        }

        if (current % x_param === 0) {
            current = current / x_param;
        } else {
            current = (y_param * current + z_param);
            yPlusZ_operations++;
        }

        steps++;

        if (!Number.isFinite(current) || Math.abs(current) > Number.MAX_SAFE_INTEGER || current <= 0) {
            let errorType = "Exceeded Max Safe Integer";
            if (current <= 0) errorType = "Reached Non-Positive Value";
            return {
                startN, sequence: sequence, steps: steps, maxVal: maxVal, minVal: minVal, sumVal: sumVal,
                avgVal: sumVal / sequence.length, stdDev: 0, type: errorType,
                converges_to_1: false, stoppingTime_t: stoppingTime_t === Infinity ? 'N/A' : stoppingTime_t,
                coefficientStoppingTime_tau: coefficientStoppingTime_tau === Infinity ? 'N/A' : coefficientStoppingTime_tau,
                paradoxicalOccurrences: paradoxicalOccurrences
            };
        }

        if (sequence.includes(current)) {
            return {
                startN, sequence: sequence, steps: steps, maxVal: maxVal, minVal: minVal, sumVal: sumVal,
                avgVal: sumVal / sequence.length, stdDev: 0, type: "Cycle Detected",
                converges_to_1: false, stoppingTime_t: stoppingTime_t === Infinity ? 'N/A' : stoppingTime_t,
                coefficientStoppingTime_tau: coefficientStoppingTime_tau === Infinity ? 'N/A' : coefficientStoppingTime_tau,
                paradoxicalOccurrences: paradoxicalOccurrences
            };
        }

        sequence.push(current);

        if (current > maxVal) maxVal = current;
        if (current < minVal) minVal = current;
        sumVal += current;

        const currentCoefficient = (steps === 0) ? 1 : (Math.pow(y_param, yPlusZ_operations) / Math.pow(x_param, steps));

        if (stoppingTime_t === Infinity && current < initialN) {
            stoppingTime_t = steps;
        }

        if (coefficientStoppingTime_tau === Infinity && currentCoefficient < 1) {
            coefficientStoppingTime_tau = steps;
        }

        if (currentCoefficient < 1 && current >= initialN) {
            paradoxicalOccurrences.push({
                step: steps,
                value: current,
                coefficient: currentCoefficient.toFixed(6)
            });
        }
    }

    let type = "Unknown";
    let converges_to_1 = false;
    if (current === 1) {
        type = "Converges to 1";
        converges_to_1 = true;
    } else if (steps >= maxIterations) {
        type = "Max Iterations Reached";
    }

    let mean = sumVal / sequence.length;
    let sumOfSquaredDifferences = sequence.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0);
    let stdDev = Math.sqrt(sumOfSquaredDifferences / sequence.length);

    return {
        startN, sequence: sequence, steps: steps, maxVal: maxVal, minVal: minVal, sumVal: sumVal,
        avgVal: mean, stdDev: stdDev, type: type, converges_to_1: converges_to_1,
        stoppingTime_t: stoppingTime_t === Infinity ? 'N/A' : stoppingTime_t,
        coefficientStoppingTime_tau: coefficientStoppingTime_tau === Infinity ? 'N/A' : coefficientStoppingTime_tau,
        paradoxicalOccurrences: paradoxicalOccurrences,
        x_param: x_param, // Ensure x_param is included in the returned data object
        y_param: y_param,
        z_param: z_param
    };
}

// Helper function to determine if a color is light or dark
export function isLight(color) { // Exporting this function as well, as it's a utility
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    return luminance > 0.5;
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
    
    // Add debug log for 2D context availability
    if (!ctx) {
        if (DEBUG_MODE) console.error("2D context not available for 9-net drawing.");
        return;
    }

    // Adjust canvas resolution for sharper drawing on high-DPI screens
    const dpi = window.devicePixelRatio || 1;
    const currentCssWidth = canvas.offsetWidth; // Get current CSS width
    const currentCssHeight = canvas.offsetHeight; // Get current CSS height

    canvas.width = currentCssWidth * dpi; // Set canvas drawing surface width
    canvas.height = currentCssHeight * dpi; // Set canvas drawing surface height
    ctx.scale(dpi, dpi); // Scale the context

    // --- CRUCIAL FIX: Clear the canvas and then fill with a solid background color ---
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear all pixels to transparent
    ctx.fillStyle = '#222'; // Choose a solid dark grey (or any color that contrasts well)
    ctx.fillRect(0, 0, currentCssWidth, currentCssHeight); // Fill the entire canvas with the chosen color (using CSS dimensions for filling)
    // --- END CRUCIAL FIX ---

    // Use the global constants for drawing logic
    const faceSize = FACE_SIZE; 
    const padding = PADDING; 
    const stepSize = STEP_SIZE; 

    // Define the layout of the 9-net (a 3x3 grid of 3x3 faces) - REVERTED TO ORIGINAL LAYOUT
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
    for (const pos of layout) { // Using 'layout' from your original code
        // Iterate through the 3x3 grid of small squares within each face
        for (let i = 0; i < stepSize; i++) { // Row within the face
            for (let j = 0; j < stepSize; j++) { // Column within the face
                // Calculate the x and y coordinates for the current small square - REVERTED TO ORIGINAL CALCULATION
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

// === Helper function to show messages ===
export function showMessage(message, isError = true) {
    const messageDiv = document.getElementById('errorMessage'); // Assuming 'errorMessage' is the div for messages
    if (messageDiv) {
        messageDiv.textContent = message;
        // You might want to add/remove classes for styling (e.g., 'text-red-400' for errors)
        messageDiv.classList.remove('hidden'); // Make sure it's visible

        // Optional: Hide message after a few seconds
        setTimeout(() => {
            messageDiv.classList.add('hidden');
        }, 5000);
    } else {
        console.warn("Message display div not found (expected 'errorMessage'), logging message:", message);
    }
}

// === Helper function to clear messages ===
export function clearMessage() {
    const messageDiv = document.getElementById('errorMessage'); // Assuming 'errorMessage' is the div for messages
    if (messageDiv) {
        messageDiv.textContent = '';
        messageDiv.classList.add('hidden');
    }
}
