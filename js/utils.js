import { getExplorationSetting } from './state.js';

// ==========================================================
// Consolidate ALL Global Variable Declarations at the Top
// ==========================================================

export let DEFAULT_LINE_COLOR = '#34d399';
export let DEFAULT_NODE_COLOR = '#fb923c';
export const DEFAULT_NODE_BORDER_COLOR = '#f00';
export const DEFAULT_NODE_RADIUS = 5;

export let translateX = 0;
export let translateY = 0;
export let scale = 1;

// This variable now checks for the 'window' object, which makes the file testable.
export const dpi = (typeof window !== 'undefined') ? window.devicePixelRatio || 1 : 1;

export const PADDING_BETWEEN_GROUPS = 10;
export const MAX_ITERATIONS = 1000;
export const DEBUG_MODE = true;
export const DEFAULT_X_DIVISOR = 2;
export const DEFAULT_Y_MULTIPLIER = 3;
export const DEFAULT_Z_ADDER = 1;

// ==========================================================
// Core Collatz Calculation & Utilities (Pure Functions)
// ==========================================================

// Helper function to calculate mean
export function calculateMean(sequence) {
    if (sequence.length === 0) return 0;
    const sum = sequence.reduce((acc, val) => acc + val, 0);
    return sum / sequence.length;
}

// Helper function to calculate standard deviation
export function calculateStandardDeviation(sequence, mean) {
    if (sequence.length < 2) return 0;
    const variance = sequence.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / sequence.length;
    return Math.sqrt(variance);
}

// Helper function to calculate sum
export function calculateSum(sequence) {
    return sequence.reduce((acc, val) => acc + val, 0);
}

/**
 * Calculates the full generalized Collatz sequence and returns a detailed analysis object.
 * This is the unified function that combines core logic with statistical analysis.
 * @param {number} startN - The starting number.
 * @param {number} x_param - The divisor (for n/x).
 * @param {number} y_param - The multiplier (for yn + z).
 * @param {number} z_param - The adder (for yn + z).
 * @param {number} maxIterations - The maximum number of steps to take.
 * @returns {object} An object containing the sequence and all its statistical properties.
 */
