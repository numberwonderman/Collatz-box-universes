// Default canvas colors
const DEFAULT_LINE_COLOR = '#00f'; // Blue
const DEFAULT_NODE_COLOR = '#ff0'; // Yellow
const DEFAULT_NODE_BORDER_COLOR = '#f00'; // Red
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

// Collatz function definitions (from provided problem statement)
const X = 3; // Multiplier for odd numbers
const Y = 1; // Adder for odd numbers
const Z = 2; // Divisor for even and odd numbers (after addition)

function calculateCollatzSequence(startN, maxIterations = 1000) {
    let sequence = [startN];
    let current = startN;
    let steps = 0;
    let oddCount = 0;
    let maxVal = startN;
    let minVal = startN;
    let sumVal = startN;

    // New variables for paper-specific metrics
    let stoppingTime_t = Infinity; // Least j such that T^j(n) < n
    let coefficientStoppingTime_tau = Infinity; // Least j such that C_j(n) < 1
    let paradoxicalOccurrences = []; // Array to store {step, value, coefficient} for paradoxical points

    const initialN = startN; // Store initial N for stopping time and paradoxical checks

    while (current !== 1 && steps < maxIterations) {
        if (current % 2 === 0) {
            current = current / Z;
        } else {
            current = (X * current + Y) / Z;
            oddCount++; // Increment odd count for 3n+1 operation
        }

        steps++;

        // Check for potential cycles (e.g., if it returns to a previously seen number)
        // This simple check just adds to the sequence, actual cycle detection would need more robust logic
        if (sequence.includes(current) && current !== 1) {
            // Found a cycle, or returning to a previous value that isn't 1.
            // For simplicity, we'll let it terminate by maxIterations for now,
            // but in a real scenario, you'd handle this as a cycle.
            break;
        }

        sequence.push(current);

        // Update statistics
        if (current > maxVal) maxVal = current;
        if (current < minVal) minVal = current;
        sumVal += current;

        // Calculate current coefficient C_j(n) = (3^q) / (2^j)
        const currentCoefficient = (oddCount === 0 && steps === 0) ? 0 : (3 ** oddCount) / (2 ** steps); // Handle initial case

        // Check for stopping time t(n)
        if (current < initialN && stoppingTime_t === Infinity) {
            stoppingTime_t = steps;
        }

        // Check for coefficient stopping time tau(n)
        if (currentCoefficient < 1 && coefficientStoppingTime_tau === Infinity) {
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

        // Safety break for extremely large numbers that might exceed JS precision
        if (current > Number.MAX_SAFE_INTEGER || current < 0) {
            return {
                startN,
                sequence: sequence,
                steps: steps,
                maxVal: maxVal,
                minVal: minVal,
                sumVal: sumVal,
                avgVal: sumVal / sequence.length,
                stdDev: 0, // Placeholder, requires more calculation
                type: "Exceeded Max Safe Integer",
                converges_to_1: false,
                stoppingTime_t: stoppingTime_t,
                coefficientStoppingTime_tau: coefficientStoppingTime_tau,
                paradoxicalOccurrences: paradoxicalOccurrences
            };
        }
    }

    let type = "Unknown";
    let converges_to_1 = false;
    if (current === 1) {
        type = "Converges to 1";
        converges_to_1 = true;
    } else if (steps >= maxIterations) {
        type = "Max Iterations Reached";
    } else if (sequence.includes(current) && current !== 1) {
        type = "Cycle Detected";
    }

    // Calculate Standard Deviation
    let mean = sumVal / sequence.length;
    let sumOfSquares = 0;
    for (let i = 0; i < sequence.length; i++) {
        sumOfSquares += Math.pow(sequence[i] - mean, 2);
    }
    let stdDev = Math.sqrt(sumOfSquares / sequence.length);

    return {
        startN,
        sequence: sequence,
        steps: steps,
        maxVal: maxVal,
        minVal: minVal,
        sumVal: sumVal,
        avgVal: mean,
        stdDev: stdDev,
        type: type,
        converges_to_1: converges_to_1,
        stoppingTime_t: stoppingTime_t === Infinity ? 'N/A' : stoppingTime_t,
        coefficientStoppingTime_tau: coefficientStoppingTime_tau === Infinity ? 'N/A' : coefficientStoppingTime_tau,
        paradoxicalOccurrences: paradoxicalOccurrences
    };
}

// Function to render the 9-net
function render9Net(data) {
    if (!canvas) {
        canvas = document.getElementById('collatzCanvas');
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
    if (sequence.length < 2) return;

    // Calculate dynamic node radius and line thickness based on sequence length
    // For simplicity, we'll keep it fixed or adjust based on a max expected length
    const normalizedLength = Math.min(sequence.length, 100); // Normalize for reasonable scaling
    nodeRadius = minNodeRadius + (maxNodeRadius - minNodeRadius) * (1 - normalizedLength / 100);
    let lineThickness = minLineThickness + (maxLineThickness - minLineThickness) * (1 - normalizedLength / 100);


    // Draw lines first
    for (let i = 0; i < sequence.length - 1; i++) {
        const startNum = sequence[i];
        const endNum = sequence[i + 1];

        // Determine angle and radius for current number
        const startAngle = (startNum % 9) * (2 * Math.PI / 9);
        const startRadius = 50 + startNum * 0.1; // Simple radial progression

        // Determine angle and radius for next number
        const endAngle = (endNum % 9) * (2 * Math.PI / 9);
        const endRadius = 50 + endNum * 0.1; // Simple radial progression

        // Calculate coordinates
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

    // Draw nodes second, so they appear on top of lines
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

        ctx.fillStyle = '#000'; // Text color
        ctx.font = `${Math.max(8, nodeRadius * 0.8)}px Arial`; // Dynamic font size
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(num, x, y);
    }

    ctx.restore();
}

// Function to display sequence statistics
function displaySequenceStats(data) {
    const statsDiv = document.getElementById('sequenceStats');
    if (!statsDiv) return; // Ensure the div exists

    statsDiv.innerHTML = `
        <h3>Sequence Statistics for N=${data.startN}</h3>
        <p><strong>Initial Value:</strong> ${data.startN}</p>
        <p><strong>Steps (J):</strong> ${data.steps}</p>
        <p><strong>Max Value:</strong> ${data.maxVal}</p>
        <p><strong>Min Value:</strong> ${data.minVal}</p>
        <p><strong>Sum of Values:</strong> ${data.sumVal}</p>
        <p><strong>Average Value:</strong> ${data.avgVal.toFixed(2)}</p>
        <p><strong>Standard Deviation:</strong> ${data.stdDev.toFixed(2)}</p>
        <p><strong>Result Type:</strong> ${data.type}</p>
        <p><strong>Converges to 1:</strong> ${data.converges_to_1 ? 'Yes' : 'No'}</p>
        <p><strong>Stopping Time t(n) (first j where T^j(n) < n):</strong> ${data.stoppingTime_t}</p>
        <p><strong>Coefficient Stopping Time τ(n) (first j where C_j(n) < 1):</strong> ${data.coefficientStoppingTime_tau}</p>
        ${data.paradoxicalOccurrences.length > 0 ? `
            <h4>Paradoxical Occurrences (C_j(n) < 1 AND T^j(n) >= n):</h4>
            <ul>
                ${data.paradoxicalOccurrences.map(p => `
                    <li>Step ${p.step}: Value = ${p.value}, Coefficient = ${p.coefficient}</li>
                `).join('')}
            </ul>
        ` : '<p><strong>Paradoxical Occurrences:</strong> None found.</p>'}
    `;
}


// Event listener for single calculation
document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('collatzCanvas');
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

            // Adjust mouse coordinates for current translation and scale
            const worldX = (mouseX - (centerX + translateX)) / scale;
            const worldY = (mouseY - (centerY + translateY)) / scale;

            if (e.deltaY < 0) {
                scale *= scaleAmount;
            } else {
                scale /= scaleAmount;
            }

            // Keep scale within reasonable limits
            scale = Math.max(0.1, Math.min(scale, 10));

            // Adjust translation to zoom towards the mouse cursor
            translateX = -worldX * scale + mouseX - centerX;
            translateY = -worldY * scale + mouseY - centerY;

            if (currentSequenceData) {
                render9Net(currentSequenceData); // Re-render with new scale and translation
            }
        });
    }

    const singleCalculateButton = document.getElementById('singleCalculate');
    if (singleCalculateButton) {
        singleCalculateButton.addEventListener('click', () => {
            const startN = parseInt(document.getElementById('startN').value);
            if (!isNaN(startN) && startN > 0) {
                currentSequenceData = calculateCollatzSequence(startN);
                displaySequenceStats(currentSequenceData);
                render9Net(currentSequenceData);
            } else {
                alert('Please enter a valid positive integer for N.');
            }
        });
    }

    // Event listener for bulk calculation
    const bulkGenerateButton = document.getElementById('bulkGenerate');
    if (bulkGenerateButton) {
        bulkGenerateButton.addEventListener('click', () => {
            const startRange = parseInt(document.getElementById('startRange').value);
            const endRange = parseInt(document.getElementById('endRange').value);
            const maxIterationsBulk = parseInt(document.getElementById('maxIterationsBulk').value);

            if (!isNaN(startRange) && !isNaN(endRange) && startRange > 0 && endRange >= startRange && !isNaN(maxIterationsBulk) && maxIterationsBulk > 0) {
                displayBulkUniverseStats(startRange, endRange, maxIterationsBulk);
            } else {
                alert('Please enter valid positive integers for range and max iterations.');
            }
        });
    }

    // Initialize the canvas display when the page loads, perhaps with a default sequence or empty.
    // For now, it will just clear and set up listeners.
    if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#888';
        ctx.fillText('Enter a number and click "Calculate Single"', canvas.width / 2 / dpi, canvas.height / 2 / dpi);
    }
});


