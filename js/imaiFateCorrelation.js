/**
 * Fate correlation for the dyadic circle (exploratory), after Imai's
 * suggestion: let L(n) be the periodic orbit eventually reached by n; study
 * F(r) = P[L(n) = L(n + 2r)] as a function of r.
 *
 * Fates come from trajectoryFate in js/imaiFractalProbe.js (map
 * T(n) = n/2 | m n + c from js/imaiDyadicCircle.js). An orbit that hits the
 * step cap or leaves the safe-integer range gets the label null and is never
 * assigned a fate; pairs involving it are skipped.
 *
 * Labels are stored by index i for n = sign * (2 i + 1), i.e. odd n of one
 * sign ordered by |n|, so the pair (n, n + 2r) of negative odd numbers is the
 * index pair (i, i - r), and of positive odd numbers (i, i + r). Either way
 * F(r) compares labels r indices apart.
 */

import { trajectoryFate } from './imaiFractalProbe.js';
import { step } from './imaiDyadicCircle.js';

/**
 * Fates of the odd n with 1 <= |n| <= N and the given sign.
 * Returns { ns, labels, unsettled: { cap, overflow }, counts } where
 * labels[i] is the cycle key (least-|.| element) reached by ns[i], or null.
 */
export function fateLabels({ N, m = 3, c = 1, maxSteps = 2000, sign = -1 }) {
    const ns = [], labels = [];
    const unsettled = { cap: 0, overflow: 0 };
    const counts = {};
    for (let a = 1; a <= N; a += 2) {
        const n = sign * a;
        const f = trajectoryFate(n, { m, c, maxSteps });
        ns.push(n);
        if (f.fate === 'cycle') {
            labels.push(f.key);
            counts[f.key] = (counts[f.key] ?? 0) + 1;
        } else {
            labels.push(null);
            if (f.fate === 'unsettled') unsettled[f.reason ?? 'cap']++;
            else unsettled[f.fate] = (unsettled[f.fate] ?? 0) + 1;
        }
    }
    return { ns, labels, unsettled, counts };
}

/** The cycle through `key`, listed from key, under n/2 | m n + c. */
export function cycleOf(key, m = 3, c = 1, maxLen = 10000) {
    const out = [key];
    let x = step(key, m, c);
    while (x !== key) {
        out.push(x);
        if (out.length > maxLen) throw new Error(`no cycle through ${key} within ${maxLen} steps`);
        x = step(x, m, c);
    }
    return out;
}

/** Shares of each fate among settled labels, and the independent baseline sum p_i^2. */
export function fateShares(labels) {
    const counts = {};
    let settled = 0;
    for (const l of labels) {
        if (l === null) continue;
        counts[l] = (counts[l] ?? 0) + 1;
        settled++;
    }
    const shares = {};
    for (const [k, v] of Object.entries(counts)) shares[k] = v / settled;
    const sumSquares = Object.values(shares).reduce((s, p) => s + p * p, 0);
    return { counts, settled, unsettled: labels.length - settled, shares, sumSquares, cycles: Object.keys(counts).length };
}

/**
 * F(r) for r = 1..rMax: among index pairs (i, i + r) with both labels
 * non-null, the fraction with equal labels. Rows { r, pairs, same, F, se },
 * where se = sqrt(F (1 - F) / pairs) is the naive binomial standard error
 * (it ignores the dependence between overlapping pairs, so it understates
 * the true uncertainty).
 */
export function fateCorrelation(labels, rMax) {
    const rows = [];
    for (let r = 1; r <= rMax; r++) {
        let pairs = 0, same = 0;
        for (let i = 0; i + r < labels.length; i++) {
            const a = labels[i], b = labels[i + r];
            if (a === null || b === null) continue;
            pairs++;
            if (a === b) same++;
        }
        const F = pairs ? same / pairs : null;
        rows.push({ r, pairs, same, F, se: pairs ? Math.sqrt((F * (1 - F)) / pairs) : null });
    }
    return rows;
}

/**
 * Co-settling S(r) = P[n + 2r settles | n settles] for r = 1..rMax: the
 * analogue of F(r) when only one cycle (or none) is reached and F(r) is
 * trivial. Rows { r, settledPairs, both, S }; compare with the marginal
 * settled share.
 */
export function coSettling(labels, rMax) {
    const rows = [];
    for (let r = 1; r <= rMax; r++) {
        let base = 0, both = 0;
        for (let i = 0; i + r < labels.length; i++) {
            if (labels[i] === null) continue;
            base++;
            if (labels[i + r] !== null) both++;
        }
        rows.push({ r, settledPairs: base, both, S: base ? both / base : null });
    }
    return rows;
}

