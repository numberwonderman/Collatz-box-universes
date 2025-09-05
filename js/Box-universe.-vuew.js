- DEBUG MODE FLAG ---
        const DEBUG_MODE = false; // Set to true to enable console logs, false to disable

        // --- Global Three.js Variables ---
        let scene, camera, renderer, controls;
        let meshMap = new Map(); // Stores references to generated Three.js cubes

        // --- Constants ---
        const BOX_SIZE = 1; // Size of each cube representing a ruleset (x,y,z)
        const GRID_SPACING = BOX_SIZE + 0.6; // Spacing between cubes for better visibility
        const MAX_ITERATIONS = 1000; // Increased max iterations
        const CYCLE_DETECTION_LIMIT = 500; // Increased iterations before checking for cycles

        // Color map for different sequence behaviors (use THREE.Color for direct application)
        const COLOR_MAP = {
            converges: new THREE.Color(0x00ff00), // Bright Green
            diverges: new THREE.Color(0xff0000),  // Bright Red
            cycles: new THREE.Color(0x0000ff),    // Bright Blue
            unknown: new THREE.Color(0xaaaaaa),   // Lighter Grey
            classic: new THREE.Color(0xffd700),   // Gold
        };

        // --- UI Elements ---
        const nValueInput = document.getElementById('nValue');
        const xMinInput = document.getElementById('xMin');
        const xMaxInput = document.getElementById('xMax');
        const yMinInput = document.getElementById('yMin');
        const yMaxInput = document.getElementById('yMax');
        const zMinInput = document.getElementById('zMin');
        const zMaxInput = document.getElementById('zMax');
        const generateBtn = document.getElementById('generateBtn');
        const resetCameraBtn = document.getElementById('resetCameraBtn');
        const loadingDiv = document.getElementById('loading');
        const messageArea = document.getElementById('message-area');

        // --- Collatz Logic ---
        function generalizedCollatz(n, x, y, z, maxIterations, cycleDetectionLimit) {
            if (n <= 0) {
                if (DEBUG_MODE) console.error('N must be a positive integer');
                return { sequence: [], type: 'error', message: 'N must be a positive integer' };
            }
            if (x === 0) {
                if (DEBUG_MODE) console.error('X cannot be zero');
                return { sequence: [], type: 'error', message: 'X cannot be zero' };
            }

            let current = n;
            const history = new Set();
            const historyArray = []; // To reconstruct cycles if found

            for (let i = 0; i < maxIterations; i++) {
                // Console log added here to track progress - now conditional
                if (DEBUG_MODE) console.log('Iteration:', i, 'Current number:', current, 'Rule:', `X=${x}, Y=${y}, Z=${z}`);

                if (current === 1 && x === 2 && y === 3 && z === 1) {
                    return { type: 'converges' };
                }

                if (i > cycleDetectionLimit && history.has(current)) {
                    // Cycle detected
                    if (DEBUG_MODE) console.log('Cycle detected for N,X,Y,Z:', n, x, y, z);
                    return { type: 'cycles' };
                }
                history.add(current);
                historyArray.push(current);

                if (current % x === 0) {
                    current /= x;
                } else {
                    current = current * y + z;
                }

                if (Math.abs(current) > Number.MAX_SAFE_INTEGER || Math.abs(current) < Number.MIN_SAFE_INTEGER) {
                    if (DEBUG_MODE) console.warn('Number too large/small, stopping computation for N,X,Y,Z:', n, x, y, z);
                    return { type: 'diverges', message: 'Number too large/small, stopping computation.' };
                }
            }
            if (DEBUG_MODE) console.warn('Max iterations reached without convergence or cycle for N,X,Y,Z:', n, x, y, z);
            return { type: 'diverges', message: 'Max iterations reached without convergence or cycle' };
        }

        // --- Three.js Initialization ---
        function initThreeJS() {
            const canvas = document.getElementById('three-canvas');
            const container = document.getElementById('three-canvas-container');

            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x1a202c); // Dark background

            camera = new THREE.PerspectiveCamera(
                75,
                container.clientWidth / container.clientHeight,
                0.1,
                2000
            );
            // Adjusted initial camera position to be closer and better frame the default grid
            camera.position.set(5, 5, 5); // Closer initial view
            camera.lookAt(0, 0, 0); // Always look at the center

            renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
            renderer.setSize(container.clientWidth, container.clientHeight);
            renderer.setPixelRatio(window.devicePixelRatio);
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;

            // --- LIGHTING SETUP (Reduced Intensity) ---
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.8); // Softer ambient
            scene.add(ambientLight);

            const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5); // Softer directional
            directionalLight.position.set(50, 50, 50);
            directionalLight.castShadow = true;
            directionalLight.shadow.mapSize.width = 2048; // Keep high resolution for shadows
            directionalLight.shadow.mapSize.height = 2048;
            directionalLight.shadow.camera.left = -50;
            directionalLight.shadow.camera.right = 50;
            directionalLight.shadow.camera.top = 50;
            directionalLight.shadow.camera.bottom = -50;
            directionalLight.shadow.camera.near = 0.5;
            directionalLight.shadow.camera.far = 100;
            scene.add(directionalLight);

            const hemiLight = new THREE.HemisphereLight(0xb1e1ff, 0xb97a20, 0.5); // Softer hemisphere light
            scene.add(hemiLight);

            const pointLight = new THREE.PointLight(0xffffff, 1, 100); // Softer point light
            pointLight.position.set(0, 20, 0);
            scene.add(pointLight);

            // --- ADDED DEBUGGING HELPERS (GridHelper and AxesHelper) ---
            // These will help confirm the grid structure is laid out
            const gridHelper = new THREE.GridHelper(10, 10); // Size 10, 10 divisions
            scene.add(gridHelper);

            const axesHelper = new THREE.AxesHelper(5); // Size 5 for axes (X=red, Y=green, Z=blue)
            scene.add(axesHelper);


            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.05;
            controls.screenSpacePanning = false;
            controls.minDistance = 2; // Allow closer zoom
            controls.maxDistance = 200;
            controls.maxPolarAngle = Math.PI / 2;
            controls.target.set(0, 0, 0); // Ensure target is at the center of the grid
            controls.update();

            window.addEventListener('resize', onWindowResize);
            animate();

            if (DEBUG_MODE) console.log('Three.js initialized successfully with reduced lighting and helpers.');
        }

        // --- Three.js Animation Loop ---
        function animate() {
            requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        }

        // --- Visualization Logic ---
        function createOrUpdateCube(x, y, z, type) {
            const key = `${x}-${y}-${z}`;
            let mesh = meshMap.get(key);
            const materialColor = COLOR_MAP[type] || COLOR_MAP.unknown;

            if (mesh) {
                // If mesh exists, update its color
                mesh.material.color.set(materialColor);
            } else {
                // Create new cube
                const geometry = new THREE.BoxGeometry(BOX_SIZE, BOX_SIZE, BOX_SIZE);
                const material = new THREE.MeshStandardMaterial({ color: materialColor, flatShading: true });
                mesh = new THREE.Mesh(geometry, material);

                // Position the cube in the 3D grid, centered around origin
                // Calculate the true center of the range for accurate centering
                const centerX = (parseFloat(xMinInput.value) + parseFloat(xMaxInput.value)) / 2;
                const centerY = (parseFloat(yMinInput.value) + parseFloat(yMaxInput.value)) / 2;
                const centerZ = (parseFloat(zMinInput.value) + parseFloat(zMaxInput.value)) / 2;

                const offsetX = (x - centerX);
                const offsetY = (y - centerY);
                const offsetZ = (z - centerZ);

                mesh.position.set(
                    offsetX * GRID_SPACING,
                    offsetY * GRID_SPACING,
                    offsetZ * GRID_SPACING
                );
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                scene.add(mesh);
                meshMap.set(key, mesh);
            }

            // Apply special color for classic Collatz rule if it matches
            if (x === 2 && y === 3 && z === 1) {
                mesh.material.color.set(COLOR_MAP.classic);
            }
        }

        function clearCubes() {
            // Remove only the generated cubes, ensuring helpers and lights are preserved
            const objectsToRemove = [];
            scene.children.forEach(child => {
                // Check if the object is a Mesh (our cubes) and not a helper or light
                // Only remove meshes that are *not* a GridHelper or AxesHelper instance
                if (child.isMesh) {
                    objectsToRemove.push(child);
                }
            });

            objectsToRemove.forEach(child => {
                scene.remove(child);
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
            meshMap.clear(); // Clear the map of references
            if (DEBUG_MODE) console.log("Generated cubes cleared.");
        }

        async function generateCubes() {
            // Disable buttons during generation
            generateBtn.disabled = true;
            resetCameraBtn.disabled = true;
            loadingDiv.classList.remove('hidden');
            displayMessage("Generating Box Universe...", "info");

            clearCubes(); // Clear previous cubes

            const nValue = parseInt(nValueInput.value);
            const xMin = parseInt(xMinInput.value);
            const xMax = parseInt(xMaxInput.value);
            const yMin = parseInt(yMinInput.value);
            const yMax = parseInt(yMaxInput.value);
            const zMin = parseInt(zMinInput.value);
            const zMax = parseInt(zMaxInput.value);

            // Validate ranges
            if (isNaN(nValue) || nValue < 1 || isNaN(xMin) || xMin < 1 || isNaN(xMax) || xMax < xMin ||
                isNaN(yMin) || yMin < 1 || isNaN(yMax) || yMax < yMin || isNaN(zMin) || isNaN(zMax) || zMax < zMin) {
                displayMessage('Please enter valid positive integer ranges. X and Y must be >= 1.', 'error');
                generateBtn.disabled = false;
                resetCameraBtn.disabled = false;
                loadingDiv.classList.add('hidden');
                return;
            }

            if (DEBUG_MODE) console.log(`Generating cubes for N=${nValue}, X=[${xMin}-${xMax}], Y=[${yMin}-${yMax}], Z=[${zMin}-${zMax}]`);

            for (let x = xMin; x <= xMax; x++) {
                for (let y = yMin; y <= yMax; y++) {
                    for (let z = zMin; z <= zMax; z++) {
                        // Directly call createOrUpdateCube
                        const result = generalizedCollatz(nValue, x, y, z, MAX_ITERATIONS, CYCLE_DETECTION_LIMIT);
                        createOrUpdateCube(x, y, z, result.type);
                    }
                }
            }

            loadingDiv.classList.add('hidden');
            displayMessage("Collatz Box Universe generated!", "success");
            generateBtn.disabled = false;
            resetCameraBtn.disabled = false;
            resetCameraView(); // Call reset camera after generation for optimal view
            if (DEBUG_MODE) console.log("Cubes generation complete.");
        }

        // --- Camera Reset Function ---
        function resetCameraView() {
            // Updated default camera position for clearer view of the grid
            camera.position.set(5, 5, 5);
            camera.lookAt(0, 0, 0);
            controls.target.set(0, 0, 0);
            controls.update();
            displayMessage("Camera view reset!", "info");
            if (DEBUG_MODE) console.log("Camera reset to default view.");
        }

        // --- Event Handlers ---
        generateBtn.addEventListener('click', generateCubes);
        resetCameraBtn.addEventListener('click', resetCameraView);

        // --- Window Resize Handler ---
        function onWindowResize() {
            const container = document.getElementById('three-canvas-container');
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
            if (DEBUG_MODE) console.log("Window resized.");
        }

        // --- Custom Message Box Function ---
        let messageTimer = null;
        function displayMessage(message, type = 'info') {
            if (messageTimer) {
                clearTimeout(messageTimer);
            }
            messageArea.textContent = message;
            messageArea.className = `mb-4 p-3 rounded-md text-center text-white ${
                type === 'success' ? 'bg-green-500' :
                type === 'error' ? 'bg-red-500' :
                'bg-blue-500'
            }`;
            messageArea.classList.remove('hidden');
            messageTimer = setTimeout(() => {
                messageArea.classList.add('hidden');
            }, 3000);
        }

        // --- Initialize everything on window load ---
        window.addEventListener('load', () => {
            initThreeJS();
            // Generate initial set of cubes after a short delay to allow Three.js to fully render
            setTimeout(generateCubes, 500);
        })
