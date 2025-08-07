
    
        // Import functions and constants from utils.js
        import {
            calculateCollatzSequence, // Renamed from generalizedCollatz
            drawNineNetCanvasSecondary,
            getUrlParams,
            generateLinkURL,
            DEFAULT_LINE_COLOR, // For divColor
            DEFAULT_NODE_COLOR, // For mulColor
            FACE_SIZE,
            PADDING,
            STEP_SIZE,
            NINE_NET_DRAW_WIDTH,
            NINE_NET_DRAW_HEIGHT,
            isLight // Helper for text color
        } from './js/utils.js';


        // === Slideshow Animation Logic ===
        let slideshowInterval;
        let isSlideshowPlaying = false;
        let currentAnimationValue;
        let allBoxUniverses = []; // Stores all generated universes for bulk display/slideshow
        let filteredBoxUniverses = []; // Currently displayed universes (if filtering was applied)
        const MAX_ITERATIONS = 1000; // Max iterations for sequence calculation

        // Default colors for the 9-net drawing from utils.js
        const divColor = DEFAULT_LINE_COLOR;
        const mulColor = DEFAULT_NODE_COLOR;


        // Get elements for controls
        const animationAxisSelect = document.getElementById('animationAxis');
        const animationSpeedSlider = document.getElementById('animationSpeed');
        const speedValueSpan = document.getElementById('speedValue');
        const toggleSlideshowButton = document.getElementById('toggleSlideshow');
        const nMinInput = document.getElementById('nMin');
        const nMaxInput = document.getElementById('nMax');
        const xMinInput = document.getElementById('xMin');
        const xMaxInput = document.getElementById('xMax');
        const yMinInput = document.getElementById('yMin');
        const yMaxInput = document.getElementById('yMax');
        const zMinInput = document.getElementById('zMin');
        const zMaxInput = document.getElementById('zMax');
        const applyFiltersButton = document.getElementById('applyFilters');
        const gridContainer = document.getElementById('gridContainer');
        const nineNetCanvas = document.getElementById('nineNetCanvas'); // Main display canvas
        const paramDisplay = document.getElementById('paramDisplay'); // Main display text
        const sequenceInfo = document.getElementById('sequenceInfo'); // Main display text
        const sequenceNumbersDiv = document.getElementById('sequenceNumbers'); // Main display sequence numbers
        const sequenceRangeInfo = document.getElementById('sequenceRangeInfo'); // New element for main slicer display
        const sequenceSumInfo = document.getElementById('sequenceSumInfo'); // New element for main slicer display
        const sequenceAvgInfo = document.getElementById('sequenceAvgInfo'); // New element for main slicer display
        const sequenceStdDevInfo = document.getElementById('sequenceStdDevInfo'); // New element for main slicer display

        // Gold star elements for slicer
        const nStarSlicer = document.getElementById('n-star');
        const xStarSlicer = document.getElementById('x-star');
        const yStarSlicer = document.getElementById('y-star');
        const zStarSlicer = document.getElementById('z-star');


        // Update speed value display
        if (animationSpeedSlider && speedValueSpan) { // Add null checks
            animationSpeedSlider.addEventListener('input', () => {
                speedValueSpan.textContent = animationSpeedSlider.value;
            });
        }

        // Function to toggle slideshow playback
        if (toggleSlideshowButton) { // Add null check
            toggleSlideshowButton.addEventListener('click', () => {
                if (isSlideshowPlaying) {
                    clearInterval(slideshowInterval);
                    toggleSlideshowButton.textContent = 'Play Slideshow';
                    isSlideshowPlaying = false;
                } else {
                    // Before starting, make sure we have universes to cycle through
                    if (filteredBoxUniverses.length === 0) {
                        applyAndDrawFilters(); // Generate if not already present
                        if (filteredBoxUniverses.length === 0) {
                            // Still no universes, show an error or message
                            console.warn("No universes to play slideshow with. Adjust filter ranges.");
                            return;
                        }
                    }

                    toggleSlideshowButton.textContent = 'Stop Slideshow';
                    isSlideshowPlaying = true;

                    const axis = animationAxisSelect.value;
                    // Initialize currentAnimationValue to the min of the selected axis
                    if (axis === 'N') {
                        currentAnimationValue = parseInt(nMinInput.value);
                    } else if (axis === 'X') {
                        currentAnimationValue = parseInt(xMinInput.value);
                    } else if (axis === 'Y') {
                        currentAnimationValue = parseInt(yMinInput.value);
                    } else if (axis === 'Z') {
                        currentAnimationValue = parseInt(zMinInput.value);
                    } else {
                        currentAnimationValue = 0; // Fallback
                    }

                    animationStep(); // Call the animation step immediately to draw the first frame
                    slideshowInterval = setInterval(animationStep, parseInt(animationSpeedSlider.value));
                }
            });
        }

        // Function to perform one step of the animation
        function animationStep() {
            const axis = animationAxisSelect.value;
            let minVal, maxVal, inputElement;

            if (axis === 'N') {
                minVal = nMinInput ? parseInt(nMinInput.value) : 1;
                maxVal = nMaxInput ? parseInt(nMaxInput.value) : 50;
                inputElement = nMinInput;
            } else if (axis === 'X') {
                minVal = xMinInput ? parseInt(xMinInput.value) : 1;
                maxVal = xMaxInput ? parseInt(xMaxInput.value) : 5;
                inputElement = xMinInput;
            } else if (axis === 'Y') {
                minVal = yMinInput ? parseInt(yMinInput.value) : 1;
                maxVal = yMaxInput ? parseInt(yMaxInput.value) : 5;
                inputElement = yMinInput;
            } else if (axis === 'Z') {
                minVal = zMinInput ? parseInt(zMinInput.value) : 1;
                maxVal = zMaxInput ? parseInt(zMaxInput.value) : 5;
                inputElement = zMinInput;
            }

            currentAnimationValue++;

            if (inputElement && currentAnimationValue > maxVal) {
                currentAnimationValue = minVal;
            }

            if (inputElement) inputElement.value = currentAnimationValue;
            applyAndDrawFilters();
            updateGoldStarVisibilitySlicer(); // Update stars after input changes via animation
        }

        // Function to generate a set of Box Universes based on specified ranges
        function generateBoxUniverses(nMin, nMax, xMin, xMax, yMin, yMax, zMin, zMax) {
            const tempUniverses = [];
            const maxUniversesToGenerate = 100; // Limit to prevent performance issues
            let generatedCount = 0;

            for (let n = nMin; n <= nMax && generatedCount < maxUniversesToGenerate; n++) {
                for (let x = xMin; x <= xMax && generatedCount < maxUniversesToGenerate; x++) {
                    if (x === 0) continue;
                    for (let y = yMin; y <= yMax && generatedCount < maxUniversesToGenerate; y++) {
                        for (let z = zMin; z <= zMax && generatedCount < maxUniversesToGenerate; z++) {
                            const result = calculateCollatzSequence(n, MAX_ITERATIONS, x, y, z); // Use calculateCollatzSequence
                            if (result.type !== "error" && result.type !== "Invalid Parameters (X is 0)") { // Ensure valid parameters
                                tempUniverses.push({
                                    N: n, X: x, Y: y, Z: z,
                                    sequence: result.sequence,
                                    steps: result.steps,
                                    type: result.type,
                                    minVal: result.minVal,
                                    maxVal: result.maxVal,
                                    sumVal: result.sumVal,
                                    avgVal: result.avgVal,
                                    stdDev: result.stdDev,
                                    finalNum: result.sequence[result.sequence.length -1] // Add finalNum for display
                                });
                                generatedCount++;
                            }
                        }
                    }
                }
            }
            return tempUniverses;
        }

        // Function to get current filter values from inputs
        function getFilterValues() {
            // Add null checks for all input elements before accessing their values
            return {
                nMin: nMinInput ? parseInt(nMinInput.value) || 1 : 1,
                nMax: nMaxInput ? parseInt(nMaxInput.value) || 50 : 50,
                xMin: xMinInput ? parseInt(xMinInput.value) || 1 : 1,
                xMax: xMaxInput ? parseInt(xMaxInput.value) || 5 : 5,
                yMin: yMinInput ? parseInt(yMinInput.value) || 1 : 1,
                yMax: yMaxInput ? parseInt(yMaxInput.value) || 5 : 5,
                zMin: zMinInput ? parseInt(zMinInput.value) || 1 : 1,
                zMax: zMaxInput ? parseInt(zMaxInput.value) || 5 : 5
            };
        }

        // Function to display a specific universe in the main view
        function displayMainUniverse(universe) {
            if (!paramDisplay || !sequenceInfo || !sequenceNumbersDiv || !sequenceRangeInfo || !sequenceSumInfo || !sequenceAvgInfo || !sequenceStdDevInfo || !nineNetCanvas) {
                console.error("Missing one or more main display elements for displayMainUniverse.");
                return;
            }

            paramDisplay.textContent = `N=${universe.N}, X=${universe.X}, Y=${universe.Y}, Z=${universe.Z}`;
            let typeText = universe.type.replace(/_/g, ' ');
            if (universe.type === "Cycle Detected") { // Updated for exact match
                typeText += ` (Cycle: ${universe.sequence[universe.sequence.indexOf(universe.finalNum)].toLocaleString()} → ...)`; // Show cycle start
            } else if (universe.type === "Max Iterations Reached" || universe.type === "Exceeded Max Safe Integer") { // Updated for exact match
                typeText += ` (Final: ${universe.finalNum !== undefined ? universe.finalNum.toLocaleString() : 'N/A'})`; // Added undefined check
            } else if (universe.type === "Converges to 1") { // Updated for exact match
                 typeText += ` (Final: 1)`;
            }
            sequenceInfo.textContent = `Steps: ${universe.steps} | Type: ${typeText}`;
            sequenceNumbersDiv.textContent = universe.sequence.join(' → ');

            // Display statistics
            sequenceRangeInfo.textContent = `Range: [${universe.minVal.toLocaleString()}, ${universe.maxVal.toLocaleString()}]`;
            // Check if sumVal is a safe number or if it's "Too Large" (from calculateCollatzSequence)
            sequenceSumInfo.textContent = `Sum: ${typeof universe.sumVal === 'number' && Number.isFinite(universe.sumVal) ? universe.sumVal.toLocaleString() : 'Too Large'}`;
            sequenceAvgInfo.textContent = `Avg: ${typeof universe.avgVal === 'number' && Number.isFinite(universe.avgVal) ? universe.avgVal.toLocaleString(undefined, { maximumFractionDigits: 2 }) : 'N/A'}`;
            sequenceStdDevInfo.textContent = `StdDev: ${typeof universe.stdDev === 'number' && Number.isFinite(universe.stdDev) ? universe.stdDev.toLocaleString(undefined, { maximumFractionDigits: 2 }) : 'N/A'}`;


            drawNineNetCanvasSecondary(nineNetCanvas, universe.sequence, universe.X, divColor, mulColor);
            nineNetCanvas.style.display = 'block'; // Ensure canvas is visible when displaying a universe
        }


        // Function to apply filters and draw the grid of universes
        function applyAndDrawFilters() {
            const filters = getFilterValues();
            filteredBoxUniverses = generateBoxUniverses(
                filters.nMin, filters.nMax,
                filters.xMin, filters.xMax,
                filters.yMin, filters.yMax,
                filters.zMin, filters.zMax
            );

            if (!gridContainer) {
                console.error("Grid container not found. Cannot apply filters.");
                return;
            }
            gridContainer.innerHTML = ''; // Clear existing grid items

            if (filteredBoxUniverses.length === 0) {
                gridContainer.innerHTML = '<p class="text-gray-400 text-center col-span-full">No universes found for the given ranges. Try adjusting the filters.</p>';
                // Clear main display if no universes are found for filtered view
                if (paramDisplay) paramDisplay.textContent = 'No specific sequence loaded. Use controls below.';
                if (sequenceInfo) sequenceInfo.textContent = '';
                if (sequenceNumbersDiv) sequenceNumbersDiv.textContent = '';
                if (nineNetCanvas) nineNetCanvas.getContext('2d').clearRect(0, 0, nineNetCanvas.width, nineNetCanvas.height);
                if (sequenceRangeInfo) sequenceRangeInfo.textContent = '';
                if (sequenceSumInfo) sequenceSumInfo.textContent = '';
                if (sequenceAvgInfo) sequenceAvgInfo.textContent = '';
                if (sequenceStdDevInfo) sequenceStdDevInfo.textContent = '';
                if (nineNetCanvas) nineNetCanvas.style.display = 'none'; // Hide main canvas on error
                return;
            }

            // Display the first universe in the main canvas if it's the initial load or filters changed
            const urlParams = getUrlParams();
            const urlN = parseInt(urlParams.n);
            const urlX = parseInt(urlParams.x);
            const urlY = parseInt(urlParams.y);
            const urlZ = parseInt(urlParams.z);

            const isUrlLoaded = !isNaN(urlN) && !isNaN(urlX) && !isNaN(urlY) && !isNaN(urlZ);
            let updateMainDisplay = true;

            if (isUrlLoaded) {
                const currentMainUniverse = { N: urlN, X: urlX, Y: urlY, Z: urlZ };
                const isStillInFilter = filteredBoxUniverses.some(u =>
                    u.N === currentMainUniverse.N &&
                    u.X === currentMainUniverse.X &&
                    u.Y === currentMainUniverse.Y &&
                    u.Z === currentMainUniverse.Z
                );
                if (isStillInFilter) {
                    // Find the exact universe object that matches the URL params
                    const exactMatch = filteredBoxUniverses.find(u =>
                        u.N === currentMainUniverse.N &&
                        u.X === currentMainUniverse.X &&
                        u.Y === currentMainUniverse.Y &&
                        u.Z === currentMainUniverse.Z
                    );
                    if (exactMatch) {
                        displayMainUniverse(exactMatch);
                        updateMainDisplay = false;
                    }
                }
            }

            if (updateMainDisplay && filteredBoxUniverses.length > 0) {
                displayMainUniverse(filteredBoxUniverses[0]);
            }


           filteredBoxUniverses.forEach(universe => {
    const gridItem = document.createElement('div');
    gridItem.className = 'grid-item';

    const canvasElement = document.createElement('canvas');
    canvasElement.width = NINE_NET_DRAW_WIDTH;
    canvasElement.height = NINE_NET_DRAW_HEIGHT;
    canvasElement.className = 'grid-item-canvas';

    // Draw the universe on the mini-canvas
    drawNineNetCanvasSecondary(canvasElement, universe.sequence, universe.X, divColor, mulColor);

    const infoDiv = document.createElement('div');
    infoDiv.className = 'info';
    infoDiv.innerHTML = `N=${universe.N}, X=${universe.X}, Y=${universe.Y}, Z=${universe.Z}<br>`;
    let typeText = universe.type.replace(/_/g, ' ');

    if (universe.type === "Cycle Detected") {
        typeText += ` (Cycle)`;
    } else if (universe.type === "Max Iterations Reached" || universe.type === "Exceeded Max Safe Integer") {
        typeText += ` (Final: ${universe.finalNum !== undefined ? universe.finalNum.toLocaleString() : 'N/A'})`;
    }
    infoDiv.innerHTML += `Steps: ${universe.steps} | Type: ${typeText}`;
    infoDiv.innerHTML += `<br>Range: [${universe.minVal.toLocaleString()}, ${universe.maxVal.toLocaleString()}]`;
    infoDiv.innerHTML += `<br>Sum: ${typeof universe.sumVal === 'number' && Number.isFinite(universe.sumVal) ? universe.sumVal.toLocaleString() : 'Too Large'}`;
    infoDiv.innerHTML += `<br>Avg: ${typeof universe.avgVal === 'number' && Number.isFinite(universe.avgVal) ? universe.avgVal.toLocaleString(undefined, { maximumFractionDigits: 2 }) : 'N/A'}`;
    infoDiv.innerHTML += `<br>StdDev: ${typeof universe.stdDev === 'number' && Number.isFinite(universe.stdDev) ? universe.stdDev.toLocaleString(undefined, { maximumFractionDigits: 2 }) : 'N/A'}`;
    
    // Append the canvas and info to the grid item
    gridItem.appendChild(canvasElement);
    gridItem.appendChild(infoDiv);
    gridContainer.appendChild(gridItem);
});

            updateGoldStarVisibilitySlicer();
        }

        // Function to update the gold star visibility in Slicer
        function updateGoldStarVisibilitySlicer() {
            // Ensure inputs exist before trying to read their values
            const xVal = xMinInput ? parseInt(xMinInput.value) : NaN;
            const yVal = yMinInput ? parseInt(yMinInput.value) : NaN;
            const zVal = zMinInput ? parseInt(zMinInput.value) : NaN;

            // The gold star should only appear when X=2, Y=3, and Z=1 (standard Collatz parameters)
            // based on the minimum values of the ranges.
            if (xStarSlicer) xStarSlicer.style.display = (xVal === 2 && xMaxInput && parseInt(xMaxInput.value) === 2) ? 'inline-block' : 'none';
            if (yStarSlicer) yStarSlicer.style.display = (yVal === 3 && yMaxInput && parseInt(yMaxInput.value) === 3) ? 'inline-block' : 'none';
            if (zStarSlicer) zStarSlicer.style.display = (zVal === 1 && zMaxInput && parseInt(zMaxInput.value) === 1) ? 'inline-block' : 'none';

            // N-star is always hidden as N doesn't define the rule parameters
            if (nStarSlicer) nStarSlicer.style.display = 'none';
        }


        // Event listener for apply filters button
        if (applyFiltersButton) applyFiltersButton.addEventListener('click', applyAndDrawFilters);

        // Add event listeners to input fields to update gold star visibility
        // These will update the stars as the user types/changes values
        if (nMinInput) nMinInput.addEventListener('input', updateGoldStarVisibilitySlicer);
        if (nMaxInput) nMaxInput.addEventListener('input', updateGoldStarVisibilitySlicer);
        if (xMinInput) xMinInput.addEventListener('input', updateGoldStarVisibilitySlicer);
        if (xMaxInput) xMaxInput.addEventListener('input', updateGoldStarVisibilitySlicer);
        if (yMinInput) yMinInput.addEventListener('input', updateGoldStarVisibilitySlicer);
        if (yMaxInput) yMaxInput.addEventListener('input', updateGoldStarVisibilitySlicer);
        if (zMinInput) zMinInput.addEventListener('input', updateGoldStarVisibilitySlicer);
        if (zMaxInput) zMaxInput.addEventListener('input', updateGoldStarVisibilitySlicer);


        // Initial setup on page load
        window.addEventListener('DOMContentLoaded', () => {
            const returnToMainButton = document.getElementById('returnToMainButton');
if (returnToMainButton) {
    returnToMainButton.addEventListener('click', () => {
        // You'll need to define a 'generateLinkURL' function or use a hardcoded path here
        const mainPageUrl = generateLinkURL('index');
        window.location.href = mainPageUrl;
    });
}
            const params = getUrlParams();
            const n = parseInt(params.n);
            const x = parseInt(params.x);
            const y = parseInt(params.y);
            const z = parseInt(params.z);

            // Update color boxes based on initial values (defaults or URL)
            const divColorBox = document.getElementById('divColorBox');
            const mulColorBox = document.getElementById('mulColorBox');
            if (divColorBox) divColorBox.style.backgroundColor = divColor;
            if (mulColorBox) mulColorBox.style.backgroundColor = mulColor;

            // If URL parameters are present, pre-fill inputs and display that single universe in the main canvas
            if (!isNaN(n) && !isNaN(x) && !isNaN(y) && !isNaN(z)) {
                // Set current animation values to URL values if they were provided
                if (nMinInput) nMinInput.value = n;
                if (nMaxInput) nMaxInput.value = n; // Set max to N to ensure it stays in range
                if (xMinInput) xMinInput.value = x;
                if (xMaxInput) xMaxInput.value = x;
                if (yMinInput) yMinInput.value = y;
                if (yMaxInput) yMaxInput.value = y;
                if (zMinInput) zMinInput.value = z;
                if (zMaxInput) zMaxInput.value = z;

                const result = calculateCollatzSequence(n, MAX_ITERATIONS, x, y, z); // Use calculateCollatzSequence
                if (result.type !== "error" && result.type !== "Invalid Parameters (X is 0)") {
                    displayMainUniverse({ N: n, X: x, Y: y, Z: z, ...result });
                    if (nineNetCanvas) nineNetCanvas.style.display = 'block'; // Ensure main canvas is visible
                } else {
                    // Handle error for URL-loaded sequence
                    if (paramDisplay) paramDisplay.textContent = `Error for N=${n}, X=${x}, Y=${y}, Z=${z}`;
                    if (sequenceInfo) sequenceInfo.textContent = result.type; // Display the error type
                    if (sequenceNumbersDiv) sequenceNumbersDiv.textContent = '';
                    if (nineNetCanvas) nineNetCanvas.getContext('2d').clearRect(0, 0, nineNetCanvas.width, nineNetCanvas.height);
                    if (sequenceRangeInfo) sequenceRangeInfo.textContent = '';
                    if (sequenceSumInfo) sequenceSumInfo.textContent = '';
                    if (sequenceAvgInfo) sequenceAvgInfo.textContent = '';
                    if (sequenceStdDevInfo) sequenceStdDevInfo.textContent = '';
                    if (nineNetCanvas) nineNetCanvas.style.display = 'none'; // Hide main canvas on error
                }
            } else {
                // If no parameters, hide the main canvas initially, then `applyAndDrawFilters` will handle it.
                if (nineNetCanvas) nineNetCanvas.style.display = 'none';
                if (paramDisplay) paramDisplay.textContent = 'No specific sequence loaded. Use controls below.';
                if (sequenceInfo) sequenceInfo.textContent = '';
                if (sequenceNumbersDiv) sequenceNumbersDiv.textContent = '';
                if (sequenceRangeInfo) sequenceRangeInfo.textContent = '';
                if (sequenceSumInfo) sequenceSumInfo.textContent = '';
                if (sequenceAvgInfo) sequenceAvgInfo.textContent = '';
                if (sequenceStdDevInfo) sequenceStdDevInfo.textContent = '';
            }

            // Initial draw of bulk universes (always happens regardless of URL params)
            applyAndDrawFilters(); // This will populate the grid with default ranges and potentially update the main display

            // Adjust canvas size if needed for responsiveness (for the single canvas at the top)
            function resizeMainCanvas() {
                if (!nineNetCanvas || !paramDisplay) {
                    return;
                }
                const containerWidth = nineNetCanvas.parentElement ? nineNetCanvas.parentElement.clientWidth : NINE_NET_DRAW_WIDTH;
                const desiredDisplayWidth = Math.min(containerWidth * 0.9, NINE_NET_DRAW_WIDTH);
                nineNetCanvas.style.width = `${desiredDisplayWidth}px`;
                nineNetCanvas.style.height = 'auto';

                // Redraw if there's currently a sequence displayed and canvas is visible
                const currentParamsText = paramDisplay.textContent;
                const nMatch = currentParamsText.match(/N=(\d+)/);
                const xMatch = currentParamsText.match(/X=(\d+)/);
                const yMatch = currentParamsText.match(/Y=(\d+)/);
                const zMatch = currentParamsText.match(/Z=(\d+)/);

                const currentN = nMatch ? parseInt(nMatch[1]) : NaN;
                const currentX = xMatch ? parseInt(xMatch[1]) : NaN;
                const currentY = yMatch ? parseInt(yMatch[1]) : NaN;
                const currentZ = zMatch ? parseInt(zMatch[1]) : NaN;

                if (!isNaN(currentN) && !isNaN(currentX) && !isNaN(currentY) && !isNaN(currentZ) && nineNetCanvas.style.display !== 'none') {
                    const result = calculateCollatzSequence(currentN, MAX_ITERATIONS, currentX, currentY, currentZ);
                    if (result.type !== "error" && result.type !== "Invalid Parameters (X is 0)") {
                        drawNineNetCanvasSecondary(nineNetCanvas, result.sequence, currentX, divColor, mulColor);
                    }
                }
            }
            window.addEventListener('resize', resizeMainCanvas);
            resizeMainCanvas();
            updateGoldStarVisibilitySlicer();
            
        });
    
