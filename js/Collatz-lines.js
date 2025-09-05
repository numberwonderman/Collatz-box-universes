
        // --- Global Variables for Three.js Scene ---
        let scene, camera, renderer, controls;
        let pointsGeometry = null; 
        let pointsMaterial = null; 
        let pointsMesh = null; 
        let animationFrameId; 
        
        // Global object to hold animated state, ensuring correct closure access
        let appState = {
            currentSequenceData: null, 
            currentSequenceIndex: 0, 
            lastDrawTime: 0 
        };

        const MAX_SEGMENT_LENGTH = 2.0; 
        const POINT_SIZE = 1.0; // Back to a smaller size for a "line" effect
        const ANIMATION_INTERVAL = 50; // Re-enabled animation interval for drawing effect
        const MAX_ITERATIONS = 500; 

        // --- Message Box Utility ---
        function showMessage(message, type = 'info', duration = 3000) {
            const messageBox = document.getElementById('message-box');
            messageBox.textContent = message;
            messageBox.style.backgroundColor = type === 'error' ? 'rgba(220, 38, 38, 0.9)' : 'rgba(0, 0, 0, 0.7)';
            messageBox.style.display = 'block';
            setTimeout(() => {
                messageBox.style.display = 'none';
            }, duration);
        }

        // --- Generalized Collatz Function ---
        const generalizedCollatz = (n, x, y, z, maxSteps) => {
            console.log(`Collatz: N=${n}, X=${x}, Y=${y}, Z=${z}, MaxSteps=${maxSteps}`);
            if (x === 0) {
                return { sequence: [], type: "error", message: "X (divisor) cannot be zero." };
            }
            if (y === 0 && z === 0 && n % Math.abs(x) !== 0) {
                 return { sequence: [], type: "error", message: "For non-divisible numbers, Y and Z cannot both be zero. This would result in an infinite loop or trivial operation." };
            }

            let currentN = n;
            const sequence = [currentN];
            const visited = new Set();
            visited.add(currentN);

            for (let steps = 0; steps < maxSteps; steps++) {
                let nextN;

                if (Math.abs(currentN) > Number.MAX_SAFE_INTEGER || !Number.isFinite(currentN)) {
                    return { sequence: sequence, type: 'diverges_overflow', message: 'Sequence value exceeded safe integer limit before calculation.' };
                }

                if (currentN % Math.abs(x) === 0) {
                    nextN = currentN / x;
                } else {
                    nextN = (Math.abs(y) || 3) * currentN + (z || 1);
                }

                if (Math.abs(nextN) > Number.MAX_SAFE_INTEGER || !Number.isFinite(nextN)) {
                    return { sequence: sequence, type: 'diverges_overflow', message: 'Sequence value exceeded safe integer limit after calculation.' };
                }

                if (visited.has(nextN)) {
                    sequence.push(nextN); 
                    return { sequence: sequence, type: 'cycle', message: 'Cycle detected.' };
                }
                visited.add(nextN);
                sequence.push(nextN);

                currentN = nextN;
                if (currentN === 1) {
                    return { sequence: sequence, type: 'converges_to_1', message: 'Sequence converged to 1.' };
                }
            }
            return { sequence: sequence, type: 'max_iterations_reached', message: 'Max iterations reached without convergence or cycle.' };
        };

        // --- Three.js Initialization ---
        function initThreeJS() {
            const canvas = document.getElementById('collatzLinesCanvas');
            console.log("initThreeJS: Canvas element found:", canvas);

            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x000000); 
            console.log("initThreeJS: Scene created.");

            // Add Axes Helper for visual reference
            const axesHelper = new THREE.AxesHelper(5); 
            scene.add(axesHelper);
            console.log("initThreeJS: AxesHelper added.");


            camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
            camera.position.set(0, 0, 20); 
            camera.lookAt(0, 0, 0); 
            console.log("initThreeJS: Camera created and positioned at", camera.position);

            renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
            renderer.setSize(canvas.clientWidth, canvas.clientHeight);
            renderer.setPixelRatio(window.devicePixelRatio);
            console.log("initThreeJS: Renderer created with size", canvas.clientWidth, "x", canvas.clientHeight);

            const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
            scene.add(ambientLight);
            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
            directionalLight.position.set(5, 10, 7.5).normalize();
            scene.add(directionalLight);
            console.log("initThreeJS: Lighting added.");

            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true; 
            controls.dampingFactor = 0.05;
            controls.screenSpacePanning = false;
            controls.minDistance = 0.1; 
            controls.maxDistance = 2000; 
            console.log("initThreeJS: OrbitControls added.");

            window.addEventListener('resize', onWindowResize, false);
            onWindowResize(); 
            console.log("initThreeJS: Resize listener attached, initial resize called.");
        }

        // --- Window Resize Handler ---
        function onWindowResize() {
            const canvas = document.getElementById('collatzLinesCanvas');
            if (canvas && camera && renderer) {
                const parentWidth = canvas.parentElement.clientWidth;
                const parentHeight = window.innerHeight * 0.6; 
                
                canvas.style.width = parentWidth + 'px';
                canvas.style.height = parentHeight + 'px';

                camera.aspect = canvas.clientWidth / canvas.clientHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(canvas.clientWidth, canvas.clientHeight);
                console.log("onWindowResize: Canvas resized to", canvas.clientWidth, "x", canvas.clientHeight);
            }
        }

        // --- Scene Management ---
        function clearScene() {
            console.log("clearScene: Clearing dynamic visual elements.");
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
            if (pointsMesh) {
                scene.remove(pointsMesh);
                if (pointsGeometry) pointsGeometry.dispose();
                if (pointsMaterial) pointsMaterial.dispose();
                pointsMesh = null;
                pointsGeometry = null;
                pointsMaterial = null;
            }
            // Reset appState
            appState.currentSequenceData = null; 
            appState.currentSequenceIndex = 0; 
            appState.lastDrawTime = 0; 
            console.log("clearScene: Dynamic elements cleared, animation reset.");
        }

        /**
         * Generates the 3D path (array of Vector3 points) for a Collatz sequence.
         * @param {Array<number>} sequence - The calculated Collatz sequence.
         * @param {number} xVal - The X parameter used in the Collatz rule for parity checks.
         * @returns {Array<THREE.Vector3>} An array of 3D points representing the path.
         */
        function generateLinePath(sequence, xVal) {
            console.log("generateLinePath: Starting path generation for sequence length", sequence.length);
            const points = [];
            let currentX = 0, currentY = 0, currentZ = 0; 
            let direction = new THREE.Vector3(1, 0, 0); 
            
            points.push(new THREE.Vector3(currentX, currentY, currentZ)); 
            console.log(`Point 0: (${currentX.toFixed(2)}, ${currentY.toFixed(2)}, ${currentZ.toFixed(2)})`);

            for (let i = 0; i < sequence.length - 1; i++) {
                const currentVal = sequence[i];
                const isDivisible = (currentVal % Math.abs(xVal) === 0);

                const angleChange = Math.PI / 4 + (Math.random() * Math.PI / 8); 
                const wobble = new THREE.Vector3(
                    (Math.random() - 0.5) * 0.5, 
                    (Math.random() - 0.5) * 0.5,
                    (Math.random() - 0.5) * 0.5
                );

                if (isDivisible) {
                    direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), -angleChange); 
                    direction.applyAxisAngle(new THREE.Vector3(1, 0, 0), (Math.random() - 0.5) * Math.PI / 16); 
                } else {
                    direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), angleChange);  
                    direction.applyAxisAngle(new THREE.Vector3(0, 0, 1), (Math.random() - 0.5) * Math.PI / 16); 
                }
                
                direction.add(wobble).normalize(); 

                currentX += direction.x * MAX_SEGMENT_LENGTH;
                currentY += direction.y * MAX_SEGMENT_LENGTH;
                currentZ += direction.z * MAX_SEGMENT_LENGTH;

                points.push(new THREE.Vector3(currentX, currentY, currentZ)); 
                if (i < 5) { 
                    console.log(`Point ${i+1}: (${currentX.toFixed(2)}, ${currentY.toFixed(2)}, ${currentZ.toFixed(2)})`);
                }
            }
            console.log("generateLinePath: Generated", points.length, "points.");
            return points;
        }

        // --- Animation Loop ---
        function animateScene(time) {
            animationFrameId = requestAnimationFrame(animateScene);
            
            if (controls) { 
                controls.update();
            }

            // Logic to draw new point if there's a sequence and it's not fully drawn yet
            if (appState.currentSequenceData && appState.currentSequenceData.points && appState.currentSequenceIndex < appState.currentSequenceData.points.length) { 
                // Re-added the time-based condition to control drawing speed
                if (time - appState.lastDrawTime > ANIMATION_INTERVAL) {
                    appState.lastDrawTime = time; // Update last draw time
                    
                    // --- Drawing logic ---
                    const pointsToRender = appState.currentSequenceData.points.slice(0, appState.currentSequenceIndex + 1); 
                    
                    if (pointsToRender.length > 0) {
                        if (!pointsGeometry) {
                            pointsGeometry = new THREE.BufferGeometry();
                            pointsMaterial = new THREE.PointsMaterial({
                                size: POINT_SIZE, 
                                sizeAttenuation: true,
                                transparent: true,
                                opacity: 1,
                                vertexColors: true, 
                                alphaTest: 0.5
                            });
                            pointsMesh = new THREE.Points(pointsGeometry, pointsMaterial);
                            scene.add(pointsMesh);
                        }
                        
                        const positionsArray = new Float32Array(pointsToRender.length * 3);
                        const colorsArray = new Float32Array(pointsToRender.length * 3);
                        
                        const color1 = new THREE.Color(0x00ff00); 
                        const color2 = new THREE.Color(0xffa500); 

                        for (let i = 0; i < pointsToRender.length; i++) {
                            const point = pointsToRender[i];
                            positionsArray[i * 3] = point.x;
                            positionsArray[i * 3 + 1] = point.y;
                            positionsArray[i * 3 + 2] = point.z;

                            const val = appState.currentSequenceData.sequence[i]; 
                            const isDivisible = (val % Math.abs(appState.currentSequenceData.x) === 0);
                            const color = isDivisible ? color1 : color2;

                            colorsArray[i * 3] = color.r;
                            colorsArray[i * 3 + 1] = color.g;
                            colorsArray[i * 3 + 2] = color.b;
                        }

                        pointsGeometry.setAttribute('position', new THREE.BufferAttribute(positionsArray, 3));
                        pointsGeometry.setAttribute('color', new THREE.BufferAttribute(colorsArray, 3));
                        pointsGeometry.setDrawRange(0, pointsToRender.length); 
                        pointsGeometry.attributes.position.needsUpdate = true;
                        pointsGeometry.attributes.color.needsUpdate = true;
                        
                        // console.log(`DEBUG_ANIMATE: Animated point ${appState.currentSequenceIndex + 1} / ${appState.currentSequenceData.points.length} rendered.`);
                    }
                    appState.currentSequenceIndex++; 
                }
            } else if (appState.currentSequenceData && appState.currentSequenceIndex >= appState.currentSequenceData.points.length) {
                // Animation finished, ensure the full set of points is drawn (final frame)
                if (pointsGeometry && pointsGeometry.drawRange.count < appState.currentSequenceData.points.length) {
                    pointsGeometry.setDrawRange(0, appState.currentSequenceData.points.length);
                    pointsGeometry.attributes.position.needsUpdate = true;
                    pointsGeometry.attributes.color.needsUpdate = true;
                    // console.log("DEBUG_ANIMATE: Animation finished. Ensured all points are drawn to the full sequence length.");
                }
            }
            
            if (renderer && scene && camera) {
                renderer.render(scene, camera);
            }
        }

        // --- Event Listeners and UI Logic ---
        document.addEventListener('DOMContentLoaded', () => {
            console.log("DOMContentLoaded: Initializing app.");
            initThreeJS(); 
            // Initial call to start the animation loop; it will immediately check appState.currentSequenceData (which is null initially)
            animateScene(performance.now()); 

            const inputN = document.getElementById('inputN');
            const inputX = document.getElementById('inputX');
            const inputY = document.getElementById('inputY');
            const inputZ = document.getElementById('inputZ');
            const generateBtn = document.getElementById('generateBtn');
            const clearBtn = document.getElementById('clearBtn');

            generateBtn.addEventListener('click', () => {
                console.log("Generate button clicked.");
                const n = parseInt(inputN.value);
                const x = parseInt(inputX.value);
                const y = parseInt(inputY.value);
                const z = parseInt(inputZ.value);

                if (isNaN(n) || n <= 0) { showMessage("N (Start Number) must be a positive integer.", "error"); return; }
                if (isNaN(x) || x === 0) { showMessage("X (Divisor) must be a non-zero integer.", "error"); return; }
                if (isNaN(y)) { showMessage("Y (Multiplier) must be an integer.", "error"); return; }
                if (isNaN(z)) { showMessage("Z (Adder) must be an integer.", "error"); return; }

                clearScene(); 

                const result = generalizedCollatz(n, x, y, z, MAX_ITERATIONS);
                console.log("Collatz calculation result:", result);

                if (result.type === "error" || result.type.startsWith("diverges_")) {
                    showMessage(result.message, "error");
                    return;
                }

                const pathPoints = generateLinePath(result.sequence, x);
                
                if (pathPoints.length === 0) { 
                    showMessage("Sequence is too short to visualize. Try a different N.", "info");
                    return;
                }

                // Deep clone the result object and update appState properties
                appState.currentSequenceData = JSON.parse(JSON.stringify({ 
                    sequence: result.sequence, 
                    x: x, 
                    points: pathPoints 
                }));
                appState.currentSequenceIndex = 0; 
                appState.lastDrawTime = performance.now(); 
                showMessage(`Generated: ${result.message}`);
                console.log("Animation data set. Lines should start drawing.");

                // --- CRITICAL FIX: Restart the animation loop to ensure correct closure ---
                if (animationFrameId) {
                    cancelAnimationFrame(animationFrameId);
                }
                animationFrameId = requestAnimationFrame(animateScene); // Start a new loop
            });

            clearBtn.addEventListener('click', () => {
                console.log("Clear button clicked.");
                clearScene(); 
                showMessage("Scene cleared.");
            });
        });
