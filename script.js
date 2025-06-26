// Default canvas colors - These initialize the colors when the page loads
window.divColor = "#34d399";
window.mulColor = "#fb923c";

// === Constants for 9-Net Dimensions ===
const FACE_SIZE = 30;
const PADDING = 10;
const STEP_SIZE = 3;

const NINE_NET_DRAW_WIDTH = (4 * STEP_SIZE * FACE_SIZE) + (2 * PADDING);
const NINE_NET_DRAW_HEIGHT = (3 * STEP_SIZE * FACE_SIZE) + (2 * PADDING);

// === Generalized Collatz function ===
const sequence = (num, x, y, z, maxiterations) => {
    if (x === 0) {
        return { sequence: [], type: "error", message: "X cannot be zero for the division rule." };
    }
    const output = [];
    output.push(num);
    let iterations = 0;
    const visitedNumbersMap = new Map();
    visitedNumbersMap.set(num, 0);

    let minVal = num;
    let maxVal = num;
    let sumVal = num;

    while (num !== 1 && iterations < maxiterations) {
        if (Math.abs(num) > Number.MAX_SAFE_INTEGER || !Number.isFinite(num)) {
            const avgVal = sumVal / (iterations + 1);
            let stdDevVal = 0;
            if (output.length > 1) {
                const mean = avgVal;
                const sumOfSquaredDifferences = output.reduce((acc, val) => {
                    const diff = val - mean;
                    const squaredDiff = diff * diff;
                    if (!Number.isFinite(squaredDiff) || acc > Number.MAX_SAFE_INTEGER - squaredDiff) {
                        return Number.MAX_SAFE_INTEGER;
                    }
                    return acc + squaredDiff;
                }, 0);

                if (sumOfSquaredDifferences === Number.MAX_SAFE_INTEGER) {
                    stdDevVal = "Too Large";
                } else {
                    const variance = sumOfSquaredDifferences / output.length;
                    const stdDev = Math.sqrt(variance);
                    if (!Number.isFinite(stdDev) || stdDev > Number.MAX_SAFE_INTEGER) {
                        stdDevVal = "Too Large";
                    } else {
                        stdDevVal = stdDev;
                    }
                }
            }
            return { sequence: output, type: "exceeded_max_safe_integer", steps: iterations, finalNum: num, minVal: minVal, maxVal: maxVal, sumVal: sumVal, avgVal: avgVal, stdDev: stdDevVal };
        }

        let next_num;
        if (num % Math.abs(x) === 0) {
            next_num = num / x;
        } else {
            next_num = (Math.abs(y) || 3) * num + (z || 1);
        }

        if (!Number.isFinite(next_num) || Math.abs(next_num) > Number.MAX_SAFE_INTEGER) {
            const avgVal = sumVal / (iterations + 1);
            let stdDevVal = 0;
            if (output.length > 1) {
                const mean = avgVal;
                const sumOfSquaredDifferences = output.reduce((acc, val) => {
                    const diff = val - mean;
                    const squaredDiff = diff * diff;
                    if (!Number.isFinite(squaredDiff) || acc > Number.MAX_SAFE_INTEGER - squaredDiff) {
                        return Number.MAX_SAFE_INTEGER;
                    }
                    return acc + squaredDiff;
                }, 0);

                if (sumOfSquaredDifferences === Number.MAX_SAFE_INTEGER) {
                    stdDevVal = "Too Large";
                } else {
                    const variance = sumOfSquaredDifferences / output.length;
                    const stdDev = Math.sqrt(variance);
                    if (!Number.isFinite(stdDev) || stdDev > Number.MAX_SAFE_INTEGER) {
                        stdDevVal = "Too Large";
                    } else {
                        stdDevVal = stdDev;
                    }
                }
            }
            return { sequence: output, type: "exceeded_max_safe_integer", steps: iterations, finalNum: num, minVal: minVal, maxVal: maxVal, sumVal: sumVal, avgVal: avgVal, stdDev: stdDevVal };
        }

        minVal = Math.min(minVal, next_num);
        maxVal = Math.max(maxVal, next_num);
        
        if (sumVal > Number.MAX_SAFE_INTEGER - Math.abs(next_num)) {
            sumVal = Number.MAX_SAFE_INTEGER;
        } else {
            sumVal += next_num;
        }

        if (visitedNumbersMap.has(next_num)) {
            const avgVal = sumVal / (iterations + 1);
            let stdDevVal = 0;
            if (output.length > 1) {
                const mean = avgVal;
                const sumOfSquaredDifferences = output.reduce((acc, val) => {
                    const diff = val - mean;
                    const squaredDiff = diff * diff;
                    if (!Number.isFinite(squaredDiff) || acc > Number.MAX_SAFE_INTEGER - squaredDiff) {
                        return Number.MAX_SAFE_INTEGER;
                    }
                    return acc + squaredDiff;
                }, 0);

                if (sumOfSquaredDifferences === Number.MAX_SAFE_INTEGER) {
                    stdDevVal = "Too Large";
                } else {
                    const variance = sumOfSquaredDifferences / output.length;
                    const stdDev = Math.sqrt(variance);
                    if (!Number.isFinite(stdDev) || stdDev > Number.MAX_SAFE_INTEGER) {
                        stdDevVal = "Too Large";
                    } else {
                        stdDevVal = stdDev;
                    }
                }
            }
            const cycleStartIndex = visitedNumbersMap.get(next_num);
            const cycle = output.slice(cycleStartIndex);
            return { sequence: output, type: "cycle", steps: iterations + 1, cycle: cycle, minVal: minVal, maxVal: maxVal, sumVal: sumVal, avgVal: avgVal, stdDev: stdDevVal };
        }
        visitedNumbersMap.set(next_num, output.length);

        num = next_num;
        output.push(num);
        iterations++;
    }

    const avgVal = sumVal / (iterations + 1);
    let stdDevVal = 0;
    if (output.length > 1) {
        const mean = avgVal;
        const sumOfSquaredDifferences = output.reduce((acc, val) => {
            const diff = val - mean;
            const squaredDiff = diff * diff;
            if (!Number.isFinite(squaredDiff) || acc > Number.MAX_SAFE_INTEGER - squaredDiff) {
                return Number.MAX_SAFE_INTEGER;
            }
            return acc + squaredDiff;
        }, 0);

        if (sumOfSquaredDifferences === Number.MAX_SAFE_INTEGER) {
            stdDevVal = "Too Large";
        } else {
            const variance = sumOfSquaredDifferences / output.length;
            const stdDev = Math.sqrt(variance);
            if (!Number.isFinite(stdDev) || stdDev > Number.MAX_SAFE_INTEGER) {
                stdDevVal = "Too Large";
            } else {
                stdDevVal = stdDev;
            }
        }
    }

    if (num === 1) {
        return { sequence: output, type: "converges_to_1", steps: iterations, minVal: minVal, maxVal: maxVal, sumVal: sumVal, avgVal: avgVal, stdDev: stdDevVal };
    } else {
        return { sequence: output, type: "reached_max_iterations", steps: iterations, finalNum: num, minVal: minVal, maxVal: maxVal, sumVal: sumVal, avgVal: avgVal, stdDev: stdDevVal };
    }
};

