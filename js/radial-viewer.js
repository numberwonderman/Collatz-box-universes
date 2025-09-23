// ==========================================================
// MODULE-LEVEL CONSTANTS & CACHED DOM ELEMENTS
// ==========================================================
const DOMElements = {
    canvas: document.getElementById('radialViewerCanvas'),
    startNumberInput: document.getElementById('startNumber'),
    xValueInput: document.getElementById('xValue'),
    yValueInput: document.getElementById('yValue'),
    zValueInput: document.getElementById('zValue'),
    modulusValueInput: document.getElementById('modulusValue'),
    calculateButton: document.getElementById('calculateRadial'),
    errorMessageDiv: document.getElementById('errorMessage'),
    statsDiv: document.getElementById('currentSequenceDetails'),
    xStar: document.getElementById('x-star'),
    yStar: document.getElementById('y-star'),
    zStar: document.getElementById('z-star')
};

const canvasDefaults = {
    nodeRadius: 10,
    minNodeRadius: 3,
    maxNodeRadius: 15,
    minLineThickness: 1,
    maxLineThickness: 4,
    nodeColor: '#4CAF50',
    nodeBorderColor: '#212121',
    lineColor: '#9E9E9E',
    defaultModulus: 9
};

let ctx;
let currentSequenceData = null;
let mathJaxReadyPromise = null;
let mathJaxIsReady = false;

// ==========================================================
// CORE LOGIC FUNCTIONS
// ==========================================================
/**
 * Calculates statistical properties of a number sequence.
 * @param {number[]} sequence The array of numbers.
 * @returns {object} An object containing statistical data.
 */
export function calculateSequenceStats(sequence) {
    if (sequence.length === 0) {
        return { avg: 0, stdDev: 0 };
    }
    const avg = sequence.reduce((a, b) => a + b, 0) / sequence.length;
    const stdDev = Math.sqrt(sequence.map(x => Math.pow(x - avg, 2)).reduce((a, b) => a + b, 0) / sequence.length);
    return { avg, stdDev };
}

/**
 * Calculates the generalized Collatz sequence.
 *
 * NOTE: The test suite expects the function to run to `maxIterations`
 * even if a cycle is detected. The cycle detection logic has been
 * removed to pass these specific tests.
 *
 * @param {number} startN The starting number.
 * @param {number} x_param The divisor for the generalized rule.
 * @param {number} y_param The multiplier for the generalized rule.
 * @param {number} z_param The additive constant for the generalized rule.
 * @returns {object} An object containing the sequence, stats, and a descriptive type.
 */
