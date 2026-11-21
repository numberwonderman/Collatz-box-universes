/**
 * Fate-dominated domains (Nov 2026): window tiling, domain extraction and
 * the domain-only prediction of F.
 *
 * Fate codes come from fateCodes (js/imaiFateCorrelation.js): codes[i] is the
 * fate of n = -(2i + 1) (0 = -1, 1 = -5, 2 = -17). Dyadic block B_k = odd n
 * with 2^k <= |n| < 2^(k+1) = indices [2^(k-1), 2^k) (blockRange in
 * js/imaiFateMap.js).
 *
 * Operational definitions (see docs/imai-embedding-notes.md):
 *  - windows: non-overlapping tiles of w consecutive odd n within one block,
 *    in increasing |n|, starting at the block's lowest |n|;
 *  - a window is dominated by fate f if f's share is >= tau;
 *  - a domain is a maximal run of consecutive windows of one block all
 *    dominated by the same fate; runs stop at block boundaries.
 */

import { blockRange } from './imaiFateMap.js';

/** Tile indices [from, to) with windows of w; a final partial window is dropped. Returns [{ from, to, counts, shares }]. */
export function tileWindows(codes, from, to, w, nKeys = 3) {
    const out = [];
    for (let f = from; f + w <= to; f += w) {
        const counts = new Array(nKeys).fill(0);
        let settled = 0;
        for (let i = f; i < f + w; i++) if (codes[i] >= 0) { counts[codes[i]]++; settled++; }
        out.push({ from: f, to: f + w, counts, shares: counts.map(c => c / settled) });
    }
    return out;
}

/** Dominating fate of a window (index of a share >= tau), or -1. */
export function dominantFate(shares, tau) {
    let best = -1, bestShare = -1;
    for (let i = 0; i < shares.length; i++) if (shares[i] >= tau && shares[i] > bestShare) { best = i; bestShare = shares[i]; }
    return best;
}

/**
 * Domains in one block's window list: maximal runs of consecutive windows
 * dominated by the same fate. Returns [{ fate, firstWindow, windows, length }]
 * with length in odd integers (windows * w).
 */
export function extractDomains(windows, tau, w) {
    const out = [];
    let cur = null;
    windows.forEach((win, i) => {
        const f = dominantFate(win.shares, tau);
        if (f >= 0 && cur && cur.fate === f) { cur.windows++; return; }
        if (cur) out.push(cur);
        cur = f >= 0 ? { fate: f, firstWindow: i, windows: 1 } : null;
    });
    if (cur) out.push(cur);
    return out.map(d => ({ ...d, length: d.windows * w }));
}

/** count, mean, median (lower), max of a list of numbers. */
export function summary(xs) {
    if (!xs.length) return { count: 0, mean: null, median: null, max: null };
    const s = [...xs].sort((a, b) => a - b);
    return { count: s.length, mean: s.reduce((a, b) => a + b, 0) / s.length, median: s[Math.ceil(s.length / 2) - 1], max: s[s.length - 1] };
}

/**
 * Domain statistics for block k at (w, tau): number of domains, length
 * summary (odd integers) overall and per fate, fraction of the block's odd
 * integers inside domains.
 */
export function blockDomainStats(codes, k, w, tau, nKeys = 3) {
    const { from, to } = blockRange(k);
    const windows = tileWindows(codes, from, to, w, nKeys);
    const domains = extractDomains(windows, tau, w);
    const covered = domains.reduce((s, d) => s + d.length, 0);
    const byFate = {};
    for (let f = 0; f < nKeys; f++) byFate[f] = summary(domains.filter(d => d.fate === f).map(d => d.length));
    return {
        k, w, tau, windows: windows.length, blockSize: to - from,
        domains: domains.length, lengths: summary(domains.map(d => d.length)), byFate,
        fractionInDomains: covered / (to - from), domainList: domains,
    };
}

/**
 * Per-index window shares for every complete block k = kMin..kMax at width w
 * (block-internal tiling). Returns Float64Array of length 3 * count, NaN
 * where an index is not covered (block smaller than w, or a dropped tail).
 */
export function windowShareTable(codes, kMin, kMax, w, nKeys = 3) {
    const sh = new Float64Array(codes.length * nKeys).fill(NaN);
    for (let k = kMin; k <= kMax; k++) {
        const { from, to } = blockRange(k);
        if (to > codes.length) break;
        for (const win of tileWindows(codes, from, to, w, nKeys)) {
            for (let i = win.from; i < win.to; i++) for (let q = 0; q < nKeys; q++) sh[nKeys * i + q] = win.shares[q];
        }
    }
    return sh;
}

/**
 * Domain-only prediction for W = indices [from, to) at separation r, with the
 * fate-map pair convention (partner index i - r, possibly below W, must be
 * >= 0): A_dom(r) = mean over pairs of sum_q p_q(W(i)) p_q(W(i - r)).
 * Pairs whose window shares are undefined (NaN) or with an unsettled member
 * are skipped. Returns { pairs, Adom }.
 */
export function domainPrediction(codes, shareTable, from, to, r, nKeys = 3) {
    let pairs = 0, sum = 0;
    for (let i = Math.max(from, r); i < to; i++) {
        const j = i - r;
        if (codes[i] < 0 || codes[j] < 0) continue;
        let s = 0;
        for (let q = 0; q < nKeys; q++) s += shareTable[nKeys * i + q] * shareTable[nKeys * j + q];
        if (Number.isNaN(s)) continue;
        pairs++;
        sum += s;
    }
    return { pairs, Adom: pairs ? sum / pairs : null };
}

/** Least-squares fit y = a + b x; returns { slope, intercept, r2, n }. */
export function fitLine(xs, ys) {
    const n = xs.length;
    if (n < 2) return { slope: null, intercept: null, r2: null, n };
    const mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
    let sxx = 0, sxy = 0, syy = 0;
    for (let i = 0; i < n; i++) { sxx += (xs[i] - mx) ** 2; sxy += (xs[i] - mx) * (ys[i] - my); syy += (ys[i] - my) ** 2; }
    const slope = sxy / sxx;
    return { slope, intercept: my - slope * mx, r2: syy === 0 ? 1 : (sxy * sxy) / (sxx * syy), n };
}

/**
 * Growth law size ~ |n|^alpha from typical sizes per block: fits log2(size)
 * against k (log2 |n| = k + const within a block), so the slope is alpha.
 * `points` = [{ k, size }]; blocks with size null are excluded.
 */
export function fitAlpha(points) {
    const use = points.filter(p => p.size !== null && p.size > 0);
    const f = fitLine(use.map(p => p.k), use.map(p => Math.log2(p.size)));
    return { alpha: f.slope, r2: f.r2, blocksUsed: use.map(p => p.k), n: f.n };
}