// Function to display bulk universe statistics
function displayBulkUniverseStats(startRange, endRange, maxIterations) {
    const statsDiv = document.getElementById('bulkSequenceStats');
    if (!statsDiv) return;

    let totalSteps = 0;
    let totalMaxVal = 0;
    let totalOddCount = 0;
    let sequencesCount = 0;
    let convergenceCount = 0;
    let maxStoppingTime_t = 0;
    let maxCoefficientStoppingTime_tau = 0;
    let totalParadoxicalOccurrences = 0;

    statsDiv.innerHTML = `<h3>Generating Universe Statistics...</h3>`;

    // It's crucial to use a small delay or Web Workers for large ranges
    // to prevent freezing the UI. For simplicity, we'll run it directly.
    for (let i = startRange; i <= endRange; i++) {
        const result = calculateCollatzSequence(i, maxIterations);
        sequencesCount++;
        totalSteps += result.steps;
        if (result.maxVal > totalMaxVal) totalMaxVal = result.maxVal;
        // The oddCount for bulk stats needs to be adjusted; current code doesn't pass it directly in result for bulk.
        // Let's assume for this example, we'd add totalOddCount to the result object from calculateCollatzSequence.
        // For now, we'll just sum steps.
        
        if (result.converges_to_1) {
            convergenceCount++;
        }

        if (result.stoppingTime_t !== 'N/A' && result.stoppingTime_t > maxStoppingTime_t) {
            maxStoppingTime_t = result.stoppingTime_t;
        }

        if (result.coefficientStoppingTime_tau !== 'N/A' && result.coefficientStoppingTime_tau > maxCoefficientStoppingTime_tau) {
            maxCoefficientStoppingTime_tau = result.coefficientStoppingTime_tau;
        }
        totalParadoxicalOccurrences += result.paradoxicalOccurrences.length;
    }

    statsDiv.innerHTML = `
        <h3>Universe Statistics (N=${startRange} to ${endRange})</h3>
        <p><strong>Numbers Processed:</strong> ${sequencesCount}</p>
        <p><strong>Total Steps Calculated:</strong> ${totalSteps}</p>
        <p><strong>Highest Value Encountered:</strong> ${totalMaxVal}</p>
        <p><strong>Sequences Converging to 1:</strong> ${convergenceCount} (${((convergenceCount / sequencesCount) * 100).toFixed(2)}%)</p>
        <p><strong>Max Stopping Time t(n) in Range:</strong> ${maxStoppingTime_t}</p>
        <p><strong>Max Coefficient Stopping Time τ(n) in Range:</strong> ${maxCoefficientStoppingTime_tau}</p>
        <p><strong>Total Paradoxical Occurrences:</strong> ${totalParadoxicalOccurrences}</p>
    `;
}

// Function to navigate between program sections
function navigateToProgram(page) {
    document.querySelectorAll('.program-section').forEach(section => {
        section.style.display = 'none';
    });
    document.getElementById(page).style.display = 'block';
}