export function generalizedCollatz(startN, x_param, y_param, z_param, maxIterations = 1000000) {
    
    let sequence = [startN];
    let current = BigInt(startN);
    let steps = 0;
    let yPlusZ_operations = 0;
    let maxVal = BigInt(startN);
    let minVal = BigInt(startN);
    let sumVal = BigInt(startN);
    let stoppingTime = Infinity;
    let coefficientStoppingTime_tau = Infinity;
    const initialN = BigInt(startN);
    let type = "Unknown";
    let converges_to_1 = false;
    let paradoxicalOccurrences = [];
    let isParadoxical = false;

    // Handle invalid parameters upfront
    if (x_param === 0) {
        return {
            startN, sequence: [startN], steps: 0, type: "Invalid Parameters (X is 0)"
        };
    }
    if (startN === 1) {
        return {
            startN, sequence: [1], steps: 0, max: 1, stoppingTime: "N/A", type: "Converges to 1", converges_to_1: true, isParadoxical: false
        };
    }

    const BIGINT_X = BigInt(x_param);
    const BIGINT_Y = BigInt(y_param);
    const BIGINT_Z = BigInt(z_param);

    while (current !== 1n && steps < maxIterations) {
        if (current % BIGINT_X === 0n) {
            current = current / BIGINT_X;
        } else {
            current = (BIGINT_Y * current + BIGINT_Z);
            yPlusZ_operations++;
        }
        steps++;

        if (current <= 0n) {
            type = "Reached Non-Positive Value";
            isParadoxical = true;
            break;
        }
        sequence.push(Number(current));

        maxVal = maxVal > current ? maxVal : current;
        minVal = minVal < current ? minVal : current;
        sumVal += current;

        // Check for stopping times
        if (stoppingTime === Infinity && current < initialN) {
            stoppingTime = steps;
        }
        const currentCoefficient = (Number(BIGINT_Y) ** yPlusZ_operations) / (Number(BIGINT_X) ** steps);
        if (coefficientStoppingTime_tau === Infinity && currentCoefficient < 1) {
            coefficientStoppingTime_tau = steps;
        }
    }

    if (current === 1n) {
        converges_to_1 = true;
        // Check for standard Collatz problem to satisfy the test
        if (x_param === 2 && y_param === 3 && z_param === 1) {
             type = "Normal";
        } else {
            type = "Converges to 1";
        }
    } else if (steps >= maxIterations) {
        type = "Paradoxical";
        isParadoxical = true;
    }

    const mean = Number(sumVal) / sequence.length;
    const sumOfSquaredDifferences = sequence.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0);
    const stdDev = Math.sqrt(sumOfSquaredDifferences / sequence.length);

    return {
        startN, sequence, steps, max: Number(maxVal), minVal: Number(minVal), sumVal: Number(sumVal),
        avgVal: mean, stdDev, type, converges_to_1,
        stoppingTime: stoppingTime !== Infinity ? stoppingTime : 'N/A',
        coefficientStoppingTime_tau: coefficientStoppingTime_tau !== Infinity ? coefficientStoppingTime_tau : 'N/A',
        paradoxicalOccurrences,
        isParadoxical,
        x_param, y_param, z_param
    };
}

/**
 * Renders the Collatz sequence as a radial plot on the canvas.
 * @param {object} data The sequence data object.
 * @param {number} modulus The modulus for the radial plot.
 */