// === drawNineNetCanvas function ===
function drawNineNetCanvas(canvas, sequence, xVal, divColor, mulColor) {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const faceSize = FACE_SIZE;
    const padding = PADDING;
    const stepSize = STEP_SIZE;

    const layout = [
        { r: 0, c: 1 }, // Top
        { r: 1, c: 0 }, // Left
        { r: 1, c: 1 }, // Center-Left (main sequence starts here)
        { r: 1, c: 2 }, // Center
        { r: 1, c: 3 }, // Center-Right
        { r: 2, c: 1 }  // Bottom
    ];

    let sequenceIndex = 0;

    for (const pos of layout) {
        for (let i = 0; i < stepSize; i++) {
            for (let j = 0; j < stepSize; j++) {
                const x = padding + (pos.c * stepSize + j) * faceSize;
                const y = padding + (pos.r * stepSize + i) * faceSize;

                let color = "#444";
                let label = "";

                if (sequenceIndex < sequence.length) {
                    const val = sequence[sequenceIndex];
                    if (val % Math.abs(xVal) === 0) {
                        color = divColor;
                    } else {
                        color = mulColor;
                    }
                    label = val.toString();

                    const maxChars = 5;
                    if (label.length > maxChars) {
                        const start = label.substring(0, Math.ceil((maxChars - 3) / 2));
                        const end = label.substring(label.length - Math.floor((maxChars - 3) / 2));
                        label = start + "..." + end;
                    }
                }

                ctx.fillStyle = color;
                ctx.fillRect(x, y, faceSize - 2, faceSize - 2);

                if (label) {
                    ctx.fillStyle = "#FFF";
                    let currentFontSize = 10;
                    if (label.length > 7) {
                        currentFontSize = 6;
                    } else if (label.length > 5) {
                        currentFontSize = 8;
                    }
                    ctx.font = `${currentFontSize}px Arial`;
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillText(label, x + faceSize / 2 - 1, y + faceSize / 2 - 1);
                }

                sequenceIndex++;
            }
        }
    }
}

