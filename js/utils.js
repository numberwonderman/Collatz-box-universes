// utils.js

// ==========================================================
// Consolidate ALL Global Variable Declarations at the Top
// ==========================================================

// Default canvas colors (will be updated by color pickers)
export let DEFAULT_LINE_COLOR = '#34d399'; // Green - for divisible operation (matches image's green)
export let DEFAULT_NODE_COLOR = '#fb923c'; // Orange - for multiply/add operation (matches image's orange)
export const DEFAULT_NODE_BORDER_COLOR = '#f00'; // Red (kept fixed, or add picker if needed)
export const DEFAULT_NODE_RADIUS = 5;

// Variables for drag and zoom (if used globally across utils-dependent modules)
export let translateX = 0;
export let translateY = 0;
export let scale = 1;

// Define dpi globally and once
export const dpi = window.devicePixelRatio || 1;

// NEW: Global padding variable for the unfolded box visualization
export const PADDING_BETWEEN_GROUPS = 10; // Padding between the large 3x3 remainder groups

// Constants for Collatz parameters and limits
export const MAX_ITERATIONS = 1000; // Default max iterations for sequences
export const DEBUG_MODE = true; // Global debug flag
export const DEFAULT_X_DIVISOR = 2;
export const DEFAULT_Y_MULTIPLIER = 3;
export const DEFAULT_Z_ADDER = 1;

// ==========================================================
// Core Collatz Calculation & Utilities
// ==========================================================

/**
 * Calculates a generalized Collatz sequence.
 * @param {number} num - The starting number.
 * @param {number} x - The divisor.
 * @param {number} y - The multiplier.
 * @param {number} z - The adder.
 * @param {number} maxIterations - Maximum number of iterations to prevent infinite loops.
 * @returns {{sequence: Array<number>, type: string, message?: string}} Object containing sequence and its type/message.
 */
export function generalizedCollatz(num, x, y, z, maxIterations = MAX_ITERATIONS) {
  if (x === 0) {
    return { sequence: [], type: "error", message: "Error: X (divisor) cannot be zero." };
  }
  const output = [num];
  let iterations = 0;
  let currentNum = num;

  while (currentNum !== 1 && iterations < maxIterations) {
    let nextNum;
    if (currentNum % Math.abs(x) === 0) {
      nextNum = currentNum / x;
    } else {
      nextNum = (Math.abs(y) || 3) * currentNum + (z || 1);
    }

    // Check for cycles
    if (output.includes(nextNum)) {
      output.push(nextNum); // Add the repeating number to show the cycle
      return { sequence: output, type: "cycle", message: `Sequence entered a cycle at ${nextNum}.` };
    }

    currentNum = nextNum;
    output.push(currentNum);
    iterations++;
  }

  if (currentNum === 1) {
    return { sequence: output, type: "converges_to_1", message: `Sequence converged to 1 in ${iterations} iterations.` };
  } else {
    return { sequence: output, type: "reached_max_iterations", message: `Sequence reached max iterations (${maxIterations}) at ${currentNum}.` };
  }
}

// Renaming for consistency across files where 'sequence' was used
export const calculateCollatzSequence = generalizedCollatz;

/**
 * Calculates the mean (average) of a numerical sequence.
 * @param {Array<number>} sequence - The array of numbers.
 * @returns {number} The mean of the sequence.
 */
export function calculateMean(sequence) {
  if (sequence.length === 0) return 0;
  const sum = sequence.reduce((acc, val) => acc + val, 0);
  return sum / sequence.length;
}

/**
 * Calculates the standard deviation of a numerical sequence.
 * @param {Array<number>} sequence - The array of numbers.
 * @param {number} mean - The pre-calculated mean of the sequence.
 * @returns {number} The standard deviation.
 */
export function calculateStandardDeviation(sequence, mean) {
  if (sequence.length < 2) return 0; // Standard deviation is 0 for less than 2 elements
  const variance = sequence.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / sequence.length;
  return Math.sqrt(variance);
}

/**
 * Calculates the sum of a numerical sequence.
 * @param {Array<number>} sequence - The array of numbers.
 * @returns {number} The sum of the sequence.
 */
export function calculateSum(sequence) {
  return sequence.reduce((acc, val) => acc + val, 0);
}

// ==========================================================
// UI & Canvas Utilities
// ==========================================================

/**
 * Displays a custom message in a designated message area.
 * @param {string} message - The message to display.
 * @param {string} type - 'info', 'success', or 'error' to determine styling.
 * @param {string} messageBoxId - The ID of the message box element.
 * @param {number} duration - How long the message should be visible in ms.
 * @param {string} initialClasses - Base classes for the message box.
 */
