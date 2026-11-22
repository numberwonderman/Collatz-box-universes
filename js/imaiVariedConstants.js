/**
 * Varying the constant (Build 10, Nov 2026): fate partitions of
 *   T_c(n) = n/2 (n even),  3n + c (n odd),   c odd,
 * on the negative integers. One general classifier for every c.
 *
 * Caps (both reported, never dropped silently):
 *  - step cap: an orbit still without a repeated value after `stepCap` steps
 *    is "unsettled";
 *  - magnitude cap: an orbit whose value exceeds `magCap` in absolute value
 *    is "escaped".
 * Cycles are detected by a value repeating within the orbit; 0 is the fixed
 * point [0]. A cycle is canonicalised by its element of least absolute value
 * (ties: the negative one) and listed starting there, in orbit order.
 * Orbits may change sign (e.g. -1 -> 2 under c = +5), so a fate may be a
 * positive cycle.
 *
 * Every value stays below 3 * 2^40 + 5 < 2^53, so Number arithmetic is exact.
 */

export const STEP_CAP = 10000;
export const MAG_CAP = 2 ** 40;

/** One step of T_c. */
export function stepC(n, c) {
    return n % 2 === 0 ? n / 2 : 3 * n + c;
}

/** Canonical form of a cycle (array in orbit order): rotate to the least-|.| element (ties: negative). */
export function canonicalCycle(cyc) {
    let best = 0;
    for (let i = 1; i < cyc.length; i++) {
        const a = Math.abs(cyc[i]), b = Math.abs(cyc[best]);
        if (a < b || (a === b && cyc[i] < cyc[best])) best = i;
    }
    return [...cyc.slice(best), ...cyc.slice(0, best)];
}

/**
 * Fate of n under T_c. Returns { status: 'cycle', key, cycle, steps } (key =
 * canonical first element), or { status: 'unsettled', steps } or
 * { status: 'escaped', steps, value }.
 */
export function classify(n, c, { stepCap = STEP_CAP, magCap = MAG_CAP } = {}) {
    const seen = new Map();
    let x = n;
    for (let s = 0; s <= stepCap; s++) {
        if (Math.abs(x) > magCap) return { status: 'escaped', steps: s, value: x };
        if (seen.has(x)) {
            const cyc = [];
            let y = x;
            do { cyc.push(y); y = stepC(y, c); } while (y !== x);
            const canon = canonicalCycle(cyc);
            return { status: 'cycle', key: canon[0], cycle: canon, steps: seen.get(x) };
        }
        seen.set(x, s);
        x = stepC(x, c);
    }
    return { status: 'unsettled', steps: stepCap };
}

/** The orbit of n under T_c up to and including the first repeated value. */
export function orbitUntilRepeat(n, c, maxLen = 1000) {
    const out = [n];
    const seen = new Set([n]);
    let x = n;
    while (out.length < maxLen) {
        x = stepC(x, c);
        out.push(x);
        if (seen.has(x)) return out;
        seen.add(x);
    }
    return out;
}

/**
 * Classify the odd integers sign * 1, sign * 3, ..., sign * N under T_c.
 * Returns { c, sign, N, codes: Int16Array (cycle index, -1 unsettled, -2 escaped),
 *           cycles: [{ key, cycle, count }], unsettled, escaped, maxSteps }.
 */
export function classifyRange(c, N, sign = -1, caps = {}) {
    const count = Math.floor((N + 1) / 2);
    const codes = new Int16Array(count);
    const index = new Map();
    const cycles = [];
    let unsettled = 0, escaped = 0, maxSteps = 0;
    for (let i = 0; i < count; i++) {
        const f = classify(sign * (2 * i + 1), c, caps);
        if (f.status === 'cycle') {
            if (!index.has(f.key)) { index.set(f.key, cycles.length); cycles.push({ key: f.key, cycle: f.cycle, count: 0 }); }
            const k = index.get(f.key);
            codes[i] = k;
            cycles[k].count++;
            if (f.steps > maxSteps) maxSteps = f.steps;
        } else if (f.status === 'unsettled') { codes[i] = -1; unsettled++; }
        else { codes[i] = -2; escaped++; }
    }
    return { c, sign, N, codes, cycles, unsettled, escaped, maxSteps };
}

/**
 * F(1) over consecutive odd pairs (n, n - 2 sign) of a classified range, both
 * endpoints settled, with the sum-p^2 baseline of the settled shares.
 */
export function f1AndBaseline(r) {
    let pairs = 0, same = 0;
    for (let i = 1; i < r.codes.length; i++) {
        const a = r.codes[i - 1], b = r.codes[i];
        if (a < 0 || b < 0) continue;
        pairs++;
        if (a === b) same++;
    }
    const settled = r.cycles.reduce((s, x) => s + x.count, 0);
    const shares = r.cycles.map(x => x.count / settled);
    return { pairs, same, F1: pairs ? same / pairs : null, settled, shares, baseline: shares.reduce((s, p) => s + p * p, 0) };
}

/** Cycle as a set key (sorted elements) for comparing cycle sets. */
export function cycleSetKey(cyc) {
    return [...cyc].sort((a, b) => a - b).join(',');
}
