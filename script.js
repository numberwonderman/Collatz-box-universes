// ==========================================================
// Consolidate ALL Global Variable Declarations at the Top
// ==========================================================

// Default canvas colors (will be updated by color pickers)
// These match the default values in index.html for consistency
let DEFAULT_LINE_COLOR = '#0000ff'; // Blue - for divisible operation
let DEFAULT_NODE_COLOR = '#ffff00'; // Yellow - for multiply/add operation
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

// ==========================================================
// End of Global Variable Declarations
// ==========================================================

// Function to render the Unfolded Box (9-Net) visualization
// This function is intended for the main index.html page
function drawNineNetCanvas(data) {
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

    centerX = canvas.offsetWidth / 2;
    centerY = canvas.offsetHeight / 2;
    nodeRadius = DEFAULT_NODE_RADIUS; // Reset to default for new render

    ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight); // Clear the entire canvas

    ctx.save(); // Save the current canvas state (transforms)
    // Apply translation and scale AFTER calculating layout, so it works on the "unscaled" canvas dimensions
    ctx.translate(centerX + translateX, centerY + translateY);
    ctx.scale(scale, scale);

    const sequence = data.sequence; // Access sequence from data object
    const xValue = data.x_param; // Get xValue from data object (needed for divisibility check)

    const paddingBetweenBoxes = 10; // Padding between the large remainder boxes (faces)

    // Define the positions of the 9 "faces" on a 4x3 grid of `faceSize` blocks
    // This layout creates the "unfolded box" or "cross" shape
    const layout = [
        {r: 0, c: 1}, // Remainder 0: Top-middle face
        {r: 1, c: 0}, // Remainder 1: Middle-left face
        {r: 1, c: 1}, // Remainder 2: Center face
        {r: 1, c: 2}, // Remainder 3: Middle-right face
        {r: 1, c: 3}, // Remainder 4: Far-right face
        {r: 2, c: 1}, // Remainder 5: Bottom-middle face
        {r: 0, c: 2}, // Remainder 6: Top-right corner (of the cross shape)
        {r: 2, c: 0}, // Remainder 7: Bottom-left corner (of the cross shape)
        {r: 2, c: 2}  // Remainder 8: Bottom-right corner (of the cross shape)
    ];

    // Determine the effective grid dimensions for calculating face size
    const maxLayoutColIndex = Math.max(...layout.map(p => p.c));
    const maxLayoutRowIndex = Math.max(...layout.map(p => p.r));

    const effectiveLayoutCols = maxLayoutColIndex + 1; // e.g., 0,1,2,3 -> 4 columns
    const effectiveLayoutRows = maxLayoutRowIndex + 1; // e.g., 0,1,2 -> 3 rows

    // Calculate the size of each "face" (larger box) based on canvas dimensions
    const potentialFaceSizeByWidth = (canvas.offsetWidth / dpi - (effectiveLayoutCols - 1) * paddingBetweenBoxes) / effectiveLayoutCols;
    const potentialFaceSizeByHeight = (canvas.offsetHeight / dpi - (effectiveLayoutRows - 1) * paddingBetweenBoxes) / effectiveLayoutRows;

    const faceSize = Math.min(potentialFaceSizeByWidth, potentialFaceSizeByHeight) * 0.95; // Use 95% to add some margin

    // Calculate total drawing dimensions for centering
    const NINE_NET_TOTAL_DRAW_WIDTH = effectiveLayoutCols * faceSize + (effectiveLayoutCols - 1) * paddingBetweenBoxes;
    const NINE_NET_TOTAL_DRAW_HEIGHT = effectiveLayoutRows * faceSize + (effectiveLayoutRows - 1) * paddingBetweenBoxes;

    // Calculate initial offset to center the entire 9-net drawing
    const initialOffsetX = -NINE_NET_TOTAL_DRAW_WIDTH / 2;
    const initialOffsetY = -NINE_NET_TOTAL_DRAW_HEIGHT / 2;

    const remainderBoxCoords = {}; // Store coordinates for each remainder box
    for (let i = 0; i < layout.length; i++) {
        const pos = layout[i];
        const boxX = initialOffsetX + (pos.c * faceSize) + (pos.c * paddingBetweenBoxes);
        const boxY = initialOffsetY + (pos.r * faceSize) + (pos.r * paddingBetweenBoxes);
        remainderBoxCoords[i] = { x: boxX, y: boxY, width: faceSize, height: faceSize };

        // Draw outline for each remainder box
        ctx.beginPath();
        ctx.rect(boxX, boxY, faceSize, faceSize);
        ctx.strokeStyle = '#555'; // Gray outline
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    // Draw the sequence numbers within their respective remainder boxes
    for (let i = 0; i < sequence.length; i++) {
        const num = sequence[i];
        const remainder = num % 9; // Determine which of the 9 remainder boxes this number belongs to

        const box = remainderBoxCoords[remainder];
        if (box) { // If a valid box exists for this remainder
            // Set fill color based on divisibility by xValue
            if (num % xValue === 0) { // If divisible by X
                ctx.fillStyle = DEFAULT_LINE_COLOR; // Use the "Divisible Color"
            } else { // If not divisible by X
                ctx.fillStyle = DEFAULT_NODE_COLOR; // Use the "Multiply/Add Color"
            }
            ctx.fillRect(box.x, box.y, box.width, box.height); // Fill the box

            ctx.strokeStyle = DEFAULT_NODE_BORDER_COLOR; // Red border
            ctx.lineWidth = 1;
            ctx.strokeRect(box.x, box.y, box.width, box.height); // Draw border

            // Draw the number text
            ctx.fillStyle = '#000'; // Black text color
            ctx.font = `${Math.max(8, faceSize * 0.2)}px Arial`; // Dynamic font size
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(num.toString(), box.x + box.width / 2, box.y + box.height / 2);
        }
    }
    ctx.restore(); // Restore canvas state
}


