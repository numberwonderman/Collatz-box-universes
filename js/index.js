// index.js

// ==========================================================
// IMPORTS
// ==========================================================
import {
    drawNineNetCanvasSecondary,
    formatSequenceOutput,
    saveToHistory,
    showMessage}
 from './utils.js';
import { generalizedCollatz  } from './collatzLogic.js';
import { getExplorationSetting, setExplorationSetting } from './state.js';

// ==========================================================
// STATE MANAGEMENT (Negative Numbers)
// ==========================================================
// Get the DOM elements for the toggle button and status display
const toggleButton = document.getElementById('toggleNegativeNumbers');
const statusSpan = document.getElementById('negativeStatus');

// Function to update the UI based on the current setting
function updateStatusUI() {
    const isEnabled = getExplorationSetting();
    statusSpan.textContent = `Status: ${isEnabled ? 'Enabled' : 'Disabled'}`;
    statusSpan.classList.toggle('text-green-400', isEnabled);
    statusSpan.classList.toggle('text-red-400', !isEnabled);
}

// Add an event listener to the button
if (toggleButton) { // Defensive check to ensure the element exists
    toggleButton.addEventListener('click', () => {
        const newSetting = !getExplorationSetting();
        setExplorationSetting(newSetting);
        updateStatusUI();
    });
}

// ==========================================================
// GLOBAL VARIABLES (UI-related state)
// ==========================================================
// Global variable to store current sequence data (for visualization tools)
let currentSequenceData = null;


// ==========================================================
// HELPER FUNCTIONS (for UI management)
// ==========================================================
/**
 * Sets up the canvas for high-DPI screens by adjusting its drawing buffer size
 * and scaling the context.
 * @param {HTMLCanvasElement} canvasElement - The canvas DOM element.
 */
function setupNineNetCanvas(canvasElement) {
    if (!canvasElement) {
        console.error("Canvas element not found for setup.");
        return;
    }
    const ctx = canvasElement.getContext('2d');
    if (!ctx) {
        console.error("2D rendering context not available.");
        return;
    }
    const style = getComputedStyle(canvasElement);
    const cssWidth = parseFloat(style.width);
    const cssHeight = parseFloat(style.height);
    const dpi = window.devicePixelRatio || 1;
    canvasElement.width = cssWidth * dpi;
    canvasElement.height = cssHeight * dpi;
    ctx.scale(dpi, dpi);
}
// index.js (client)
import { IncrementalTree } from './incrementalEncoding.js';
import { layoutTree } from './layoutTree.js';
import { drawTree } from './treeRenderer.js';

const T = new IncrementalTree(1n);
// ...build with your reverse predecessors...
// const T = IncrementalTree.buildFromReverse({ root: 1n, predecessors, depthLimit: 12 });

const layout = layoutTree(T);         // -> { nodes:[{id,x,y}], edges:[{u,v}] }
const canvas = document.getElementById('treeCanvas');
drawTree(canvas, layout);             // draw only here
// ... rest of your existing code (Event Listeners and DOMContentLoaded) ...
