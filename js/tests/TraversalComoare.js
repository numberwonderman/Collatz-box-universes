// tests/shortcuts-vs-forward.test.js
import { describe, it, expect } from 'vitest';
import {
  shortcutOddPredecessors,  // from your binaryRotation.js
} from '../src/binaryRotation.js';

// 1) Adapter: use YOUR forward Collatz step (Number or BigInt version).
// If you already have one, replace this:
const forwardStep = (n) => (n % 2n === 0n ? n / 2n : 3n * n + 1n);

// 2) Bundle forward steps from an odd p until we reach the next odd m.
//    Return {m, k} where k = number of /2 steps applied.
function bundledForwardFromOdd(p) {
  let x = p;
  // first step from odd is 3p+1
  x = forwardStep(x);
  let k = 0n;
  while ((x & 1n) === 0n) {  // while even, keep halving via forwardStep
    x = forwardStep(x);
    k += 1n;
  }
  return { m: x, k: Number(k) };
}

describe('Shortcuts agree with my forward Collatz function', () => {
  it('Round-trip: p → (3p+1)/2^k hits m, matching shortcut (p,k) of m', () => {
    // Hand-picked odd p examples
    const examples = [3n, 5n, 7n, 27n, 63n, 85n, 97n];

    for (const p of examples) {
      const { m, k } = bundledForwardFromOdd(p);
      // Compute shortcut predecessors of m (candidates p_k)
      const shorts = shortcutOddPredecessors(m, 128); // up to k=128 is plenty
      const hit = shorts.find(s => s.p === p && s.k === k);
      expect(hit, `Expected p=${p} to be a shortcut predecessor of m=${m} with k=${k}`).toBeTruthy();
      // Also assert the identity (3p+1) = 2^k * m
      expect(3n * p + 1n).toBe((1n << BigInt(k)) * m);
    }
  });

  it('For a given m, every shortcut (p,k) round-trips via my forward step', () => {
    const targets = [8n, 10n, 40n, 82n, 160n]; // a few m values to probe
    for (const m of targets) {
      const shorts = shortcutOddPredecessors(m, 64);
      for (const { p, k } of shorts) {
        const { m: m2, k: k2 } = bundledForwardFromOdd(p);
        expect(m2).toBe(m);
        expect(k2).toBe(k);
        expect(3n * p + 1n).toBe((1n << BigInt(k)) * m);
      }
    }
  });
});