export function calculateCollatzSequence(startN, x_param, y_param, z_param, maxIterations = MAX_ITERATIONS) {
    let sequence = [startN];
    let current = startN;
    let steps = 0;
    let odd_operations = 0;
    let maxVal = startN;
    let minVal = startN;
    let paradoxicalOccurrences = [];
    let firstDescentStep = 'N/A';
    let stoppingTime_t = 'N/A';
    let tau = 'N/A'; // coefficient stopping time: first j with Y^q / X^(j-q) < 1

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

        // Paradoxical (Terras): coefficient Y^q / X^(j-q) < 1 while the value is still >= startN.
        // Only the j-q division steps divide by X. Logs avoid overflow on long runs.
        if (tau === 'N/A' && Math.abs(x_param) > 1 && y_param !== 0) {
            const logCoefficient = odd_operations * Math.log(Math.abs(y_param)) - (steps - odd_operations) * Math.log(Math.abs(x_param));
            if (logCoefficient < 0) {
                tau = steps; // coefficient stopping time
                if (firstDescentStep === 'N/A' && Number.isFinite(current) && current >= startN) {
                    paradoxicalOccurrences.push({ value: current, step: steps, reason: "Coefficient < 1 while value >= start" });
                }
            }
        }
        
        // This check handles numbers that grow too large or go to zero
        if (!Number.isFinite(current) || Math.abs(current) > Number.MAX_SAFE_INTEGER || (!exploreNegativeNumbers && current <= 0)) {
            let errorType = "Exceeded Max Safe Integer";
            if (!exploreNegativeNumbers && current <= 0) errorType = "Reached Non-Positive Value";
            
            const finalSum = calculateSum(sequence);
            const finalMean = calculateMean(sequence);
            const finalStdDev = calculateStandardDeviation(sequence, finalMean);

            return {
                startN, sequence: sequence, steps: steps, maxVal: maxVal, minVal: minVal, sumVal: finalSum,
                avgVal: finalMean, stdDev: finalStdDev, type: errorType, converges_to_1: false, stoppingTime_t, coefficientStoppingTime_tau: tau, oddSteps_q: odd_operations, paradoxicalOccurrences, firstDescentStep
            };
        }

        // This check handles cycles
        if (sequence.includes(current)) {
            paradoxicalOccurrences.push({ value: current, step: steps, reason: "Cycle detected" });
            
            const finalSum = calculateSum(sequence);
            const finalMean = calculateMean(sequence);
            const finalStdDev = calculateStandardDeviation(sequence, finalMean);

            return {
                startN, sequence: sequence, steps: steps, maxVal: maxVal, minVal: minVal, sumVal: finalSum,
                avgVal: finalMean, stdDev: finalStdDev, type: "Cycle Detected", converges_to_1: false, stoppingTime_t, coefficientStoppingTime_tau: tau, oddSteps_q: odd_operations, paradoxicalOccurrences, firstDescentStep
            };
        }

        sequence.push(current);

        if (current > maxVal) maxVal = current;
        if (current < minVal) minVal = current;
    }

    if (current === 1) {
        let finalSequence = sequence;
        if (finalSequence[finalSequence.length - 1] !== 1) {
             finalSequence.push(1);
        }
        stoppingTime_t = steps;
        
        const finalSum = calculateSum(finalSequence);
        const finalMean = calculateMean(finalSequence);
        const finalStdDev = calculateStandardDeviation(finalSequence, finalMean);

        return {
            startN, sequence: finalSequence, steps: steps, maxVal: maxVal, minVal: minVal, sumVal: finalSum,
            avgVal: finalMean, stdDev: finalStdDev, type: "Converges to 1", converges_to_1: true,
            x_param: x_param, y_param: y_param, z_param: z_param,
            stoppingTime_t: stoppingTime_t,
            coefficientStoppingTime_tau: tau, oddSteps_q: odd_operations,
            paradoxicalOccurrences: paradoxicalOccurrences,
            firstDescentStep: firstDescentStep
        };
    } else { // Max iterations reached
        const finalSum = calculateSum(sequence);
        const finalMean = calculateMean(sequence);
        const finalStdDev = calculateStandardDeviation(sequence, finalMean);

        return {
            startN, sequence: sequence, steps: steps, maxVal: maxVal, minVal: minVal, sumVal: finalSum,
            avgVal: finalMean, stdDev: finalStdDev, type: "Max Iterations Reached", converges_to_1: false,
            x_param: x_param, y_param: y_param, z_param: z_param,
            stoppingTime_t: 'N/A',
            coefficientStoppingTime_tau: tau, oddSteps_q: odd_operations,
            paradoxicalOccurrences: paradoxicalOccurrences,
            firstDescentStep: firstDescentStep
        };
    }
}

// Remaining utility functions...
export function formatSequenceOutput(sequence) {
    if (!sequence || sequence.length === 0) return "No sequence to display.";
    const maxItems = 100;
    let output = sequence.slice(0, maxItems).join(', ');
    if (sequence.length > maxItems) {
        output += '... (sequence truncated for display)';
    }
    return `[${output}]`;
}

export function hexToRgb(hex) {
    if (/^#[0-9a-f]{3}$/i.test(hex)) {
        hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
    }
    const r = parseInt(hex.substring(1, 3), 16);
    const g = parseInt(hex.substring(3, 5), 16);
    const b = parseInt(hex.substring(5, 7), 16);
    return { r, g, b };
}

export function isLight(hexColor) {
    const rgb = hexToRgb(hexColor);
    const hsp = Math.sqrt(
        0.299 * (rgb.r * rgb.r) +
        0.587 * (rgb.g * rgb.g) +
        0.114 * (rgb.b * rgb.b)
    );
    return hsp > 180;
}

export function getUrlParams() {
    const params = {};
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    for (const [key, value] of urlParams) {
        params[key] = value;
    }
    return params;
}

// ==========================================================
// UI & Canvas Utilities (Impure Functions)
// ==========================================================

let messageTimer = null;
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
    else typeClass = 'bg-blue-500';
    messageArea.className = `${initialClasses} ${typeClass}`;
    messageArea.classList.remove('hidden');
    messageTimer = setTimeout(() => {
        messageArea.classList.add('hidden');
    }, duration);
}

export const displayMessage = showMessage;