// Function to update the gold star visibility
function updateGoldStarVisibility() {
    const xVal = parseInt(document.getElementById('xValue').value);
    const yVal = parseInt(document.getElementById('yValue').value);
    const zVal = parseInt(document.getElementById('zValue').value);

    const xStar = document.getElementById('x-star');
    const yStar = document.getElementById('y-star');
    const zStar = document.getElementById('z-star');

    if (xStar) xStar.style.display = (xVal === 2) ? 'inline-block' : 'none';
    if (yStar) yStar.style.display = (yVal === 3) ? 'inline-block' : 'none';
    if (zStar) zStar.style.display = (zVal === 1) ? 'inline-block' : 'none';
}

let calculatedRuns = []; // Global array to store runs

/**
 * Helper function to validate a single number input.
 * @param {string} value - The input string value.
 * @param {string} name - The name of the input for error messages.
 * @param {boolean} allowZero - Whether zero is a valid input.
 * @returns {string|null} Error message if invalid, otherwise null.
 */
const validateNumberInput = (value, name, allowZero = false) => {
    const num = parseInt(value, 10);
    if (isNaN(num) || (!allowZero && num === 0) || !Number.isInteger(num)) {
        return `${name} must be a valid integer${allowZero ? '' : ' (non-zero)'}.`;
    }
    return null; // No error
};

/**
 * Renders the calculated runs into the history display.
 */
