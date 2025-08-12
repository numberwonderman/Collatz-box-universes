// generalizedCollatz.test.js
import { calculateCollatzSequence } from '../utils.js';

// generalizedCollatz.test.js (This is your test file)
test('standard Collatz sequence for n=6', () => {
  const result = generalizedCollatz(6, 2, 3, 1);
  const expectedSequence = [6, 3, 10, 5, 16, 8, 4, 2, 1];
  expect(result.sequence).toEqual(expectedSequence);
});