let messageTimer = null; // Declare globally for displayMessage
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
  else typeClass = 'bg-blue-500'; // Default info

  messageArea.className = `${initialClasses} ${typeClass}`;
  messageArea.classList.remove('hidden');

  messageTimer = setTimeout(() => {
    messageArea.classList.add('hidden');
  }, duration);
}

// Keeping displayMessage as an alias for compatibility where used
export const displayMessage = showMessage;

/**
 * Function to format the sequence output for display
 * @param {Array<number>} sequence - The sequence to format
 * @returns {string} The formatted string
 */
export function formatSequenceOutput(sequence) {
  if (!sequence || sequence.length === 0) return "No sequence to display.";
  const maxItems = 100;
  let output = sequence.slice(0, maxItems).join(', ');
  if (sequence.length > maxItems) {
    output += '... (sequence truncated for display)';
  }
  return `[${output}]`;
}

/**
 * Function to save a calculation to the history
 * @param {Object} data - The data object to save
 */
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
          **Stopping Times**: t=${data.stoppingTime_t || 'N/A'} | τ=${data.coefficientStoppingTime_tau || 'N/A'}
      </p>
  `;

  historyItem.innerHTML = itemHtml;
  historyContainer.prepend(historyItem);

  if (typeof MathJax !== 'undefined') {
      MathJax.typesetPromise([historyItem]);
  }
}

/**
 * Generates a link URL with parameters for different visualizations.
 * @param {string} visualizationKey - Key indicating the visualization type (e.g., 'collatz-dragon', 'boxviewer').
 * @param {Object} [params={}] - Optional parameters to append to the URL.
 * @returns {string} The generated URL.
 */
export function generateLinkURL(visualizationKey, params = {}) {
  const baseUrl = window.location.origin + window.location.pathname;
  const urlMap = {
    'collatz-dragon': 'collatz-dragon.html',
    'boxviewer': 'box-universe-viewer.html',
    'slicer3d_fps': 'box-universe-fps.html', // Corresponds to Box Universe Slicer 3D
    'collatz-lines-explorer': 'collatz-lines-explorer.html',
    'slicer2d': 'slicer.html', // 2D pseudo-3D slicer
    'radial-animator': 'radial-animator.html', // 2D pseudo-3D slicer (Radial)
    'radial-viewer': 'radial-viewer.html', // Collatz Radial Viewer
    'index': 'index.html' // Main hub
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

/**
 * Updates the visibility of the gold star icon based on specific Collatz parameters (N=27, X=2, Y=3, Z=1).
 * @param {number} n - The current N value.
 * @param {number} x - The current X value.
 * @param {number} y - The current Y value.
 * @param {number} z - The current Z value.
 * @param {string} starId - The ID of the gold star icon element.
 */
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

// Keeping updateGoldStar and updateGoldStarVisibilitySlicer as aliases for compatibility where used
export const updateGoldStar = updateGoldStarVisibility;
export const updateGoldStarVisibilitySlicer = updateGoldStarVisibility;


/**
 * Converts a hex color string to an RGB object.
 * @param {string} hex - The hex color string (e.g., "#RRGGBB").
 * @returns {{r: number, g: number, b: number}} RGB object.
 */
export function hexToRgb(hex) {
  const r = parseInt(hex.substring(1, 3), 16);
  const g = parseInt(hex.substring(3, 5), 16);
  const b = parseInt(hex.substring(5, 7), 16);
  return { r, g, b };
}

/**
 * Checks if a color is light or dark based on its RGB components.
 * Useful for determining text color contrast.
 * @param {string} hexColor - The hex color string.
 * @returns {boolean} True if the color is light, false otherwise.
 */
export function isLight(hexColor) {
  const rgb = hexToRgb(hexColor);
  // HSP (Highly Sensitive Pooled) equation for perceived brightness
  const hsp = Math.sqrt(
    0.299 * (rgb.r * rgb.r) +
    0.587 * (rgb.g * rgb.g) +
    0.114 * (rgb.b * rgb.b)
  );
  // Use a threshold (e.g., 127.5 for 0-255 range)
  return hsp > 180; // Adjusted threshold for better contrast
}

/**
 * Draws the 9-net (3x3 grid visualization) on a canvas.
 * @param {HTMLCanvasElement} canvas - The canvas element.
 * @param {Array<number>} sequence - The Collatz sequence to visualize.
 * @param {number} xVal - The X (divisor) parameter for Collatz.
 * @param {string} divColor - Color for numbers divisible by X.
 * @param {string} mulColor - Color for numbers not divisible by X (multiplied).
 */
export function drawNineNetCanvasSecondary(canvas, sequence, xVal, divColor, mulColor) {
  if (!canvas) {
    if (DEBUG_MODE) console.error("Canvas element not found for 9-net drawing.");
    return;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    if (DEBUG_MODE) console.error("2D context not available for 9-net drawing.");
    return;
  }

  const faceSize = canvas.width / 3;
  let sequenceIndex = 0;

  // Define the grid positions for drawing
  const gridPositions = [
    // Center face (remainder 0)
    { r: 1, c: 1, remainder: 0 },
    // Top-left (remainder 1, if any)
    { r: 0, c: 0, remainder: 1 },
    // Top-center (remainder 2, if any)
    { r: 0, c: 1, remainder: 2 },
    // Top-right (remainder 3, if any)
    { r: 0, c: 2, remainder: 3 },
    // Mid-left (remainder 4, if any)
    { r: 1, c: 0, remainder: 4 },
    // Mid-right (remainder 5, if any)
    { r: 1, c: 2, remainder: 5 },
    // Bottom-left (remainder 6, if any)
    { r: 2, c: 0, remainder: 6 },
    // Bottom-center (remainder 7, if any)
    { r: 2, c: 1, remainder: 7 },
    { r: 2, c: 2, remainder: 8 }
  ];

  ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas
  ctx.font = `${faceSize * 0.4}px Inter, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Draw grid lines
  ctx.strokeStyle = "#4a5568"; // Grid line color
  ctx.lineWidth = 1;
  for (let i = 1; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(i * faceSize, 0);
    ctx.lineTo(i * faceSize, canvas.height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * faceSize);
    ctx.lineTo(canvas.width, i * faceSize);
    ctx.stroke();
  }


  gridPositions.forEach(pos => {
    const x = pos.c * faceSize;
    const y = pos.r * faceSize;
    let color = "#333"; // Default empty square color
    let label = ""; // Default empty label

    // Check if there's a corresponding number in the sequence for this square
    if (sequenceIndex < sequence.length) {
      const num = sequence[sequenceIndex];
      // Determine color based on divisibility by X
      color = (num % xVal === 0) ? divColor : mulColor;
      label = num; // Set the number as label
      sequenceIndex++; // Move to the next number in the sequence
    }

    ctx.fillStyle = color;
    ctx.fillRect(x, y, faceSize, faceSize);
    ctx.strokeStyle = "#222"; // Darker border for separation
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, faceSize, faceSize);

    // Optional: Draw the number inside the square
    if (label !== "") {
      ctx.fillStyle = isLight(color) ? "#000" : "#fff"; // Text color contrast
      ctx.fillText(label, x + faceSize / 2, y + faceSize / 2);
    }
  });
}


