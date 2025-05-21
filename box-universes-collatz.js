var sequence = function (num, x, y, z, maxiterations) {
    if (x === 0) {
        return { sequence: [], type: "error" };
    }
    var output = [];
    output.push(num);
    var iterations = 0;
    while (num > 1 && iterations < maxiterations) {
        var next_num;
        if (num % Math.abs(x) === 0) {
            next_num = num / x;
        } else {
            next_num = (Math.abs(y) || 3) * num + (z || 1);
        }

        if (output.includes(next_num)) {
            output.push(next_num);
            return { sequence: output, type: "cycle" };
        }

        num = next_num;
        output.push(num);
        iterations++;
    }

    if (num === 1) {
        return { sequence: output, type: "converges_to_1" };
    } else {
        return { sequence: output, type: "reached_max_iterations" };
    }
};

var generateBoxUniverseData = function (startNum, xStart, xEnd, yStart, yEnd, zStart, zEnd, maxIterations) {
    var universeData = [];
    const xOffset = xStart;
    const yOffset = yStart;
    const zOffset = zStart;

    for (let x = xStart; x <= xEnd; x++) {
        universeData[x - xOffset] = [];
        for (let y = yStart; y <= yEnd; y++) {
            universeData[x - xOffset][y - yOffset] = [];
            for (let z = zStart; z <= zEnd; z++) {
                var result = sequence(startNum, x, y, z, maxIterations);
                universeData[x - xOffset][y - yOffset][z - zOffset] = { coordinates: [x, y, z], result: result };
            }
        }
    }
    return { data: universeData, xStart, yStart, zStart, xEnd, yEnd, zEnd };
};

var visualizer_computer = function (universe) {
    var carpenter = function (coordinates) { /*makes boxes*/};
    var Genesis = function (sequences) {/*graphs sequences*/ };
    var postmaster = function (coordinates, sequences) { /* puts the graphs in the boxes*/};
};


