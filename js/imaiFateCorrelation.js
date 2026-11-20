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
