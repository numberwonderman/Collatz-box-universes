var sequence = function (num, x, y, z, maxiterations) {
    if (x === 0) {
        return { sequence: [], type: "error" };
    }
    var output = [];
    output.push(num);
    var iterations = 0;
    while (num > 1 && iterations < maxiterations) {
        var next_num;
        // Use Math.abs(x) for the modulo, but x directly for division
        if (num % Math.abs(x) === 0) {
            next_num = num / x; // Use x directly to preserve sign if x is negative
        } else {
            // Ensure y and z are treated as numbers, with defaults
            next_num = (Math.abs(y) || 3) * num + (z || 1); // Use Math.abs(y) for the multiplier, z directly
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

    for (var x = xStart; x <= xEnd; x++) {
        var yDimensionData = [];
        for (var y = yStart; y <= yEnd; y++) {
            var zDimensionData = [];
            for (var z = zStart; z <= zEnd; z++) {
                var result = sequence(startNum, x, y, z, maxIterations);
                zDimensionData.push({ coordinates: [x, y, z], result: result });
            }
            yDimensionData.push(zDimensionData);
        }
        universeData.push(yDimensionData);
    }
    return universeData;
};


var universe = generateBoxUniverseData(5, 1, 2, 1, 2, 1, 2, 10);

var printUniverseData = function (data) {
    for (var i = 0; i < data.length; i++) {
        for (var j = 0; j < data[i].length; j++) {
            for (var k = 0; k < data[i][j].length; k++) {
                var box = data[i][j][k];
                console.log("Coordinates: [" + box.coordinates[0] + ", " + box.coordinates[1] + ", " + box.coordinates[2] + "]");
                console.log("Result Type: " + box.result.type);
                console.log("Sequence: " + box.result.sequence);
                console.log("---");
            }
        }
    }
};

var visualizer_computer = function (universe) {
    var carpenter = function (coordinates) { /*makes boxes*/};
    var Genesis = function (sequences) {/*graphs sequences*/ };
    var postmaster = function (coordinates, sequences) { /* puts the graphs in the boxes*/};
};

// MODIFIED: Added xVal, yVal, zVal parameters
function nine_net(startNum = 1, xVal = 2, yVal = 3, zVal = 1) {
    let gridSize = 9;
    let grid = [];

    for (let i = 0; i < gridSize; i++) {
        grid[i] = [];
        for (let j = 0; j < gridSize; j++) {
            grid[i][j] = ' ';
        }
    }

    for (let i = 0; i < gridSize; i++) {
        grid[0][i] = '+';
        grid[gridSize - 1][i] = '+';
        grid[i][0] = '+';
        grid[i][gridSize - 1] = '+';
    }

    // Label now includes the rule (x, y, z)
    const label = `Collatz Cube at ${xVal}${yVal}${zVal} for ${startNum}`;
    let labelCol = Math.floor((gridSize - label.length) / 2);
    for(let i = 0; i < label.length; i++) {
        if (labelCol + i > 0 && labelCol + i < gridSize - 1) { // Ensure it fits within borders
            grid[1][labelCol + i] = label[i];
        }
    }

    // MODIFIED: Use the passed xVal, yVal, zVal for the sequence
    let sequenceData = sequence(startNum, xVal, yVal, zVal, 100);
    let seq = sequenceData.sequence;

    // Populate the grid with 'x' and 'o' based on the sequence
    let centralFaceRowStart = 3;
    let centralFaceColStart = 1;
    let seqIndex = 0;

    // Central 3x3 area
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
            if (seqIndex < seq.length) {
                grid[centralFaceRowStart + r][centralFaceColStart + c] = (seq[seqIndex] % 2 === 0) ? 'x' : 'o';
                seqIndex++;
            } else {
                grid[centralFaceRowStart + r][centralFaceColStart + c] = ' ';
            }
        }
    }

    // Top face (row 2, col 1,2,3)
    // Populate left to right for linear progression within the row
    const topFaceRow = 2;
    for (let c = 1; c <= 3; c++) {
        if (seqIndex < seq.length) {
            grid[topFaceRow][c] = (seq[seqIndex] % 2 === 0) ? 'x' : 'o';
            seqIndex++;
        }
    }

    // Bottom face (row 6, col 1,2,3)
    // Populate left to right for linear progression within the row
    const bottomFaceRow = 6;
    for (let c = 1; c <= 3; c++) {
        if (seqIndex < seq.length) {
            grid[bottomFaceRow][c] = (seq[seqIndex] % 2 === 0) ? 'x' : 'o';
            seqIndex++;
        }
    }


    // Add tabs for assembly. The 'T' character represents a tab.
    grid[2][0] = 'T';
    grid[2][4] = 'T';
    grid[3][0] = 'T';
    grid[3][4] = 'T';
    grid[4][0] = 'T';
    grid[4][4] = 'T';
    grid[5][1] = 'T';
    grid[1][1] = 'T';

    let netString = "";
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            netString += grid[i][j];
        }
        netString += "\n";
    }
    return netString;
}

// Example Usage:
let startingNumbers = [1, 2, 3, 5, 7, 10]; // Smaller array for demonstration

// Test different rules
const rulesToTest = [
    { x: 2, y: 3, z: 1, description: "Classic Collatz (2,3,1)" },
    { x: 2, y: 5, z: 1, description: "Modified Collatz (2,5,1)" },
    { x: -2, y: 3, z: 1, description: "Negative Division ( -2,3,1)"},
    { x: 3, y: 4, z: 2, description: "Custom Rule (3,4,2)"}
];

for (const rule of rulesToTest) {
   console.log(`\n==============================================`);
    console.log(`  Collatz Cube Net for Rule: (${rule.x}, ${rule.y}, ${rule.z})`); // Modified this line slightly
    console.log(`==============================================\n`);

    for (let i = 0; i < startingNumbers.length; i++) {
        let startNum = startingNumbers[i];
        // This is where you had the previous `console.log` for `--- Collatz Cube for StartNum=X ---`
        // Now, it should be just:
        console.log(`--- For Starting Number: ${startNum} ---\n`); // Added a simpler header for each startNum

        let cubeNet = nine_net(startNum, rule.x, rule.y, rule.z);
        console.log(cubeNet);
    }
}
/*makes a 9 by 9 net for a cube for the classic collatz sequence i seee this as a grid within my larger coordinate framework located at 231
    I would like that location listed on the cube too and i will call it the collatz cube the boaders will be made of pus signs and the evens will be xs the odds will be os and the style wll be 
    linear progression*/