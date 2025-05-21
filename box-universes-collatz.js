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
    for (let i = 0; i < gridSize; i++) {
        grid[0][i] = '+'; // Top border
        grid[gridSize - 1][i] = '+'; // Bottom border
        grid[i][0] = '+'; // Left border
        grid[i][gridSize - 1] = '+'; // Right border
    }

    // --- Revised Label Placement ---
    const numLabel = `S:${startNum}`;
    const labelRow = 1; // Row for the label
    const labelColStart = 1; // Start from col 1 (index 1)
    for (let i = 0; i < numLabel.length; i++) {
        if (labelColStart + i < gridSize - 1) { // Ensure within bounds
            grid[labelRow][labelColStart + i] = numLabel[i];
        }
    }

    // --- Core Net Layout (Standard Cross/T-Shape) ---
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

    // Define the positions for the 6 faces on the 9x9 grid
    // This forms a 'plus' shape where each 'x' or 'o' represents a full face
    // Center point of the horizontal strip: roughly grid[4][4]
    //
    //      [ ][ ][ ][T][ ][ ][ ]
    //      [ ][ ][ ][T][ ][ ][ ]
    //      [ ][ ][ ][F][ ][ ][ ]  <- Top Face (F = filled cell)
    //   [T][ ][ ][T][ ][ ][T][ ]
    //   [F][ ][ ][F][ ][ ][F][F]  <- Horizontal strip of 4 faces
    //   [T][ ][ ][T][ ][ ][T][ ]
    //      [ ][ ][ ][F][ ][ ][ ]  <- Bottom Face
    //      [ ][ ][ ][T][ ][ ][ ]
    //      [ ][ ][ ][T][ ][ ][ ]

    // Central horizontal strip (4 faces)
    fillCell(4, 2); // Face 1 (Left)
    fillCell(4, 3); // Face 2
    fillCell(4, 4); // Face 3 (Center for top/bottom connection)
    fillCell(4, 5); // Face 4 (Right)

    // Top face (connected to Face 3)
    fillCell(3, 4);

    // Bottom face (connected to Face 3)
    fillCell(5, 4);

    // --- Revised Tab Placement (on the borders '+' characters) ---
    // These need to be placed carefully to align with the faces

    // Tabs for Left Face (4,2)
    grid[4][1] = 'T'; // Left of face
    grid[3][2] = 'T'; // Top of face
    grid[5][2] = 'T'; // Bottom of face

    // Tabs for Face 2 (4,3)
    grid[3][3] = 'T'; // Top of face
    grid[5][3] = 'T'; // Bottom of face

    // Tabs for Face 3 (4,4)
    grid[3][4] = 'T'; // Already filled by top face, will be overwritten by a tab
                     // If you want a tab here, the top face needs to move, or this tab is just for the side.
                     // Let's assume this tab will be below the top face, connecting to central.
    grid[5][4] = 'T'; // Already filled by bottom face
    // Let's refine the tab strategy. Tabs should be on the *borders* of the faces.
    // The previous fillCell() fills a single character for the face.
    // Tabs should be adjacent to the *edges* of those characters.

    // Let's redefine tab placement based on cell coordinates to avoid conflicts with face data.
    // This requires adding tabs to the '+' border or empty space.
    // Assuming 9x9 grid, border is 0 and 8. Faces are 2-6.
    //
    // Central Horizontal Strip: (4,2), (4,3), (4,4), (4,5)
    // Left Face (4,2) tabs:
    grid[4][1] = 'T'; // Left border
    grid[3][2] = 'T'; // Top border
    grid[5][2] = 'T'; // Bottom border

    // Face 2 (4,3) tabs:
    grid[3][3] = 'T'; // Top border
    grid[5][3] = 'T'; // Bottom border

    // Face 3 (4,4) tabs:
    // This face connects to Top (3,4) and Bottom (5,4)
    grid[3][5] = 'T'; // Top right of face 3
    grid[5][5] = 'T'; // Bottom right of face 3

    // Face 4 (Right - 4,5) tabs:
    grid[4][6] = 'T'; // Right border
    grid[3][6] = 'T'; // Top border
    grid[5][6] = 'T'; // Bottom border


    // Top Face (3,4) tabs:
    grid[2][4] = 'T'; // Top border
    grid[3][3] = 'T'; // Left border (overlaps with face 2 tab, need to be careful)
    grid[3][5] = 'T'; // Right border (overlaps with face 3 tab)

    // Bottom Face (5,4) tabs:
    grid[6][4] = 'T'; // Bottom border
    grid[5][3] = 'T'; // Left border (overlaps with face 2 tab)
    grid[5][5] = 'T'; // Right border (overlaps with face 3 tab)

    // Let's simplify the tab placement to avoid overlaps with each other or sequence cells
    // This needs to be carefully chosen to avoid overwriting sequence, but be on the border.
    // Let's try placing tabs at coordinates that are guaranteed to be borders or empty space.
    // Coordinates like [r][0], [r][8], [0][c], [8][c] are borders.
    // Also internal spaces like [1][c], [7][c], [r][1], [r][7] might be border-like.

    // Redefining Tab Placement for clarity and avoiding overwrites on sequence (x/o) cells.
    // Tabs will be placed on the '+' border lines where they would naturally connect.
    // Based on the 'plus' shape:
    //      [ ][ ][ ][F][ ][ ][ ]
    //   [F][ ][ ][F][ ][ ][F][F]
    //      [ ][ ][ ][F][ ][ ][ ]

    // Tabs for Top Face (3,4) - connect upwards and sideways
    grid[2][4] = 'T'; // Above top face
    grid[3][3] = 'T'; // Left of top face (connects to 4,3's right)
    grid[3][5] = 'T'; // Right of top face (connects to 4,5's left)

    // Tabs for Left-most Face (4,2) - connect leftwards, top and bottom
    grid[4][1] = 'T'; // Left of face
    grid[3][2] = 'T'; // Top of face
    grid[5][2] = 'T'; // Bottom of face

    // Tabs for Face 2 (4,3) - connect top and bottom
    grid[3][3] = 'T'; // Top of face (might overlap with a tab from Top Face)
    grid[5][3] = 'T'; // Bottom of face

    // Tabs for Face 3 (4,4) - already covered by top/bottom connection, maybe not needed on its top/bottom
    // We need tabs for the 'right' connection of face 3 to face 4.
    grid[4][5] = 'T'; // Right of Face 3 (this is actually where Face 4 goes) -> error in concept.

    // Let's simplify. Tabs should be on the *perimeter* of the unfolded net.
    // These are the "+" characters you drew.

    // Top face tabs (connected to central Face 3)
    grid[2][3] = 'T'; // Top Left corner tab
    grid[2][4] = 'T'; // Top Middle tab
    grid[2][5] = 'T'; // Top Right corner tab
    grid[3][2] = 'T'; // Left side tab
    grid[3][6] = 'T'; // Right side tab

    // Left face tabs (connected to central Face 1)
    grid[4][1] = 'T'; // Left side tab
    grid[3][1] = 'T'; // Top Left
    grid[5][1] = 'T'; // Bottom Left

    // Right face tabs (connected to central Face 4)
    grid[4][7] = 'T'; // Right side tab
    grid[3][7] = 'T'; // Top Right
    grid[5][7] = 'T'; // Bottom Right

    // Bottom face tabs (connected to central Face 3)
    grid[6][3] = 'T'; // Bottom Left
    grid[6][4] = 'T'; // Bottom Middle
    grid[6][5] = 'T'; // Bottom Right
    grid[5][2] = 'T'; // Left side tab
    grid[5][6] = 'T'; // Right side tab


    // The current tab placement strategy is messy and causes overwrites/unwanted visuals.
    // The previous simple tab placement was actually less visually disruptive,
    // though not strictly accurate for folding.

    // Let's try a very minimal set of tabs that are clearly on the border and near the connections.
    // This will avoid overwriting the sequence or other tabs.
    grid[1][4] = 'T'; // Topmost part of top face column
    grid[7][4] = 'T'; // Bottommost part of bottom face column
    grid[4][1] = 'T'; // Leftmost part of horizontal strip
    grid[4][7] = 'T'; // Rightmost part of horizontal strip

    // Also some tabs at the inner corners where faces meet
    grid[3][3] = 'T'; // Between top and left of central strip
    grid[3][5] = 'T'; // Between top and right of central strip
    grid[5][3] = 'T'; // Between bottom and left of central strip
    grid[5][5] = 'T'; // Between bottom and right of central strip


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