const renderHistory = () => {
    const runsHistoryDiv = document.getElementById('runsHistory');
    const historyContainer = document.getElementById('historyContainer');

    if (!runsHistoryDiv || !historyContainer) {
        console.error("History elements not found. Cannot render history.");
        return;
    }

    runsHistoryDiv.innerHTML = ''; // Clear previous history

    if (calculatedRuns.length === 0) {
        historyContainer.classList.add('hidden');
        return;
    } else {
        historyContainer.classList.remove('hidden');
    }

    // Iterate in reverse to show newest runs at the top
    for (let i = calculatedRuns.length - 1; i >= 0; i--) {
        const run = calculatedRuns[i];
        const runDiv = document.createElement('div');
        runDiv.className = 'bg-blue-800 bg-opacity-40 rounded-lg p-4 mb-4 border border-blue-600 last:mb-0';

        const title = document.createElement('h3');
        title.className = 'text-xl font-bold text-blue-200 mb-2';
        title.textContent = `N=${run.startNum}, X=${run.X}, Y=${run.Y}, Z=${run.Z}`;
        runDiv.appendChild(title);

        const stepsInfo = document.createElement('p');
        stepsInfo.className = 'text-blue-300 mb-2';
        let typeText = run.type.replace(/_/g, ' ');

        if (run.type === "reached_max_iterations") {
            typeText += ` - Ended at ${run.finalNum}`;
        } else if (run.type === "exceeded_max_safe_integer") {
            typeText += ` - Ended at ${run.finalNum}`;
        } else if (run.type === "cycle") {
            typeText += ` - Cycle: ${run.cycle.join(' → ')}`;
        }
        stepsInfo.textContent = `Steps: ${run.steps} (Type: ${typeText})`;
        runDiv.appendChild(stepsInfo);

        // Add stats only if available and not an error type
        if (run.type !== "error") {
            const statsP = document.createElement('p');
            statsP.className = 'text-blue-100 text-sm mt-1';
            statsP.innerHTML = `
                Min: ${run.minVal.toLocaleString()}, Max: ${run.maxVal.toLocaleString()}<br>
                Sum: ${typeof run.sumVal === 'number' ? run.sumVal.toLocaleString() : run.sumVal}, 
                Avg: ${typeof run.avgVal === 'number' ? run.avgVal.toFixed(2) : 'N/A'}, 
                StdDev: ${typeof run.stdDev === 'number' ? run.stdDev.toFixed(2) : run.stdDev}
            `;
            runDiv.appendChild(statsP);
        }

        // Append the canvas for this run
        const canvasId = `historyCanvas-${i}`;
        const historyCanvas = document.createElement('canvas');
        historyCanvas.id = canvasId;
        historyCanvas.width = NINE_NET_DRAW_WIDTH;
        historyCanvas.height = NINE_NET_DRAW_HEIGHT;
        historyCanvas.className = 'bg-blue-900 bg-opacity-60 rounded-md mt-4 border border-blue-700';
        runDiv.appendChild(historyCanvas);

        runsHistoryDiv.appendChild(runDiv);

        // Draw on the newly created canvas
        if (run.sequence && run.sequence.length > 0) {
            drawNineNetCanvas(historyCanvas, run.sequence, run.X, window.divColor, window.mulColor);
        }
    }
};

// Function to update the display for a single sequence run
function updateSingleSequenceStats(stats) {
    document.getElementById('stat-steps').textContent = stats.steps.toLocaleString();
    let typeText = stats.type.replace(/_/g, ' ');
    if (stats.type === "reached_max_iterations" || stats.type === "exceeded_max_safe_integer") {
        typeText += ` (Ended at ${stats.finalNum.toLocaleString()})`;
    } else if (stats.type === "cycle") {
        typeText += ` (Cycle: ${stats.cycle.join(' → ')})`;
    } else if (stats.type === "error") {
        typeText += ` (${stats.message})`;
    }
    document.getElementById('stat-type').textContent = typeText;
    document.getElementById('stat-min').textContent = stats.minVal.toLocaleString();
    document.getElementById('stat-max').textContent = stats.maxVal.toLocaleString();
    document.getElementById('stat-sum').textContent = typeof stats.sumVal === 'number' ? stats.sumVal.toLocaleString() : stats.sumVal;
    document.getElementById('stat-avg').textContent = typeof stats.avgVal === 'number' ? stats.avgVal.toFixed(2) : 'N/A';
    document.getElementById('stat-stddev').textContent = typeof stats.stdDev === 'number' ? stats.stdDev.toFixed(2) : stats.stdDev;

    // Show the single sequence stats div
    document.getElementById('singleSequenceStats').classList.remove('hidden');
}

