// ==========================================================
// Consolidate ALL Global Variable Declarations at the Top
// ==========================================================

// Default canvas colors (will be updated by color pickers)
let DEFAULT_LINE_COLOR = '#008000'; // Green - for divisible operation (matches image's green)
let DEFAULT_NODE_COLOR = '#FFA500'; // Orange - for multiply/add operation (matches image's orange)
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

    // Clear the entire canvas
    ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

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
    ctx.restore(); // Restore canvas state
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
        paradoxicalOccurrences: paradoxicalOccurrences
    };
}

// Function to render the Radial 9-net (This is the one that was in your previous working state)
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
    const statsDiv = document.getElementById('currentSequenceDetails'); // Correct ID from index_html_final_icons_fix
    if (!statsDiv) return;

    // Update individual spans
    document.getElementById('currentParams').textContent = `N=${data.startN.toLocaleString()}, X=${data.x_param}, Y=${data.y_param}, Z=${data.z_param}`;
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
                <li>Invalid Parameters (X=0): ${invalidParamsCount.toLocaleString()}</li>
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

    // --- START New Mode Switching Code ---
    // Get references to the mode radio buttons and calculator sections
    const modeSingle = document.getElementById('modeSingle');
    const modeBulk = document.getElementById('modeBulk');
    const singleSection = document.getElementById('singleCalculatorSection');
    const bulkSection = document.getElementById('bulkCalculatorSection');

    // Function to update section visibility
    function updateCalculatorMode() {
        const singleNineNetContainer = document.getElementById('singleNineNetContainer'); // Get the container div for the canvas

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
                    // Adjust text position for DPI
                    ctx.fillText('Enter a number and click "Calculate Single"', canvas.width / 2 / dpi, canvas.height / 2 / dpi);
                }
            }

        } else { // modeBulk.checked
            singleSection.classList.add('hidden');
            bulkSection.classList.remove('hidden');
            if (singleNineNetContainer) {
                singleNineNetContainer.classList.add('hidden'); // Ensure canvas container is hidden in bulk mode
            }
        }
        // Optionally hide stats when switching modes to prevent confusion
        document.getElementById('currentSequenceDetails').classList.add('hidden'); // Corrected ID
        document.getElementById('bulkSequenceStats').classList.add('hidden');
    }

    // Set initial visibility on page load
    updateCalculatorMode();

    // Add event listeners to the radio buttons
    modeSingle.addEventListener('change', updateCalculatorMode);
    modeBulk.addEventListener('change', updateCalculatorMode);
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
            // Pass x_param, y_param, z_param to the data object for displaySequenceStats to use
            currentSequenceData.x_param = xValue;
            currentSequenceData.y_param = yValue;
            currentSequenceData.z_param = zValue;

            displaySequenceStats(currentSequenceData);
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
            if (currentSequenceData) drawNineNetCanvas(currentSequenceData); // Update unfolded box color
        });
    }

    const mulColorPicker = document.getElementById('mulColorPicker');
    if (mulColorPicker) {
        mulColorPicker.addEventListener('input', (e) => {
            DEFAULT_NODE_COLOR = e.target.value;
            if (currentSequenceData) drawNineNetCanvas(currentSequenceData); // Update unfolded box color
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
                    // Replaced alert with a more user-friendly message in the errorMessageDiv
                    document.getElementById('errorMessage').textContent = 'Please enter valid numbers for N, X, Y, and Z.';
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
                // Replaced alert with a more user-friendly message in the errorMessageDiv
                document.getElementById('errorMessage').textContent = 'Please select a visualization tool to launch.';
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
        // Using a small timeout to ensure all DOM elements are fully rendered before click
        setTimeout(() => {
            calculateSingleButton.click();
        }, 100); 
    } else if (singleNineNetCanvasElement && startNumberInput && xValueInput && yValueInput && zValueInput) {
        // If no URL parameters, perform initial draw with default values from input fields
        const defaultN = parseInt(startNumberInput.value);
        const defaultX = parseInt(xValueInput.value);
        const defaultY = parseInt(yValueInput.value);
        const defaultZ = parseInt(zValueInput.value);
        const maxSteps = 10000;
        // The calculateCollatzSequence function expects x_param, y_param, z_param as direct arguments
        const defaultResult = calculateCollatzSequence(defaultN, maxSteps, defaultX, defaultY, defaultZ);
        
        // Pass x_param, y_param, z_param to the data object for drawNineNetCanvas to use
        // This ensures the draw function has access to the X value for color logic
        defaultResult.x_param = defaultX; 
        defaultResult.y_param = defaultY;
        defaultResult.z_param = defaultZ;

        if (defaultResult.type !== "error") { // Assuming "error" type for invalid parameters
            drawNineNetCanvas(defaultResult); // Use drawNineNetCanvas for unfolded box on initial load
            displaySequenceStats(defaultResult); // Display stats for the default sequence
        }
    }

    // Call renderHistory and updateGoldStarVisibility if those functions exist
    // These functions need to be defined somewhere in your script.js or included HTML
    // Placeholder functions if they are not defined elsewhere to prevent errors
    function renderHistory() {
        const historyContainer = document.getElementById('historyContainer');
        const runsHistory = document.getElementById('runsHistory');
        if (historyContainer && runsHistory) {
            if (calculatedRuns.length > 0) {
                historyContainer.classList.remove('hidden');
                runsHistory.innerHTML = calculatedRuns.map(run => `
                    <div class="bg-blue-800 bg-opacity-40 rounded-lg p-3 mb-2 text-blue-100 text-sm">
                        <strong>N=${run.startN}, X=${run.x_param}, Y=${run.y_param}, Z=${run.z_param}</strong><br>
                        Steps: ${run.steps}, Type: ${run.type}<br>
                        Avg: ${run.avgVal.toFixed(2)}, Max: ${run.maxVal.toLocaleString()}
                    </div>
                `).join('');
            } else {
                historyContainer.classList.add('hidden');
            }
        }
    }

    function updateGoldStarVisibility() {
        // This function would typically check conditions for gold stars (e.g., if X, Y, Z are 2, 3, 1)
        // For now, let's just ensure they are visible if their parent elements exist.
        const xStar = document.getElementById('x-star');
        const yStar = document.getElementById('y-star');
        const zStar = document.getElementById('z-star');

        // Check if current X, Y, Z values match standard Collatz (2, 3, 1)
        const currentX = parseInt(document.getElementById('xValue').value);
        const currentY = parseInt(document.getElementById('yValue').value);
        const currentZ = parseInt(document.getElementById('zValue').value);

        if (xStar) xStar.style.display = (currentX === 2) ? 'inline-block' : 'none';
        if (yStar) yStar.style.display = (currentY === 3) ? 'inline-block' : 'none';
        if (zStar) zStar.style.display = (currentZ === 1) ? 'inline-block' : 'none';
    }


    if (typeof renderHistory === 'function') {
        renderHistory();
    }
    if (typeof updateGoldStarVisibility === 'function') {
        updateGoldStarVisibility();
    }
}); // CLOSING BRACE FOR THE MAIN DOMContentLoaded LISTENER
