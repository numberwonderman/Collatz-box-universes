var sequence = function (num, x, y, z, maxiterations) {
    if (x === 0) {
        // console.log("Error: The value of x cannot be zero."); // Removed console.log here as it's handled by returning error object
        return { sequence: [], type: "error" }; // Return an error object
    }
    var output = [];
    output.push(num);
    var iterations = 0;
    while (num > 1 && iterations < maxiterations) {
        var next_num;
        // Use Math.abs(x) for the divisor to avoid division by zero or unexpected behavior with negative x
        if (num % Math.abs(x) === 0) {
            next_num = num / x; // Use x directly, not Math.abs(x) if x can be negative for division
        } else {
            next_num = Math.abs(y || 3) * num + (z || 1);
        }

        if (output.includes(next_num)) {
            output.push(next_num); // Add the cycle start again to show the loop
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
                var result = sequence(startNum, x, y, z, maxIterations); // Call the modified sequence function
                zDimensionData.push({ coordinates: [x, y, z], result: result }); // Store the entire result object
            }
            yDimensionData.push(zDimensionData);
        }
        universeData.push(yDimensionData);
    }
    return universeData;
};


var universe = generateBoxUniverseData(5, 1, 2, 1, 2, 1, 2, 10); // Smaller ranges for demonstration

// Function to print the universe data with the result type
var printUniverseData = function (data) {
    for (var i = 0; i < data.length; i++) {
        for (var j = 0; j < data[i].length; j++) {
            for (var k = 0; k < data[i][j].length; k++) {
                var box = data[i][j][k];
                console.log("Coordinates: [" + box.coordinates[0] + ", " + box.coordinates[1] + ", " + box.coordinates[2] + "]");
                console.log("Result Type: " + box.result.type); // Print the type of result
                console.log("Sequence: " + box.result.sequence); // Print the sequence
                console.log("---");
            }
        }
    }
};

//printUniverseData(universe);

var visualizer_computer = function (universe) {
    var carpenter = function (coordinates) { /*makes boxes*/};
    var Genesis = function (sequences) {/*graphs sequences*/ };
    var postmaster = function (coordinates, sequences) { /* puts the graphs in the boxes*/};
};

function nine_net(startNum = 1) { // Changed parameter name to startNum for consistency
    let gridSize = 9;
    let grid = [];

    // Create the 9x9 grid (2D array)
    for (let i = 0; i < gridSize; i++) {
        grid[i] = [];
        for (let j = 0; j < gridSize; j++) {
            grid[i][j] = ' '; // Initialize the grid with spaces
        }
    }

    // 1. Create the basic structure of the net with '+' borders
    for (let i = 0; i < gridSize; i++) {
        grid[0][i] = '+';
        grid[gridSize - 1][i] = '+';
        grid[i][0] = '+';
        grid[i][gridSize - 1] = '+';
    }

    // Add the "Collatz Cube at 231" label
    const label = "Collatz Cube at 231";
    let labelCol = Math.floor((gridSize - label.length) / 2);
    for(let i = 0; i < label.length; i++) {
        if (labelCol + i < gridSize - 1) { // Ensure it fits within borders
            grid[1][labelCol + i] = label[i];
        }
    }


    // 2. Get the classic Collatz sequence using your sequence function
    let sequenceData = sequence(startNum, 2, 3, 1, 100); // Start with 1, classic rule, max 100 iterations
    let seq = sequenceData.sequence; // Renamed sequence to seq to avoid conflict

    // 3. Populate the grid with 'x' and 'o' based on the sequence, in the correct net layout
    // The central face (where most of the sequence will go)
    let centralFaceRowStart = 3;
    let centralFaceColStart = 1;
    let seqIndex = 0;

    // First, populate the central 3x3 area
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
            if (seqIndex < seq.length) {
                grid[centralFaceRowStart + r][centralFaceColStart + c] = (seq[seqIndex] % 2 === 0) ? 'x' : 'o';
                seqIndex++;
            } else {
                // If sequence runs out, fill with empty space
                grid[centralFaceRowStart + r][centralFaceColStart + c] = ' ';
            }
        }
    }

    // Now, populate the top face (row 2, col 1,2,3)
    if (seqIndex < seq.length) {
        grid[2][2] = (seq[seqIndex] % 2 === 0) ? 'x' : 'o'; // Center of top face
        seqIndex++;
    }
    if (seqIndex < seq.length) {
        grid[2][1] = (seq[seqIndex] % 2 === 0) ? 'x' : 'o'; // Left of center top face
        seqIndex++;
    }
     if (seqIndex < seq.length) {
        grid[2][3] = (seq[seqIndex] % 2 === 0) ? 'x' : 'o'; // Right of center top face
        seqIndex++;
    }

    // Now, populate the bottom face (row 6, col 1,2,3)
    if (seqIndex < seq.length) {
        grid[6][2] = (seq[seqIndex] % 2 === 0) ? 'x' : 'o'; // Center of bottom face
        seqIndex++;
    }
    if (seqIndex < seq.length) {
        grid[6][1] = (seq[seqIndex] % 2 === 0) ? 'x' : 'o'; // Left of center bottom face
        seqIndex++;
    }
    if (seqIndex < seq.length) {
        grid[6][3] = (seq[seqIndex] % 2 === 0) ? 'x' : 'o'; // Right of center bottom face
        seqIndex++;
    }


    // 4. Add tabs for assembly. The 'T' character represents a tab.
    grid[2][0] = 'T'; // Tab on the left of the top face
    grid[2][4] = 'T'; // Tab on the right of the top face
    grid[3][0] = 'T'; // Tab on the left of the middle-left face
    grid[3][4] = 'T'; // Tab on the right of the middle-right face
    grid[4][0] = 'T'; // Tab on the left of the bottom face
    grid[4][4] = 'T'; // Tab on the right of the bottom face
    grid[5][1] = 'T'; // Tab on the top of the bottom face
    grid[1][1] = 'T'; // Tab on the top of the top face

    // Convert the grid to a string for output
    let netString = "";
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            netString += grid[i][j];
        }
        netString += "\n"; // Add a newline after each row
    }
    return netString;
}

let startingNumbers = [1, 2, 3, 5, 7, 10, 20, 50, 100]; // Array of starting numbers to test
for (let i = 0; i < startingNumbers.length; i++) {
    let startNum = startingNumbers[i];
    console.log(`\n--- Collatz Cube for StartNum=${startNum} ---\n`);
    let cubeNet = nine_net(startNum);
    console.log(cubeNet);
}
/*makes a 9 by 9 net for a cube for the classic collatz sequence i seee this as a grid within my larger coordinate framework located at 231
    I would like that location listed on the cube too and i will call it the collatz cube the boaders will be made of pus signs and the evens will be xs the odds will be os and the style wll be 
    linear progression*/