// Event Listener for the Single Sequence Calculation
document.getElementById('calculateSingle').addEventListener('click', () => {
    const startNumber = parseInt(document.getElementById('startNumber').value);
    const xValue = parseInt(document.getElementById('xValue').value);
    const yValue = parseInt(document.getElementById('yValue').value);
    const zValue = parseInt(document.getElementById('zValue').value);
    const errorMessageElement = document.getElementById('errorMessage');
    const singleSequenceCanvas = document.getElementById('singleNineNetCanvas');

    errorMessageElement.textContent = ''; // Clear previous error messages
    document.getElementById('singleSequenceStats').classList.add('hidden'); // Hide stats until calculated
    
    // Validate inputs
    let error = validateNumberInput(startNumber, "Starting Number", true); // Allow 0 for start number, though sequence handles it
    if (!error) error = validateNumberInput(xValue, "X (Divisor)");
    if (!error) error = validateNumberInput(yValue, "Y (Multiplier)", true);
    if (!error) error = validateNumberInput(zValue, "Z (Additive Constant)", true);

    if (error) {
        errorMessageElement.textContent = error;
        singleSequenceCanvas.getContext('2d').clearRect(0, 0, singleSequenceCanvas.width, singleSequenceCanvas.height); // Clear canvas on error
        return;
    }

    // Define a maxIterations for single calculations. Can be larger than bulk.
    const MAX_ITERATIONS_SINGLE = 10000; 
    const result = sequence(startNumber, xValue, yValue, zValue, MAX_ITERATIONS_SINGLE);

    if (result.type === "error") {
        errorMessageElement.textContent = `Error: ${result.message}`;
        singleSequenceCanvas.getContext('2d').clearRect(0, 0, singleSequenceCanvas.width, singleSequenceCanvas.height);
        return;
    }

    updateSingleSequenceStats(result);

    // Draw 9-Net for the single sequence
    if (result.sequence && result.sequence.length > 0) {
        drawNineNetCanvas(singleSequenceCanvas, result.sequence, xValue, window.divColor, window.mulColor);
    } else {
        singleSequenceCanvas.getContext('2d').clearRect(0, 0, singleSequenceCanvas.width, singleSequenceCanvas.height);
    }

    // Add to history (only successful single runs)
    if (result.type !== "error") {
        result.startNum = startNumber;
        result.X = xValue;
        result.Y = yValue;
        result.Z = zValue;
        calculatedRuns.push(result);
        renderHistory();
    }
});

// Event Listener for Bulk Box Universe Generation
document.getElementById('generateBulk').addEventListener('click', async () => {
    const minX = parseInt(document.getElementById('xStart').value);
    const maxX = parseInt(document.getElementById('xEnd').value);
    const minY = parseInt(document.getElementById('yStart').value);
    const maxY = parseInt(document.getElementById('yEnd').value);
    const minZ = parseInt(document.getElementById('zStart').value);
    const maxZ = parseInt(document.getElementById('zEnd').value);
    const startNum = parseInt(document.getElementById('startNumber').value);
    const errorMessageElement = document.getElementById('errorMessage');
    const historyContainer = document.getElementById('historyContainer');
    const bulkSequenceStatsDiv = document.getElementById('bulkSequenceStats'); // Get the new stats div

    errorMessageElement.textContent = ''; // Clear any previous errors
    historyContainer.classList.add('hidden'); // Hide history initially for bulk
    bulkSequenceStatsDiv.classList.add('hidden'); // Hide bulk stats initially

    // Input validation for bulk range
    let error = null;
    if (isNaN(minX) || isNaN(maxX) || isNaN(minY) || isNaN(maxY) || isNaN(minZ) || isNaN(maxZ) || isNaN(startNum)) {
        error = "All range inputs and starting number must be valid integers.";
    } else if (minX > maxX || minY > maxY || minZ > maxZ) {
        error = "Start values cannot be greater than end values for X, Y, or Z ranges.";
    } else if (minX <= 0 || maxX <= 0) {
        error = "X values (divisor) must be non-zero (preferably positive for standard behavior).";
    } else if (startNum === 0) {
        error = "Starting number (n) cannot be zero.";
    }

    if (error) {
        errorMessageElement.textContent = error;
        return; // Stop execution if validation fails
    }

    calculatedRuns = []; // Clear previous runs for a new bulk calculation

    // Variables to collect data for bulk statistics
    const allSteps = [];
    const allMinVals = [];
    const allMaxVals = [];
    const allSumVals = [];
    const sequenceTypeCounts = {
        converges_to_1: 0,
        cycle: 0,
        exceeded_max_safe_integer: 0,
        reached_max_iterations: 0,
        error: 0 // In case of internal errors from the sequence function (e.g., X=0)
    };

    // The nested loops for bulk calculation
    for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
            for (let z = minZ; z <= maxZ; z++) {
                // Define a maxIterations for bulk calculations. Can be a fixed number or an input.
                const MAX_ITERATIONS = 5000; 

                const result = sequence(startNum, x, y, z, MAX_ITERATIONS);
                result.startNum = startNum; // Store original N for history
                result.X = x; // Store X, Y, Z for history
                result.Y = y;
                result.Z = z;
                calculatedRuns.push(result);

                // Collect data for bulk stats
                if (result.type !== "error") { // Only collect stats for valid runs
                    allSteps.push(result.steps);
                    allMinVals.push(result.minVal);
                    allMaxVals.push(result.maxVal);
                    // Ensure sumVal is a number before pushing, handle "Too Large" string
                    if (typeof result.sumVal === 'number') {
                        allSumVals.push(result.sumVal);
                    }
                }
                // Increment type count
                if (sequenceTypeCounts.hasOwnProperty(result.type)) {
                    sequenceTypeCounts[result.type]++;
                } else {
                    // Fallback for unexpected types
                    console.warn(`Unknown sequence type encountered: ${result.type}`);
                    sequenceTypeCounts.error++;
                }
            }
        }
    }

    renderHistory(); // Render the history after all calculations are done

    // Call a new function to update bulk stats
    updateBulkStatisticsDisplay(allSteps, allMinVals, allMaxVals, allSumVals, sequenceTypeCounts);
});

