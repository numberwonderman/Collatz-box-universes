// ==========================================================
// Consolidate ALL Global Variable Declarations at the Top
// ==========================================================

// Default canvas colors (will be updated by color pickers)
let DEFAULT_LINE_COLOR = '#34d399'; // Green - for divisible operation (matches image's green)
let DEFAULT_NODE_COLOR = '#fb923c'; // Orange - for multiply/add operation (matches image's orange)
const DEFAULT_NODE_BORDER_COLOR = '#f00'; // Red (kept fixed, or add picker if needed)
const DEFAULT_NODE_RADIUS = 5;

// Variables for canvas and rendering context
let canvas;
let ctx;
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

// Define dpi globally and once
let dpi = window.devicePixelRatio || 1;

// Stores the current sequence data for rendering
let currentSequenceData = null;

// Global array to store runs for history (resets on page refresh unless persistence is added)
let calculatedRuns = [];

// NEW: Global padding variable for the unfolded box visualization
const PADDING_BETWEEN_GROUPS = 10; // Padding between the large 3x3 remainder groups

// ==========================================================
// End of Global Variable Declarations
// ==========================================================

// Function to render the Unfolded Box (9-Net) visualization
// This function is intended for the main index.html page
function drawUnfoldedBoxNineNet(data) {
    // Ensure canvas and ctx are initialized. This is crucial if the function is called before DOMContentLoaded.
    if (!canvas) {
        canvas = document.getElementById('singleNineNetCanvas');
        if (!canvas) {
            console.error("Canvas element 'singleNineNetCanvas' not found. Cannot draw.");
            return;
        }
        ctx = canvas.getContext('2d');
    }

    // Adjust canvas resolution for sharper drawing on high-DPI screens
    const dpi = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpi;
    canvas.height = canvas.offsetHeight * dpi;
    ctx.scale(dpi, dpi);

    // Clear the entire canvas
    ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

    ctx.save(); // Save the current canvas state (transforms)
    // Apply translation and scale AFTER calculating layout, so it works on the "unscaled" canvas dimensions
    ctx.translate(canvas.offsetWidth / 2 / dpi + translateX, canvas.offsetHeight / 2 / dpi + translateY);
    ctx.scale(scale, scale);

    const sequence = data.sequence; // Access sequence from data object
    const xValue = data.x_param; // Get xValue from data object (needed for divisibility check) - CORRECTED TO x_param

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
    // We want the total drawing to fit within the canvas.
    // Total available width for content (after padding for edges)
    const availableWidth = canvas.offsetWidth / dpi - (effectiveLayoutCols - 1) * PADDING_BETWEEN_GROUPS;
    const availableHeight = canvas.offsetHeight / dpi - (effectiveLayoutRows - 1) * PADDING_BETWEEN_GROUPS;

    // Each logical column in `layout` takes up 3 cells, each logical row takes up 3 cells.
    // So, total cells across = effectiveLayoutCols * 3
    // Total cells down = effectiveLayoutRows * 3
    const potentialCellSizeByWidth = availableWidth / (effectiveLayoutCols * 3);
    const potentialCellSizeByHeight = availableHeight / (effectiveLayoutRows * 3);

    const cellSize = Math.min(potentialCellSizeByWidth, potentialCellSizeByHeight) * 0.9; // Use 90% to add some margin around the entire structure
    const groupSize = cellSize * 3; // Each remainder group is a 3x3 grid of cells

    // Calculate total drawing dimensions for centering
    const totalDrawingWidth = effectiveLayoutCols * groupSize + (effectiveLayoutCols - 1) * PADDING_BETWEEN_GROUPS;
    const totalDrawingHeight = effectiveLayoutRows * groupSize + (effectiveLayoutRows - 1) * PADDING_BETWEEN_GROUPS; // Corrected to use PADDING_BETWEEN_GROUPS

    // Calculate initial offset to center the entire 9-net drawing
    const initialOffsetX = -totalDrawingWidth / 2;
    const initialOffsetY = -totalDrawingHeight / 2;

    // Store the final number for each cell (remainder, cellX, cellY)
    // This ensures only the last number to occupy a cell is drawn, matching the image.
    const cellContents = {}; // Structure: {remainder: {cellY: {cellX: num}}}

    // Process the sequence to determine the final content of each cell
    for (let i = 0; i < sequence.length; i++) {
        const num = sequence[i];
        const remainder = num % 9;
        const cellInGroupX = (num % 3);
        // Invert cellY to match the image's vertical arrangement
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
function calculateCollatzSequence(startN, maxIterations, x_param, y_param, z_param) {
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
function isLight(color) {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    return luminance > 0.5;
}


// === Constants for 9-Net Dimensions ===
const FACE_SIZE = 30; // Size of each small square face
const PADDING = 10; // Padding around the entire 9-net
const STEP_SIZE = 3; // Number of small squares per 'face' side (3x3 grid)

// Total internal drawing dimensions for a complete 9-net
const NINE_NET_DRAW_WIDTH = (4 * STEP_SIZE * FACE_SIZE) + (2 * PADDING); // 4 faces horizontally * 3 squares/face * 30px/square + 2*10px padding
const NINE_NET_DRAW_HEIGHT = (3 * STEP_SIZE * FACE_SIZE) + (2 * PADDING); // 3 faces vertically * 3 squares/face * 30px/square + 2*10px padding


// Function to render the 9-net
/**
 * Draws the 9-net visualization of the sequence on a canvas.
 * @param {HTMLCanvasElement} canvas - The canvas element to draw on.
 * @param {Array<number>} sequence - The sequence of numbers to visualize.
 * @param {number} xVal - The X parameter used in the Collatz rule for color determination.
 * @param {string} divColor - Color for divisible numbers.
 * @param {string} mulColor - Color for multiply/add numbers.
 */
function drawNineNetCanvasSecondary(canvas, sequence, xVal, divColor, mulColor) {
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
