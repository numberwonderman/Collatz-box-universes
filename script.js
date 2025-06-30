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