/**
 * F within dyadic block k only: pairs of odd |n| and |n| + 2r both in
 * [2^k, 2^(k+1)). `labels` indexed as in fateLabels (index (|n| - 1) / 2).
 */
export function blockFateCorrelation(labels, k, r) {
    let pairs = 0, same = 0;
    for (let a = 2 ** k + 1; a + 2 * r < 2 ** (k + 1); a += 2) {
        const x = labels[(a - 1) / 2], y = labels[(a + 2 * r - 1) / 2];
        if (x === undefined || y === undefined || x === null || y === null) continue;
        pairs++;
        if (x === y) same++;
    }
    return { k, r, pairs, F: pairs ? same / pairs : null };
}

/** 2-adic valuation of a positive integer. */
export function v2(r) {
    let v = 0;
    while (r % 2 === 0) { r /= 2; v++; }
    return v;
}

/**
 * Residual of F(r) against a local trend (mean of F at r-2, r-1, r+1, r+2),
 * averaged by the 2-adic valuation of r. `rows` from fateCorrelation.
 * Returns [{ v2, count, meanResidual }].
 */
export function residualByValuation(rows) {
    const F = new Map(rows.map(x => [x.r, x.F]));
    const groups = new Map();
    for (const { r } of rows) {
        const nb = [r - 2, r - 1, r + 1, r + 2].map(s => F.get(s));
        if (nb.some(v => v === undefined || v === null) || F.get(r) === null) continue;
        const res = F.get(r) - nb.reduce((s, v) => s + v, 0) / 4;
        const k = v2(r);
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push(res);
    }
    return [...groups.entries()].sort((a, b) => a[0] - b[0])
        .map(([k, a]) => ({ v2: k, count: a.length, meanResidual: a.reduce((s, v) => s + v, 0) / a.length }));
}

// ---------------------------------------------------------------------------
// Fate partition portrait and F(1) convergence (Imai, 20 Nov 2026).
// Compact fate storage for large ranges: one Int8 code per odd n.
// ---------------------------------------------------------------------------

/**
 * Fates of the odd n with 1 <= |n| <= N and the given sign, as compact codes:
 * codes[i] is the index into `keys` of the cycle reached by n = sign (2i + 1),
 * or -1 if the orbit hit the cap or overflowed (never assigned a fate).
 * Uses trajectoryFate, so fates are identical to fateLabels.
 * `keys` fixes the code order (default for 3n+1 negatives: [-1, -5, -17]);
 * a cycle not in `keys` is appended. `onProgress(i)` is called every 2^20 n.
 */
export function fateCodes({ N, m = 3, c = 1, maxSteps = 2000, sign = -1, keys = [-1, -5, -17], onProgress }) {
    const count = Math.floor((N + 1) / 2);
    const codes = new Int8Array(count);
    const keyList = [...keys];
    const index = new Map(keyList.map((k, i) => [k, i]));
    const unsettled = { cap: 0, overflow: 0 };
    for (let i = 0; i < count; i++) {
        const f = trajectoryFate(sign * (2 * i + 1), { m, c, maxSteps });
        if (f.fate === 'cycle') {
            if (!index.has(f.key)) { index.set(f.key, keyList.length); keyList.push(f.key); }
            codes[i] = index.get(f.key);
        } else {
            codes[i] = -1;
            unsettled[f.reason ?? 'cap'] = (unsettled[f.reason ?? 'cap'] ?? 0) + 1;
        }
        if (onProgress && (i & 0xfffff) === 0) onProgress(i);
    }
    return { codes, keys: keyList, unsettled };
}

/**
 * Maximal runs of consecutive equal codes in codes[from, to). A code of -1
 * (unsettled) ends a run and belongs to none. Returns { runs, lengths
 * (histogram: length -> count), byCode (histogram per code), mean, median, max,
 * maxAt (start index of the first longest run), maxCode }.
 */
export function runLengths(codes, from = 0, to = codes.length) {
    const hist = new Map();
    const byCode = new Map();
    let runs = 0, total = 0, max = 0, maxAt = -1, maxCode = null;
    let i = from;
    while (i < to) {
        if (codes[i] === -1) { i++; continue; }
        let j = i + 1;
        while (j < to && codes[j] === codes[i]) j++;
        const L = j - i;
        runs++;
        total += L;
        hist.set(L, (hist.get(L) ?? 0) + 1);
        if (!byCode.has(codes[i])) byCode.set(codes[i], new Map());
        byCode.get(codes[i]).set(L, (byCode.get(codes[i]).get(L) ?? 0) + 1);
        if (L > max) { max = L; maxAt = i; maxCode = codes[i]; }
        i = j;
    }
    return { runs, lengths: hist, byCode, mean: runs ? total / runs : null, median: histogramMedian(hist), max, maxAt, maxCode };
}

