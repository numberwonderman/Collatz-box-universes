/**
 * The depth-pairing table (Build 12, Nov 2026).
 *
 * Reuses Build 7 exactly (js/imaiAngularFate.js): the overlay of j < 2^K in
 * Imai's angular order, its cyclic neighbour pairs, and the depth of a
 * circle point, v = K - 1 - (its j-block), so a pair's coarser member has
 * v = v2(|n| +- 1) as in Build 7's notes. j = 0 (n = -1, block -1) has v = K.
 *
 * Pairs are ordered canonically: coarser member (larger v) first.
 * codes[j] = fate code of n = -(2j + 1) (fateCodes).
 */

import { overlayOrder, jBlock } from './imaiAngularFate.js';

/** Build 7's depth of circle point j in the K-overlay. */
export function depth(j, K) {
    return K - 1 - jBlock(j);
}

function cell() {
    return { pairs: 0, same: 0, fateCounts: [0, 0, 0], coarserFate: [0, 0, 0], finerFate: [0, 0, 0] };
}
function addTo(c, fa, fb, s) {
    c.pairs++; if (s) c.same++;
    c.fateCounts[fa]++; c.fateCounts[fb]++;
    c.coarserFate[fa]++; c.finerFate[fb]++;
}

/**
 * Joint depth table over the K-overlay neighbour pairs.
 * Returns { K, pairs, same, joint: Map 'vCoarser,vFiner' -> cell, byMin, byMax, byCoarser, peakByFate }
 * where peakByFate[v][f] = { pairs, same } for pairs whose coarser member has depth v and fate f.
 */
export function depthTable(codes, K) {
    const order = overlayOrder(K);
    const N = order.length;
    const joint = new Map(), byMin = new Map(), byMax = new Map(), byCoarser = new Map();
    const peakByFate = new Map();
    let pairs = 0, same = 0;
    const get = (m, k) => { if (!m.has(k)) m.set(k, cell()); return m.get(k); };
    for (let i = 0; i < N; i++) {
        const a = order[i], b = order[(i + 1) % N];
        const va = depth(a, K), vb = depth(b, K);
        const [jc, jf, vc, vf] = va >= vb ? [a, b, va, vb] : [b, a, vb, va];
        const fc = codes[jc], ff = codes[jf];
        if (fc < 0 || ff < 0) continue;
        const s = fc === ff;
        pairs++; if (s) same++;
        addTo(get(joint, `${vc},${vf}`), fc, ff, s);
        addTo(get(byMin, vf), fc, ff, s);
        addTo(get(byMax, vc), fc, ff, s);
        addTo(get(byCoarser, vc), fc, ff, s);
        if (!peakByFate.has(vc)) peakByFate.set(vc, [0, 1, 2].map(() => ({ pairs: 0, same: 0, finerFate: [0, 0, 0] })));
        const pf = peakByFate.get(vc)[fc];
        pf.pairs++; if (s) pf.same++; pf.finerFate[ff]++;
    }
    return { K, pairs, same, joint, byMin, byMax, byCoarser, peakByFate };
}

/** Agreement and the cell's own baselines: pooled sum p^2 over both members' fates, and the conditional expectation sum_f p_f(coarser) p_f(finer). */
export function cellStats(c) {
    const tot = c.fateCounts.reduce((a, b) => a + b, 0);
    const pooled = c.fateCounts.reduce((s, v) => s + (v / tot) ** 2, 0);
    const indep = [0, 1, 2].reduce((s, f) => s + (c.coarserFate[f] / c.pairs) * (c.finerFate[f] / c.pairs), 0);
    return { pairs: c.pairs, same: c.same, agreement: c.same / c.pairs, pooledSumSquares: pooled, independentGivenSides: indep };
}