function nine_net(startNum = 1, xVal = 2, yVal = 3, zVal = 1) {
    let gridSize = 13; // Still 13x13
    let grid = [];

    // Initialize with spaces
    for (let i = 0; i < gridSize; i++) {
        grid[i] = [];
        for (let j = 0; j < gridSize; j++) {
            grid[i][j] = ' ';
        }
    }

    // Outer border
    for (let i = 0; i < gridSize; i++) {
        grid[0][i] = '+';
        grid[gridSize - 1][i] = '+';
        grid[i][0] = '+';
        grid[i][gridSize - 1] = '+';
    }

    // Label
    const numLabel = `S:${startNum}`;
    const labelRow = 1;
    const labelColStart = 7 - Math.floor(numLabel.length / 2);
    for (let i = 0; i < numLabel.length; i++) {
        if (labelColStart + i >= 1 && labelColStart + i <= gridSize - 2) {
            grid[labelRow][labelColStart + i] = numLabel[i];
        }
    }

    // --- Core Net Faces ---
    let seq = sequence(startNum, xVal, yVal, zVal, 100).sequence;
    let seqIndex = 0;

    // Define the conceptual "face" cells. These are the *centers* of where each face would be.
    // We'll also store their bounding box for easier tab placement later.
    const faces = [
        { r: 3, c: 6 }, // Top face
        { r: 6, c: 3 }, // Left face
        { r: 6, c: 5 }, // Center-left face
        { r: 6, c: 7 }, // True center face
        { r: 6, c: 9 }, // Center-right face
        { r: 9, c: 6 }  // Bottom face
    ];

    // Mark the face cells with sequence values or '+'
    faces.forEach(face => {
        if (seqIndex < seq.length) {
            grid[face.r][face.c] = (seq[seqIndex] % 2 === 0) ? 'x' : 'o';
            seqIndex++;
        } else {
            grid[face.r][face.c] = '+'; // Fill with '+' if sequence runs out
        }
    });

    // --- Tab Placement with Collision Detection ---
    // Iterate through each face and determine where its tabs should go.
    // A tab should be 1 unit away from the face, and in an empty spot.

    // Define directions for tabs relative to a face center [dr, dc]
    const tabDirections = [
        [-1, 0], // Top
        [1, 0],  // Bottom
        [0, -1], // Left
        [0, 1]   // Right
    ];

    // Additional corner tabs (for faces that have more than 2 connections)
    const cornerTabDirections = [
        [-1, -1], // Top-Left
        [-1, 1],  // Top-Right
        [1, -1],  // Bottom-Left
        [1, 1]    // Bottom-Right
    ];


    // Function to check if a coordinate is within the bounds of the grid
    const inBounds = (r, c) => r >= 0 && r < gridSize && c >= 0 && c < gridSize;

    // Function to check if a coordinate is already part of a face
    const isFaceCell = (r, c) => faces.some(f => f.r === r && f.c === c);
    
    // Helper to add a tab if the spot is eligible
    const tryPlaceTab = (r, c) => {
        // Ensure it's within grid bounds, not already a border (+), and not already a face character (x, o, +)
        if (inBounds(r, c) && grid[r][c] === ' ' && !isFaceCell(r, c)) {
            grid[r][c] = 'T';
        }
    };


    // Place tabs for each face
    faces.forEach(face => {
        // Main (cardinal) tabs
        tabDirections.forEach(dir => {
            let tr = face.r + dir[0];
            let tc = face.c + dir[1];
            tryPlaceTab(tr, tc);
        });

        // Add some corner tabs specifically for faces that would connect diagonally
        // This makes the tabs visually connect better for complex nets.
        // For a simple cube net, we might only need cardinal.
        // Let's refine specific corner tabs based on which faces connect to which.

        // Tabs around Top Face (3,6) - it connects "down" to (6,7)
        if (face.r === 3 && face.c === 6) { // Top Face
             tryPlaceTab(face.r, face.c - 1); // Left of top face
             tryPlaceTab(face.r, face.c + 1); // Right of top face
        }
        // Tabs around Left Face (6,3) - it connects "right" to (6,5)
        if (face.r === 6 && face.c === 3) { // Left Face
             tryPlaceTab(face.r - 1, face.c); // Above left face
             tryPlaceTab(face.r + 1, face.c); // Below left face
        }
        // Tabs around Face 2 (6,5) - connects left to 6,3 and right to 6,7
        if (face.r === 6 && face.c === 5) {
            tryPlaceTab(face.r - 1, face.c); // Above
            tryPlaceTab(face.r + 1, face.c); // Below
        }
        // Tabs around Face 3 (6,7) - true center. Connects to all others
        if (face.r === 6 && face.c === 7) {
            tryPlaceTab(face.r - 1, face.c); // Above
            tryPlaceTab(face.r + 1, face.c); // Below
            tryPlaceTab(face.r, face.c - 1); // Left
            tryPlaceTab(face.r, face.c + 1); // Right

            // Specific corner tabs for the central face, forming connecting "corners"
            tryPlaceTab(face.r - 1, face.c - 1); // Top-left corner
            tryPlaceTab(face.r - 1, face.c + 1); // Top-right corner
            tryPlaceTab(face.r + 1, face.c - 1); // Bottom-left corner
            tryPlaceTab(face.r + 1, face.c + 1); // Bottom-right corner
        }
        // Tabs around Face 4 (Right - at 6,9)
        if (face.r === 6 && face.c === 9) {
            tryPlaceTab(face.r - 1, face.c); // Above
            tryPlaceTab(face.r + 1, face.c); // Below
            tryPlaceTab(face.r, face.c + 1); // Right
        }
        // Tabs around Bottom Face (at 9,6)
        if (face.r === 9 && face.c === 6) {
            tryPlaceTab(face.r + 1, face.c); // Below
            tryPlaceTab(face.r, face.c - 1); // Left
            tryPlaceTab(face.r, face.c + 1); // Right
        }
    });


    // Final grid string assembly
    let netString = "";
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            netString += grid[i][j];
        }
        netString += "\n";
    }
    return netString;
}

// --- Main Execution (unchanged) ---
let startingNumbers = [1, 2, 3, 5, 7, 10];
const rulesToTest = [
    { x: 2, y: 3, z: 1, description: "Classic Collatz (2,3,1)" },
    { x: 2, y: 5, z: 1, description: "Modified Collatz (2,5,1)" },
    { x: -2, y: 3, z: 1, description: "Negative Division ( -2,3,1)"},
    { x: 3, y: 4, z: 2, description: "Custom Rule (3,4,2)"}
];

const universeXStart = 1;
const universeXEnd = 2;
const universeYStart = 1;
const universeYEnd = 2;
const universeZStart = 1;
const universeZEnd = 2;

for (const rule of rulesToTest) {
    console.log(`\n==============================================`);
    console.log(`  Collatz Cube Net for Rule: (${rule.x}, ${rule.y}, ${rule.z})`);
    console.log(`==============================================\n`);

    for (let i = 0; i < startingNumbers.length; i++) {
        let startNum = startingNumbers[i];
        console.log(`--- For Starting Number: ${startNum} ---\n`);

        const currentUniverse = generateBoxUniverseData(
            startNum,
            universeXStart, universeXEnd,
            universeYStart, universeYEnd,
            universeZStart, universeZEnd,
            100
        );

        let cubeNet = nine_net(startNum, rule.x, rule.y, rule.z);
        console.log(cubeNet);
    }
}