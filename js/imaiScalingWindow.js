/**
 * Does the residual still fall under a scaling window? (Build 14, Nov 2026.)
 *
 * Build 11's split (blockSplit in js/imaiDomainSaturation.js), unchanged,
 * computed at three window settings:
 *  - fixed:        w = 1024 for every block (Build 11's control);
 *  - scaling:      w_k = 2^(k-10), 512 windows per block (equals 1024 at k = 20);
 *  - half-scaling: w_k = 2^(k-12), 2,048 windows per block (equals 1024 at k = 22).
 * Block B_k = odd n with 2^k <= |n| < 2^(k+1) holds 2^(k-1) odd values.
 * As in Build 11, the block's lowest-|n| element pairs into B_(k-1), tiled
 * with the same width w.
 */

import { blockSplit } from './imaiDomainSaturation.js';

export const SETTINGS = {
    fixed: () => 1024,
    scaling: k => 2 ** (k - 10),
    halfScaling: k => 2 ** (k - 12),
};

/** Window width for a setting at block k. */
export function windowFor(setting, k) {
    const f = SETTINGS[setting];
    if (!f) throw new RangeError(`unknown setting ${setting}`);
    return f(k);
}

/** The split of block k under every setting: { setting: blockSplit result + { w, windows } }. */
export function splitAllSettings(codes, k) {
    const out = {};
    for (const s of Object.keys(SETTINGS)) {
        const w = windowFor(s, k);
        const r = blockSplit(codes, k, w);
        out[s] = { ...r, w, windows: r.size / w };
    }
    return out;
}

/** Residual increments between consecutive rows (rows sorted by k). */
export function residualIncrements(rows) {
    return rows.slice(1).map((r, i) => ({ from: rows[i].k, to: r.k, dResidual: r.residual - rows[i].residual, dEdom: r.Edom - rows[i].Edom }));
}

/** The block where the residual peaks, among rows. */
export function peakBlock(rows) {
    return rows.reduce((best, r) => (r.residual > best.residual ? r : best)).k;
}
