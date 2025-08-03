import { generalizedCollatz } from '../utils.js';
// Test for the standard Collatz sequence (3n+1) starting at 6
function testStandardCollatz() {
    const result = generalizedCollatz(6, 2, 3, 1);
    const expectedSequence = [6, 3, 10, 5, 16, 8, 4, 2, 1];

    // Check if the sequence matches
    if (JSON.stringify(result.sequence) === JSON.stringify(expectedSequence)) {
        console.log("Test Passed: Standard Collatz sequence is correct.");
    } else {
        console.error("Test Failed: Standard Collatz sequence is incorrect.");
        console.error("Expected:", expectedSequence);
        console.error("Received:", result.sequence);
    }
}
testStandardCollatz();