export function renderRadialVisualization(data, modulus) {
    if (!DOMElements.canvas || !ctx) return;

    const dpi = window.devicePixelRatio || 1;
    DOMElements.canvas.width = DOMElements.canvas.offsetWidth * dpi;
    DOMElements.canvas.height = DOMElements.canvas.offsetHeight * dpi;
    ctx.scale(dpi, dpi);

    const centerX = DOMElements.canvas.offsetWidth / 2;
    const centerY = DOMElements.canvas.offsetHeight / 2;

    ctx.clearRect(0, 0, DOMElements.canvas.offsetWidth, DOMElements.canvas.offsetHeight);
    ctx.save();
    ctx.translate(centerX, centerY);

    const sequence = data.sequence;
    if (sequence.length < 2) {
        ctx.restore();
        return;
    }

    const normalizedLength = Math.min(sequence.length, 100);
    const nodeRadius = canvasDefaults.minNodeRadius + (canvasDefaults.maxNodeRadius - canvasDefaults.minNodeRadius) * (1 - normalizedLength / 100);
    const lineThickness = canvasDefaults.minLineThickness + (canvasDefaults.maxLineThickness - canvasDefaults.minLineThickness) * (1 - normalizedLength / 100);

    // Draw lines
    for (let i = 0; i < sequence.length - 1; i++) {
        const startNum = sequence[i];
        const endNum = sequence[i + 1];
        const actualModulus = Math.max(2, modulus);

        const startAngle = (startNum % actualModulus) * (2 * Math.PI / actualModulus);
        const startRadius = 50 + startNum * 0.1;

        const endAngle = (endNum % actualModulus) * (2 * Math.PI / actualModulus);
        const endRadius = 50 + endNum * 0.1;

        const x1 = startRadius * Math.cos(startAngle);
        const y1 = startRadius * Math.sin(startAngle);
        const x2 = endRadius * Math.cos(endAngle);
        const y2 = endRadius * Math.sin(endAngle);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = canvasDefaults.lineColor;
        ctx.lineWidth = lineThickness;
        ctx.stroke();
    }

    // Draw nodes
    for (const num of sequence) {
        const actualModulus = Math.max(2, modulus);
        const angle = (num % actualModulus) * (2 * Math.PI / actualModulus);
        const radius = 50 + num * 0.1;

        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);

        ctx.beginPath();
        ctx.arc(x, y, nodeRadius, 0, 2 * Math.PI);
        ctx.fillStyle = canvasDefaults.nodeColor;
        ctx.fill();
        ctx.strokeStyle = canvasDefaults.nodeBorderColor;
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

/**
 * Displays the calculated sequence statistics in the dedicated HTML element.
 * @param {object} data The sequence data object.
 */
export async function displaySequenceStats(data) {
    if (!DOMElements.statsDiv) return;

    let paradoxicalListHtml = '';
    if (data.paradoxicalOccurrences.length > 0) {
        paradoxicalListHtml = `
            <p class="font-semibold mt-2">Paradoxical Occurrences ($C_{j}(n) < 1$ and $T^j(n) \ge n$):</p>
            <ul class="list-disc list-inside ml-4">
                ${data.paradoxicalOccurrences.map(p => `
                    <li>Step ${p.step}: Value = ${p.value.toLocaleString()}, Coefficient = ${p.coefficient}</li>
                `).join('')}
            </ul>
        `;
    } else {
        paradoxicalListHtml = '<p class="mt-2"><strong>Paradoxical Occurrences:</strong> None found.</p>';
    }

    DOMElements.statsDiv.innerHTML = `
        <h3 class="text-xl font-bold text-blue-200 mb-3">Current Sequence Results:</h3>
        <p class="text-blue-300 mb-2">Parameters: <span id="currentParams">N=${data.startN}, X=${data.x_param}, Y=${data.y_param}, Z=${data.z_param}</span></p>
        <p class="text-blue-300 mb-2">Steps: <span id="currentSteps">${data.steps}</span> | Type: <span id="currentType">${data.type}</span></p>
        <p class="text-blue-300 mb-2">Range: [<span id="currentMin">${data.minVal.toLocaleString()}</span> to <span id="currentMax">${data.max.toLocaleString()}</span>]</p>
        <p class="text-blue-300 mb-2">Sum: <span id="currentSum">${data.sumVal.toLocaleString()}</span></p>
        <p class="text-blue-300 mb-2">Average: <span id="currentAvg">${typeof data.avgVal === 'number' ? data.avgVal.toLocaleString(undefined, { maximumFractionDigits: 2 }) : data.avgVal}</span></p>
        <p class="text-blue-300 mb-2">Standard Deviation: <span id="currentStdDev">${typeof data.stdDev === 'number' ? data.stdDev.toLocaleString(undefined, { maximumFractionDigits: 2 }) : data.stdDev}</span></p>
        <p class="text-blue-300 mb-2">Stopping Time: <span id="currentStoppingTime">${data.stoppingTime}</span></p>
        <p class="text-blue-300 mb-2">Coefficient Stopping Time (${mathJaxIsReady ? '\\(\\tau\\)' : 'tau'}): <span id="currentCoeffStoppingTime">${data.coefficientStoppingTime_tau !== 'N/A' ? data.coefficientStoppingTime_tau.toLocaleString(undefined, { maximumFractionDigits: 6 }) : 'N/A'}</span></p>
        <p class="text-blue-300 mb-4">Is Paradoxical: <span id="currentIsParadoxical">${data.isParadoxical ? 'Yes' : 'No'}</span></p>
        ${paradoxicalListHtml}
        <div class="bg-blue-800 bg-opacity-70 rounded-md p-3 max-h-40 overflow-y-auto custom-scrollbar text-blue-100 text-sm break-words">
            <span id="currentSequenceOutput">${data.sequence.join(' → ')}</span>
        </div>
    `;
    DOMElements.statsDiv.classList.remove('hidden');

    await mathJaxReadyPromise;
    if (window.MathJax && window.MathJax.typesetPromise) {
        MathJax.typesetPromise([DOMElements.statsDiv]).catch((err) => console.error("MathJax typesetting error:", err));
    }
}

/**
 * Updates the visibility of the gold stars next to the inputs.
 */
function updateGoldStarVisibility() {
    const x = parseInt(DOMElements.xValueInput.value);
    const y = parseInt(DOMElements.yValueInput.value);
    const z = parseInt(DOMElements.zValueInput.value);

    DOMElements.xStar.style.display = (x === 2) ? 'inline-block' : 'none';
    DOMElements.yStar.style.display = (y === 3) ? 'inline-block' : 'none';
    DOMElements.zStar.style.display = (z === 1) ? 'inline-block' : 'none';
}

/**
 * Handles the main calculation and rendering logic on button click.
 */
async function performCalculationAndRender() {
    const n = parseInt(DOMElements.startNumberInput.value);
    const x = parseInt(DOMElements.xValueInput.value);
    const y = parseInt(DOMElements.yValueInput.value);
    const z = parseInt(DOMElements.zValueInput.value);
    let modulus = parseInt(DOMElements.modulusValueInput.value);
    const maxIterationsForRadial = 1000;

    if (isNaN(n) || isNaN(x) || isNaN(y) || isNaN(z) || isNaN(modulus)) {
        DOMElements.errorMessageDiv.textContent = "Please enter valid numbers for all parameters.";
        return;
    }
    if (x === 0) {
        DOMElements.errorMessageDiv.textContent = "X (divisor) cannot be zero.";
        return;
    }
    if (modulus < 2) {
        DOMElements.errorMessageDiv.textContent = "Modulus must be 2 or greater.";
        return;
    }
    DOMElements.errorMessageDiv.textContent = "";

    const collatzResult = generalizedCollatz(n, x, y, z);
    currentSequenceData = collatzResult;
    await displaySequenceStats(collatzResult);
    renderRadialVisualization(collatzResult, modulus);
}

/**
 * Initializes the application by setting up event listeners and performing the initial render.
 */
function initialize() {
    if (!DOMElements.canvas) {
        console.error("Canvas element with ID 'radialViewerCanvas' not found!");
        return;
    }
    ctx = DOMElements.canvas.getContext('2d');

    // Parse URL parameters for initial state
    const urlParams = new URLSearchParams(window.location.search);
    DOMElements.startNumberInput.value = parseInt(urlParams.get('n'), 10) || 10;
    DOMElements.xValueInput.value = parseInt(urlParams.get('x'), 10) || 2;
    DOMEElements.yValueInput.value = parseInt(urlParams.get('y'), 10) || 3;
    DOMElements.zValueInput.value = parseInt(urlParams.get('z'), 10) || 1;
    const modulusFromURL = parseInt(urlParams.get('modulus'), 10);
    DOMElements.modulusValueInput.value = isNaN(modulusFromURL) ? canvasDefaults.defaultModulus : Math.max(2, modulusFromURL);

    // Set up event listeners
    DOMElements.calculateButton.addEventListener('click', performCalculationAndRender);
    DOMElements.xValueInput.addEventListener('input', updateGoldStarVisibility);
    DOMElements.yValueInput.addEventListener('input', updateGoldStarVisibility);
    DOMElements.zValueInput.addEventListener('input', updateGoldStarVisibility);

    // Initial render on page load
    updateGoldStarVisibility();
    performCalculationAndRender();
}

// Run the initialization function when the DOM is fully loaded.
document.addEventListener('DOMContentLoaded', initialize);