/** Median of a length -> count histogram (lower median for an even count). */
export function histogramMedian(hist) {
    const total = [...hist.values()].reduce((s, v) => s + v, 0);
    if (!total) return null;
    let seen = 0;
    for (const L of [...hist.keys()].sort((a, b) => a - b)) {
        seen += hist.get(L);
        if (seen >= Math.ceil(total / 2)) return L;
    }
    return null;
}

/**
 * Run-length statistics expected if fates were independent with the given
 * shares (code -> probability). Exact values for an i.i.d. sequence of length
 * n: expected runs 1 + (n - 1)(1 - sum p^2); a run of code i has geometric
 * length P(L) = p_i^(L-1) (1 - p_i), and the share of runs that are of code i
 * is p_i (1 - p_i) / sum_j p_j (1 - p_j). Returns { expectedRuns, meanLength,
 * pmf(L), median }.
 */
export function independentRunModel(shares, n) {
    const ps = Object.values(shares);
    const s2 = ps.reduce((s, p) => s + p * p, 0);
    const w = ps.map(p => p * (1 - p));
    const W = w.reduce((s, v) => s + v, 0);
    const pmf = L => ps.reduce((s, p, i) => s + (w[i] / W) * p ** (L - 1) * (1 - p), 0);
    let cdf = 0, median = null;
    for (let L = 1; L < 1000 && median === null; L++) { cdf += pmf(L); if (cdf >= 0.5) median = L; }
    return { expectedRuns: 1 + (n - 1) * (1 - s2), meanLength: n / (1 + (n - 1) * (1 - s2)), pmf, median };
}

/**
 * Simulated i.i.d. fate sequences with the given shares (code -> p), for the
 * longest-run and histogram baselines. rng() returns uniforms in [0, 1).
 * Returns [{ runs, mean, median, max, lengths }] per simulation.
 */
export function simulateIndependentRuns(shares, n, sims, rng) {
    const codes = Object.keys(shares).map(Number);
    const cum = [];
    let acc = 0;
    for (const k of codes) { acc += shares[k]; cum.push(acc); }
    const out = [];
    const seq = new Int8Array(n);
    for (let s = 0; s < sims; s++) {
        for (let i = 0; i < n; i++) {
            const u = rng() * acc;
            let j = 0;
            while (j < cum.length - 1 && u >= cum[j]) j++;
            seq[i] = codes[j];
        }
        const r = runLengths(seq);
        out.push({ runs: r.runs, mean: r.mean, median: r.median, max: r.max, lengths: r.lengths });
    }
    return out;
}

/**
 * F(1) ladder over prefix ranges |n| <= 2^k - 1 (k = kMin..kMax) and over
 * single dyadic blocks 2^(k-1) <= |n| < 2^k, from fate codes indexed by
 * i = (|n| - 1)/2. Pairs with an unsettled member are skipped.
 * Rows { k, N, prefix: { pairs, same, F, shares, delta }, block: { pairs, same, F } }.
 */
export function f1Ladder(codes, kMin, kMax, nKeys = 3) {
    const rows = [];
    let prevF = null;
    for (let k = kMin; k <= kMax; k++) {
        const N = 2 ** k - 1;
        const count = (N + 1) / 2;
        if (count > codes.length) break;
        const pref = adjacentAgreement(codes, 0, count, nKeys);
        // block 2^(k-1) <= |n| < 2^k: odd |n| from 2^(k-1) + 1 to 2^k - 1, indices 2^(k-2) .. 2^(k-1) - 1
        const b0 = k >= 2 ? 2 ** (k - 2) : 0;
        const blk = adjacentAgreement(codes, b0, count, nKeys);
        rows.push({
            k, N,
            prefix: { pairs: pref.pairs, same: pref.same, F: pref.F, shares: pref.shares, delta: prevF === null ? null : pref.F - prevF },
            block: { from: 2 ** (k - 1), to: 2 ** k - 1, pairs: blk.pairs, same: blk.same, F: blk.F, shares: blk.shares },
        });
        prevF = pref.F;
    }
    return rows;
}

/** Adjacent-pair agreement F(1) and code shares on codes[from, to). */
export function adjacentAgreement(codes, from, to, nKeys = 3) {
    let pairs = 0, same = 0;
    const counts = new Array(nKeys).fill(0);
    let settled = 0;
    for (let i = from; i < to; i++) {
        const a = codes[i];
        if (a >= 0) { counts[a] = (counts[a] ?? 0) + 1; settled++; }
        if (i + 1 < to) {
            const b = codes[i + 1];
            if (a >= 0 && b >= 0) { pairs++; if (a === b) same++; }
        }
    }
    return { pairs, same, F: pairs ? same / pairs : null, shares: counts.map(v => v / settled) };
}
