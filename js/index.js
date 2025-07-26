// index.js

// ==========================================================
// IMPORTS
// ==========================================================
// Import functions from utils.js
import { calculateCollatzSequence, drawNineNetCanvasSecondaru} from './utils.js';

// ==========================================================
// GLOBAL VARIABLES (UI-related state)
// ==========================================================
// Global variable to store current sequence data (for visualization tools)
let currentSequenceData = null;

// ==========================================================
// HELPER FUNCTIONS (for UI management)
// ==========================================================

/**
 * Formats a numerical sequence into a string with line breaks for display.
 * @param {Array<number>} sequence - The array of numbers in the sequence.
 * @param {number} [maxItemsPerRow=10] - Maximum number of items to display per row.
 * @returns {string} The formatted HTML string.
 */
function formatSequenceOutput(sequence, maxItemsPerRow = 10) {
    let output = '';
    for (let i = 0; i < sequence.length; i++) {
        output += sequence[i];
        if (i < sequence.length - 1) {
            output += ', ';
        }
        if ((i + 1) % maxItemsPerRow === 0 && i < sequence.length - 1) {
            output += '<br>';
        }
    }
    return output;
}

/**
 * Saves a calculation result to the history display.
 * @param {object} data - The result data object from a Collatz calculation.
 */
function saveToHistory(data) {
    const historyContainer = document.getElementById('historyContainer');
    const runsHistory = document.getElementById('runsHistory');
    historyContainer.classList.remove('hidden'); // Ensure history container is visible

    const historyEntry = document.createElement('div');
    historyEntry.classList.add('bg-blue-800', 'bg-opacity-40', 'rounded-lg', 'p-4', 'mb-3', 'border', 'border-blue-600', 'shadow-md');
    historyEntry.innerHTML = `
        <p class="text-blue-200 font-bold mb-1">Run: N=${data.startN}, X=${data.x}, Y=${data.y}, Z=${data.z}</p>
        <p class="text-blue-300 text-sm">Steps: ${data.steps} | Type: ${data.type}</p>
        <p class="text-blue-300 text-sm">Range: [${data.minVal} to ${data.maxVal}] | Avg: ${data.avgVal.toFixed(2)}</p>
        <p class="text-blue-300 text-sm">Stopping Time (t): ${data.stoppingTime_t} | Coeff. Stopping Time (&tau;): ${data.coefficientStoppingTime_tau}</p>
        <div class="bg-blue-700 bg-opacity-50 rounded-md p-2 mt-2 max-h-24 overflow-y-auto custom-scrollbar text-blue-100 text-xs">
            ${formatSequenceOutput(data.sequence)}
        </div>
    `;
    runsHistory.prepend(historyEntry); // Add new entry to the top
}

/**
 * Displays an error message in the dedicated error message element.
 * @param {string} message - The error message to display.
 */
function displayErrorMessage(message) {
    const errorMessageElement = document.getElementById('errorMessage');
    errorMessageElement.textContent = message;
    errorMessageElement.classList.remove('hidden'); // Ensure it's visible
}

/**
 * Clears and hides the error message element.
 */
function clearErrorMessage() {
    const errorMessageElement = document.getElementById('errorMessage');
    errorMessageElement.textContent = '';
    errorMessageElement.classList.add('hidden'); // Hide it
}

// ==========================================================
// EVENT LISTENERS
// ==========================================================