// NEW FUNCTION: updateBulkStatisticsDisplay
// This function will calculate and populate the bulk statistics div
function updateBulkStatisticsDisplay(allSteps, allMinVals, allMaxVals, allSumVals, sequenceTypeCounts) {
    const bulkSequenceStatsDiv = document.getElementById('bulkSequenceStats');
    if (!bulkSequenceStatsDiv) {
        console.error("Bulk stats display div not found.");
        return;
    }

    // Show the bulk stats div
    bulkSequenceStatsDiv.classList.remove('hidden');

    // Helper to calculate statistics
    const calculateStats = (arr) => {
        if (arr.length === 0) return { avg: 'N/A', min: 'N/A', max: 'N/A', stdDev: 'N/A' };

        const sum = arr.reduce((a, b) => a + b, 0);
        const avg = sum / arr.length;
        const min = Math.min(...arr);
        const max = Math.max(...arr);

        // Calculate standard deviation
        const sumOfSquaredDiffs = arr.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0);
        const stdDev = Math.sqrt(sumOfSquaredDiffs / arr.length);

        return { avg: avg, min: min, max: max, stdDev: stdDev };
    };

    const stepsStats = calculateStats(allSteps);
    const minValStats = calculateStats(allMinVals);
    const maxValStats = calculateStats(allMaxVals);
    const sumValStats = calculateStats(allSumVals);

    // Populate the HTML elements
    document.getElementById('bulk-total-sequences').textContent = allSteps.length.toLocaleString();
    document.getElementById('bulk-avg-steps').textContent = stepsStats.avg !== 'N/A' ? stepsStats.avg.toFixed(2) : 'N/A';
    document.getElementById('bulk-min-steps').textContent = stepsStats.min.toLocaleString();
    document.getElementById('bulk-max-steps').textContent = stepsStats.max.toLocaleString();
    document.getElementById('bulk-stddev-steps').textContent = stepsStats.stdDev !== 'N/A' ? stepsStats.stdDev.toFixed(2) : 'N/A';

    document.getElementById('bulk-avg-minval').textContent = minValStats.avg !== 'N/A' ? minValStats.avg.toFixed(2) : 'N/A';
    document.getElementById('bulk-min-minval').textContent = minValStats.min.toLocaleString();
    document.getElementById('bulk-max-minval').textContent = minValStats.max.toLocaleString();

    document.getElementById('bulk-avg-maxval').textContent = maxValStats.avg !== 'N/A' ? maxValStats.avg.toFixed(2) : 'N/A';
    document.getElementById('bulk-min-maxval').textContent = maxValStats.min.toLocaleString();
    document.getElementById('bulk-max-maxval').toLocaleString();

    document.getElementById('bulk-avg-sumval').textContent = sumValStats.avg !== 'N/A' ? sumValStats.avg.toFixed(2) : 'N/A';
    document.getElementById('bulk-min-sumval').textContent = sumValStats.min.toLocaleString();
    document.getElementById('bulk-max-sumval').textContent = sumValStats.max.toLocaleString();

    // Populate sequence type counts
    document.getElementById('bulk-type-convergent').textContent = sequenceTypeCounts.converges_to_1.toLocaleString();
    document.getElementById('bulk-type-cycle').textContent = sequenceTypeCounts.cycle.toLocaleString();
    document.getElementById('bulk-type-exceeded_max_safe_integer').textContent = sequenceTypeCounts.exceeded_max_safe_integer.toLocaleString();
    document.getElementById('bulk-type-reached_max_iterations').textContent = sequenceTypeCounts.reached_max_iterations.toLocaleString();
}


