/**
 * The fate partition in Imai's angular placement (dyadic_fate.py, Nov 2026).
 *
 * For odd negative n write n = -(2j + 1), j = 0, 1, 2, ...; with
 * k = floor(log2(max(j, 1))):
 *   theta(n) = (2 (j - 2^k) + 1) pi / 2^k   for j >= 1,   theta(-1) = 0  (j = 0).
 * j-block B^j_k = { j : 2^k <= j < 2^(k+1) } occupies exactly the odd
 * multiples of pi / 2^k, so the overlay of all j < 2^K is the uniform grid
 * t pi / 2^(K-1), t = 0 .. 2^K - 1 (tested).
 *
 * Fates: codes[j] from fateCodes (js/imaiFateCorrelation.js, unchanged
 * trajectoryFate), so codes are indexed by j directly (index i = j).
 */

/** Imai's angle for j >= 0 (j = 0 is n = -1, at angle 0). */
export function imaiTheta(j) {
    if (j === 0) return 0;
    const k = jBlock(j);
    return ((2 * (j - 2 ** k) + 1) * Math.PI) / 2 ** k;
}

/** Dyadic j-block index k = floor(log2 j) for j >= 1; j = 0 belongs to no block (returns -1). */
export function jBlock(j) {
    if (j === 0) return -1;
    let k = 0;
    while (2 ** (k + 1) <= j) k++;
    return k;
}

/** The j values of a list sorted by Imai's angle (stable; angles are distinct). */
export function angularOrder(js) {
    return Int32Array.from(js).sort((a, b) => imaiTheta(a) - imaiTheta(b));
}

/** Fate shares and baseline sum p^2 over the j values of a list. */
export function baselineOf(codes, js) {
    const counts = [0, 0, 0];
    let settled = 0;
    for (const j of js) { const c = codes[j]; if (c < 0) continue; counts[c]++; settled++; }
    const shares = counts.map(c => c / settled);
    return { counts, shares, baseline: shares.reduce((s, p) => s + p * p, 0) };
}

/**
 * Per-block angular agreement A_k(m), m = 1..mMax: points of j-block k in
 * angular order; pairs (i, i + m) in that order, both in the block (linear,
 * non-cyclic). Pairs with an unsettled member are skipped.
 * Returns { k, size, shares, baseline, rows: [{ m, pairs, same, A, excess }] }.
 */
export function blockAngularAgreement(codes, k, mMax) {
    const js = [];
    for (let j = 2 ** k; j < 2 ** (k + 1); j++) js.push(j);
    const order = angularOrder(js);
    const base = baselineOf(codes, order);
    const rows = [];
    for (let m = 1; m <= mMax; m++) {
        let pairs = 0, same = 0;
        for (let i = 0; i + m < order.length; i++) {
            const a = codes[order[i]], b = codes[order[i + m]];
            if (a < 0 || b < 0) continue;
            pairs++;
            if (a === b) same++;
        }
        const A = pairs ? same / pairs : null;
        rows.push({ m, pairs, same, A, excess: A === null ? null : A - base.baseline });
    }
    return { k, size: order.length, shares: base.shares, baseline: base.baseline, rows };
}

/** All j < 2^K in angular order (the full overlay on one circle). */
export function overlayOrder(K) {
    const n = 2 ** K;
    const th = new Float64Array(n);
    const js = new Int32Array(n);
    for (let j = 0; j < n; j++) { js[j] = j; th[j] = imaiTheta(j); }
    return js.sort((a, b) => th[a] - th[b]);
}

/**
 * Neighbour statistics on the cyclic overlay order: consecutive points,
 * last point neighbouring the first. Pair types by j-block (j = 0 is block -1).
 * Returns { pairs, same, agreement, sameBlock: { pairs, same }, crossBlock: { pairs, same },
 *           byLargerK: { k: { pairs, same } }, byCoarserK: { k: { pairs, same } } }.
 */
export function overlayNeighbourStats(codes, order) {
    const out = { pairs: 0, same: 0, sameBlock: { pairs: 0, same: 0 }, crossBlock: { pairs: 0, same: 0 }, byLargerK: {}, byCoarserK: {} };
    const add = (obj, key, s) => { obj[key] ??= { pairs: 0, same: 0 }; obj[key].pairs++; if (s) obj[key].same++; };
    const N = order.length;
    for (let i = 0; i < N; i++) {
        const a = order[i], b = order[(i + 1) % N];
        const ca = codes[a], cb = codes[b];
        if (ca < 0 || cb < 0) continue;
        const s = ca === cb;
        out.pairs++;
        if (s) out.same++;
        const ka = jBlock(a), kb = jBlock(b);
        if (ka === kb) { out.sameBlock.pairs++; if (s) out.sameBlock.same++; }
        else {
            out.crossBlock.pairs++; if (s) out.crossBlock.same++;
            add(out.byLargerK, Math.max(ka, kb), s);
            add(out.byCoarserK, Math.min(ka, kb), s);
        }
    }
    out.agreement = out.pairs ? out.same / out.pairs : null;
    return out;
}

/**
 * Maximal same-fate arcs in a cyclic sequence of fate codes (wrap-around
 * joins the last and first runs). Unsettled codes (-1) end a run.
 * Returns { runs, mean, median, max, maxStartIndex, histogram: Map }.
 */
export function cyclicRuns(seq) {
    const N = seq.length;
    const hist = new Map();
    if (N === 0) return { runs: 0, mean: null, median: null, max: 0, maxStartIndex: -1, histogram: hist };
    // start scanning at a run boundary so wrap-around runs are counted once
    let start = -1;
    for (let i = 0; i < N; i++) if (seq[i] !== seq[(i - 1 + N) % N]) { start = i; break; }
    if (start === -1) { hist.set(N, 1); return { runs: 1, mean: N, median: N, max: N, maxStartIndex: 0, histogram: hist }; }
    let runs = 0, total = 0, max = 0, maxStart = -1;
    let i = 0;
    while (i < N) {
        const p = (start + i) % N;
        if (seq[p] < 0) { i++; continue; }
        let L = 1;
        while (i + L < N && seq[(start + i + L) % N] === seq[p]) L++;
        runs++; total += L;
        hist.set(L, (hist.get(L) ?? 0) + 1);
        if (L > max) { max = L; maxStart = p; }
        i += L;
    }
    const sorted = [...hist.keys()].sort((a, b) => a - b);
    let seen = 0, median = null;
    for (const L of sorted) { seen += hist.get(L); if (seen >= Math.ceil(runs / 2)) { median = L; break; } }
    return { runs, mean: total / runs, median, max, maxStartIndex: maxStart, histogram: hist };
}

/** Fate sequence along an order. */
export function fatesAlong(codes, order) {
    const s = new Int8Array(order.length);
    for (let i = 0; i < order.length; i++) s[i] = codes[order[i]];
    return s;
}

/**
 * Independence comparison: shuffle the same fate multiset over the circle
 * (Fisher-Yates with rng()) and record runs and longest run per shuffle.
 */
export function shuffledRunRange(seq, sims, rng) {
    const a = Int8Array.from(seq);
    const out = [];
    for (let s = 0; s < sims; s++) {
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            const t = a[i]; a[i] = a[j]; a[j] = t;
        }
        const r = cyclicRuns(a);
        let same = 0;
        for (let i = 0; i < a.length; i++) if (a[i] >= 0 && a[i] === a[(i + 1) % a.length]) same++;
        out.push({ runs: r.runs, max: r.max, mean: r.mean, agreement: same / a.length });
    }
    return out;
}