// Event Listener for Single Sequence Calculation
document.getElementById('calculateSingle').addEventListener('click', () => {
    clearErrorMessage(); // Clear any previous error messages

    const startN = parseInt(document.getElementById('startNumber').value);
    const xVal = parseInt(document.getElementById('xValue').value);
    const yVal = parseInt(document.getElementById('yValue').value);
    const zVal = parseInt(document.getElementById('zValue').value);
    const maxIterations = 1000; // Define a reasonable max iterations

    // Input validation
    if (isNaN(startN) || isNaN(xVal) || isNaN(yVal) || isNaN(zVal)) {
        displayErrorMessage('Please enter valid numbers for all fields.');
        return;
    }
    if (startN <= 0) {
        displayErrorMessage('Starting number (n) must be positive.');
        return;
    }
    if (xVal === 0) { // X (divisor) cannot be zero
        displayErrorMessage('X (divisor) cannot be zero.');
        return;
    }

    // Get current colors for the canvas from color pickers
    const divColor = document.getElementById('divColorPicker').value;
    const mulColor = document.getElementById('mulColorPicker').value;

    // Calculate the Collatz sequence using the utility function
    const result = calculateCollatzSequence(startN, maxIterations, xVal, yVal, zVal);

    // Store the result data globally for potential use by visualization tools
    currentSequenceData = {
        startN: result.startN,
        x: xVal,
        y: yVal,
        z: zVal,
        steps: result.steps,
        maxVal: result.maxVal,
        minVal: result.minVal,
        sumVal: result.sumVal,
        avgVal: result.avgVal,
        stdDev: result.stdDev,
        type: result.type,
        sequence: result.sequence,
        stoppingTime_t: result.stoppingTime_t,
        coefficientStoppingTime_tau: result.coefficientStoppingTime_tau,
        paradoxicalOccurrences: result.paradoxicalOccurrences
    };

    // Update the UI with the calculation results
    document.getElementById('currentParams').textContent = `N=${startN}, X=${xVal}, Y=${yVal}, Z=${zVal}`;
    document.getElementById('currentSteps').textContent = result.steps;
    document.getElementById('currentType').textContent = result.type;
    document.getElementById('currentMin').textContent = result.minVal;
    document.getElementById('currentMax').textContent = result.maxVal;
    document.getElementById('currentSum').textContent = result.sumVal;
    document.getElementById('currentAvg').textContent = result.avgVal.toFixed(2);
    document.getElementById('currentStdDev').textContent = result.stdDev.toFixed(2);
    document.getElementById('currentStoppingTime').textContent = result.stoppingTime_t;
    document.getElementById('currentCoeffStoppingTime').textContent = result.coefficientStoppingTime_tau;
    document.getElementById('currentIsParadoxical').textContent = result.paradoxicalOccurrences.length > 0 ? `Yes (${result.paradoxicalOccurrences.length} points)` : 'No';
    document.getElementById('currentSequenceOutput').innerHTML = formatSequenceOutput(result.sequence);

    // Make the single sequence details section visible
    document.getElementById('currentSequenceDetails').classList.remove('hidden');

    // Draw the 9-net visualization on the canvas
    const singleCanvas = document.getElementById('singleNineNetCanvas');
    drawNineNetCanvasSecondary(singleCanvas, result.sequence, xVal, divColor, mulColor);

    // Save the current calculation to the history
    saveToHistory({
        startN: startN, x: xVal, y: yVal, z: zVal,
        steps: result.steps, maxVal: result.maxVal, minVal: result.minVal, avgVal: result.avgVal,
        type: result.type, sequence: result.sequence, stoppingTime_t: result.stoppingTime_t,
        coefficientStoppingTime_tau: result.coefficientStoppingTime_tau
    });

    // Re-render any existing MathJax equations that might have been added or updated
    if (typeof MathJax !== 'undefined') {
        MathJax.typeset();
    }
});

