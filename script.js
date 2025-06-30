// ==========================================================
// Consolidate ALL Global Variable Declarations at the Top
// ==========================================================

// Default canvas colors (will be updated by color pickers)
let DEFAULT_LINE_COLOR = '#00f'; // Blue - for divisible operation
let DEFAULT_NODE_COLOR = '#ff0'; // Yellow - for multiply/add operation
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

// ==========================================================
// End of Global Variable Declarations
// ==========================================================

// Function to render the Unfolded Box (9-Net)
function drawNineNetCanvas(data) {
    if (!canvas) { // Ensure canvas and ctx are initialized
        canvas = document.getElementById('singleNineNetCanvas');
        ctx = canvas.getContext('2d');
    }

    // Adjust canvas resolution for sharper drawing
    const dpi = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpi;
    canvas.height = canvas.offsetHeight * dpi;
    ctx.scale(dpi, dpi);

    centerX = canvas.offsetWidth / 2;
    centerY = canvas.offsetHeight / 2;
    nodeRadius = DEFAULT_NODE_RADIUS; // Reset to default for new render

    ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

    ctx.save();
    // Apply translation and scale AFTER calculating layout, so it works on the "unscaled" canvas dimensions
    // The current translateX, translateY, scale are for the *content* not the canvas itself.
    // We need to calculate the layout relative to the canvas's current displayed size, then apply the user's drag/zoom.

    const sequence = data.sequence; // Access sequence from data object
    const xValue = data.xValue; // Get xValue from data object (needed for divisibility check)

    const paddingBetweenBoxes = 10; // Padding between the large remainder boxes

    // Define the positions of the 9 "faces" on a 4x3 grid of `faceSize` blocks
    // These define the top-left corner (row, col) for each remainder's box.
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

    // Determine the effective number of rows and columns based on the layout array's max indices
    const maxLayoutColIndex = Math.max(...layout.map(p => p.c)); // max is 3
    const maxLayoutRowIndex = Math.max(...layout.map(p => p.r)); // max is 2

    const effectiveLayoutCols = maxLayoutColIndex + 1; // 4 conceptual columns
    const effectiveLayoutRows = maxLayoutRowIndex + 1; // 3 conceptual rows

    // Calculate faceSize such that the entire grid of faces plus padding fits within the canvas
    // We use canvas.offsetWidth and canvas.offsetHeight as the available space
    const potentialFaceSizeByWidth = (canvas.offsetWidth - (effectiveLayoutCols - 1) * paddingBetweenBoxes) / effectiveLayoutCols;
    const potentialFaceSizeByHeight = (canvas.offsetHeight - (effectiveLayoutRows - 1) * paddingBetweenBoxes) / effectiveLayoutRows;

    // Choose the smaller faceSize to ensure it fits both dimensions, and add a small buffer
    const faceSize = Math.min(potentialFaceSizeByWidth, potentialFaceSizeByHeight) * 0.95; // 5% buffer

    // Recalculate total drawing dimensions based on the new faceSize
    const NINE_NET_TOTAL_DRAW_WIDTH = effectiveLayoutCols * faceSize + (effectiveLayoutCols - 1) * paddingBetweenBoxes;
    const NINE_NET_TOTAL_DRAW_HEIGHT = effectiveLayoutRows * faceSize + (effectiveLayoutRows - 1) * paddingBetweenBoxes;

    // Center the overall 9-net drawing in the canvas's current view
    // These offsets are for the *entire grid* relative to the canvas center (0,0 point after ctx.translate to centerX, centerY)
    const initialOffsetX = -NINE_NET_TOTAL_DRAW_WIDTH / 2;
    const initialOffsetY = -NINE_NET_TOTAL_DRAW_HEIGHT / 2;

    // Apply user's drag and zoom transformations
    ctx.translate(centerX + translateX, centerY + translateY);
    ctx.scale(scale, scale);

    // Store the drawing coordinates for each remainder box
    const remainderBoxCoords = {};
    for (let i = 0; i < layout.length; i++) {
        const pos = layout[i];
        // Calculate box position relative to the initialOffsetX, initialOffsetY (which centers the whole grid)
        const boxX = initialOffsetX + (pos.c * faceSize) + (pos.c * paddingBetweenBoxes);
        const boxY = initialOffsetY + (pos.r * faceSize) + (pos.r * paddingBetweenBoxes);
        remainderBoxCoords[i] = { x: boxX, y: boxY, width: faceSize, height: faceSize };

        // Draw the empty box outline for each remainder
        ctx.beginPath();
        ctx.rect(boxX, boxY, faceSize, faceSize);
        ctx.strokeStyle = '#555'; // A neutral color for empty boxes
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    // Now, iterate through the sequence and draw numbers into their respective boxes
    // For simplicity, we'll draw each number in the center of its box.
    // If multiple numbers map to the same box, they will overlap, but we will see the last one.
    // To see all, we'd need more complex text layout or smaller markers.
    for (let i = 0; i < sequence.length; i++) {
        const num = sequence[i];
        const remainder = num % 9;

        const box = remainderBoxCoords[remainder];
        if (box) {
            // Determine color based on divisibility
            if (num % xValue === 0) {
                ctx.fillStyle = DEFAULT_LINE_COLOR; // Blue for divisible
            } else {
                ctx.fillStyle = DEFAULT_NODE_COLOR; // Yellow for multiply/add
            }
            ctx.fillRect(box.x, box.y, box.width, box.height); // Fill the box with the color

            ctx.strokeStyle = DEFAULT_NODE_BORDER_COLOR;
            ctx.lineWidth = 1;
            ctx.strokeRect(box.x, box.y, box.width, box.height); // Redraw border on top

            ctx.fillStyle = '#000'; // Text color
            ctx.font = `${Math.max(8, faceSize * 0.2)}px Arial`; // Adjust font size based on box size
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(num.toString(), box.x + box.width / 2, box.y + box.height / 2);
        }
    }
    ctx.restore();
}


// Collatz function as per user's definition
// Rule: If n % X == 0, then n -> n / X. Otherwise, n -> n * Y + Z.
// Standard Collatz uses X=2, Y=3, Z=1
function calculateCollatzSequence(startN, maxIterations, x_param, y_param, z_param) {
    let sequence = [startN];
    let current = startN;
    let steps = 0;
    let yPlusZ_operations = 0; // Counts (Y*n + Z) operations, equivalent to 'oddCount' for standard Collatz
    let maxVal = startN;
    let minVal = startN;
    let sumVal = startN;

    let stoppingTime_t = Infinity; // Least j such that T^j(n) < n
    let coefficientStoppingTime_tau = Infinity; // Least j such that C_j(n) < 1
    let paradoxicalOccurrences = []; // Array to store {step, value, coefficient} for paradoxical points

    const initialN = startN;

    // Parameter validation
    if (x_param === 0) { // Divisor (X) cannot be zero
        return {
            startN, sequence: [startN], steps: 0, maxVal: startN, minVal: startN, sumVal: startN,
            avgVal: startN, stdDev: 0, type: "Invalid Parameters (X is 0)", converges_to_1: false,
            stoppingTime_t: 'N/A', coefficientStoppingTime_tau: 'N/A', paradoxicalOccurrences: []
        };
    }
    // Handle trivial case where startN is 1 for standard Collatz, might not apply for generalized
    // But if startN is 1, and the rule eventually leads to 1, steps should be 0.
    if (startN === 1) {
        return {
            startN, sequence: [1], steps: 0, maxVal: 1, minVal: 1, sumVal: 1,
            avgVal: 1, stdDev: 0, type: "Converges to 1", converges_to_1: true,
            stoppingTime_t: 0, // It's already < initialN if initialN > 1
            coefficientStoppingTime_tau: 1, // C_0(n) = Y^0 / X^0 = 1
            paradoxicalOccurrences: []
        };
    }


    while (current !== 1 && steps < maxIterations) { // Continue until 1 or max iterations
        // Check for potential infinite loop or very large numbers before calculation
        // Add a safety break for extremely long sequences that might not converge or cycle.
        if (steps > maxIterations * 2 && maxIterations > 0) { // If it goes way over maxIterations
             return {
                startN, sequence: sequence, steps: steps, maxVal: maxVal, minVal: minVal, sumVal: sumVal,
                avgVal: sumVal / sequence.length, stdDev: 0, type: "Exceeded Max Iterations (Possible Divergence)",
                converges_to_1: false, stoppingTime_t: stoppingTime_t === Infinity ? 'N/A' : stoppingTime_t,
                coefficientStoppingTime_tau: coefficientStoppingTime_tau === Infinity ? 'N/A' : coefficientStoppingTime_tau,
                paradoxicalOccurrences: paradoxicalOccurrences
            };
        }

        if (current % x_param === 0) { // If n is divisible by X
            current = current / x_param;
        } else { // Otherwise (n % X !== 0)
            current = (y_param * current + z_param);
            yPlusZ_operations++; // Count occurrences of the (Y*n + Z) operation
        }

        steps++;

        // Check for overflow, non-finite, or non-positive numbers (important for divergence)
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

        // Cycle detection - check if current number has appeared before
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

        // Update statistics
        if (current > maxVal) maxVal = current;
        if (current < minVal) minVal = current;
        sumVal += current;

        // Calculate current coefficient C_j(n) = (Y^q) / (X^j) where q is count of (Y*n+Z) operations, j is total steps
        // C_0(n) = 1 (when steps is 0, yPlusZ_operations is 0, Y^0/X^0 = 1)
        const currentCoefficient = (steps === 0) ? 1 : (Math.pow(y_param, yPlusZ_operations) / Math.pow(x_param, steps));

        // Check for stopping time t(n) - first j such that T^j(n) < n
        if (stoppingTime_t === Infinity && current < initialN) {
            stoppingTime_t = steps;
        }

        // Check for coefficient stopping time tau(n) - first j such that C_j(n) < 1
        if (coefficientStoppingTime_tau === Infinity && currentCoefficient < 1) {
            coefficientStoppingTime_tau = steps;
        }

        // Check for paradoxical sequence condition (C_j(n) < 1 AND T^j(n) >= n)
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

    // Calculate Standard Deviation
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

// Function to render the Radial 9-net (This function is not used in index.html, but kept for completeness if needed elsewhere)
function render9Net(data) {
    if (!canvas) {
        canvas = document.getElementById('singleNineNetCanvas'); // Use the correct ID from user's HTML
        ctx = canvas.getContext('2d');
    }

    // Adjust canvas resolution for sharper drawing
    const dpi = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpi;
    canvas.height = canvas.offsetHeight * dpi;
    ctx.scale(dpi, dpi);

    centerX = canvas.offsetWidth / 2;
    centerY = canvas.offsetHeight / 2;
    nodeRadius = DEFAULT_NODE_RADIUS; // Reset to default for new render

    ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

    ctx.save();
    ctx.translate(centerX + translateX, centerY + translateY);
    ctx.scale(scale, scale);

    const sequence = data.sequence;
    if (sequence.length < 2) {
        // If sequence is too short, just draw the starting node if it exists
        if (sequence.length === 1) {
            const num = sequence[0];
            ctx.beginPath();
            ctx.arc(0, 0, nodeRadius, 0, 2 * Math.PI); // Draw at center for single node
            ctx.fillStyle = DEFAULT_NODE_COLOR;
            ctx.fill();
            ctx.strokeStyle = DEFAULT_NODE_BORDER_COLOR;
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.fillStyle = '#000'; // Text color
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

    // Draw lines first
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
        ctx.strokeStyle = DEFAULT_LINE_COLOR; // Use dynamically set color
        ctx.lineWidth = lineThickness;
        ctx.stroke();
    }

    // Draw nodes second, so they appear on top of lines
    for (let i = 0; i < sequence.length; i++) {
        const num = sequence[i];
        const angle = (num % 9) * (2 * Math.PI / 9);
        const radius = 50 + num * 0.1;

        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);

        ctx.beginPath();
        ctx.arc(x, y, nodeRadius, 0, 2 * Math.PI);
        ctx.fillStyle = DEFAULT_NODE_COLOR; // Use dynamically set color
        ctx.fill();
        ctx.strokeStyle = DEFAULT_NODE_BORDER_COLOR;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#000'; // Text color
        ctx.font = `${Math.max(8, nodeRadius * 0.8)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(num, x, y);
    }

    ctx.restore();
}

// Function to display single sequence statistics
function displaySequenceStats(data) {
    const statsDiv = document.getElementById('singleSequenceStats'); // Correct ID
    if (!statsDiv) return;

    // Build the paradoxical occurrences list HTML
    let paradoxicalListHtml = '';
    if (data.paradoxicalOccurrences.length > 0) {
        paradoxicalListHtml = `
            <p class="font-semibold mt-2">Paradoxical Occurrences (C<sub>j</sub>(n) &lt; 1 AND T<sup>j</sup>(n) &gt;= n):</p>
            <ul class="list-disc list-inside ml-4">
                ${data.paradoxicalOccurrences.map(p => `
                    <li>Step ${p.step}: Value = ${p.value.toLocaleString()}, Coefficient = ${p.coefficient}</li>
                `).join('')}
            </ul>
        `;
    } else {
        paradoxicalListHtml = '<p class="mt-2"><strong>Paradoxical Occurrences:</strong> None found.</p>';
    }

    statsDiv.innerHTML = `
        <p class="font-semibold text-lg mb-2">Sequence Statistics for N=${data.startN.toLocaleString()}</p>
        <p><strong>Initial Value:</strong> ${data.startN.toLocaleString()}</p>
        <p><strong>Steps (J):</strong> ${data.steps.toLocaleString()}</p>
        <p><strong>Max Value:</strong> ${data.maxVal.toLocaleString()}</p>
        <p><strong>Min Value:</strong> ${data.minVal.toLocaleString()}</p>
        <p><strong>Sum of Values:</strong> ${data.sumVal.toLocaleString()}</p>
        <p><strong>Average Value:</strong> ${data.avgVal.toFixed(2)}</p>
        <p><strong>Standard Deviation:</strong> ${data.stdDev.toFixed(2)}</p>
        <p><strong>Result Type:</strong> ${data.type}</p>
        <p><strong>Converges to 1:</strong> ${data.converges_to_1 ? 'Yes' : 'No'}</p>
        <p><strong>Stopping Time t(n) (first j where T<sup>j</sup>(n) &lt; n):</strong> ${data.stoppingTime_t !== 'N/A' ? data.stoppingTime_t.toLocaleString() : 'N/A'}</p>
        <p><strong>Coefficient Stopping Time &tau;(n) (first j where C<sub>j</sub>(n) &lt; 1):</strong> ${data.coefficientStoppingTime_tau !== 'N/A' ? data.coefficientStoppingTime_tau.toLocaleString() : 'N/A'}</p>
        ${paradoxicalListHtml}
    `;
    statsDiv.classList.remove('hidden'); // Ensure it's visible
}


// Function to display bulk universe statistics
function displayBulkUniverseStats(startN_fixed, maxIterations, xStart, xEnd, yStart, yEnd, zStart, zEnd) {
    const statsDiv = document.getElementById('bulkSequenceStats');
    if (!statsDiv) return;

    let totalSteps = 0;
    let maxOverallVal = 0; // Max value encountered across all sequences
    let minOverallVal = Infinity; // Min value encountered across all sequences
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
    // Calculate total combinations only for X, Y, Z ranges, as N is fixed for this bulk mode.
    const totalCombinations = (xEnd - xStart + 1) * (yEnd - yStart + 1) * (zEnd - zStart + 1);
    const progressBar = statsDiv.querySelector('#bulk-progress'); // Select progress bar within statsDiv

    // Use setTimeout to allow UI to update and prevent freezing for large computations
    setTimeout(() => {
        for (let x = xStart; x <= xEnd; x++) {
            for (let y = yStart; y <= yEnd; y++) {
                for (let z = zStart; z <= zEnd; z++) {
                    // For each combination of X, Y, Z, calculate for the fixed N
                    const result = calculateCollatzSequence(startN_fixed, maxIterations, x, y, z);
                    totalSequencesCalculated++;

                    if (result.type === "Invalid Parameters (X is 0)") {
                        invalidParamsCount++;
                        processedCount++;
                        if (progressBar) progressBar.textContent = `${((processedCount / totalCombinations) * 100).toFixed(2)}%`;
                        continue; // Skip further processing for invalid parameters
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
    }, 50); // Small delay to let the "Generating..." message show
}


// Event listeners for DOM content loaded
document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('singleNineNetCanvas');
    if (canvas) {
        ctx = canvas.getContext('2d');
        // Initial setup for drag and zoom
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
                lastY = e.clientX; // Corrected: Should be e.clientY
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

    // --- START New Mode Switching Code ---
    // Get references to the mode radio buttons and calculator sections
    const modeSingle = document.getElementById('modeSingle');
    const modeBulk = document.getElementById('modeBulk');
    const singleSection = document.getElementById('singleCalculatorSection');
    const bulkSection = document.getElementById('bulkCalculatorSection');

    // Function to update section visibility
    function updateCalculatorMode() {
        const singleNineNetContainer = document.getElementById('singleNineNetContainer'); // Get the container div for the canvas

        // Ensure modeSingle and modeBulk elements exist before accessing their 'checked' property
        if (!modeSingle || !modeBulk) {
            console.error("Mode radio buttons (modeSingle or modeBulk) not found. Cannot update calculator mode visibility.");
            return; // Exit function if elements are missing
        }

        if (modeSingle.checked) {
            singleSection.classList.remove('hidden');
            bulkSection.classList.add('hidden');
            if (singleNineNetContainer) {
                singleNineNetContainer.classList.remove('hidden'); // Ensure canvas container is visible in single mode
            }
            // IMPORTANT: Only try to render if currentSequenceData exists or if it's an initial load
            // The initial load logic is handled by the DOMContentLoaded block below this function.
            // This function primarily handles mode switching.
            if (currentSequenceData) {
                drawNineNetCanvas(currentSequenceData); // Re-render if data already exists (e.g., after a mode switch back)
            } else {
                // If no data yet, clear canvas and show initial message
                if (ctx && canvas) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.font = '20px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillStyle = '#888';
                    ctx.fillText('Enter a number and click "Calculate Single"', canvas.width / 2 / dpi, canvas.height / 2 / dpi);
                }
            }

        } else { // modeBulk.checked
            singleSection.classList.add('hidden');
            bulkSection.classList.remove('hidden');
            if (singleNineNetContainer) {
                singleNineNetContainer.classList.add('hidden'); // Ensure canvas container is hidden in bulk mode
            }
            // Also clear the canvas when switching to bulk mode
            if (ctx && canvas) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }
        // Optionally hide stats when switching modes to prevent confusion
        const singleStats = document.getElementById('singleSequenceStats');
        const bulkStats = document.getElementById('bulkSequenceStats');
        if (singleStats) singleStats.classList.add('hidden');
        if (bulkStats) bulkStats.classList.add('hidden');
    }

    // Set initial visibility on page load
    updateCalculatorMode();

    // Add event listeners to the radio buttons
    if (modeSingle) modeSingle.addEventListener('change', updateCalculatorMode);
    if (modeBulk) modeBulk.addEventListener('change', updateCalculatorMode);
    // --- END New Mode Switching Code ---


    // Single Calculator button click
    const singleCalculateButton = document.getElementById('calculateSingle');
    if (singleCalculateButton) {
        singleCalculateButton.addEventListener('click', () => {
            const startN = parseInt(document.getElementById('startNumber').value);
            const maxIterationsSingle = 1000; // Fixed max iterations for single calculation for now

            const xValue = parseInt(document.getElementById('xValue').value);
            const yValue = parseInt(document.getElementById('yValue').value);
            const zValue = parseInt(document.getElementById('zValue').value);

            const errorMessageDiv = document.getElementById('errorMessage');
            errorMessageDiv.textContent = ''; // Clear previous errors

            if (isNaN(startN) || startN <= 0) {
                errorMessageDiv.textContent = 'Please enter a valid positive integer for Starting Number.';
                return;
            }
            if (isNaN(xValue) || xValue === 0 || isNaN(yValue) || isNaN(zValue)) {
                errorMessageDiv.textContent = 'Please enter valid integers for X, Y, Z. X cannot be zero.';
                return;
            }

            currentSequenceData = calculateCollatzSequence(startN, maxIterationsSingle, xValue, yValue, zValue);
            displaySequenceStats(currentSequenceData);
            // Pass xValue to drawNineNetCanvas for correct color logic
            currentSequenceData.xValue = xValue; // Add xValue to the data object for drawing
            drawNineNetCanvas(currentSequenceData); // Call unfolded box after calculation
        });
    }

    // Bulk Calculator button click
    const bulkGenerateButton = document.getElementById('generateBulk');
    if (bulkGenerateButton) {
        bulkGenerateButton.addEventListener('click', () => {
            // N value for bulk is taken from the single calculator's 'startNumber'
            const startN_fixed = parseInt(document.getElementById('startNumber').value);

            const xStart = parseInt(document.getElementById('xStart').value);
            const xEnd = parseInt(document.getElementById('xEnd').value);
            const yStart = parseInt(document.getElementById('yStart').value);
            const yEnd = parseInt(document.getElementById('yEnd').value);
            const zStart = parseInt(document.getElementById('zStart').value);
            const zEnd = parseInt(document.getElementById('zEnd').value);
            
            const maxIterationsBulk = 5000; // Fixed max iterations for bulk calculation for now

            const errorMessageDiv = document.getElementById('errorMessage');
            errorMessageDiv.textContent = ''; // Clear previous errors

            // Validate N and ranges
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
        });
    }

    // Color picker event listeners
    const divColorPicker = document.getElementById('divColorPicker');
    if (divColorPicker) {
        divColorPicker.addEventListener('input', (e) => {
            DEFAULT_LINE_COLOR = e.target.value;
            if (currentSequenceData) {
                // Ensure xValue is available for re-drawing
                const xValue = parseInt(document.getElementById('xValue').value);
                currentSequenceData.xValue = xValue; // Update xValue in currentSequenceData
                drawNineNetCanvas(currentSequenceData); // Update unfolded box color
            }
        });
    }

    const mulColorPicker = document.getElementById('mulColorPicker');
    if (mulColorPicker) {
        mulColorPicker.addEventListener('input', (e) => {
            DEFAULT_NODE_COLOR = e.target.value;
            if (currentSequenceData) {
                // Ensure xValue is available for re-drawing
                const xValue = parseInt(document.getElementById('xValue').value);
                currentSequenceData.xValue = xValue; // Update xValue in currentSequenceData
                drawNineNetCanvas(currentSequenceData); // Update unfolded box color
            }
        });
    }

    // --- New JavaScript for Visualization Selection ---
    const launchVisualizationButton = document.getElementById('launchVisualization');
    if (launchVisualizationButton) {
        launchVisualizationButton.addEventListener('click', () => {
            const selectedRadio = document.querySelector('input[name="visualization"]:checked');
            if (selectedRadio) {
                let selectedUrl = selectedRadio.value; // Get the base filename (e.g., 'box-universe-viewer.html')

                // Get the current N, X, Y, Z values from the input fields
                // Ensure these input fields exist and are accessible when this code runs
                const startN_str = document.getElementById('startNumber').value;
                const xValue_str = document.getElementById('xValue').value;
                const yValue_str = document.getElementById('yValue').value;
                const zValue_str = document.getElementById('zValue').value;

                // Robust parsing with defaults
                const startN = startN_str ? parseInt(startN_str) : 7;
                const xValue = xValue_str ? parseInt(xValue_str) : 2;
                const yValue = yValue_str ? parseInt(yValue_str) : 3;
                const zValue = zValue_str ? parseInt(zValue_str) : 1;

                if (isNaN(startN) || isNaN(xValue) || isNaN(yValue) || isNaN(zValue)) {
                    // Use a custom message box instead of alert()
                    const errorMessageDiv = document.getElementById('errorMessage');
                    if (errorMessageDiv) {
                        errorMessageDiv.textContent = 'Please enter valid numbers for N, X, Y, and Z.';
                    } else {
                        console.error('Please enter valid numbers for N, X, Y, and Z.');
                    }
                    return; // Stop the function execution
                }

                // Construct the query parameters string
                const params = new URLSearchParams();
                params.append('n', startN);
                params.append('x', xValue);
                params.append('y', yValue);
                params.append('z', zValue);

                // Append the query parameters to the URL
                selectedUrl += '?' + params.toString();

                // Navigate to the selected URL with parameters
                window.open(selectedUrl, '_self'); // Use _self to open in the same tab, or _blank for new tab
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

    // --- Initial load logic for single calculation (from your previous index.html code) ---
    // This block ensures the 9-net is drawn on first load,
    // potentially using URL parameters if the page was launched with them.
    const startNumberInput = document.getElementById('startNumber');
    const xValueInput = document.getElementById('xValue');
    const yValueInput = document.getElementById('yValue');
    const zValueInput = document.getElementById('zValue');
    const calculateSingleButton = document.getElementById('calculateSingle');
    const singleNineNetCanvasElement = document.getElementById('singleNineNetCanvas');

    // Retrieve URL parameters on initial load of index.html itself (if it's a target page)
    // This is useful if someone bookmarks or shares index.html with parameters.
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

    // If parameters are present in the URL, apply them and trigger calculation
    if (nParam && xParam && yParam && zParam && startNumberInput && xValueInput && yValueInput && zValueInput && calculateSingleButton) {
        startNumberInput.value = nParam;
        xValueInput.value = xParam;
        yValueInput.value = yParam;
        zValueInput.value = zParam;

        // Automatically trigger the single calculation
        calculateSingleButton.click();
    } else if (singleNineNetCanvasElement && startNumberInput && xValueInput && yValueInput && zValueInput) {
        // If no URL parameters, perform initial draw with default values from input fields
        const defaultN = parseInt(startNumberInput.value);
        const defaultX = parseInt(xValueInput.value);
        const defaultY = parseInt(yValueInput.value);
        const defaultZ = parseInt(zValueInput.value);
        const maxSteps = 10000;
        const defaultResult = calculateCollatzSequence(defaultN, defaultX, defaultY, defaultZ, maxSteps);
        if (defaultResult.type !== "error") {
            // Store xValue in currentSequenceData for drawing
            defaultResult.xValue = defaultX;
            drawNineNetCanvas(defaultResult); // Use drawNineNetCanvas for unfolded box on initial load
        }
    }

    // Global array to store runs for history (moved from inline script)
    let calculatedRuns = [];

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
            title.textContent = `N=${run.startN}, X=${run.x_param}, Y=${run.y_param}, Z=${run.z_param}`; // Changed to run.n, run.x etc.
            runDiv.appendChild(title);

            const stepsInfo = document.createElement('p');
            stepsInfo.className = 'text-blue-300 mb-2';
            let typeText = run.type.replace(/_/g, ' ');

            if (run.type === "Max Iterations Reached" || run.type === "Exceeded Max Safe Integer") {
                typeText += ` - Ended at ${run.current.toLocaleString()}`; // Use finalNum and format
            } else if (run.type === "Cycle Detected") {
                typeText += ` - Cycle detected`; // Simpler for history view, full sequence below
            }
            stepsInfo.textContent = `Steps: ${run.steps} (Type: ${typeText})`;
            runDiv.appendChild(stepsInfo);

            // Add min/max info (from image reference)
            const rangeInfo = document.createElement('p');
            rangeInfo.className = 'text-blue-300 text-sm mb-2';
            rangeInfo.textContent = `Range: ${run.minVal.toLocaleString()} to ${run.maxVal.toLocaleString()}`;
            runDiv.appendChild(rangeInfo);

            // Add sum info (from image reference)
            const sumInfo = document.createElement('p');
            sumInfo.className = 'text-blue-300 text-sm mb-2';
            sumInfo.textContent = `Sum: ${typeof run.sumVal === 'number' ? run.sumVal.toLocaleString() : run.sumVal}`;
            runDiv.appendChild(sumInfo);

            // Add average info (from image reference)
            const avgInfo = document.createElement('p');
            avgInfo.className = 'text-blue-300 text-sm mb-2';
            avgInfo.textContent = `Average: ${typeof run.avgVal === 'number' ? run.avgVal.toLocaleString(undefined, { maximumFractionDigits: 2 }) : run.avgVal}`;
            runDiv.appendChild(avgInfo);

            // Add Standard Deviation info (from image reference)
            const stdDevInfo = document.createElement('p');
            stdDevInfo.className = 'text-blue-300 text-sm mb-2';
            stdDevInfo.textContent = `Standard Deviation: ${typeof run.stdDev === 'number' ? run.stdDev.toLocaleString(undefined, { maximumFractionDigits: 2 }) : run.stdDev}`;
            runDiv.appendChild(stdDevInfo);

            // Add Stopping Time (NEW)
            const stoppingTimeInfo = document.createElement('p');
            stoppingTimeInfo.className = 'text-blue-300 text-sm mb-2';
            stoppingTimeInfo.textContent = `Stopping Time: ${run.stoppingTime_t === 'N/A' ? 'N/A' : run.stoppingTime_t}`;
            runDiv.appendChild(stoppingTimeInfo);

            // Add Is Paradoxical (NEW)
            const paradoxicalInfo = document.createElement('p');
            paradoxicalInfo.className = 'text-blue-300 text-sm mb-2';
            paradoxicalInfo.textContent = `Is Paradoxical: ${run.isParadoxical ? 'Yes' : 'No'}`;
            runDiv.appendChild(paradoxicalInfo);


            const sequenceDiv = document.createElement('div');
            sequenceDiv.className = 'bg-blue-900 bg-opacity-60 rounded-md p-3 max-h-32 overflow-y-auto custom-scrollbar text-blue-100 text-sm break-words mb-4';
            sequenceDiv.textContent = Array.isArray(run.sequence) ? run.sequence.join(' → ') : 'Invalid sequence data';
            runDiv.appendChild(sequenceDiv);

            // === View in 3D button (linking to slicerr3d.html) ===
            const viewIn3dBtn = document.createElement('button');
            viewIn3dBtn.textContent = 'View in 3D';
            viewIn3dBtn.className = 'mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-md shadow-md transition duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-400';
            viewIn3dBtn.setAttribute('title', 'Launches 3D visualization of this ruleset');
            viewIn3dBtn.addEventListener('click', () => {
                const url = `box-universe-fps.html?n=${run.startN}&x=${run.x_param}&y=${run.y_param}&z=${run.z_param}`; // Use run.n, run.x etc.
                window.open(url, '_blank'); // Open slicerr3d.html in a new browser tab
            });
            runDiv.appendChild(viewIn3dBtn);

            // === View in 2D button (linking to slicer.html) ===
            const viewIn2dBtn = document.createElement('button');
            viewIn2dBtn.textContent = 'View in 2D';
            viewIn2dBtn.className = 'mt-4 ml-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-md shadow-md transition duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-400';
            viewIn2dBtn.setAttribute('title', 'Launches 2D Slicer visualization of this ruleset'); // Tooltip for 2D
            viewIn2dBtn.addEventListener('click', () => {
                // Pass all relevant parameters to slicer.html
                const url = `slicer.html?n=${run.startN}&x=${run.x_param}&y=${run.y_param}&z=${run.z_param}&divColor=${encodeURIComponent(DEFAULT_LINE_COLOR)}&mulColor=${encodeURIComponent(DEFAULT_NODE_COLOR)}`;
                window.open(url, '_blank'); // Open slicer.html in a new browser tab
            });
            runDiv.appendChild(viewIn2dBtn);

            runsHistoryDiv.appendChild(runDiv);
        }
    };

    // Add event listeners to input fields to update gold star visibility
    const xValueInputForStar = document.getElementById('xValue');
    const yValueInputForStar = document.getElementById('yValue');
    const zValueInputForStar = document.getElementById('zValue');

    // Function to update the gold star visibility (CORRECTED)
    function updateGoldStarVisibility() {
        // Ensure elements exist before accessing their values
        const xVal = xValueInputForStar ? parseInt(xValueInputForStar.value) : NaN;
        const yVal = yValueInputForStar ? parseInt(yValueInputForStar.value) : NaN;
        const zVal = zValueInputForStar ? parseInt(zValueInputForStar.value) : NaN;

        const xStar = document.getElementById('x-star');
        const yStar = document.getElementById('y-star');
        const zStar = document.getElementById('z-star');

        // The gold star should only appear when X=2, Y=3, and Z=1 (standard Collatz parameters)
        const isStandardCollatz = (xVal === 2 && yVal === 3 && zVal === 1);

        if (xStar) xStar.style.display = isStandardCollatz ? 'inline-block' : 'none';
        if (yStar) yStar.style.display = isStandardCollatz ? 'inline-block' : 'none';
        if (zStar) zStar.style.display = isStandardCollatz ? 'inline-block' : 'none';
    }

    if (xValueInputForStar) xValueInputForStar.addEventListener('input', updateGoldStarVisibility);
    if (yValueInputForStar) yValueInputForStar.addEventListener('input', updateGoldStarVisibility);
    if (zValueInputForStar) zValueInputForStar.addEventListener('input', updateGoldStarVisibility);

}); // CLOSING BRACE FOR THE MAIN DOMContentLoaded LISTENER