// Event listeners for color pickers
document.getElementById('divColorPicker').addEventListener('change', (event) => {
    window.divColor = event.target.value;
    // Redraw history if visible to apply new colors
    if (!document.getElementById('historyContainer').classList.contains('hidden')) {
        renderHistory();
    }
    // Redraw single sequence canvas if visible
    if (!document.getElementById('singleSequenceCanvas').classList.contains('hidden')) {
        const startNumber = parseInt(document.getElementById('startNumber').value);
        const xValue = parseInt(document.getElementById('xValue').value);
        const result = sequence(startNumber, xValue, 3, 1, 10000); // Re-calculate or use last result if available
        if (result.sequence) {
            drawNineNetCanvas(document.getElementById('singleNineNetCanvas'), result.sequence, xValue, window.divColor, window.mulColor);
        }
    }
});

document.getElementById('mulColorPicker').addEventListener('change', (event) => {
    window.mulColor = event.target.value;
    // Redraw history if visible to apply new colors
    if (!document.getElementById('historyContainer').classList.contains('hidden')) {
        renderHistory();
    }
    // Redraw single sequence canvas if visible
    if (!document.getElementById('singleNineNetCanvas').classList.contains('hidden')) {
        const startNumber = parseInt(document.getElementById('startNumber').value);
        const xValue = parseInt(document.getElementById('xValue').value);
        const result = sequence(startNumber, xValue, 3, 1, 10000); // Re-calculate or use last result if available
        if (result.sequence) {
            drawNineNetCanvas(document.getElementById('singleNineNetCanvas'), result.sequence, xValue, window.divColor, window.mulColor);
        }
    }
});

// Initial calls to set up
document.addEventListener('DOMContentLoaded', () => {
    updateGoldStarVisibility(); // Set initial star visibility
    // Add event listeners to input fields to update star visibility on change
    document.getElementById('xValue').addEventListener('input', updateGoldStarVisibility);
    document.getElementById('yValue').addEventListener('input', updateGoldStarVisibility);
    document.getElementById('zValue').addEventListener('input', updateGoldStarVisibility);

    // Initial clear for canvas and hide stats
    const singleSequenceCanvas = document.getElementById('singleNineNetCanvas');
    if (singleSequenceCanvas) {
        singleSequenceCanvas.getContext('2d').clearRect(0, 0, singleSequenceCanvas.width, singleSequenceCanvas.height);
    }
    document.getElementById('singleSequenceStats').classList.add('hidden');
    document.getElementById('historyContainer').classList.add('hidden'); // Ensure history is hidden on load
    document.getElementById('bulkSequenceStats').classList.add('hidden'); // Ensure bulk stats are hidden on load
});


// Navigation function for "Explore Other Tools" buttons
function navigateToProgram(page) {
    window.location.href = page;
}
