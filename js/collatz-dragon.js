import { showMessage } from "./utils"; 
        // Get DOM elements
        const inputN = document.getElementById('inputN');
        const inputX = document.getElementById('inputX');
        const inputY = document.getElementById('inputY');
        const inputZ = document.getElementById('inputZ');
        const generateBtn = document.getElementById('generateBtn');
        const clearBtn = document.getElementById('clearBtn');
        const collatzCanvas = document.getElementById('collatzCanvas');
        const statsOutput = document.getElementById('statsOutput');
        const goldStar = document.getElementById('goldStar');
        const messageBox = document.getElementById('message-box'); // Get message box element

        // Link buttons
        const linkSlicer = document.getElementById('linkSlicer');
        const linkSlicer3D = document.getElementById('linkSlicer3D'); // This button links to the 3D FPS program
        const linkBoxViewer = document.getElementById('linkBoxViewer');
        const linkIndex = document.getElementById('linkIndex'); // New: Link to main index page

        // Canvas context
        const ctx = collatzCanvas.getContext('2d');


        // --- Helper Function to Get Parameters ---
        function getParameters() {
            const N = parseInt(inputN.value);
            const X = parseInt(inputX.value);
            const Y = parseInt(inputY.value);
            const Z = parseInt(inputZ.value);

            // Validate inputs
            if (isNaN(N) || N <= 0) {
                showMessage("N (Start Number) must be a positive integer.", "error");
                return null;
            }
            if (isNaN(X) || X === 0) { // X must be non-zero
                showMessage("X (Divisor) must be a non-zero integer.", "error");
                return null;
            }
            if (isNaN(Y)) { 
                showMessage("Y (Multiplier) must be an integer.", "error");
                return null;
            }
            if (isNaN(Z)) {
                showMessage("Z (Adder) must be an integer.", "error");
                return null;
            }
            // Special case check for Y=0 and Z=0 for non-divisible numbers
            if (Y === 0 && Z === 0 && N % X !== 0) {
                 showMessage("For non-divisible numbers, Y and Z cannot both be zero, as this would result in a trivial or infinite loop.", "error");
                return null;
            }
            
            return { N, X, Y, Z };
        }

        // --- Core Collatz Function (Generalized) ---
        function generalizedCollatzStep(n, X, Y, Z) {
            if (n % X === 0) {
                return { next: n / X, parity: 0 }; // Parity 0 for "even" rule (divisible by X)
            } else {
                return { next: Y * n + Z, parity: 1 }; // Parity 1 for "odd" rule (not divisible by X)
            }
        }

        // --- Generate Collatz Sequence and Binary Path ---
        function generateCollatzSequence(startN, X, Y, Z) {
            let sequence = [startN];
            let binaryPath = []; // 0 for even rule, 1 for odd rule
            let currentN = startN;
            let steps = 0;
            let maxValue = startN;
            let stoppingTime = -1; // -1 indicates not yet found
            let isParadoxical = false;

            const maxIterations = 10000; // Cap to prevent infinite loops in display

            // Use a set to detect immediate cycles
            const visited = new Set();
            visited.add(startN);

            // Heuristic for possible infinite loops/divergence in generalized Collatz
            const divergenceThreshold = 1e15; // Arbitrary large number

            while (currentN !== 1 && steps < maxIterations) {
                const { next, parity } = generalizedCollatzStep(currentN, X, Y, Z);
                
                // Check for divergence due to overflow *before* adding to sequence
                if (Math.abs(next) > Number.MAX_SAFE_INTEGER || !Number.isFinite(next)) {
                    return { sequence, binaryPath, steps, maxValue, status: 'Divergent (Overflow)', stoppingTime, isParadoxical };
                }

                sequence.push(next);
                binaryPath.push(parity);

                currentN = next;
                steps++;

                if (currentN > maxValue) {
                    maxValue = currentN;
                }

                // Check for stopping time: first time sequence value drops below startN
                if (stoppingTime === -1 && currentN < startN) {
                    stoppingTime = steps;
                }
                
                // Check for paradoxical behavior: sequence exceeds startN AFTER stopping time has been reached
                if (stoppingTime !== -1 && currentN > startN) {
                    isParadoxical = true;
                }

                // If number grows too large, assume divergence
                if (currentN > divergenceThreshold) {
                    return { sequence, binaryPath, steps, maxValue, status: 'Divergent', stoppingTime, isParadoxical };
                }

                // Check for cycles
                if (visited.has(currentN)) {
                    return { sequence, binaryPath, steps, maxValue, status: 'Cycle Detected', stoppingTime, isParadoxical };
                }
                visited.add(currentN);
            }

            // After loop, if it reached 1
            if (currentN === 1) {
                return { sequence, binaryPath, steps, maxValue, status: 'Converged to 1', stoppingTime, isParadoxical };
            } else {
                return { sequence, binaryPath, steps, maxValue, status: 'Max Iterations Reached', stoppingTime, isParadoxical };
            }
        }

        // --- Draw Collatz Dragon Curve ---
        function drawCollatzDragon(binaryPath) {
            // Clear canvas before drawing new path
            clearCanvas();

            const canvasWidth = collatzCanvas.width;
            const canvasHeight = collatzCanvas.height;

            // Define starting position and scaling for the curve
            let x = canvasWidth / 2;
            let y = canvasHeight / 2;
            let angle = 0; // Initial direction (e.g., pointing right)

            // Length of each segment, scaled by path length
            // Adjusted factor based on typical dragon curve length characteristics
            const segmentLength = Math.min(canvasWidth, canvasHeight) / (binaryPath.length > 0 ? binaryPath.length * 2 : 10); // Adjust factor for better fit, prevent division by zero

            ctx.beginPath();
            ctx.moveTo(x, y);

            ctx.strokeStyle = '#6366f1'; // Indigo color for the path
            ctx.lineWidth = 1; // Thin line for detail

            binaryPath.forEach((turn) => {
                // '0' (divisible by X) -> turn left, '1' (not divisible by X) -> turn right
                // Using 90 degrees (Math.PI / 2) for a classic fractal turn.
                if (turn === 0) { // Divisible rule applied: turn left
                    angle -= Math.PI / 2; // -90 degrees
                } else { // Multiply/Add rule applied: turn right
                    angle += Math.PI / 2; // +90 degrees
                }

                // Calculate new position
                x += segmentLength * Math.cos(angle);
                y += segmentLength * Math.sin(angle);

                // Draw line to new position
                ctx.lineTo(x, y);
            });

            ctx.stroke();
            // Add a subtle glow
            ctx.shadowBlur = 10;
            ctx.shadowColor = "#6366f1";
            ctx.stroke();
            ctx.shadowBlur = 0; // Reset shadow for other drawings
        }

        // --- Canvas Management ---
        function clearCanvas() {
            ctx.clearRect(0, 0, collatzCanvas.width, collatzCanvas.height);
            statsOutput.textContent = 'No sequence generated yet.';
        }

        // --- Update UI ---
        function updateUI(sequenceInfo) {
            const { sequence, steps, maxValue, status, stoppingTime, isParadoxical } = sequenceInfo;
            statsOutput.innerHTML = `
                <p><strong>Status:</strong> ${status}</p>
                <p><strong>Steps to ${sequence[sequence.length - 1] === 1 ? '1' : sequence[sequence.length - 1]}:</strong> ${steps}</p>
                <p><strong>Max Value Reached:</strong> ${maxValue.toLocaleString()}</p>
                <p><strong>Sequence Start:</strong> ${sequence[0]}</p>
                <p><strong>Stopping Time:</strong> ${stoppingTime === -1 ? 'Not Found (did not drop below start)' : stoppingTime}</p>
                <p><strong>Is Paradoxical:</strong> ${isParadoxical ? 'Yes' : 'No'}</p>
                <p class="text-sm text-gray-400 mt-2">
                    Note: For display, the sequence is truncated to ${Math.min(sequence.length, 50)} terms.
                    Full sequence length: ${sequence.length}.
                </p>
                <p class="text-sm text-gray-400">
                    Sequence (first 50 terms): ${sequence.slice(0, 50).join(', ')}${sequence.length > 50 ? '...' : ''}
                </p>
            `;
        }

        // --- Gold Star Visibility ---
        function updateGoldStar() {
            // We need to check inputs here without triggering error messages if called from input events
            const N = parseInt(inputN.value);
            const X = parseInt(inputX.value);
            const Y = parseInt(inputY.value);
            const Z = parseInt(inputZ.value);

            // Only show gold star if all are valid and match classic Collatz
            if (!isNaN(N) && N > 0 && !isNaN(X) && X !== 0 && !isNaN(Y) && !isNaN(Z) &&
                (Y !== 0 || Z !== 0 || N % X === 0) && // Ensure Y=0,Z=0 is only allowed if N%X==0
                X === 2 && Y === 3 && Z === 1) {
                goldStar.classList.remove('hidden');
            } else {
                goldStar.classList.add('hidden');
            }
        }

        // --- Event Listeners ---
        generateBtn.addEventListener('click', () => {
            const params = getParameters(); // This will now show messages directly if validation fails
            if (params) {
                const sequenceInfo = generateCollatzSequence(params.N, params.X, params.Y, params.Z);
                lastBinaryPath = sequenceInfo.binaryPath; // Store the path
                drawCollatzDragon(lastBinaryPath);
                updateUI(sequenceInfo);
                updateGoldStar(); // Check for gold star on generation
            }
        });

        clearBtn.addEventListener('click', clearCanvas);

        // Update gold star on parameter change
        inputX.addEventListener('input', updateGoldStar);
        inputY.addEventListener('input', updateGoldStar);
        inputZ.addEventListener('input', updateGoldStar);
        inputN.addEventListener('input', updateGoldStar);


        // --- Program Link Logic ---
        function generateLinkURL(programName) {
            const params = getParameters();
            if (!params) {
                // getParameters will now show a message; we just return a dummy link.
                return '#';
            }

            const { N, X, Y, Z } = params;

            // Define the base URL for your GitHub Pages repository
            // Replace 'numberwonderman' with your actual GitHub username
            // and 'Collatz-box-universes' with your actual repository name
            const githubPagesBaseUrl = "https://numberwonderman.github.io/Collatz-box-universes/";

            let url = '';
            switch (programName) {
                case 'slicer':
                    // Links directly to the slicer.html in the root of the GitHub Pages site
                    url = `${githubPagesBaseUrl}slicer.html?n=${N}&x=${X}&y=${Y}&z=${Z}`;
                    break;
                case 'slicer3d_fps': 
                    // Links directly to box-universe-fps.html in the root of the GitHub Pages site
                    url = `${githubPagesBaseUrl}box-universe-fps.html?n=${N}&x=${X}&y=${Y}&z=${Z}`;
                    break;
                case 'boxviewer':
                    // Links directly to box-universe-viewer.html in the root of the GitHub Pages site
                    url = `${githubPagesBaseUrl}box-universe-viewer.html?n=${N}&x=${X}&y=${Y}&z=${Z}`;
                    break;
                case 'index': // New case for linking to the main index.html
                    url = `${githubPagesBaseUrl}index.html`;
                    break;
                default:
                    url = '#';
            }
            return url;
        }

        linkSlicer.addEventListener('click', (event) => { 
            event.preventDefault(); 
            const url = generateLinkURL('slicer');
            if (url !== '#') window.open(url, '_blank');
        });

        linkSlicer3D.addEventListener('click', (event) => { 
            event.preventDefault(); 
            const url = generateLinkURL('slicer3d_fps');
            if (url !== '#') window.open(url, '_blank');
        });

        linkBoxViewer.addEventListener('click', (event) => { 
            event.preventDefault(); 
            const url = generateLinkURL('boxviewer');
            if (url !== '#') window.open(url, '_blank');
        });

        // New event listener for the 'Back to Main Hub' button
        linkIndex.addEventListener('click', (event) => {
            event.preventDefault();
            const url = generateLinkURL('index');
            if (url !== '#') window.open(url, '_self'); // Open in the same tab for navigation
        });

        // Initialize canvas size and gold star on load
        window.onload = () => {
            // Make canvas responsive
            function resizeCanvas() {
                const parentDiv = collatzCanvas.parentElement;
                collatzCanvas.width = parentDiv.clientWidth;
                collatzCanvas.height = parentDiv.clientWidth * (3 / 4); // Maintain 4:3 aspect ratio
                drawCollatzDragon(lastBinaryPath || []); // Redraw if there was a path
            }
            resizeCanvas(); // Set initial size
            window.addEventListener('resize', resizeCanvas); // Adjust on window resize

            // Initial check for gold star
            updateGoldStar();
        };

        // Store the last drawn binary path to redraw on resize
        let lastBinaryPath = [];