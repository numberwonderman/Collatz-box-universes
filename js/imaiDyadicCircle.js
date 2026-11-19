/**
 * Dyadic circular embedding of the nonzero integers, after
 *
 *   Y. Imai, "Geometric Extensions of Dyadic Circular Embeddings to the
 *   Integers" (2026), HAL hal-05858260v1, CC BY 4.0.
 *   (local copy: docs/imai-2026-dyadic-circular-embeddings.pdf;
 *    extracted definitions: docs/imai-embedding-notes.md)
 *
 * Equation numbers below are the paper's.
 *
 *   k(n)        = floor(log2 n),                              n > 0   (2.1)
 *   theta(n)    = pi (n - 2^k) / 2^k,                         n > 0   (2.2)
 *   theta(-n)   = theta(n) + pi                                       (2.3)
 *   P(n)        = (cos theta(n), sin theta(n))                        (2.4)
 *   theta_nat(n)= 2 pi (n - 2^k) / 2^k                                (2.6)
 *   theta_a(n)  = a theta_nat(|n|)  (+ pi if n < 0)                   (6.9)
 *   P_a,R(n)    = R (cos theta_a(n), sin theta_a(n))                  (6.10)
 *   Q(n)        = (n, 0)                                              (4.1)
 *
 * The signed embedding of Section 2 is the case a = 1/2 (6.8, Sec. 6).
 *
 * Map (1.2):  T_m(n) = n/2 if n even, m n if n odd   (m odd, no additive term).
 * This module also accepts an additive term c (odd step m n + c) so the
 * Collatz-type map 3n+1 can be studied; c = 0 is the paper's map. With
 * c != 0 the odd symmetry T(-n) = -T(n) of (3.2) no longer holds.
 */

export const TWO_PI = 2 * Math.PI;

/** Normalize an angle to [0, 2 pi). */
export function normAngle(t) {
    const r = t % TWO_PI;
    return r < 0 ? r + TWO_PI : r;
}

/** Smallest absolute difference between two angles, in [0, pi]. */
export function angleDistance(a, b) {
    const d = normAngle(a - b);
    return Math.min(d, TWO_PI - d);
}

function assertSafeNonzero(n) {
    if (!Number.isSafeInteger(n)) throw new RangeError(`not a safe integer: ${n}`);
    if (n === 0) throw new RangeError('the embedding is defined on nonzero integers only');
}

/** k(n) = floor(log2 n) for n > 0, computed exactly by bit length. (2.1) */
export function dyadicLevel(n) {
    assertSafeNonzero(n);
    if (n < 0) throw new RangeError('dyadicLevel takes n > 0; use |n|');
    let k = 0;
    let p = 1;
    while (p * 2 <= n) {
        p *= 2;
        k++;
    }
    return k;
}

/** Fractional dyadic position (n - 2^k) / 2^k in [0, 1), n > 0. */
function dyadicFraction(n) {
    const k = dyadicLevel(n);
    const p = 2 ** k;
    return (n - p) / p;
}

/** theta_nat(n) = 2 pi (n - 2^k)/2^k, n > 0: the original natural-number representation. (2.6) */
export function thetaNat(n) {
    assertSafeNonzero(n);
    if (n < 0) throw new RangeError('thetaNat is defined for n > 0 (6.2)');
    return TWO_PI * dyadicFraction(n);
}

/**
 * theta_alpha(n) for nonzero n (6.9):
 *   n > 0:  alpha * theta_nat(n)
 *   n < 0:  alpha * theta_nat(|n|) + pi
 * Not reduced mod 2 pi.
 */
export function thetaAlpha(n, alpha = 0.5) {
    assertSafeNonzero(n);
    const base = alpha * thetaNat(Math.abs(n));
    return n > 0 ? base : base + Math.PI;
}

/** theta(n): the signed dyadic embedding of Section 2, eqs. (2.2)-(2.3). Equals thetaAlpha(n, 1/2). */
export function theta(n) {
    assertSafeNonzero(n);
    const base = Math.PI * dyadicFraction(Math.abs(n));
    return n > 0 ? base : base + Math.PI;
}

/** P_{alpha,R}(n) = R (cos theta_alpha(n), sin theta_alpha(n)). (2.4), (4.2), (6.10) */
export function position(n, { alpha = 0.5, R = 1 } = {}) {
    const t = thetaAlpha(n, alpha);
    return { x: R * Math.cos(t), y: R * Math.sin(t), theta: t };
}

/** Q(n) = (n, 0) on the real axis. (4.1) */
export function numberLinePoint(n) {
    return { x: n, y: 0 };
}