// Collatz function as per user's definition
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
        paradoxicalOccurrences: paradoxicalOccurrences
    };
}

// Function to render the Radial 9-net (This is kept in case other pages use it, but not for index.html's main canvas)
function render9Net(data) {
    // This function is not primarily used by index.html's main canvas anymore,
    // but kept here in case other visualization pages link to this script.
    if (!canvas) {
        canvas = document.getElementById('singleNineNetCanvas');
        ctx = canvas.getContext('2d');
    }

    const dpi = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpi;
    canvas.height = canvas.offsetHeight * dpi;
    ctx.scale(dpi, dpi);

    centerX = canvas.offsetWidth / 2;
    centerY = canvas.offsetHeight / 2;
    nodeRadius = DEFAULT_NODE_RADIUS;

    ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

    ctx.save();
    ctx.translate(centerX + translateX, centerY + translateY);
    ctx.scale(scale, scale);

    const sequence = data.sequence;
    if (sequence.length < 2) {
        if (sequence.length === 1) {
            const num = sequence[0];
            ctx.beginPath();
            ctx.arc(0, 0, nodeRadius, 0, 2 * Math.PI);
            ctx.fillStyle = DEFAULT_NODE_COLOR;
            ctx.fill();
            ctx.strokeStyle = DEFAULT_NODE_BORDER_COLOR;
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.fillStyle = '#000';
            ctx.font = `${Math.max(8, nodeRadius * 0.8)}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(num, 0, 0);
        }
        ctx.restore();
        return;
    }

    const normalizedLength = Math.min(sequence.length, 100);
    nodeRadius = minNodeRadius + (maxNodeRadius - minNodeRadius) * (1 - normalizedLength / 100);
    let lineThickness = minLineThickness + (maxLineThickness - minLineThickness) * (1 - normalizedLength / 100);

    for (let i = 0; i < sequence.length - 1; i++) {
        const startNum = sequence[i];
        const endNum = sequence[i + 1];

        const startAngle = (startNum % 9) * (2 * Math.PI / 9);
        const startRadius = 50 + startNum * 0.1;

        const endAngle = (endNum % 9) * (2 * Math.PI / 9);
        const endRadius = 50 + endNum * 0.1;

        const x1 = startRadius * Math.cos(startAngle);
        const y1 = startRadius * Math.sin(startAngle);
        const x2 = endRadius * Math.cos(endAngle);
        const y2 = endRadius * Math.sin(endAngle);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = DEFAULT_LINE_COLOR;
        ctx.lineWidth = lineThickness;
        ctx.stroke();
    }

    for (let i = 0; i < sequence.length; i++) {
        const num = sequence[i];
        const angle = (num % 9) * (2 * Math.PI / 9);
        const radius = 50 + num * 0.1;

        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);

        ctx.beginPath();
        ctx.arc(x, y, nodeRadius, 0, 2 * Math.PI);
        ctx.fillStyle = DEFAULT_NODE_COLOR;
        ctx.fill();
        ctx.strokeStyle = DEFAULT_NODE_BORDER_COLOR;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#000';
        ctx.font = `${Math.max(8, nodeRadius * 0.8)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(num, x, y);
    }

    ctx.restore();
}

// Function to display single sequence statistics
function displaySequenceStats(data) {
    const currentSequenceDetails = document.getElementById('currentSequenceDetails');
    if (!currentSequenceDetails) {
        console.error("Element 'currentSequenceDetails' not found.");
        return;
    }

    document.getElementById('currentParams').textContent = `N=${data.startN}, X=${data.x_param}, Y=${data.y_param}, Z=${data.z_param}`;
    document.getElementById('currentSteps').textContent = data.steps.toLocaleString();
    document.getElementById('currentType').textContent = data.type;
    document.getElementById('currentMin').textContent = data.minVal.toLocaleString();
    document.getElementById('currentMax').textContent = data.maxVal.toLocaleString();
    document.getElementById('currentSum').textContent = data.sumVal.toLocaleString();
    document.getElementById('currentAvg').textContent = typeof data.avgVal === 'number' ? data.avgVal.toLocaleString(undefined, { maximumFractionDigits: 2 }) : data.avgVal;
    document.getElementById('currentStdDev').textContent = typeof data.stdDev === 'number' ? data.stdDev.toLocaleString(undefined, { maximumFractionDigits: 2 }) : data.stdDev;
    document.getElementById('currentStoppingTime').textContent = data.stoppingTime_t === 'N/A' ? 'N/A' : data.stoppingTime_t.toLocaleString();
    document.getElementById('currentIsParadoxical').textContent = data.paradoxicalOccurrences.length > 0 ? 'Yes' : 'No';
    document.getElementById('currentSequenceOutput').textContent = data.sequence.join(' → ');

    currentSequenceDetails.classList.remove('hidden');
}


// Function to display bulk universe statistics
function displayBulkUniverseStats(startN_fixed, maxIterations, xStart, xEnd, yStart, yEnd, zStart, zEnd) {
    const statsDiv = document.getElementById('bulkSequenceStats');
    if (!statsDiv) {
        console.error("Element 'bulkSequenceStats' not found.");
        return;
    }

    let totalSteps = 0;
    let maxOverallVal = 0;
    let minOverallVal = Infinity;
    let totalSumVals = 0;
    let totalSequencesCalculated = 0;

    let convergenceCount = 0;
    let cycleCount = 0;
    let exceededMaxCount = 0;
    let maxIterationsReachedCount = 0;
    let nonPositiveValueCount = 0;
    let invalidParamsCount = 0;

    let overallMaxStoppingTime_t = 0;
    let overallMaxCoefficientStoppingTime_tau = 0;
    let overallTotalParadoxicalOccurrences = 0;

    statsDiv.innerHTML = `
        <p class="font-semibold text-lg mb-2">Generating Universe Statistics... Please Wait.</p>
        <p>Processing: <span id="bulk-progress">0%</span></p>
    `;
    statsDiv.classList.remove('hidden');

    let processedCount = 0;
    const totalCombinations = (xEnd - xStart + 1) * (yEnd - yStart + 1) * (zEnd - zStart + 1);
    const progressBar = statsDiv.querySelector('#bulk-progress');

    // Use setTimeout to allow UI to update and prevent freezing for large computations
    setTimeout(() => {
        for (let x = xStart; x <= xEnd; x++) {
            for (let y = yStart; y <= yEnd; y++) {
                for (let z = zStart; z <= zEnd; z++) {
                    const result = calculateCollatzSequence(startN_fixed, maxIterations, x, y, z);
                    totalSequencesCalculated++;

                    if (result.type === "Invalid Parameters (X is 0)") {
                        invalidParamsCount++;
                        processedCount++;
                        if (progressBar) progressBar.textContent = `${((processedCount / totalCombinations) * 100).toFixed(2)}%`;
                        continue;
                    }

                    totalSteps += result.steps;
                    totalSumVals += result.sumVal;

                    if (result.maxVal > maxOverallVal) maxOverallVal = result.maxVal;
                    if (result.minVal < minOverallVal) minOverallVal = result.minVal;
                    
                    if (result.converges_to_1) convergenceCount++;
                    if (result.type === "Cycle Detected") cycleCount++;
                    if (result.type === "Exceeded Max Safe Integer") exceededMaxCount++;
                    if (result.type === "Max Iterations Reached") maxIterationsReachedCount++;
                    if (result.type === "Reached Non-Positive Value") nonPositiveValueCount++;

                    if (result.stoppingTime_t !== 'N/A' && result.stoppingTime_t > overallMaxStoppingTime_t) {
                        overallMaxStoppingTime_t = result.stoppingTime_t;
                    }
                    if (result.coefficientStoppingTime_tau !== 'N/A' && result.coefficientStoppingTime_tau > overallMaxCoefficientStoppingTime_tau) {
                        overallMaxCoefficientStoppingTime_tau = result.coefficientStoppingTime_tau;
                    }
                    overallTotalParadoxicalOccurrences += result.paradoxicalOccurrences.length;

                    processedCount++;
                    if (progressBar) progressBar.textContent = `${((processedCount / totalCombinations) * 100).toFixed(2)}%`;
                }
            }
        }

        const avgSteps = totalSequencesCalculated > 0 ? (totalSteps / totalSequencesCalculated).toFixed(2) : 'N/A';
        const avgSumVal = totalSequencesCalculated > 0 ? (totalSumVals / totalSequencesCalculated).toFixed(2) : 'N/A';
        
        statsDiv.innerHTML = `
            <h3 class="text-2xl font-bold text-blue-200 mb-4">Universe Statistics (N=${startN_fixed.toLocaleString()}, X=${xStart}-${xEnd}, Y=${yStart}-${yEnd}, Z=${zStart}-${zEnd})</h3>
            <p class="mb-1"><strong>Total Sequences Calculated:</strong> ${totalSequencesCalculated.toLocaleString()}</p>
            <p class="mb-1"><strong>Total Steps Sum:</strong> ${totalSteps.toLocaleString()}</p>
            <p class="mb-1"><strong>Highest Value Encountered:</strong> ${maxOverallVal.toLocaleString()}</p>
            <p class="mb-1"><strong>Lowest Value Encountered (excluding 1):</strong> ${minOverallVal === Infinity ? 'N/A' : minOverallVal.toLocaleString()}</p>
            <p class="mb-1"><strong>Average Sequence Sum:</strong> ${avgSumVal.toLocaleString()}</p>
            <p class="mb-1"><strong>Average Steps Per Sequence:</strong> ${avgSteps.toLocaleString()}</p>

            <h4 class="font-semibold text-lg mt-4 mb-2">Sequence Outcomes:</h4>
            <ul class="list-disc list-inside ml-4">
                <li>Converges to 1: ${convergenceCount.toLocaleString()} (${totalSequencesCalculated > 0 ? ((convergenceCount / totalSequencesCalculated) * 100).toFixed(2) : '0.00'}%)</li>
                <li>Cycles Detected: ${cycleCount.toLocaleString()}</li>
                <li>Max Iterations Reached: ${maxIterationsReachedCount.toLocaleString()}</li>
                <li>Exceeded Max Safe Integer: ${exceededMaxCount.toLocaleString()}</li>
                <li>Reached Non-Positive Value: ${nonPositiveValueCount.toLocaleString()}</li>
            </ul>

            <h4 class="font-semibold text-lg mt-4 mb-2">Paper-Specific Metrics:</h4>
            <p class="mb-1"><strong>Max Stopping Time t(n) in Range:</strong> ${overallMaxStoppingTime_t.toLocaleString()}</p>
            <p class="mb-1"><strong>Max Coefficient Stopping Time &tau;(n) in Range:</strong> ${overallMaxCoefficientStoppingTime_tau.toLocaleString()}</p>
            <p class="mb-1"><strong>Total Paradoxical Occurrences Across All Sequences:</strong> ${overallTotalParadoxicalOccurrences.toLocaleString()}</p>
        `;
    }, 50);
}

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
        title.textContent = `N=${run.startN}, X=${run.x_param}, Y=${run.y_param}, Z=${run.z_param}`;
        runDiv.appendChild(title);

        const stepsInfo = document.createElement('p');
        stepsInfo.className = 'text-blue-300 mb-2';
        let typeText = run.type.replace(/_/g, ' ');

        if (run.type === "Max Iterations Reached" || run.type === "Exceeded Max Safe Integer") {
            typeText += ` - Ended at ${run.sequence[run.sequence.length - 1].toLocaleString()}`; // Use final num
        } else if (run.type === "Cycle Detected") {
            typeText += ` - Cycle detected`;
        }
        stepsInfo.textContent = `Steps: ${run.steps} (Type: ${typeText})`;
        runDiv.appendChild(stepsInfo);

        const rangeInfo = document.createElement('p');
        rangeInfo.className = 'text-blue-300 text-sm mb-2';
        rangeInfo.textContent = `Range: ${run.minVal.toLocaleString()} to ${run.maxVal.toLocaleString()}`;
        runDiv.appendChild(rangeInfo);

        const sumInfo = document.createElement('p');
        sumInfo.className = 'text-blue-300 text-sm mb-2';
        sumInfo.textContent = `Sum: ${typeof run.sumVal === 'number' ? run.sumVal.toLocaleString() : run.sumVal}`;
        runDiv.appendChild(sumInfo);

        const avgInfo = document.createElement('p');
        avgInfo.className = 'text-blue-300 text-sm mb-2';
        avgInfo.textContent = `Average: ${typeof run.avgVal === 'number' ? run.avgVal.toLocaleString(undefined, { maximumFractionDigits: 2 }) : run.avgVal}`;
        runDiv.appendChild(avgInfo);

        const stdDevInfo = document.createElement('p');
        stdDevInfo.className = 'text-blue-300 text-sm mb-2';
        stdDevInfo.textContent = `Standard Deviation: ${typeof run.stdDev === 'number' ? run.stdDev.toLocaleString(undefined, { maximumFractionDigits: 2 }) : run.stdDev}`;
        runDiv.appendChild(stdDevInfo);

        const stoppingTimeInfo = document.createElement('p');
        stoppingTimeInfo.className = 'text-blue-300 text-sm mb-2';
        stoppingTimeInfo.textContent = `Stopping Time: ${run.stoppingTime_t === 'N/A' ? 'N/A' : run.stoppingTime_t.toLocaleString()}`;
        runDiv.appendChild(stoppingTimeInfo);

        const paradoxicalInfo = document.createElement('p');
        paradoxicalInfo.className = 'text-blue-300 text-sm mb-2';
        paradoxicalInfo.textContent = `Is Paradoxical: ${run.paradoxicalOccurrences.length > 0 ? 'Yes' : 'No'}`;
        runDiv.appendChild(paradoxicalInfo);

        const sequenceDiv = document.createElement('div');
        sequenceDiv.className = 'bg-blue-900 bg-opacity-60 rounded-md p-3 max-h-32 overflow-y-auto custom-scrollbar text-blue-100 text-sm break-words mb-4';
        sequenceDiv.textContent = Array.isArray(run.sequence) ? run.sequence.join(' → ') : 'Invalid sequence data';
        runDiv.appendChild(sequenceDiv);

        const viewIn3dBtn = document.createElement('button');
        viewIn3dBtn.textContent = 'View in 3D';
        viewIn3dBtn.className = 'mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-md shadow-md transition duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-400';
        viewIn3dBtn.setAttribute('title', 'Launches 3D visualization of this ruleset');
        viewIn3dBtn.addEventListener('click', () => {
            // Pass parameters to the 3D viewer
            const url = `box-universe-fps.html?n=${run.startN}&x=${run.x_param}&y=${run.y_param}&z=${run.z_param}`;
            window.open(url, '_blank'); // Open in new tab
        });
        runDiv.appendChild(viewIn3dBtn);

        const viewIn2dBtn = document.createElement('button');
        viewIn2dBtn.textContent = 'View in 2D';
        viewIn2dBtn.className = 'mt-4 ml-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-md shadow-md transition duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-400';
        viewIn2dBtn.setAttribute('title', 'Launches 2D Slicer visualization of this ruleset');
        viewIn2dBtn.addEventListener('click', () => {
            // Pass parameters and current colors to the 2D slicer
            const url = `slicer.html?n=${run.startN}&x=${run.x_param}&y=${run.y_param}&z=${run.z_param}&divColor=${encodeURIComponent(DEFAULT_LINE_COLOR)}&mulColor=${encodeURIComponent(DEFAULT_NODE_COLOR)}`;
            window.open(url, '_blank'); // Open in new tab
        });
        runDiv.appendChild(viewIn2dBtn);

        runsHistoryDiv.appendChild(runDiv);
    }
};

