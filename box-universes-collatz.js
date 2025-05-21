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
    let gridSize = 9;
    let grid = [];

    for (let i = 0; i < gridSize; i++) {
        grid[i] = [];
        for (let j = 0; j < gridSize; j++) {
            grid[i][j] = ' '; // Initialize with spaces
        }
    }

    // 1. Create the basic structure of the net with '+' borders
    // All outer rows/cols are borders.
    // This creates a central 7x7 usable area
    for (let i = 0; i < gridSize; i++) {
        grid[0][i] = '+'; // Top border
        grid[gridSize - 1][i] = '+'; // Bottom border
        grid[i][0] = '+'; // Left border
        grid[i][gridSize - 1] = '+'; // Right border
    }

    // --- Revised Label Placement ---
    // Make the label compact, e.g., "S:1 R:231"
    const internalLabel = `S:${startNum} R:${xVal}${yVal}${zVal}`;
    // Max width for label within the border is gridSize - 2 = 7 characters if centered
    // We'll try to center it in the top central face, which starts from col 2 (index 1)
    // Label will be placed in row 1, covering some of the original border, or more typically
    // in row 1 inside the usable grid area. Let's make it just the StartNum for simplicity.
    const numLabel = `S:${startNum}`;
    const labelRow = 1; // Row for the label
    const labelColStart = 1; // Start from col 1 (index 1)
    for (let i = 0; i < numLabel.length; i++) {
        if (labelColStart + i < gridSize - 1) { // Ensure within bounds
            grid[labelRow][labelColStart + i] = numLabel[i];
        }
    }

    // --- Core Net Layout (Standard Cross/T-Shape) ---
    // Let's visualize the 6 faces. Each face will be 1x1 cell for this purpose,
    // as a 9x9 grid doesn't allow 3x3 faces for a full net.
    // If we want 3x3 faces, the grid needs to be larger (e.g., 9x12 for a T-net)

    // Let's define the center of the middle horizontal strip as [4][4] (row 4, col 4)
    // This is the common layout:
    //      [ ][X][ ]
    //   [X][X][X][X]
    //      [ ][X][ ]

    let seq = sequence(startNum, xVal, yVal, zVal, 100).sequence;
    let seqIndex = 0;

    const fillCell = (r, c) => {
        if (seqIndex < seq.length) {
            grid[r][c] = (seq[seqIndex] % 2 === 0) ? 'x' : 'o';
            seqIndex++;
        } else {
            grid[r][c] = ' '; // Fill with space if sequence runs out
        }
    };

    // Central horizontal strip (4 faces)
    // E.g., [4][2], [4][3], [4][4], [4][5]
    fillCell(4, 2); // Left-center face
    fillCell(4, 3); // Center face
    fillCell(4, 4); // Right-center face
    fillCell(4, 5); // Far right face

    // Top face (above the 3rd cell of the horizontal strip)
    // E.g., [3][4]
    fillCell(3, 4);

    // Bottom face (below the 3rd cell of the horizontal strip)
    // E.g., [5][4]
    fillCell(5, 4);


    // Add tabs for assembly (these will need to be re-positioned for the new net shape)
    // This is a basic example of placing tabs around the new "cells"
    grid[3][3] = 'T'; // Tab on top-left of central-center face
    grid[3][5] = 'T'; // Tab on top-right of far-right face
    grid[5][3] = 'T'; // Tab on bottom-left of central-center face
    grid[5][5] = 'T'; // Tab on bottom-right of far-right face
    grid[4][1] = 'T'; // Tab on left of left-center face
    grid[4][6] = 'T'; // Tab on right of far-right face
    grid[2][4] = 'T'; // Tab above top face
    grid[6][4] = 'T'; // Tab below bottom face


    let netString = "";
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            netString += grid[i][j];
        }
        netString += "\n";
    }
    return netString;
}

// --- Main Execution (unchanged from previous) ---
let startingNumbers = [1, 2, 3, 5, 7, 10];
const rulesToTest = [
    { x: 2, y: 3, z: 1, description: "Classic Collatz (2,3,1)" },
    { x: 2, y: 5, z: 1, description: "Modified Collatz (2,5,1)" },
    { x: -2, y: 3, z: 1, description: "Negative Division ( -2,3,1)"},
    { x: 3, y: 4, z: 2, description: "Custom Rule (3,4,2)"}
];

// Define your universe bounds for generating data
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

        // Call nine_net directly for individual output as before
        let cubeNet = nine_net(startNum, rule.x, rule.y, rule.z);
        console.log(cubeNet);
    }
}