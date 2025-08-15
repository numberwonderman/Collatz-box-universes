// generalizedCollatz.test.js
import {
  calculateCollatzSequence,
  hexToRgb,
  isLight
} from '../utils.js';

// ==========================================================
// Test Suite for Core Collatz Calculation & Utilities
// ==========================================================

// A describe block to group all tests related to the core Collatz function
describe('calculateCollatzSequence', () => {

  // Test case for the standard Collatz sequence
  it('should correctly calculate the standard Collatz sequence for n=6', () => {
    // This part of the code is commented out because it requires the
    // calculateStandardDeviation and calculateSum functions which aren't
    // provided here. You would need to add them to your utils.js file
    // to test these properties.
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
  });

  // You can add more test cases here for different scenarios
  it('should handle invalid parameters (x_param === 0)', () => {
    const result = calculateCollatzSequence(6, 1000, 0, 3, 1);
    if (result.type === "Invalid Parameters (X is 0)") {
      console.log("Test Passed: Handles invalid parameters correctly.");
    } else {
      console.error("Test Failed: Did not handle invalid parameters correctly.");
      console.error("Expected type: 'Invalid Parameters (X is 0)'");
      console.error("Received type:", result.type);
    }
  });
});

---

// ==========================================================
// Test Suite for UI & Color Utilities
// ==========================================================

describe('Color Utilities', () => {

  it('should correctly convert a hex color to an RGB object', () => {
    const result = hexToRgb('#34d399');
    const expected = { r: 52, g: 211, b: 153 };
    if (JSON.stringify(result) === JSON.stringify(expected)) {
      console.log("Test Passed: hexToRgb is correct.");
    } else {
      console.error("Test Failed: hexToRgb is incorrect.");
      console.error("Expected:", expected);
      console.error("Received:", result);
    }
  });

  it('should correctly identify a light color', () => {
    const lightResult = isLight('#FFFF99');
    if (lightResult === true) {
      console.log("Test Passed: isLight correctly identifies a light color.");
    } else {
      console.error("Test Failed: isLight incorrectly identifies a light color.");
    }
  });

  it('should correctly identify a dark color', () => {
    const darkResult = isLight('#000066');
    if (darkResult === false) {
      console.log("Test Passed: isLight correctly identifies a dark color.");
    } else {
      console.error("Test Failed: isLight incorrectly identifies a dark color.");
    }
  });
});

// Note: The `getUrlParams` function is highly dependent on the browser's
// window object, making it difficult to test in a standard test runner
// like Node.js. It's generally considered low priority for unit testing.