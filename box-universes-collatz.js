var sequance = function (num, x, y, z, maxiterations) {
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
                var result = sequance(startNum, x, y, z, maxIterations); // Call the modified sequance function
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

printUniverseData(universe);

var visualizer = function (universe) {
    var carpenter = function (coordinates) { };
    var Genesis = function (sequences) { };
    var postmaster = function (coordinates, sequences) { };
};