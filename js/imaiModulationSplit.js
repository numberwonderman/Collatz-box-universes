/**
 * Which component carries the 2-adic modulation? (Build 13, Nov 2026.)
 *
 * Per-r split of the excess, exactly as Build 8 (js/imaiDomains.js) with
 * Build 6's pair convention (js/imaiFateMap.js), then grouped by the 2-adic
 * valuation of r:
 *   E(r)    = F_B(r) - baseline_B
 *   Edom(r) = A_dom(r) - baseline_B      (w-windows, block-internal tiling)
 *   R(r)    = E(r) - Edom(r)             (pair-level residual)
 *
 * Two groupings are reported:
 *  - raw group means (the requested view; confounded with the decay of the
 *    excess in r, because the v2 groups sit at different r);
 *  - detrended group means, Build 6's method: each r's value minus the mean
 *    of its values at r - 2, r - 1, r + 1, r + 2 (defined for 3 <= r <= rMax - 2).
 */

import { windowF, windowBaseline, blockRange } from './imaiFateMap.js';
import { windowShareTable, domainPrediction } from './imaiDomains.js';

/** 2-adic valuation of a positive integer. */
export function v2(r) {
    let v = 0;
    while (r % 2 === 0) { r /= 2; v++; }
    return v;
}

/** Per-r decomposition for block B_k, r = 1..rMax, window width w. */
export function perRDecomposition(codes, k, rMax = 128, w = 1024, table = null) {
    const { from, to } = blockRange(k);
    const tab = table ?? windowShareTable(codes, k - 1, k, w);
    const base = windowBaseline(codes, from, to).baseline;
    const rows = [];
    for (let r = 1; r <= rMax; r++) {
        const F = windowF(codes, from, to, r).F;
        const A = domainPrediction(codes, tab, from, to, r).Adom;
        rows.push({ r, v2: v2(r), E: F - base, Edom: A - base, residual: F - A });
    }
    return { k, w, baseline: base, rows };
}

/** Mean of each field over the rows of each v2 group. Returns [{ v2, n, rs, E, Edom, residual, shareDom, shareRes }]. */
export function groupByV2(rows, fields = ['E', 'Edom', 'residual']) {
    const g = new Map();
    for (const x of rows) { if (!g.has(x.v2)) g.set(x.v2, []); g.get(x.v2).push(x); }
    return [...g.entries()].sort((a, b) => a[0] - b[0]).map(([v, xs]) => {
        const m = f => xs.reduce((s, x) => s + x[f], 0) / xs.length;
        const out = { v2: v, n: xs.length, rs: xs.map(x => x.r) };
        for (const f of fields) out[f] = m(f);
        out.shareDom = out.Edom / out.E;
        out.shareRes = out.residual / out.E;
        return out;
    });
}

/** Build 6's detrending: value at r minus the mean at r-2, r-1, r+1, r+2; rows for 3 <= r <= rMax - 2. */
export function detrend(rows) {
    const by = new Map(rows.map(x => [x.r, x]));
    const out = [];
    for (const x of rows) {
        const nb = [x.r - 2, x.r - 1, x.r + 1, x.r + 2].map(r => by.get(r));
        if (nb.some(y => !y)) continue;
        const d = f => x[f] - nb.reduce((s, y) => s + y[f], 0) / 4;
        out.push({ r: x.r, v2: x.v2, E: d('E'), Edom: d('Edom'), residual: d('residual') });
    }
    return out;
}
