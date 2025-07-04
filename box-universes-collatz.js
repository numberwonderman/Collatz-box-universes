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
/*
var visualizer_computer = function (universe) {
    var carpenter = function (coordinates) { /*makes boxes};
    var Genesis = function (sequences) {/*graphs sequences };
    var postmaster = function (coordinates, sequences) { /* puts the graphs in the boxes};
};
*/


// You DO NOT need to change the 'sequence' function from its last version.

function nine_net(startNum = 1, xVal = 2, yVal = 3, zVal = 1) {
    let gridSize = 15;
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
    const ruleLabel = `R:${xVal}${yVal}${zVal}`;
    const labelRow = 1;
    const labelColStartNum = 2;
    const labelColStartRule = gridSize - ruleLabel.length - 2;

    for (let i = 0; i < numLabel.length; i++) {
        grid[labelRow][labelColStartNum + i] = numLabel[i];
    }
    for (let i = 0; i < ruleLabel.length; i++) {
        grid[labelRow][labelColStartRule + i] = ruleLabel[i];
    }

    // --- Define Face Regions (3x3 blocks) by their top-left corner ---
    const faceDefinitions = {
        top: { r: 3, c: 6 },
        left: { r: 6, c: 3 },
        centerLeft: { r: 6, c: 6 },
        center: { r: 6, c: 9 },
        centerRight: { r: 6, c: 12 },
        bottom: { r: 9, c: 6 }
    };

    // --- Array to hold ALL coordinates belonging to any face ---
    const allFaceCells = [];
    for (const key in faceDefinitions) {
        const face = faceDefinitions[key];
        for (let r = face.r; r < face.r + 3; r++) {
            for (let c = face.c; c < face.c + 3; c++) {
                allFaceCells.push({ r: r, c: c });
            }
        }
    }

    // Helper to check if a given (checkR, checkC) is one of the designated face cells
    const isDesignatedFaceCell = (checkR, checkC) => {
        return allFaceCells.some(cell => cell.r === checkR && cell.c === checkC);
    };


    // --- Phase 1: Fill Face Regions with sequence data (D/M) and '+' if sequence runs out ---
    // 'sequence' function still returns array of numbers: [num1, num2, ...]
    let seq = sequence(startNum, xVal, yVal, zVal, 100).sequence;
    let seqIndex = 0;

    for (const key in faceDefinitions) {
        const face = faceDefinitions[key];
        for (let r = face.r; r < face.r + 3; r++) {
            for (let c = face.c; c < face.c + 3; c++) {
                if (seqIndex < seq.length) {
                    const currentNumInSequence = seq[seqIndex];
                    // Here's the key change: checking divisibility by rule.x
                    if (currentNumInSequence % Math.abs(xVal) === 0) {
                        grid[r][c] = 'D'; // 'D' for Divisible by rule.x
                    } else {
                        grid[r][c] = 'M'; // 'M' for Multiply/Add rule
                    }
                    seqIndex++;
                } else {
                    grid[r][c] = '+'; // Fill with '+' if sequence runs out
                }
            }
        }
    }

    // --- Phase 2: Place 'T's in designated tab areas, ensuring no overlap with faces ---
    const placeTab = (r, c) => {
        if (r > 0 && r < gridSize - 1 && c > 0 && c < gridSize - 1 && grid[r][c] === ' ' && !isDesignatedFaceCell(r, c)) {
            grid[r][c] = 'T';
        }
    };

    // Tabs for Top Face (origin: r:3, c:6)
    for (let c = faceDefinitions.top.c; c < faceDefinitions.top.c + 3; c++) placeTab(faceDefinitions.top.r - 1, c); // Top edge (horizontal strip)
    placeTab(faceDefinitions.top.r, faceDefinitions.top.c - 1); // Left vertical
    placeTab(faceDefinitions.top.r + 1, faceDefinitions.top.c - 1);
    placeTab(faceDefinitions.top.r + 2, faceDefinitions.top.c - 1);
    placeTab(faceDefinitions.top.r, faceDefinitions.top.c + 3); // Right vertical
    placeTab(faceDefinitions.top.r + 1, faceDefinitions.top.c + 3);
    placeTab(faceDefinitions.top.r + 2, faceDefinitions.top.c + 3);


    // Tabs for Left Face (origin: r:6, c:3)
    for (let r = faceDefinitions.left.r; r < faceDefinitions.left.r + 3; r++) placeTab(r, faceDefinitions.left.c - 1); // Left edge (vertical strip)
    for (let c = faceDefinitions.left.c; c < faceDefinitions.left.c + 3; c++) placeTab(faceDefinitions.left.r - 1, c); // Top edge (horizontal strip)


    // Tabs for Center-Left Face (origin: r:6, c:6) - external tabs only on bottom and right
    for (let c = faceDefinitions.centerLeft.c; c < faceDefinitions.centerLeft.c + 3; c++) placeTab(faceDefinitions.centerLeft.r + 3, c); // Bottom edge
    for (let r = faceDefinitions.centerLeft.r; r < faceDefinitions.centerLeft.r + 3; r++) placeTab(r, faceDefinitions.centerLeft.c + 3); // Right edge


    // Tabs for Center Face (origin: r:6, c:9) - external tabs on top, bottom, and right
    for (let c = faceDefinitions.center.c; c < faceDefinitions.center.c + 3; c++) placeTab(faceDefinitions.center.r - 1, c); // Top edge
    for (let c = faceDefinitions.center.c; c < faceDefinitions.center.c + 3; c++) placeTab(faceDefinitions.center.r + 3, c); // Bottom edge
    for (let r = faceDefinitions.center.r; r < faceDefinitions.center.r + 3; r++) placeTab(r, faceDefinitions.center.c + 3); // Right edge

    // Tabs for Center-Right Face (origin: r:6, c:12) - far right of horizontal strip
    for (let r = faceDefinitions.centerRight.r; r < faceDefinitions.centerRight.r + 3; r++) placeTab(r, faceDefinitions.centerRight.c + 3); // Right edge
    for (let c = faceDefinitions.centerRight.c; c < faceDefinitions.centerRight.c + 3; c++) placeTab(faceDefinitions.centerRight.r - 1, c); // Top edge
    for (let c = faceDefinitions.centerRight.c; c < faceDefinitions.centerRight.c + 3; c++) placeTab(faceDefinitions.centerRight.r + 3, c); // Bottom edge

    // Tabs for Bottom Face (origin: r:9, c:6)
    for (let c = faceDefinitions.bottom.c; c < faceDefinitions.bottom.c + 3; c++) placeTab(faceDefinitions.bottom.r + 3, c); // Bottom edge
    placeTab(faceDefinitions.bottom.r, faceDefinitions.bottom.c - 1); // Left vertical
    placeTab(faceDefinitions.bottom.r + 1, faceDefinitions.bottom.c - 1);
    placeTab(faceDefinitions.bottom.r + 2, faceDefinitions.bottom.c - 1);
    placeTab(faceDefinitions.bottom.r, faceDefinitions.bottom.c + 3); // Right vertical
    placeTab(faceDefinitions.bottom.r + 1, faceDefinitions.bottom.c + 3);
    placeTab(faceDefinitions.bottom.r + 2, faceDefinitions.bottom.c + 3);


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
console.log(nine_net());
// This code was developed with iterative assistance from Google's Gemini AI.
// Specifically, for debugging spatial layout and refining character representation.
