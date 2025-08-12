// generalizedCollatz.test.js
import { calculateCollatzSequence } from '../utils.js';

function testStandardCollatz() {
  const result = calculateCollatzSequence(6, 1000, 2, 3, 1);
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

// Call the test function to run it
testStandardCollatz();