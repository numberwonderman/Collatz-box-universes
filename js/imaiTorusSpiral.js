/**
 * Torus and spiral drawings of the fate partition (Build 9, Nov 2026).
 *
 * Fates: codes[i] = fate code of n = -(2i + 1) from fateCodes
 * (js/imaiFateCorrelation.js, unchanged trajectoryFate). An even integer
 * carries the fate of its odd part (even steps only halve).
 *
 * Torus = Build 3's cylinder (js/imaiGeometries.js) with its vertical
 * coordinate wrapped: toroidal angle theta(n), height h = k(|n|) (the dyadic
 * block, |cylinderHeight(n)|), poloidal angle 2 pi (h mod H) / H.
 *
 * Lattice on the (theta, height) grid, odd negative n only:
 *  - horizontal: angularly adjacent points of one row (one block): |n| and
 *    |n| + 2 inside the block (the row spans half the circle, so no wrap);
 *  - vertical: the row above has twice the angular resolution; the angle of
 *    |n| falls exactly on the even 2|n|, so both odd points 2|n| - 1 and
 *    2|n| + 1 are nearest and both count.
 * Wrapping with H > (largest height) changes no coordinate that matters and
 * adds no pair; H <= largest height would superimpose rows of different
 * angular resolution, for which this lattice is not defined (rejected).
 *
 * Spiral: Ulam square spiral of j = 1, 2, 3, ... (j = -n), standard
 * orientation: 1 at the origin, 2 to its east, then counter-clockwise.
 */

import { theta } from './imaiDyadicCircle.js';
import { cylinderHeight } from './imaiGeometries.js';

const oddIndex = a => { while (a % 2 === 0) a /= 2; return (a - 1) / 2; };

/** Fate code of the negative integer -j (j >= 1), any parity. */
export function fateOfInteger(codes, j) {
    return codes[oddIndex(j)];
}

/** Lattice height of a negative odd n: the dyadic block k(|n|) (Build 3's |h|). */
export function latticeHeight(n) {
    return Math.abs(cylinderHeight(n));
}

/** Torus coordinates of a negative odd n for wrap period H. */
export function torusCoords(n, H) {
    const h = latticeHeight(n);
    const hw = ((h % H) + H) % H;
    return { toroidal: theta(n), poloidal: (2 * Math.PI * hw) / H, h, hWrapped: hw };
}

/**
 * Lattice agreement on the (theta, height mod H) grid for odd negative n with
 * |n| <= 2^K - 1. H = Infinity is the open cylinder.
 * Returns { pairs, same, agreement, horizontal: {pairs, same}, vertical: {pairs, same},
 *           wrapPairs, byRow: { h: { horizontal, vertical } }, maxHeight }.
 */
export function latticeAgreement(codes, K, H = Infinity) {
    const maxA = 2 ** K - 1;
    const maxHeight = K - 1;
    if (H !== Infinity && H <= maxHeight) {
        throw new RangeError(`H = ${H} <= largest height ${maxHeight}: wrapping would superimpose rows; lattice undefined`);
    }
    if (H === maxHeight + 1) {
        // the top row would sit next to row 0 across the wrap; not used in this build
        throw new RangeError(`H = ${H} = largest height + 1 would join the top row to row 0; not used in this build`);
    }
    const out = { pairs: 0, same: 0, horizontal: { pairs: 0, same: 0 }, vertical: { pairs: 0, same: 0 }, wrapPairs: 0, byRow: {}, maxHeight };
    const add = (kind, h, a, b) => {
        const ca = codes[(a - 1) / 2], cb = codes[(b - 1) / 2];
        if (ca < 0 || cb < 0) return;
        const s = ca === cb ? 1 : 0;
        out[kind].pairs++; out[kind].same += s;
        out.pairs++; out.same += s;
        out.byRow[h] ??= { horizontal: { pairs: 0, same: 0 }, vertical: { pairs: 0, same: 0 } };
        out.byRow[h][kind].pairs++; out.byRow[h][kind].same += s;
    };
    for (let a = 1; a <= maxA; a += 2) {
        const h = latticeHeight(-a);
        if (a + 2 <= maxA && latticeHeight(-(a + 2)) === h) add('horizontal', h, a, a + 2);
        for (const b of [2 * a - 1, 2 * a + 1]) if (b !== a && b <= maxA) add('vertical', h, a, b);
    }
    // for H > maxHeight + 1 an empty band separates the top row from row 0 across the wrap,
    // so wrapping adds no pair (out.wrapPairs stays 0)
    out.agreement = out.pairs ? out.same / out.pairs : null;
    return out;
}

/** Fate shares and sum p^2 over a list of codes (unsettled -1 skipped). */
export function sharesOf(list, nKeys = 3) {
    const c = new Array(nKeys).fill(0);
    let t = 0;
    for (const x of list) if (x >= 0) { c[x]++; t++; }
    const p = c.map(v => v / t);
    return { counts: c, shares: p, sumSquares: p.reduce((s, v) => s + v * v, 0) };
}

/** Ulam spiral coordinates for j = 1..J (standard orientation). Returns Int32Arrays xs, ys (index j). */
export function ulamCoords(J) {
    const xs = new Int32Array(J + 1), ys = new Int32Array(J + 1);
    let x = 0, y = 0, j = 1, len = 1;
    const dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]]; // E, N, W, S
    let d = 0;
    xs[1] = 0; ys[1] = 0;
    while (j < J) {
        for (let rep = 0; rep < 2 && j < J; rep++) {
            for (let s = 0; s < len && j < J; s++) {
                x += dirs[d][0]; y += dirs[d][1]; j++;
                xs[j] = x; ys[j] = y;
            }
            d = (d + 1) % 4;
        }
        len++;
    }
    return { xs, ys };
}

/**
 * 4-neighbourhood agreement on the Ulam spiral of j = 1..J, given a fate per
 * j (fateOf(j) -> code). Each unordered grid-adjacent pair counted once.
 * Returns { pairs, same, agreement, consecutive: {pairs, same}, crossRing: {pairs, same} }.
 */
export function spiralAgreement(J, fateOf) {
    const { xs, ys } = ulamCoords(J);
    const key = (x, y) => `${x},${y}`;
    const at = new Map();
    for (let j = 1; j <= J; j++) at.set(key(xs[j], ys[j]), j);
    const out = { pairs: 0, same: 0, consecutive: { pairs: 0, same: 0 }, crossRing: { pairs: 0, same: 0 } };
    for (let j = 1; j <= J; j++) {
        for (const [dx, dy] of [[1, 0], [0, 1]]) {
            const k = at.get(key(xs[j] + dx, ys[j] + dy));
            if (k === undefined) continue;
            const a = fateOf(j), b = fateOf(k);
            if (a < 0 || b < 0) continue;
            const s = a === b ? 1 : 0;
            const kind = Math.abs(j - k) === 1 ? 'consecutive' : 'crossRing';
            out.pairs++; out.same += s; out[kind].pairs++; out[kind].same += s;
        }
    }
    out.agreement = out.same / out.pairs;
    return out;
}
