var sequence = function (num, x, y, z, maxiterations) {
    if (x === 0) {
        console.log("Error: The value of x cannot be zero.");
        return { sequence: [], type: "error" }; // Return an error object
    }
    var output = [];
    output.push(num);
    var iterations = 0;
    while (num > 1 && iterations < maxiterations) {
        var next_num;
        if (num % Math.abs(x || 2) === 0) {
            next_num = num / x;
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

function nine_net(startnum=1) {
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

    // 2. Get the classic Collatz sequence using your sequence function
    let sequenceData = sequence(startnum, 2, 3, 1, 100); // Start with 1, classic rule, max 100 iterations
    let sequence = sequenceData.sequence;

    // 3. Populate the grid with 'x' and 'o' based on the sequence, in the correct net layout
    let row = 3; // Starting row for the central part of the net
    let col = 1; // Starting column
    if (sequence && sequence.length > 0) {
        for (let number of sequence) {
            grid[row][col] = (number % 2 === 0) ? 'x' : 'o';
            col++;
            if (col > 3) { // Move to the next row after 3 numbers
                col = 1;
                row++;
            }
            if (row > 6) break; // Stop after 4 rows of the sequence
        }
    } else {
        console.error("Error: Could not generate Collatz sequence for the 9x9 grid.");
        // Handle the error: fill the grid with error markers
        for (let i = 1; i < gridSize - 1; i++) {
            for (let j = 1; j < gridSize - 1; j++) {
                grid[i][j] = '!';
            }
        }
    }

    // Manually set the positions for the other two faces of the cube net
    grid[2][1] = sequence && sequence.length > 4 ? (sequence[4] % 2 === 0 ? 'x' : 'o') : ' '; //one before
    grid[2][3] = sequence && sequence.length > 5 ? (sequence[5] % 2 === 0 ? 'x' : 'o') : ' '; //one after

    // 4. Add tabs for assembly.  The 'T' character represents a tab.
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
let startingNumbers=[1,2,3,5,7,10,20,50,100]; //arrar of starting numbers to test
for(let i=0;i<startingNumbers.length;i++){
    let startnum=startingNumbers[i];
    console.log('\n--- Collatz Cube with StartNum=${startNum} ---\n');
    let cubeNet=nine_net(startNum);
    console.log(cubeNet);
}

/*makes a 9 by 9 net for a cube for the classic collatz sequence i seee this as a grid within my larger coordinate framework located at 231
    I would like that location listed on the cube too and i will call it the collatz cube the boaders will be made of pus signs and the evens will be xs the odds will be os and the style wll be 
    linear progression*/