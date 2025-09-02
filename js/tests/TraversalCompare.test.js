import { describe, it, expect } from 'vitest';
import {
  shortcutOddPredecessors,
} from '../binaryRotation.js';

// Adapter: Number-based Collatz forward step (with BigInt wrapper)
const forwardStepNum = (x) => (x % 2 === 0 ? x / 2 : 3 * x + 1);
const forwardStep = (n) => BigInt(forwardStepNum(Number(n)));

// Bundle forward steps from an odd p until we reach the next odd m.
// Return {m, k} where m is the next odd number and k is the number of divisions.
function bundledForwardFromOdd(p) {
  let x = forwardStep(p);
  let k = 0n;
  while ((x % 2n) === 0n) {
    x /= 2n;
    k++;
  }
  return { m: x, k: Number(k) };
}

describe('Shortcuts agree with my forward Collatz function', () => {
  it('Round-trip: p → (3p+1)/2^k hits m, matching shortcut (p,k) of m', () => {
    // Hand-picked odd p examples
    const examples = [3n, 5n, 7n, 27n, 63n, 85n, 97n];

    for (const p of examples) {
      const { m, k } = bundledForwardFromOdd(p);
      const shorts = shortcutOddPredecessors(m, 128);
      const hit = shorts.find(s => s.p === p && s.k === k);
      expect(hit, `Expected p=${p} to be a shortcut predecessor of m=${m} with k=${k}`).toBeTruthy();
      expect(3n * p + 1n).toBe((1n << BigInt(k)) * m);
    }
  });

  it('For a given m, every shortcut (p,k) round-trips via my forward step', () => {
    const targets = [8n, 10n, 40n, 82n, 160n];
    for (const m of targets) {
      const shorts = shortcutOddPredecessors(m, 64);
      for (const { p, k } of shorts) {
        const resultOfForwardStep = (3n * p + 1n);
        const expectedResult = (1n << BigInt(k)) * m;
        expect(resultOfForwardStep).toBe(expectedResult);
      }
    }
  });
});
