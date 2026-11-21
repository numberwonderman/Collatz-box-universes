/**
 * F as a function of position n and separation r (Imai, 21 Nov 2026):
 * windowed fate correlation for colour maps.
 *
 * Fate codes come from fateCodes in js/imaiFateCorrelation.js (which uses the
 * unchanged trajectoryFate): codes[i] is the fate of n = -(2i + 1) (0 = -1,
 * 1 = -5, 2 = -17, -1 = unsettled).
 *
 * Convention (Imai map, Nov 2026). For a set W of odd negative n and r >= 1,
 *   F_W(r) = #{n in W : n + 2r in the table, L(n + 2r) = L(n)}
 *            / #{n in W : n + 2r in the table}.
 * For negative n, n + 2r is closer to zero, i.e. index i - r, so a partner
 * may lie outside W (below its lower |n| edge) but must be in the table
 * (index >= 0). Pairs with an unsettled member are skipped.
 * Baseline: sum of p_i^2 over the fate shares p_i within W.
 * Excess: F_W(r) - baseline.
 */

/** F_W(r) for W = indices [from, to). Returns { pairs, same, F }. */
export function windowF(codes, from, to, r) {
    let pairs = 0, same = 0;
    for (let i = Math.max(from, r); i < to; i++) {
        const a = codes[i], b = codes[i - r];
        if (a < 0 || b < 0) continue;
        pairs++;
        if (a === b) same++;
    }
    return { pairs, same, F: pairs ? same / pairs : null };
}

/** Fate shares within W = indices [from, to) and the baseline sum p_i^2. */
export function windowBaseline(codes, from, to, nKeys = 3) {
    const counts = new Array(nKeys).fill(0);
    let settled = 0;
    for (let i = from; i < to; i++) {
        if (codes[i] < 0) continue;
        counts[codes[i]]++;
        settled++;
    }
    const shares = counts.map(c => c / settled);
    return { counts, settled, shares, baseline: shares.reduce((s, p) => s + p * p, 0) };
}

/** Index range of the dyadic block B_k = odd n with 2^k <= |n| < 2^(k+1). */
export function blockRange(k) {
    // |n| = 2i + 1 >= 2^k + 1  <=>  i >= 2^(k-1);   |n| <= 2^(k+1) - 1  <=>  i <= 2^k - 1
    return k === 0 ? { from: 0, to: 1 } : { from: 2 ** (k - 1), to: 2 ** k };
}

/** Blocks B_k for k = kMin.. while the block lies fully inside `count` codes. */
export function blockWindows(kMin, count) {
    const out = [];
    for (let k = kMin; blockRange(k).to <= count; k++) {
        const { from, to } = blockRange(k);
        out.push({ k, from, to, label: `B_${k}`, nFrom: -(2 * from + 1), nTo: -(2 * (to - 1) + 1) });
    }
    return out;
}

/**
 * Sliding windows of `size` consecutive odd n, moved by `stride`, starting at
 * index `start`, while the window fits in `count` codes.
 */
export function slidingWindows(start, size, stride, count) {
    const out = [];
    for (let from = start; from + size <= count; from += stride) {
        out.push({ from, to: from + size, nFrom: -(2 * from + 1), nTo: -(2 * (from + size - 1) + 1) });
    }
    return out;
}

/**
 * Grid of F_W(r), r = 1..rMax, for each window. Rows carry the window, its
 * shares and baseline, and Float64Arrays F, excess, and Int32Array pairs.
 */
export function fateGrid(codes, windows, rMax, nKeys = 3) {
    return windows.map(w => {
        const base = windowBaseline(codes, w.from, w.to, nKeys);
        const F = new Float64Array(rMax), excess = new Float64Array(rMax), pairs = new Int32Array(rMax);
        for (let r = 1; r <= rMax; r++) {
            const f = windowF(codes, w.from, w.to, r);
            F[r - 1] = f.F;
            excess[r - 1] = f.F - base.baseline;
            pairs[r - 1] = f.pairs;
        }
        return { ...w, shares: base.shares, baseline: base.baseline, F, excess, pairs };
    });
}

/** 2-adic valuation of a positive integer. */
export function v2(r) {
    let v = 0;
    while (r % 2 === 0) { r /= 2; v++; }
    return v;
}

/**
 * For one row of excesses (index r - 1), the mean residual against the local
 * trend (mean of r - 2, r - 1, r + 1, r + 2), grouped by v2(r).
 * Returns [{ v2, count, meanResidual }].
 */
export function valuationResiduals(excess) {
    const groups = new Map();
    for (let r = 3; r <= excess.length - 2; r++) {
        const trend = (excess[r - 3] + excess[r - 2] + excess[r] + excess[r + 1]) / 4;
        const k = v2(r);
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push(excess[r - 1] - trend);
    }
    return [...groups.entries()].sort((a, b) => a[0] - b[0])
        .map(([k, a]) => ({ v2: k, count: a.length, meanResidual: a.reduce((s, v) => s + v, 0) / a.length }));
}
