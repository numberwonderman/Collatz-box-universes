var sequance=function (num, x, y, z, maxiterations){
    if (x === 0) {
        console.log("Error: The value of x cannot be zero.");
        return [];}
var output=[];
output.push(num);
var iterations = 0;
while(num>1 && iterations < maxiterations){
    if(num%Math.abs(x || 2) === 0){num=num/x;}
    else {num= Math.abs(y || 3)*num+(z || 1);}
    output.push(num);
    iterations++;
}
return output;
};
var generateBoxUniverseData = function (startNum, xStart, xEnd, yStart, yEnd, zStart, zEnd, maxIterations) {
    var universeData = [];

    for (var x = xStart; x <= xEnd; x++) {
        var yDimensionData = [];
        for (var y = yStart; y <= yEnd; y++) {
            var zDimensionData = [];
            for (var z = zStart; z <= zEnd; z++) {
                var sequence = sequance(startNum, x, y, z, maxIterations);
                zDimensionData.push({ coordinates: [x, y, z], sequence: sequence });
            }
            yDimensionData.push(zDimensionData);
        }
        universeData.push(yDimensionData);
    }
    return universeData;
};


var universe = generateBoxUniverseData(5, 1, 2, 1, 2, 1, 2, 10); // Smaller ranges for demonstration

// Function to print the universe data in a readable way
var printUniverseData = function (data) {
    for (var i = 0; i < data.length; i++) {
        for (var j = 0; j < data[i].length; j++) {
            for (var k = 0; k < data[i][j].length; k++) {
                var box = data[i][j][k];
                console.log("Coordinates: [" + box.coordinates[0] + ", " + box.coordinates[1] + ", " + box.coordinates[2] + "]");
                console.log("Sequence: " + box.sequence);
                console.log("---");
            }
        }
    }
};

printUniverseData(universe);

var visualizer= function(universe){
var carpenter=function(coordinates){};
var Genesis=function(sequences){};
var postmaster=function(coordinates, sequances){};
};

