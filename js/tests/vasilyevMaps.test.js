import { describe, it, expect } from 'vitest';
import {
  normalizeS, twoAdicSplit, stepTS, stepKind, orbitTS, findCyclesTS, canonicalCycle
} from '../vasilyevMaps.js';

const big = (arr) => arr.map(BigInt);

describe('vasilyevMaps: definitions', () => {
  it('normalizes S from arrays and strings and rejects non-positive entries', () => {
    expect([...normalizeS('{2,3}')]).toEqual([2, 3]);
    expect([...normalizeS('')]).toEqual([]);
    expect([...normalizeS([1n, 1])]).toEqual([1]);
    expect(() => normalizeS([0])).toThrow();
    expect(() => normalizeS([-1])).toThrow();
    expect(() => normalizeS([1.5])).toThrow();
  });

  it('splits x = 2^m * k', () => {
    expect(twoAdicSplit(680n)).toEqual({ m: 3, k: 85n });
    expect(twoAdicSplit(7n)).toEqual({ m: 0, k: 7n });
    expect(() => twoAdicSplit(0n)).toThrow();
  });

  it('applies the three branches of T_S and the odd branch of T^-_S', () => {
    const S = normalizeS([1]);
    expect(stepTS(7n, S)).toBe(11n);        // odd: (3x+1)/2
    expect(stepTS(26n, S)).toBe(39n);       // m=1 in S: 3x/2
    expect(stepTS(680n, S)).toBe(85n);      // m=3 not in S: odd part
    expect(stepTS(7n, S, true)).toBe(4n);   // T^-: (x+1)/2
    expect(stepTS(26n, S, true)).toBe(39n); // T^- agrees on even x
    expect(stepKind(7n, S)).toBe('odd');
    expect(stepKind(26n, S)).toBe('up');
    expect(stepKind(680n, S)).toBe('down');
  });

  it('T_{} is Collatz with runs of halvings merged', () => {
    // Reference: the usual shortcut map (odd -> (3x+1)/2, even -> x/2), run to the first 1.
    // Merging runs of halvings = keep a value only if it is odd, or it is the
    // first even value after an odd one (or the start).
    for (let n = 2n; n <= 3000n; n++) {
      const ref = [n];
      let x = n;
      while (x !== 1n) { x = x % 2n === 0n ? x / 2n : (3n * x + 1n) / 2n; ref.push(x); }
      const merged = ref.filter((v, i) => i === 0 || v % 2n === 1n || ref[i - 1] % 2n === 1n);
      const mine = orbitTS(n, []).sequence;
      expect(mine.slice(0, mine.indexOf(1n) + 1)).toEqual(merged);
    }
  });

  it('stays exact for very large x', () => {
    const x = 3n ** 200n; // odd, far beyond 2^53
    expect(stepTS(x, new Set())).toBe((3n * x + 1n) / 2n);
    expect(stepTS(x * 2n, normalizeS([1]))).toBe(3n * x);
    expect(stepTS(x * 1024n, normalizeS([1]))).toBe(x);
  });
});

describe('vasilyevMaps: example from the paper (S = {1}, start 7)', () => {
  it('reproduces the orbit and the cycle (1,2,3,5,8)', () => {
    const r = orbitTS(7, [1]);
    expect(r.sequence).toEqual(big([7, 11, 17, 26, 39, 59, 89, 134, 201, 302, 453, 680, 85, 128, 1, 2, 3, 5, 8]));
    expect(r.type).toBe('cycle');
    expect(r.cycleStart).toBe(14);
    expect(r.cycle).toEqual(big([1, 2, 3, 5, 8]));
  });
});

describe('vasilyevMaps: cycle scan', () => {
  it('canonicalCycle rotates to the minimum', () => {
    expect(canonicalCycle(big([5, 8, 1, 2, 3]))).toEqual(big([1, 2, 3, 5, 8]));
  });

  it('every reported cycle really is a cycle, and counts add up (n < 3000)', () => {
    for (const S of [[], [1], [2, 3], [3]]) {
      for (const minus of [false, true]) {
        const set = normalizeS(S);
        const { cycles, unresolved } = findCyclesTS(3000, S, { minus });
        expect(unresolved).toEqual([]);
        expect(cycles.reduce((a, c) => a + c.count, 0)).toBe(2999);
        for (const { cycle } of cycles) {
          cycle.forEach((v, i) => {
            expect(stepTS(v, set, minus)).toBe(cycle[(i + 1) % cycle.length]);
          });
        }
      }
    }
  });

  it('agrees with brute-force orbits for n < 500', () => {
    for (const S of [[], [1], [2, 3], [3]]) {
      const { cycles } = findCyclesTS(500, S);
      const brute = new Map();
      for (let n = 1; n < 500; n++) {
        const key = orbitTS(n, S).cycle.join(',');
        brute.set(key, (brute.get(key) || 0) + 1);
      }
      const mine = new Map(cycles.map(c => [c.cycle.join(','), c.count]));
      expect(mine).toEqual(brute);
    }
  });
});
