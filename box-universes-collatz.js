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
    let gridSize = 13; // <-- INCREASED GRID SIZE HERE!
    let grid = [];

    for (let i = 0; i < gridSize; i++) {
        grid[i] = [];
        for (let j = 0; j < gridSize; j++) {
            grid[i][j] = ' '; // Initialize with spaces
        }
    }

    // 1. Create the basic structure of the net with '+' borders
    // Now borders will be on rows/cols 0 and gridSize-1 (12)
    for (let i = 0; i < gridSize; i++) {
        grid[0][i] = '+'; // Top border
        grid[gridSize - 1][i] = '+'; // Bottom border
        grid[i][0] = '+'; // Left border
        grid[i][gridSize - 1] = '+'; // Right border
    }

    // --- Revised Label Placement (adjusted for 13x13) ---
    // Label will still be in row 1, but centered for the wider grid.
    const numLabel = `S:${startNum} R:${xVal}${yVal}${zVal}`; // Let's put more info in the label
    const labelRow = 1;
    // Calculate start column to center it in the middle of the new, wider grid
    const labelColStart = Math.floor((gridSize - numLabel.length) / 2);
    for (let i = 0; i < numLabel.length; i++) {
        if (labelColStart + i >= 1 && labelColStart + i <= gridSize - 2) { // Ensure within bounds
            grid[labelRow][labelColStart + i] = numLabel[i];
        }
    }


    // --- Core Net Layout (Standard Cross/T-Shape - adjusted for 13x13) ---
    // The "center" of the horizontal strip will now be roughly grid[6][6]
    // Each 'face' (x/o) will be placed in a conceptual 3x3 block, but we'll still use one char for simplicity.
    // We'll place the 'x'/'o' character in the center of its conceptual 3x3 face.

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

    // The central face of the net will be around row 6, col 6
    // Let's make the "faces" be at these central points:
    //
    //              [F]   <- Top Face (e.g., at [3][6])
    //         [F][F][F][F] <- Horizontal Strip (e.g., [6][3] to [6][9])
    //              [F]   <- Bottom Face (e.g., at [9][6])
    //
    // Conceptual 3x3 cells (each containing one x/o for now)
    // Row/Col ranges for the "plus" shape:
    // Rows: 3, 4, 5, 6, 7, 8, 9
    // Cols: 3, 4, 5, 6, 7, 8, 9

    // Central horizontal strip (4 faces)
    // These will be in row 6, at columns 3, 5, 7, 9 (separated by spaces for clarity)
    fillCell(6, 3); // Face 1 (Left)
    fillCell(6, 5); // Face 2
    fillCell(6, 7); // Face 3 (Center for top/bottom connection)
    fillCell(6, 9); // Face 4 (Right)

    // Top face (connected to Face 3)
    fillCell(3, 7); // Row 3, Col 7 (aligned with Face 3's center)

    // Bottom face (connected to Face 3)
    fillCell(9, 7); // Row 9, Col 7 (aligned with Face 3's center)

    // --- Tab Placement (clearly outside the plus sign) ---
    // Now we have plenty of room for tabs! These will be on the border or in the empty space.

    // Tabs for Top Face (at 3,7)
    grid[2][7] = 'T'; // Above
    grid[3][6] = 'T'; // Left
    grid[3][8] = 'T'; // Right

    // Tabs for Left-most Face (at 6,3)
    grid[6][2] = 'T'; // Left
    grid[5][3] = 'T'; // Above
    grid[7][3] = 'T'; // Below

    // Tabs for Face 2 (at 6,5)
    grid[5][5] = 'T'; // Above
    grid[7][5] = 'T'; // Below

    // Tabs for Face 3 (at 6,7) - This is the central connection point
    // We'll primarily add tabs connecting it to Face 4 and the Top/Bottom faces
    grid[5][7] = 'T'; // Above (to top face)
    grid[7][7] = 'T'; // Below (to bottom face)

    // Tabs for Face 4 (Right - at 6,9)
    grid[6][10] = 'T'; // Right
    grid[5][9] = 'T';  // Above
    grid[7][9] = 'T';  // Below

    // Tabs for Bottom Face (at 9,7)
    grid[10][7] = 'T'; // Below
    grid[9][6] = 'T';  // Left
    grid[9][8] = 'T';  // Right


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