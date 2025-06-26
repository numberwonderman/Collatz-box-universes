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

// Stores the current sequence data for rendering
let currentSequenceData = null;

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

// Function to render the 9-net
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
                    render9Net(currentSequenceData); // Re-render with new translation
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
                render9Net(currentSequenceData); // Re-render with new scale and translation
            }
        });
    }

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
            render9Net(currentSequenceData);
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
            if (currentSequenceData) render9Net(currentSequenceData);
        });
    }

    const mulColorPicker = document.getElementById('mulColorPicker');
    if (mulColorPicker) {
        mulColorPicker.addEventListener('input', (e) => {
            DEFAULT_NODE_COLOR = e.target.value;
            if (currentSequenceData) render9Net(currentSequenceData);
        });
    }

    // Initial state: Clear canvas and hide stats
    if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#888';
        ctx.fillText('Enter a number and click "Calculate Single"', canvas.width / 2 / dpi, canvas.height / 2 / dpi);
    }
    // Ensure stats divs are hidden on initial load
    document.getElementById('singleSequenceStats').classList.add('hidden');
    document.getElementById('bulkSequenceStats').classList.add('hidden');
    document.getElementById('historyContainer').classList.add('hidden'); // History is not yet implemented in JS
});
