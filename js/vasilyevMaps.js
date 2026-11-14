// vasilyevMaps.js
// The "up or down by half" family of Collatz-type maps from
//   Oleg Vasilyev, "Up or down by half: a family of Collatz-type maps", arXiv:2611.10311.
//
// S is a set of positive integers. Write x = 2^m * k with k odd.
//   T_S(x)   = (3x+1)/2 if m = 0;  3x/2 if m is in S;  k otherwise.
//   T^-_S(x) = (x+1)/2  if m = 0;  otherwise the same as T_S.
// T_{} is ordinary Collatz with each run of halvings merged into one step.
//
// BigInt throughout, so values are exact at any size.
// This is a parameterised option alongside the (x, y, z) rules used elsewhere
// in the suite; it does not change any existing function.

/**
 * Validate S and return it as a Set of Numbers (the exponents m are small).
 * Accepts an array / Set of numbers or BigInts, or a string like "1,3" or "{2,3}".
 */
export function normalizeS(S = []) {
  if (typeof S === 'string') {
    const body = S.replace(/[{}\s]/g, '');
    S = body === '' ? [] : body.split(',');
  }
  const out = new Set();
  for (const raw of S) {
    const m = Number(raw);
    if (!Number.isInteger(m) || m < 1) {
      throw new Error(`S must contain positive integers only; got ${String(raw)}`);
    }
    out.add(m);
  }
  return out;
}

/** Return { m, k } with x = 2^m * k, k odd. Requires x >= 1. */
export function twoAdicSplit(x) {
  x = BigInt(x);
  if (x < 1n) throw new Error(`x must be a positive integer; got ${x}`);
  let m = 0;
  while ((x & 1n) === 0n) {
    x >>= 1n;
    m++;
  }
  return { m, k: x };
}

/**
 * One step of T_S (minus = false) or T^-_S (minus = true).
 * @param {bigint|number} x  positive integer
 * @param {Set<number>} S    from normalizeS
 * @param {boolean} minus
 * @returns {bigint}
 */
export function stepTS(x, S = new Set(), minus = false) {
  x = BigInt(x);
  const { m, k } = twoAdicSplit(x);
  if (m === 0) return minus ? (x + 1n) / 2n : (3n * x + 1n) / 2n;
  if (S.has(m)) return (3n * x) / 2n;
  return k;
}

/** Which branch applies at x: 'odd', 'up' (m in S) or 'down' (strip all 2s). */
export function stepKind(x, S = new Set()) {
  const { m } = twoAdicSplit(x);
  if (m === 0) return 'odd';
  return S.has(m) ? 'up' : 'down';
}

/** Rotate a cycle (array of BigInt) so it starts at its smallest element. */
export function canonicalCycle(cycle) {
  let i = 0;
  for (let j = 1; j < cycle.length; j++) if (cycle[j] < cycle[i]) i = j;
  return cycle.slice(i).concat(cycle.slice(0, i));
}

/**
 * Iterate from start until a value repeats or maxSteps is reached.
 * @returns {{ sequence: bigint[], cycleStart: number|null, cycle: bigint[], type: 'cycle'|'max_steps' }}
 *   sequence excludes the repeated value; cycle is rotated to start at its minimum.
 */
export function orbitTS(start, S = [], { minus = false, maxSteps = 100000 } = {}) {
  const set = S instanceof Set ? S : normalizeS(S);
  let x = BigInt(start);
  const sequence = [];
  const index = new Map();
  for (let i = 0; i <= maxSteps; i++) {
    const key = x.toString();
    if (index.has(key)) {
      const cycleStart = index.get(key);
      return { sequence, cycleStart, cycle: canonicalCycle(sequence.slice(cycleStart)), type: 'cycle' };
    }
    index.set(key, sequence.length);
    sequence.push(x);
    x = stepTS(x, set, minus);
  }
  return { sequence, cycleStart: null, cycle: [], type: 'max_steps' };
}

/**
 * Classify every start 1 <= n < limit by the cycle its orbit ends in.
 * @returns {{ cycles: {cycle: bigint[], count: number}[], unresolved: number[] }}
 */
export function findCyclesTS(limit, S = [], { minus = false, maxSteps = 100000 } = {}) {
  const set = S instanceof Set ? S : normalizeS(S);
  const label = new Int32Array(Math.max(limit, 2)); // 1 + cycle index, 0 = undecided
  const cycles = [];
  const unresolved = [];
  const cycleIndex = new Map();
  for (let n = 1; n < limit; n++) {
    const start = BigInt(n);
    let x = start;
    const path = [start];
    const seen = new Set([start]);
    let lab = 0;
    for (let steps = 1; steps <= maxSteps; steps++) {
      x = stepTS(x, set, minus);
      if (x < start) { lab = label[Number(x)]; break; }
      if (seen.has(x)) {
        // A cycle with minimum >= n can be met more than once (from a start below
        // its minimum that never dips lower, and later from the minimum itself).
        const cycle = canonicalCycle(path.slice(path.indexOf(x)));
        const key = cycle.join(',');
        if (!cycleIndex.has(key)) {
          cycles.push({ cycle, count: 0 });
          cycleIndex.set(key, cycles.length);
        }
        lab = cycleIndex.get(key);
        break;
      }
      seen.add(x);
      path.push(x);
    }
    label[n] = lab;
    if (lab) cycles[lab - 1].count++;
    else unresolved.push(n);
  }
  return { cycles, unresolved };
}