// Function to update the gold star visibility
function updateGoldStarVisibility() {
    const xValueInputForStar = document.getElementById('xValue');
    const yValueInputForStar = document.getElementById('yValue');
    const zValueInputForStar = document.getElementById('zValue');

    const xVal = xValueInputForStar ? parseInt(xValueInputForStar.value) : NaN;
    const yVal = yValueInputForStar ? parseInt(yValueInputForStar.value) : NaN;
    const zVal = zValueInputForStar ? parseInt(zValueInputForStar.value) : NaN;

    const xStar = document.getElementById('x-star');
    const yStar = document.getElementById('y-star');
    const zStar = document.getElementById('z-star');

    const isStandardCollatz = (xVal === 2 && yVal === 3 && zVal === 1);

    if (xStar) xStar.style.display = isStandardCollatz ? 'inline-block' : 'none';
    if (yStar) yStar.style.display = isStandardCollatz ? 'inline-block' : 'none';
    if (zStar) zStar.style.display = isStandardCollatz ? 'inline-block' : 'none';
}

// Function to update calculator mode visibility
function updateCalculatorMode() {
    const modeSingle = document.getElementById('modeSingle');
    const modeBulk = document.getElementById('modeBulk');
    const singleCalculatorSection = document.getElementById('singleCalculatorSection');
    const bulkCalculatorSection = document.getElementById('bulkCalculatorSection');
    const singleNineNetContainer = document.getElementById('singleNineNetContainer');
    const currentSequenceDetails = document.getElementById('currentSequenceDetails');
    const bulkSequenceStats = document.getElementById('bulkSequenceStats');

    // Ensure all elements exist before proceeding
    if (!modeSingle || !modeBulk || !singleCalculatorSection || !bulkCalculatorSection) {
        console.error("Mode radio buttons or calculator sections not found. Cannot update calculator mode visibility.");
        return;
    }

    if (modeSingle.checked) {
        singleCalculatorSection.classList.remove('hidden');
        bulkCalculatorSection.classList.add('hidden');
        if (singleNineNetContainer) singleNineNetContainer.classList.remove('hidden');
        if (bulkSequenceStats) bulkSequenceStats.classList.add('hidden'); // Hide bulk stats when switching to single
        // Re-draw canvas if there's existing data, or clear it
        if (currentSequenceData) {
            drawNineNetCanvas(currentSequenceData); // Use drawNineNetCanvas for unfolded box
        } else {
            if (ctx && canvas) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.font = '20px Inter'; // Use Inter font
                ctx.textAlign = 'center';
                ctx.fillStyle = '#888';
                ctx.fillText('Enter a number and click "Calculate Single"', canvas.width / 2 / dpi, canvas.height / 2 / dpi);
            }
        }
    } else { // modeBulk.checked
        singleCalculatorSection.classList.add('hidden');
        bulkCalculatorSection.classList.remove('hidden');
        if (singleNineNetContainer) singleNineNetContainer.classList.add('hidden');
        if (currentSequenceDetails) currentSequenceDetails.classList.add('hidden'); // Hide single stats when switching to bulk
        if (ctx && canvas) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }
}


