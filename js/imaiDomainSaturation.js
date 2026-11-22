/**
 * Does the domain component saturate? (Build 11, Nov 2026.)
 *
 * The r = 1 split of Build 8 (js/imaiDomains.js), computed block by block
 * without the per-index share table, so it fits in memory for blocks up to
 * B_26 (2^26 <= |n| < 2^27, i.e. 2^25 odd values per block). Results are
 * identical to Build 8's windowF + windowShareTable + domainPrediction at
 * r = 1 (tested).
 *
 * Conventions (Builds 6-8):
 *  - fates: codes[i] = fate code of n = -(2i + 1) (fateCodes);
 *  - block B_k = odd n with 2^k <= |n| < 2^(k+1) = indices [2^(k-1), 2^k);
 *  - F(1) with the fate-map pair convention: every n in B_k paired with
 *    n + 2 (index i - 1), which for the block's lowest |n| lies in B_(k-1);
 *  - windows: block-internal non-overlapping tiles of w odd n from the
 *    block's lowest |n| (a partial tail is dropped);
 *  - A_dom(1) = mean over pairs of sum_q p_q(W(i)) p_q(W(i - 1));
 *  - baseline = sum p^2 over the block; E = F(1) - baseline;
 *    E_dom = A_dom - baseline; residual = E - E_dom.
 */

import { blockRange } from './imaiFateMap.js';

/** Window shares of indices [from, to) tiled by w: Float64Array of 3 * (number of windows). */
function windowSharesOf(codes, from, to, w) {
    const nW = Math.floor((to - from) / w);
    const sh = new Float64Array(3 * nW);
    for (let k = 0; k < nW; k++) {
        const c = [0, 0, 0];
        let t = 0;
        for (let i = from + k * w; i < from + (k + 1) * w; i++) if (codes[i] >= 0) { c[codes[i]]++; t++; }
        for (let q = 0; q < 3; q++) sh[3 * k + q] = c[q] / t;
    }
    return { sh, nW };
}

/**
 * r = 1 split for block B_k at window width w.
 * Returns { k, size, pairs, same, F1, shares, baseline, E, Adom, Edom, residual, pairsPred }.
 */
export function blockSplit(codes, k, w = 1024) {
    const { from, to } = blockRange(k);
    if (to > codes.length) throw new RangeError(`block B_${k} needs ${to} codes, have ${codes.length}`);
    const cur = windowSharesOf(codes, from, to, w);
    // the lowest-|n| element pairs into the last window of B_(k-1), if that block has a complete window
    const prevRange = k >= 1 ? blockRange(k - 1) : null;
    const prev = prevRange && prevRange.to - prevRange.from >= w ? windowSharesOf(codes, prevRange.from, prevRange.to, w) : null;
    const winOf = i => {
        if (i >= from) { const k2 = Math.floor((i - from) / w); return k2 < cur.nW ? [cur.sh, k2] : null; }
        if (!prev) return null;
        const k2 = Math.floor((i - prevRange.from) / w);
        return k2 < prev.nW ? [prev.sh, k2] : null;
    };
    const counts = [0, 0, 0];
    let settled = 0, pairs = 0, same = 0, predPairs = 0, predSum = 0;
    for (let i = from; i < to; i++) {
        const a = codes[i];
        if (a >= 0) { counts[a]++; settled++; }
        const j = i - 1;
        if (j < 0) continue;
        const b = codes[j];
        if (a < 0 || b < 0) continue;
        pairs++;
        if (a === b) same++;
        const wa = winOf(i), wb = winOf(j);
        if (!wa || !wb) continue;
        let s = 0;
        for (let q = 0; q < 3; q++) s += wa[0][3 * wa[1] + q] * wb[0][3 * wb[1] + q];
        predPairs++;
        predSum += s;
    }
    const shares = counts.map(c => c / settled);
    const baseline = shares.reduce((s, p) => s + p * p, 0);
    const F1 = same / pairs, Adom = predSum / predPairs;
    return { k, w, size: to - from, pairs, same, F1, shares, baseline, E: F1 - baseline, Adom, Edom: Adom - baseline, residual: F1 - Adom, pairsPred: predPairs };
}

/** Block-to-block increments of E, E_dom and the residual. rows: blockSplit results in k order. */
export function increments(rows) {
    return rows.slice(1).map((r, i) => ({
        from: rows[i].k, to: r.k,
        dE: r.E - rows[i].E, dEdom: r.Edom - rows[i].Edom, dResidual: r.residual - rows[i].residual,
    }));
}