/**
 * Renders the 9-net (3x3 grid) visualization on a canvas, adapting for different Collatz parameters.
 * This is an alternative/older version of drawNineNetCanvasSecondary, consolidating.
 * @param {HTMLCanvasElement} canvas - The canvas element.
 * @param {Array<number>} sequence - The Collatz sequence.
 * @param {string} divColor - Color for numbers divisible by X.
 * @param {string} mulColor - Color for numbers not divisible by X.
 * @param {Object} [faceDefinitions={}] - Optional: explicit mapping of remainder to grid position for dynamic X.
 */
export function render9Net(canvas, sequence, divColor, mulColor, faceDefinitions = null) {
  if (!canvas) {
    if (DEBUG_MODE) console.error("Canvas element not found for 9-net rendering.");
    return;
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    if (DEBUG_MODE) console.error("2D context not available for 9-net rendering.");
    return;
  }

  const gridSize = 3;
  const faceSize = canvas.width / gridSize; // Size of each square face
  ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas

  const defaultFaceMap = [
    { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 },
    { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 },
    { row: 2, col: 0 }, { row: 2, col: 1 }, { row: 2, col: 2 }
  ];

  let sequenceIndex = 0;
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const x = c * faceSize;
      const y = r * faceSize;
      let color = "#333"; // Default empty square color
      let label = ""; // Default empty label

      // Check if there's a corresponding number in the sequence for this square
      if (sequenceIndex < sequence.length) {
        const num = sequence[sequenceIndex];
        color = (num % DEFAULT_X_DIVISOR === 0) ? divColor : mulColor; // Color based on divisibility by default X
        label = num; // Set the number as label
        sequenceIndex++; // Move to the next number in the sequence
      }

      ctx.fillStyle = color;
      ctx.fillRect(x, y, faceSize, faceSize);
      ctx.strokeStyle = "#222"; // Darker border for separation
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, faceSize, faceSize);

      // Optional: Draw the number inside the square
      if (label !== "") {
        ctx.fillStyle = isLight(color) ? "#000" : "#fff"; // Text color contrast
        ctx.font = `${faceSize * 0.4}px Inter, sans-serif`; // Adjust font size
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, x + faceSize / 2, y + faceSize / 2);
      }
    }
  }
}


// === Helper function to parse URL parameters ===
export function getUrlParams() {
  const params = {};
  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  for (const [key, value] of urlParams) {
    params[key] = value;
  }
  return params;
}