// Event Listener for Bulk Universe Generation
document.getElementById('generateBulk').addEventListener('click', () => {
    clearErrorMessage(); // Clear any previous error messages

    const xStart = parseInt(document.getElementById('xStart').value);
    const xEnd = parseInt(document.getElementById('xEnd').value);
    const yStart = parseInt(document.getElementById('yStart').value);
    const yEnd = parseInt(document.getElementById('yEnd').value);
    const zStart = parseInt(document.getElementById('zStart').value);
    const zEnd = parseInt(document.getElementById('zEnd').value);
    const maxIterations = 1000; // Max iterations for each sequence in bulk

    // Input validation for bulk parameters
    if (isNaN(xStart) || isNaN(xEnd) || isNaN(yStart) || isNaN(yEnd) || isNaN(zStart) || isNaN(zEnd)) {
        displayErrorMessage('Please enter valid numbers for all bulk generation fields.');
        return;
    }

    if (xStart < 1 || yStart < 1 || zStart < 1) {
        displayErrorMessage('X, Y, and Z start values must be at least 1.');
        return;
    }

    if (xEnd < xStart || yEnd < yStart || zEnd < zStart) {
        displayErrorMessage('End values must be greater than or equal to start values.');
        return;
    }

    const results = [];
    // Loop through the ranges of X, Y, Z to generate multiple sequences
    for (let x = xStart; x <= xEnd; x++) {
        for (let y = yStart; y <= yEnd; y++) {
            for (let z = zStart; z <= zEnd; z++) {
                // For bulk generation, we'll iterate with n = 1 to 10 for each (X,Y,Z) combination
                // This can be changed if the user wants to test a specific range of N
                for (let n = 1; n <= 10; n++) { // Test N from 1 to 10 for each (X,Y,Z)
                    const result = calculateCollatzSequence(n, maxIterations, x, y, z);
                    results.push({ n, x, y, z, ...result }); // Store the parameters along with the result
                }
            }
        }
    }

    // Display bulk results summary
    const bulkStatsDiv = document.getElementById('bulkSequenceStats');
    bulkStatsDiv.classList.remove('hidden'); // Make the bulk stats section visible
    let outputHtml = '<h3 class="text-xl font-bold text-blue-200 mb-3">Bulk Universe Summary:</h3>';

    // Aggregate statistics from all generated sequences
    let totalConverged = 0;
    let totalCycles = 0;
    let totalMaxIterations = 0;
    let totalParadoxical = 0;
    let maxStepsOverall = 0;
    let minValOverall = Infinity;
    let maxValOverall = 0;

    results.forEach(res => {
        if (res.type === "Converges to 1") totalConverged++;
        if (res.type === "Cycle Detected") totalCycles++;
        if (res.type === "Max Iterations Reached" || res.type === "Exceeded Max Iterations (Possible Divergence)") totalMaxIterations++;
        if (res.paradoxicalOccurrences && res.paradoxicalOccurrences.length > 0) totalParadoxical++;

        if (res.steps > maxStepsOverall) maxStepsOverall = res.steps;
        if (res.minVal < minValOverall) minValOverall = res.minVal;
        if (res.maxVal > maxValOverall) maxValOverall = res.maxVal;
    });

    // Append summary statistics to the output HTML
    outputHtml += `<p class="text-blue-300">Total Sequences Tested: ${results.length}</p>`;
    outputHtml += `<p class="text-blue-300">Converged to 1: ${totalConverged}</p>`;
    outputHtml += `<p class="text-blue-300">Cycles Detected: ${totalCycles}</p>`;
    outputHtml += `<p class="text-blue-300">Reached Max Iterations: ${totalMaxIterations}</p>`;
    outputHtml += `<p class="text-blue-300">Paradoxical Sequences: ${totalParadoxical}</p>`;
    outputHtml += `<p class="text-blue-300">Max Steps in any sequence: ${maxStepsOverall}</p>`;
    outputHtml += `<p class="text-blue-300">Overall Value Range: [${minValOverall} to ${maxValOverall}]</p>`;

    bulkStatsDiv.innerHTML = outputHtml; // Update the bulk stats display
});

// Event listeners for mode selection (Single Calculator vs. Bulk Calculator)
document.querySelectorAll('input[name="calculatorMode"]').forEach(radio => {
    radio.addEventListener('change', (event) => {
        const singleSection = document.getElementById('singleCalculatorSection');
        const bulkSection = document.getElementById('bulkCalculatorSection');
        const historyContainer = document.getElementById('historyContainer');
        const singleSequenceDetails = document.getElementById('currentSequenceDetails');
        const bulkSequenceStats = document.getElementById('bulkSequenceStats');
        const singleNineNetContainer = document.getElementById('singleNineNetContainer');
        const colorPickerGroup = document.querySelector('.color-picker-group');

        // Adjust visibility based on the selected mode
        if (event.target.value === 'single') {
            singleSection.classList.remove('hidden');
            bulkSection.classList.add('hidden');
            historyContainer.classList.remove('hidden'); // History is always visible in single mode
            bulkSequenceStats.classList.add('hidden'); // Hide bulk stats
            singleNineNetContainer.classList.remove('hidden'); // Show single canvas
            colorPickerGroup.classList.remove('hidden'); // Show color pickers
        } else { // 'bulk' mode selected
            singleSection.classList.add('hidden');
            bulkSection.classList.remove('hidden');
            historyContainer.classList.add('hidden'); // Hide history in bulk mode
            singleSequenceDetails.classList.add('hidden'); // Hide single sequence details
            singleNineNetContainer.classList.add('hidden'); // Hide single canvas
            colorPickerGroup.classList.add('hidden'); // Hide color pickers
        }
        clearErrorMessage(); // Clear any error messages when switching modes
    });
});