/**
 * One step of T(n) = n/2 (n even), m n + c (n odd).
 * c = 0 is the paper's T_m (1.2); m = 3, c = 1 is the Collatz map (1.1).
 */
export function step(n, m = 3, c = 0) {
    if (!Number.isSafeInteger(n)) throw new RangeError(`not a safe integer: ${n}`);
    if (n % 2 === 0) return n / 2;
    const t = m * n + c;
    if (!Number.isSafeInteger(t)) throw new RangeError(`step overflow at n = ${n}`);
    return t;
}

/** Iterate step() from n for `steps` steps; returns [n, T(n), ..., T^steps(n)]. */
export function orbit(n, steps, m = 3, c = 0) {
    const out = [n];
    let x = n;
    for (let i = 0; i < steps; i++) {
        x = step(x, m, c);
        out.push(x);
    }
    return out;
}

/** Dyadic interval index k(|n|), i.e. 2^k <= |n| < 2^(k+1) (used for colouring, Fig. 3). */
export function dyadicIntervalIndex(n) {
    return dyadicLevel(Math.abs(n));
}

/**
 * Map chords L_m = {[P(n), P(T(n))]} (3.1) for -N <= n <= N, n != 0.
 *
 * imagesInRange: keep only chords with |T(n)| <= N (default). The paper's
 *   (3.1) ranges over all nonzero n with no restriction on T(n); pass
 *   false to include every chord whose source is in range.
 * Chords with T(n) = 0 are dropped (0 has no position).
 * Even steps always give degenerate chords, since theta(2n) = theta(n) (2.8)
 * for every alpha; they are kept and flagged `degenerate`.
 */
export function mapChords({ N, m = 3, c = 0, alpha = 0.5, R = 1, imagesInRange = true }) {
    const chords = [];
    for (let n = -N; n <= N; n++) {
        if (n === 0) continue;
        const t = step(n, m, c);
        if (t === 0) continue;
        if (imagesInRange && Math.abs(t) > N) continue;
        const from = position(n, { alpha, R });
        const to = position(t, { alpha, R });
        chords.push({
            n, t, from, to,
            odd: n % 2 !== 0,
            sign: n > 0 ? 1 : -1,
            degenerate: angleDistance(from.theta, to.theta) < 1e-12,
        });
    }
    return chords;
}

/** Number-line segments S_{alpha,R}(n) = [P_{alpha,R}(n), Q(n)] for -N..N, n != 0. (4.3), (6.12) */
export function numberLineSegments({ N, alpha = 0.5, R = N }) {
    const segs = [];
    for (let n = -N; n <= N; n++) {
        if (n === 0) continue;
        segs.push({ n, from: position(n, { alpha, R }), to: numberLinePoint(n), level: dyadicIntervalIndex(n) });
    }
    return segs;
}

/** Angular-scaling segments C_alpha(n) = [P_nat(n), P_alpha(n)] for positive odd n <= N. (6.6), Fig. 5 */
export function scalingSegments({ N, alpha }) {
    const segs = [];
    for (let n = 1; n <= N; n += 2) {
        segs.push({ n, from: position(n, { alpha: 1 }), to: position(n, { alpha }) });
    }
    return segs;
}

/**
 * Every cycle of T that lies entirely inside [-N, N] \ {0}.
 * Works on the functional graph n -> T(n) restricted to sources whose image
 * is also in range, so each cycle reported is an exact periodic orbit.
 * Each cycle is rotated to start at its element of least absolute value
 * (ties: the negative one), and cycles are sorted by that element.
 */
export function cyclesInRange({ N, m = 3, c = 0 }) {
    const state = new Map(); // 1 = on current path, 2 = done
    const cycles = [];
    for (let s = -N; s <= N; s++) {
        if (s === 0 || state.has(s)) continue;
        const path = [];
        const idx = new Map();
        let x = s;
        while (true) {
            if (x === 0 || Math.abs(x) > N) break;
            const st = state.get(x);
            if (st === 2) break;
            if (st === 1) {
                cycles.push(path.slice(idx.get(x)));
                break;
            }
            state.set(x, 1);
            idx.set(x, path.length);
            path.push(x);
            x = step(x, m, c);
        }
        for (const v of path) state.set(v, 2);
    }
    const key = v => Math.abs(v) * 2 + (v > 0 ? 1 : 0);
    return cycles
        .map(cy => {
            let best = 0;
            for (let i = 1; i < cy.length; i++) if (key(cy[i]) < key(cy[best])) best = i;
            return [...cy.slice(best), ...cy.slice(0, best)];
        })
        .sort((a, b) => key(a[0]) - key(b[0]));
}