// Event listeners for DOM content loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize canvas and context
    canvas = document.getElementById('singleNineNetCanvas');
    if (canvas) {
        ctx = canvas.getContext('2d');
        // Initial message on canvas
        ctx.font = '20px Inter'; // Use Inter font
        ctx.textAlign = 'center';
        ctx.fillStyle = '#888';
        ctx.fillText('Enter a number and click "Calculate Single"', canvas.width / 2 / dpi, canvas.height / 2 / dpi);

        // Canvas interaction listeners for drag and zoom
        canvas.addEventListener('mousedown', (e) => {
            isDragging = true;
            lastX = e.clientX;
            lastY = e.clientY;
            canvas.style.cursor = 'grabbing';
        });

        canvas.addEventListener('mousemove', (e) => {
            if (isDragging) {
                const dx = e.clientX - lastX;
                const dy = e.clientY - lastY;
                translateX += dx;
                translateY += dy;
                lastX = e.clientX;
                lastY = e.clientY;
                if (currentSequenceData) {
                    drawNineNetCanvas(currentSequenceData); // Re-render with new translation (using unfolded box)
                }
            }
        });

        canvas.addEventListener('mouseup', () => {
            isDragging = false;
            canvas.style.cursor = 'grab';
        });

        canvas.addEventListener('mouseout', () => {
            isDragging = false; // Stop dragging if mouse leaves canvas
            canvas.style.cursor = 'grab';
        });

        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const scaleAmount = 1.1;
            const mouseX = e.clientX - canvas.getBoundingClientRect().left;
            const mouseY = e.clientY - canvas.getBoundingClientRect().top;

            const worldX = (mouseX - (centerX + translateX)) / scale;
            const worldY = (mouseY - (centerY + translateY)) / scale;

            if (e.deltaY < 0) {
                scale *= scaleAmount;
            } else {
                scale /= scaleAmount;
            }

            scale = Math.max(0.1, Math.min(scale, 10)); // Keep scale within reasonable limits

            translateX = -worldX * scale + mouseX - centerX;
            translateY = -worldY * scale + mouseY - centerY;

            if (currentSequenceData) {
                drawNineNetCanvas(currentSequenceData); // Re-render with new scale and translation (using unfolded box)
            }
        });
    }

    // Get references to the mode radio buttons and calculator sections
    const modeSingle = document.getElementById('modeSingle');
    const modeBulk = document.getElementById('modeBulk');

    // Add event listeners to the radio buttons
    if (modeSingle) modeSingle.addEventListener('change', updateCalculatorMode);
    if (modeBulk) modeBulk.addEventListener('change', updateCalculatorMode);

    // Set initial visibility on page load
    updateCalculatorMode();

    // Single Calculator button click
    const singleCalculateButton = document.getElementById('calculateSingle');
    if (singleCalculateButton) {
        singleCalculateButton.addEventListener('click', () => {
            const startN = parseInt(document.getElementById('startNumber').value);
            const maxIterationsSingle = 1000;

            const xValue = parseInt(document.getElementById('xValue').value);
            const yValue = parseInt(document.getElementById('yValue').value);
            const zValue = parseInt(document.getElementById('zValue').value);

            const errorMessageDiv = document.getElementById('errorMessage');
            errorMessageDiv.textContent = '';

            if (isNaN(startN) || startN <= 0) {
                errorMessageDiv.textContent = 'Please enter a valid positive integer for Starting Number.';
                return;
            }
            if (isNaN(xValue) || xValue === 0 || isNaN(yValue) || isNaN(zValue)) {
                errorMessageDiv.textContent = 'Please enter valid integers for X, Y, Z. X cannot be zero.';
                return;
            }

            currentSequenceData = calculateCollatzSequence(startN, maxIterationsSingle, xValue, yValue, zValue);
            // Add x_param, y_param, z_param to currentSequenceData for history and display
            currentSequenceData.x_param = xValue;
            currentSequenceData.y_param = yValue;
            currentSequenceData.z_param = zValue;

            displaySequenceStats(currentSequenceData);
            drawNineNetCanvas(currentSequenceData); // Call unfolded box after calculation

            // Add to history
            calculatedRuns.push(currentSequenceData);
            renderHistory();
        });
    }

    // Bulk Calculator button click
    const bulkGenerateButton = document.getElementById('generateBulk');
    if (bulkGenerateButton) {
        bulkGenerateButton.addEventListener('click', () => {
            const startN_fixed = parseInt(document.getElementById('startNumber').value);

            const xStart = parseInt(document.getElementById('xStart').value);
            const xEnd = parseInt(document.getElementById('xEnd').value);
            const yStart = parseInt(document.getElementById('yStart').value);
            const yEnd = parseInt(document.getElementById('yEnd').value);
            const zStart = parseInt(document.getElementById('zStart').value);
            const zEnd = parseInt(document.getElementById('zEnd').value);
            
            const maxIterationsBulk = 5000;

            const errorMessageDiv = document.getElementById('errorMessage');
            errorMessageDiv.textContent = '';

            if (isNaN(startN_fixed) || startN_fixed <= 0) {
                errorMessageDiv.textContent = 'Please enter a valid positive integer for Starting Number (N) for bulk calculations.';
                return;
            }
            if (isNaN(xStart) || xStart <= 0 || isNaN(xEnd) || xEnd <= 0 || xEnd < xStart ||
                isNaN(yStart) || isNaN(yEnd) || yEnd < yStart ||
                isNaN(zStart) || isNaN(zEnd) || zEnd < zStart) {
                errorMessageDiv.textContent = 'Please enter valid positive integers for all X, Y, Z range inputs, ensuring end values are not less than start values and X values are not zero.';
                return;
            }

            displayBulkUniverseStats(startN_fixed, maxIterationsBulk, xStart, xEnd, yStart, yEnd, zStart, zEnd);
            // No canvas drawing for bulk mode
        });
    }

    // Color picker event listeners
    const divColorPicker = document.getElementById('divColorPicker');
    if (divColorPicker) {
        divColorPicker.addEventListener('input', (e) => {
            DEFAULT_LINE_COLOR = e.target.value;
            if (currentSequenceData) {
                // Ensure xValue is available for drawing when color changes
                // If currentSequenceData doesn't have x_param, get it from the input
                const xValueForDrawing = currentSequenceData.x_param || parseInt(document.getElementById('xValue').value);
                currentSequenceData.x_param = xValueForDrawing; // Update x_param in currentSequenceData
                drawNineNetCanvas(currentSequenceData); // Use drawNineNetCanvas for unfolded box
            }
        });
    }

    const mulColorPicker = document.getElementById('mulColorPicker');
    if (mulColorPicker) {
        mulColorPicker.addEventListener('input', (e) => {
            DEFAULT_NODE_COLOR = e.target.value;
            if (currentSequenceData) {
                // Ensure xValue is available for drawing when color changes
                const xValueForDrawing = currentSequenceData.x_param || parseInt(document.getElementById('xValue').value);
                currentSequenceData.x_param = xValueForDrawing; // Update x_param in currentSequenceData
                drawNineNetCanvas(currentSequenceData); // Use drawNineNetCanvas for unfolded box
            }
        });
    }

    // Visualization Selection Button
    const launchVisualizationButton = document.getElementById('launchVisualization');
    if (launchVisualizationButton) {
        launchVisualizationButton.addEventListener('click', () => {
            const selectedRadio = document.querySelector('input[name="visualization"]:checked');
            if (selectedRadio) {
                let selectedUrl = selectedRadio.value;

                const startN_str = document.getElementById('startNumber').value;
                const xValue_str = document.getElementById('xValue').value;
                const yValue_str = document.getElementById('yValue').value;
                const zValue_str = document.getElementById('zValue').value;

                const startN = startN_str ? parseInt(startN_str) : 7;
                const xValue = xValue_str ? parseInt(xValue_str) : 2;
                const yValue = yValue_str ? parseInt(yValue_str) : 3;
                const zValue = zValue_str ? parseInt(zValue_str) : 1;

                if (isNaN(startN) || isNaN(xValue) || isNaN(yValue) || isNaN(zValue)) {
                    const errorMessageDiv = document.getElementById('errorMessage');
                    if (errorMessageDiv) {
                        errorMessageDiv.textContent = 'Please enter valid numbers for N, X, Y, and Z before launching a visualization.';
                    } else {
                        console.error('Please enter valid numbers for N, X, Y, and Z.');
                    }
                    return;
                }

                const params = new URLSearchParams();
                params.append('n', startN);
                params.append('x', xValue);
                params.append('y', yValue);
                params.append('z', zValue);
                // Also pass colors to other visualizations if they support them
                params.append('divColor', encodeURIComponent(DEFAULT_LINE_COLOR));
                params.append('mulColor', encodeURIComponent(DEFAULT_NODE_COLOR));


                selectedUrl += '?' + params.toString();

                window.open(selectedUrl, '_self');
            } else {
                const errorMessageDiv = document.getElementById('errorMessage');
                if (errorMessageDiv) {
                    errorMessageDiv.textContent = 'Please select a visualization tool to launch.';
                } else {
                    console.error('Please select a visualization tool to launch.');
                }
            }
        });
    }

    // Initial load logic for single calculation (from URL parameters or defaults)
    function getQueryParams() {
        const params = {};
        window.location.search.substring(1).split('&').forEach(param => {
            const parts = param.split('=');
            if (parts.length === 2) {
                params[parts[0]] = decodeURIComponent(parts[1]);
            }
        });
        return params;
    }

    const queryParams = getQueryParams();
    const nParam = queryParams.n;
    const xParam = queryParams.x;
    const yParam = queryParams.y;
    const zParam = queryParams.z;
    const divColorParam = queryParams.divColor;
    const mulColorParam = queryParams.mulColor;


    const startNumberInput = document.getElementById('startNumber');
    const xValueInput = document.getElementById('xValue');
    const yValueInput = document.getElementById('yValue');
    const zValueInput = document.getElementById('zValue');
    const calculateSingleButton = document.getElementById('calculateSingle');
    const singleNineNetCanvasElement = document.getElementById('singleNineNetCanvas');

    // IMPORTANT: Ensure divColorPicker and mulColorPicker are already defined from earlier in DOMContentLoaded
    // Do NOT re-declare them here.
    if (divColorParam) { // Check if divColorPicker exists from earlier declaration
        DEFAULT_LINE_COLOR = divColorParam;
        if (divColorPicker) divColorPicker.value = divColorParam;
    }
    if (mulColorParam) { // Check if mulColorPicker exists from earlier declaration
        DEFAULT_NODE_COLOR = mulColorParam;
        if (mulColorPicker) mulColorPicker.value = mulColorParam;
    }


    if (nParam && xParam && yParam && zParam && startNumberInput && xValueInput && yValueInput && zValueInput && calculateSingleButton) {
        startNumberInput.value = nParam;
        xValueInput.value = xParam;
        yValueInput.value = yParam;
        zValueInput.value = zParam;

        // Automatically trigger the single calculation
        // Using a small timeout to ensure all DOM elements and event listeners are fully ready
        setTimeout(() => {
            calculateSingleButton.click();
        }, 100); // 100ms delay
    } else if (singleNineNetCanvasElement && startNumberInput && xValueInput && yValueInput && zValueInput) {
        // If no URL parameters, perform initial draw with default values from input fields
        const defaultN = parseInt(startNumberInput.value);
        const defaultX = parseInt(xValueInput.value);
        const defaultY = parseInt(yValueInput.value);
        const defaultZ = parseInt(zValueInput.value);
        const maxSteps = 1000; // Max iterations for initial default calculation

        // Only calculate if parameters are valid for default
        if (!isNaN(defaultN) && defaultN > 0 && !isNaN(defaultX) && defaultX !== 0 && !isNaN(defaultY) && !isNaN(defaultZ)) {
            const defaultResult = calculateCollatzSequence(defaultN, maxSteps, defaultX, defaultY, defaultZ);
            if (defaultResult.type !== "error") {
                defaultResult.x_param = defaultX; // Ensure x_param is stored for drawing logic
                currentSequenceData = defaultResult; // Store for future canvas interactions
                drawNineNetCanvas(defaultResult); // Use drawNineNetCanvas for unfolded box on initial load
            }
        }
    }

    // Initial call to set gold star visibility on page load
    updateGoldStarVisibility();
    // Initial call to render history (it will hide itself if empty)
    renderHistory();
});