// Event Listener for Launch Visualization Tool button
document.getElementById('launchVisualization').addEventListener('click', () => {
    const selectedTool = document.querySelector('input[name="visualization"]:checked').value;
    // Construct the base URL for the visualization tool
    const baseUrl = window.location.origin + window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
    let targetUrl = baseUrl + selectedTool;

    // If the selected tool requires sequence parameters, append them to the URL
    if (selectedTool === 'box-universe-viewer.html' || selectedTool === 'slicer.html' || selectedTool === 'radial-animator.html' || selectedTool === 'radial-viewer.html' || selectedTool === 'box-universe-fps.html') {
        if (currentSequenceData) { // Check if a single sequence has been calculated
            const params = new URLSearchParams({
                n: currentSequenceData.startN,
                x: currentSequenceData.x,
                y: currentSequenceData.y,
                z: currentSequenceData.z,
                sequence: JSON.stringify(currentSequenceData.sequence), // Pass the full sequence as a JSON string
                divColor: document.getElementById('divColorPicker').value, // Pass current color picker values
                mulColor: document.getElementById('mulColorPicker').value
            });
            targetUrl += `?${params.toString()}`; // Append parameters to the URL
        } else {
            // Display an error if no single sequence is available for the visualization tool
            displayErrorMessage('Please calculate a single sequence first to pass parameters to the visualization tool.');
            return; // Stop execution
        }
    }
    window.open(targetUrl, '_blank'); // Open the visualization tool in a new tab
});

// ==========================================================
// INITIAL SETUP ON DOM CONTENT LOADED
// ==========================================================
document.addEventListener('DOMContentLoaded', () => {
    // Initial canvas setup: Clear and draw a placeholder message
    const singleCanvas = document.getElementById('singleNineNetCanvas');
    if (singleCanvas) { // Ensure the canvas element exists
        const ctx = singleCanvas.getContext('2d');
        ctx.clearRect(0, 0, singleCanvas.width, singleCanvas.height); // Clear previous drawings
        // Draw a semi-transparent background as a placeholder
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(0, 0, singleCanvas.width, singleCanvas.height);
        // Draw informational text
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '16px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Calculate a sequence to visualize the 9-net here', singleCanvas.width / 2, singleCanvas.height / 2);
    }

    // Set initial display of sections based on the default selected radio button for calculator mode
    const initialMode = document.querySelector('input[name="calculatorMode"]:checked').value;
    if (initialMode === 'bulk') {
        // If bulk is default, hide single mode elements and show bulk
        document.getElementById('singleCalculatorSection').classList.add('hidden');
        document.getElementById('bulkCalculatorSection').classList.remove('hidden');
        document.getElementById('historyContainer').classList.add('hidden');
        document.getElementById('currentSequenceDetails').classList.add('hidden');
        document.getElementById('singleNineNetContainer').classList.add('hidden');
        document.querySelector('.color-picker-group').classList.add('hidden');
    }
    // If 'single' is default, no changes are needed as elements are visible by default in HTML
});

// Initialize MathJax after DOM is loaded and ensure it typesets dynamically added content
document.addEventListener('DOMContentLoaded', () => {
    if (typeof MathJax !== 'undefined') {
       MathJax.typesetPromise(); // Use typesetPromise for async rendering of math
    }
});