export function saveToHistory(data) {
    const historyContainer = document.getElementById('runsHistory');
    if (!historyContainer) return;
    const historyItem = document.createElement('div');
    historyItem.className = "bg-blue-800 bg-opacity-40 p-3 rounded-xl mb-3 border border-blue-600 shadow-md transition-all duration-300 ease-in-out hover:scale-[1.01] hover:bg-opacity-50";
    const itemHtml = `
        <h4 class="text-lg font-bold text-blue-200 mb-1">Run: n=${data.startN}, (X=${data.x}, Y=${data.y}, Z=${data.z})</h4>
        <p class="text-blue-300 text-sm">Steps: ${data.steps} | Type: ${data.type}</p>
        <p class="text-blue-300 text-sm">Range: [${data.minVal} to ${data.maxVal}] | Avg: ${data.avgVal.toFixed(2)}</p>
        <p class="text-blue-300 text-xs mt-2">
            <strong>Stopping Times</strong>: t=${data.stoppingTime_t ?? 'N/A'} | τ=${data.coefficientStoppingTime_tau ?? 'N/A'}
        </p>
    `;
    historyItem.innerHTML = itemHtml;
    historyContainer.prepend(historyItem);
    if (typeof MathJax !== 'undefined') {
        MathJax.typesetPromise([historyItem]);
    }
}

