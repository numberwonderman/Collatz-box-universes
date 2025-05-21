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
    let gridSize = 15; // Increased grid size for more space for tabs
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

    // --- Label Placement ---
    const numLabel = `S:${startNum}`;
    const ruleLabel = `R:${xVal}${yVal}${zVal}`; // Including rule in label
    const labelRow = 1;
    const labelColStartNum = 2; // Fixed position for S:X
    const labelColStartRule = gridSize - ruleLabel.length - 2; // Fixed position for R:XYZ

    for (let i = 0; i < numLabel.length; i++) {
        grid[labelRow][labelColStartNum + i] = numLabel[i];
    }
    for (let i = 0; i < ruleLabel.length; i++) {
        grid[labelRow][labelColStartRule + i] = ruleLabel[i];
    }


    // --- Define Face Regions (3x3 blocks) ---
    // Top-left corner of each 3x3 face block
    // Adjusted these slightly for better visual alignment within the 15x15 grid
    const faces = {
        top: { r: 3, c: 6 },
        left: { r: 6, c: 3 },
        centerLeft: { r: 6, c: 6 },
        center: { r: 6, c: 9 },
        centerRight: { r: 6, c: 12 },
        bottom: { r: 9, c: 6 }
    };

    // --- Fill Face Regions ---
    let seq = sequence(startNum, xVal, yVal, zVal, 100).sequence;
    let seqIndex = 0;

    const fillFaceRegion = (startR, startC) => {
        for (let r = startR; r < startR + 3; r++) {
            for (let c = startC; c < startC + 3; c++) {
                // Only fill if it's an empty space, avoiding overwriting labels/borders
                if (grid[r][c] === ' ') {
                    if (seqIndex < seq.length) {
                        grid[r][c] = (seq[seqIndex] % 2 === 0) ? 'x' : 'o';
                        seqIndex++;
                    } else {
                        grid[r][c] = '+'; // Fill with '+' if sequence runs out
                    }
                }
            }
        }
    };

    fillFaceRegion(faces.top.r, faces.top.c);
    fillFaceRegion(faces.left.r, faces.left.c);
    fillFaceRegion(faces.centerLeft.r, faces.centerLeft.c);
    fillFaceRegion(faces.center.r, faces.center.c);
    fillFaceRegion(faces.centerRight.r, faces.centerRight.c);
    fillFaceRegion(faces.bottom.r, faces.bottom.c);

    // --- Tab Placement (explicitly defined and only fills empty spaces) ---
    // This part defines the precise areas for the tabs.

    // Helper to attempt placing a 'T' only if the spot is an empty space
    const placeTab = (r, c) => {
        if (r > 0 && r < gridSize - 1 && c > 0 && c < gridSize - 1 && grid[r][c] === ' ') {
            grid[r][c] = 'T';
        }
    };

    // Tabs for Top Face (r:3, c:6)
    for (let c = faces.top.c; c < faces.top.c + 3; c++) placeTab(faces.top.r - 1, c); // Top edge
    placeTab(faces.top.r, faces.top.c - 1); // Left edge vertical strip
    placeTab(faces.top.r + 1, faces.top.c - 1);
    placeTab(faces.top.r + 2, faces.top.c - 1);
    placeTab(faces.top.r, faces.top.c + 3); // Right edge vertical strip
    placeTab(faces.top.r + 1, faces.top.c + 3);
    placeTab(faces.top.r + 2, faces.top.c + 3);


    // Tabs for Left Face (r:6, c:3)
    for (let r = faces.left.r; r < faces.left.r + 3; r++) placeTab(r, faces.left.c - 1); // Left edge
    for (let c = faces.left.c; c < faces.left.c + 3; c++) placeTab(faces.left.r - 1, c); // Top edge


    // Tabs for Center-Left Face (r:6, c:6) - external tabs only on bottom and right
    for (let c = faces.centerLeft.c; c < faces.centerLeft.c + 3; c++) placeTab(faces.centerLeft.r + 3, c); // Bottom edge
    for (let r = faces.centerLeft.r; r < faces.centerLeft.r + 3; r++) placeTab(r, faces.centerLeft.c + 3); // Right edge


    // Tabs for Center Face (r:6, c:9) - external tabs only on top, bottom, and right
    for (let c = faces.center.c; c < faces.center.c + 3; c++) placeTab(faces.center.r - 1, c); // Top edge
    for (let c = faces.center.c; c < faces.center.c + 3; c++) placeTab(faces.center.r + 3, c); // Bottom edge
    for (let r = faces.center.r; r < faces.center.r + 3; r++) placeTab(r, faces.center.c + 3); // Right edge

    // Tabs for Center-Right Face (r:6, c:12) - far right of horizontal strip
    for (let r = faces.centerRight.r; r < faces.centerRight.r + 3; r++) placeTab(r, faces.centerRight.c + 3); // Right edge
    for (let c = faces.centerRight.c; c < faces.centerRight.c + 3; c++) placeTab(faces.centerRight.r - 1, c); // Top edge
    for (let c = faces.centerRight.c; c < faces.centerRight.c + 3; c++) placeTab(faces.centerRight.r + 3, c); // Bottom edge

    // Tabs for Bottom Face (r:9, c:6)
    for (let c = faces.bottom.c; c < faces.bottom.c + 3; c++) placeTab(faces.bottom.r + 3, c); // Bottom edge
    placeTab(faces.bottom.r, faces.bottom.c - 1); // Left edge vertical strip
    placeTab(faces.bottom.r + 1, faces.bottom.c - 1);
    placeTab(faces.bottom.r + 2, faces.bottom.c - 1);
    placeTab(faces.bottom.r, faces.bottom.c + 3); // Right edge vertical strip
    placeTab(faces.bottom.r + 1, faces.bottom.c + 3);
    placeTab(faces.bottom.r + 2, faces.bottom.c + 3);

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