export function generateLinkURL(visualizationKey, params = {}) {
    const baseUrl = window.location.origin + window.location.pathname;
    const urlMap = {
        'collatz-dragon': 'collatz-dragon.html',
        'boxviewer': 'box-universe-viewer.html',
        'slicer3d_fps': 'box-universe-fps.html',
        'collatz-lines-explorer': 'collatz-lines-explorer.html',
        'slicer2d': 'slicer.html',
        'radial-animator': 'radial-animator.html',
        'radial-viewer': 'radial-viewer.html',
        'index': 'index.html'
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

export const updateGoldStar = updateGoldStarVisibility;
export const updateGoldStarVisibilitySlicer = updateGoldStarVisibility;

// ==========================================================
// 9-net: an unfolded cube. Six 3x3 faces laid out as a cross,
//
//          [top]
//   [left][front][right][back]
//          [bottom]
//
// filled with the sequence in order (face by face, row by row), up to 54 numbers.
// Restores the layout from before the 2025-08-17 refactor (cd11469).
// ==========================================================
export const FACE_SIZE = 30;  // side of one small square, at the default canvas size
export const PADDING = 10;    // margin around the whole net
export const STEP_SIZE = 3;   // squares per face side (3x3 faces)
export const NINE_NET_FACES = [
    { r: 0, c: 1, name: 'top' },
    { r: 1, c: 0, name: 'left' },
    { r: 1, c: 1, name: 'front' },
    { r: 1, c: 2, name: 'right' },
    { r: 1, c: 3, name: 'back' },
    { r: 2, c: 1, name: 'bottom' },
];
export const NINE_NET_CAPACITY = NINE_NET_FACES.length * STEP_SIZE * STEP_SIZE; // 54
export const NINE_NET_DRAW_WIDTH = (4 * STEP_SIZE * FACE_SIZE) + (2 * PADDING);  // 380
export const NINE_NET_DRAW_HEIGHT = (3 * STEP_SIZE * FACE_SIZE) + (2 * PADDING); // 290

/**
 * Pure layout for the unfolded-cube 9-net: where each sequence number goes.
 * @returns {Array<{x:number, y:number, size:number, face:string, index:number, value:(number|undefined)}>}
 */
export function nineNetCells(sequence, width = NINE_NET_DRAW_WIDTH, height = NINE_NET_DRAW_HEIGHT) {
    // Scale squares so the 12-wide by 9-tall net fits the canvas, then centre it.
    const size = Math.max(0, Math.min((width - 2 * PADDING) / (4 * STEP_SIZE), (height - 2 * PADDING) / (3 * STEP_SIZE)));
    const offsetX = (width - 4 * STEP_SIZE * size) / 2;
    const offsetY = (height - 3 * STEP_SIZE * size) / 2;
    const cells = [];
    let index = 0;
    for (const face of NINE_NET_FACES) {
        for (let row = 0; row < STEP_SIZE; row++) {
            for (let col = 0; col < STEP_SIZE; col++) {
                cells.push({
                    x: offsetX + (face.c * STEP_SIZE + col) * size,
                    y: offsetY + (face.r * STEP_SIZE + row) * size,
                    size,
                    face: face.name,
                    index,
                    value: index < sequence.length ? sequence[index] : undefined,
                });
                index++;
            }
        }
    }
    return cells;
}

export function drawNineNetCanvasSecondary(canvas, sequence, xVal, divColor, mulColor) {
    if (!canvas || !canvas.getContext || !canvas.getContext('2d')) {
        if (DEBUG_MODE) console.error("Canvas element not found for 9-net drawing.");
        return;
    }
    const ctx = canvas.getContext('2d');
    const seq = sequence || [];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const cells = nineNetCells(seq, canvas.width, canvas.height);

    for (const cell of cells) {
        const hasValue = cell.value !== undefined;
        const color = hasValue ? ((cell.value % xVal === 0) ? divColor : mulColor) : '#444';
        ctx.fillStyle = color;
        ctx.fillRect(cell.x, cell.y, cell.size, cell.size);
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 1;
        ctx.strokeRect(cell.x, cell.y, cell.size, cell.size);
        if (hasValue) {
            // Shrink the font for long numbers so they stay inside the square.
            const digits = String(cell.value).length;
            const fontSize = Math.max(6, Math.min(cell.size * 0.45, (cell.size * 1.7) / digits));
            ctx.fillStyle = isLight(color) ? '#000' : '#fff';
            ctx.font = `${fontSize}px Inter, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(cell.value), cell.x + cell.size / 2, cell.y + cell.size / 2);
        }
    }

    // Heavier outline around each cube face so the six faces read clearly.
    const faceSide = (cells[0]?.size || 0) * STEP_SIZE;
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 2;
    for (let f = 0; f < NINE_NET_FACES.length; f++) {
        const first = cells[f * STEP_SIZE * STEP_SIZE];
        ctx.strokeRect(first.x, first.y, faceSide, faceSide);
    }
}

export function render9Net(canvas, sequence, divColor, mulColor, faceDefinitions = null, xVal = DEFAULT_X_DIVISOR) {
    if (!canvas || !canvas.getContext || !canvas.getContext('2d')) {
        if (DEBUG_MODE) console.error("Canvas element not found for 9-net rendering.");
        return;
    }
    drawNineNetCanvasSecondary(canvas, sequence, xVal, divColor, mulColor);
}
/*

**
 * Draws the Collatz sequence as a chain and a necklace on a canvas.
 * @param {HTMLCanvasElement} canvas - The canvas element to draw on.
 * @param {Object} data - The sequence data object from calculateCollatzSequence.
 */
export function drawNecklaceCanvas(canvas, data) {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const sequence = data.sequence;
    const isCycle = data.type === "Cycle Detected";
    
    // Check if the cycle point exists
    let necklaceStartIndex = -1;
    if (isCycle) {
      // Find the index where the sequence repeats
      // The repeated value isn't pushed onto the sequence; it's recorded in paradoxicalOccurrences.
      const cycleEntry = (data.paradoxicalOccurrences || []).find(o => o.reason === "Cycle detected");
      const repeated = cycleEntry ? cycleEntry.value : sequence[sequence.length - 1];
      for (let i = 0; i < sequence.length; i++) {
        if (sequence[i] === repeated) {
          necklaceStartIndex = i;
          break;
        }
      }
    }
    
    const nodeRadius = 10;
    const lineLength = 50;
    const startX = 50;
    const startY = canvas.height / 2;

    let currentX = startX;
    let currentY = startY;

    // Draw the nodes and lines
    for (let i = 0; i < sequence.length; i++) {
        const num = sequence[i];

        // Calculate position for the current node
        const nodeX = currentX;
        const nodeY = currentY;

        // Draw the line to the next node (if it exists)
        if (i < sequence.length - 1) {
            ctx.beginPath();
            ctx.moveTo(nodeX + nodeRadius, nodeY);
            ctx.lineTo(currentX + lineLength, currentY);
            ctx.strokeStyle = '#555';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Draw the node (a circle)
        ctx.beginPath();
        ctx.arc(nodeX, nodeY, nodeRadius, 0, 2 * Math.PI);
        ctx.fillStyle = (isCycle && necklaceStartIndex >= 0 && i >= necklaceStartIndex) ? '#34d399' : '#fb923c'; // Green for necklace, orange for chain
        ctx.fill();
        ctx.strokeStyle = '#f00';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw the number text inside the node
        ctx.fillStyle = isLight(ctx.fillStyle) ? '#000' : '#fff';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(num.toString(), nodeX, nodeY);
        
        // Move to the next position
        currentX += lineLength;
        // Simple line drawing. For more complex visualizations, you'd need to adjust Y as well to prevent going off-screen.
    }
}