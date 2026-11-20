/**
 * Fractal probe for the Imai dyadic circle (exploratory).
 *
 * Builds on js/imaiDyadicCircle.js. Pure functions only (no DOM), so the same
 * code runs in the browser view and in scripts/imai-fractal-probe.mjs.
 *
 * Density. Imai's eq. (4.4) sums Gaussians exp(-d^2 / (2 eps^2)) of the distance
 * d from (x, y) to each segment. The paper applies it to the circle-number-line
 * segments S_R(n); this probe applies the same kernel to the map chords
 * [P(n), P(T(n))] of eq. (3.1). Coordinates are those of the unit circle, which
 * is the R = N picture divided by N, so "eps proportional to 1/N" here is the
 * paper's R = N with a fixed eps.
 *
 * When eps is under half a pixel a point-sampled Gaussian aliases, so the grid
 * switches to "length mode": each pixel gets (chord length inside the pixel) x
 * sqrt(2 pi) eps / (pixel area), the pixel-averaged value of the same Gaussian
 * line. Both modes integrate to L sqrt(2 pi) eps per segment, so values remain
 * comparable across N.
 */

import { mapChords, dyadicIntervalIndex, step, TWO_PI } from './imaiDyadicCircle.js';

const SQRT_2PI = Math.sqrt(2 * Math.PI);

/** Euclidean distance from (px, py) to the segment [(ax, ay), (bx, by)]. */
export function pointSegmentDistance(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    const L2 = dx * dx + dy * dy;
    let t = L2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / L2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Pixel geometry of a size x size grid covering [-extent, extent]^2, y up. */
export function gridGeometry(size, extent = 1.05) {
    const h = (2 * extent) / size;
    return {
        size, extent, h,
        toPx: (x, y) => [(x + extent) / h, (extent - y) / h], // continuous pixel coords
        centre: (i, j) => [-extent + (i + 0.5) * h, extent - (j + 0.5) * h],
    };
}

/**
 * Add one segment to `grid` (Float64Array, length size^2, or per-channel
 * arrays via `weights`) by walking it in steps of at most `stepPx` pixels and
 * depositing length into the pixel under each sample.
 */
function depositLength(grid, geo, seg, scale, stepPx = 0.25) {
    const [x0, y0] = geo.toPx(seg.from.x, seg.from.y);
    const [x1, y1] = geo.toPx(seg.to.x, seg.to.y);
    const lenPx = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.max(1, Math.ceil(lenPx / stepPx));
    const dl = (lenPx * geo.h) / n; // world length per sample
    const { size } = geo;
    for (let s = 0; s < n; s++) {
        const t = (s + 0.5) / n;
        const i = Math.floor(x0 + t * (x1 - x0));
        const j = Math.floor(y0 + t * (y1 - y0));
        if (i < 0 || j < 0 || i >= size || j >= size) continue;
        grid[j * size + i] += dl * scale;
    }
}

/**
 * Gaussian line density G(x, y) = sum_seg exp(-d_seg(x, y)^2 / (2 eps^2)) on a
 * size x size grid. eps is in world (unit-circle) units.
 * Returns { grid, size, extent, epsPx, mode }.
 */
export function densityGrid(segments, { size = 512, extent = 1.05, eps }) {
    const geo = gridGeometry(size, extent);
    const grid = new Float64Array(size * size);
    const epsPx = eps / geo.h;
    const mode = epsPx >= 0.5 ? 'gaussian' : 'length';
    if (mode === 'length') {
        const scale = (SQRT_2PI * eps) / (geo.h * geo.h);
        for (const seg of segments) depositLength(grid, geo, seg, scale);
        return { grid, size, extent, epsPx, mode };
    }
    const reach = 4 * eps;
    const inv = 1 / (2 * eps * eps);
    for (const { from: a, to: b } of segments) {
        const [ia, ja] = geo.toPx(Math.min(a.x, b.x) - reach, Math.max(a.y, b.y) + reach);
        const [ib, jb] = geo.toPx(Math.max(a.x, b.x) + reach, Math.min(a.y, b.y) - reach);
        const i0 = Math.max(0, Math.floor(ia)), i1 = Math.min(size - 1, Math.ceil(ib));
        const j0 = Math.max(0, Math.floor(ja)), j1 = Math.min(size - 1, Math.ceil(jb));
        for (let j = j0; j <= j1; j++) {
            for (let i = i0; i <= i1; i++) {
                const [x, y] = geo.centre(i, j);
                const d = pointSegmentDistance(x, y, a.x, a.y, b.x, b.y);
                if (d < reach) grid[j * size + i] += Math.exp(-d * d * inv);
            }
        }
    }
    return { grid, size, extent, epsPx, mode };
}

/**
 * Coloured line density: three channel grids, each segment depositing its
 * length weighted by seg.rgb = [r, g, b] in [0, 1]. Used for the colour probes.
 */
export function colourDensity(segments, { size = 512, extent = 1.05 }) {
    const geo = gridGeometry(size, extent);
    const ch = [0, 1, 2].map(() => new Float64Array(size * size));
    const total = new Float64Array(size * size);
    for (const seg of segments) {
        for (let c = 0; c < 3; c++) if (seg.rgb[c] > 0) depositLength(ch[c], geo, seg, seg.rgb[c]);
        depositLength(total, geo, seg, 1);
    }
    return { r: ch[0], g: ch[1], b: ch[2], total, size, extent };
}

/** Non-degenerate map chords (all n in range, as in eq. 3.1 / Fig. 2, unless imagesInRange). */
export function probeChords({ N, m = 3, c = 0, alpha = 0.5, imagesInRange = false }) {
    return mapChords({ N, m, c, alpha, imagesInRange }).filter(ch => !ch.degenerate);
}

/** Chords whose source n lies in dyadic block k: 2^k <= |n| < 2^(k+1). */
export function blockChords(chords, k) {
    return chords.filter(ch => dyadicIntervalIndex(ch.n) === k);
}

/** The chord with both endpoint angles doubled (theta -> 2 theta mod 2 pi), on the unit circle. */
export function doubleAngles(ch) {
    const f = (2 * ch.from.theta) % TWO_PI;
    const t = (2 * ch.to.theta) % TWO_PI;
    return {
        ...ch,
        from: { x: Math.cos(f), y: Math.sin(f), theta: f },
        to: { x: Math.cos(t), y: Math.sin(t), theta: t },
    };
}

/**
 * Per dyadic block k of the source n (1 <= |n| <= N): how many chords n -> T(n)
 * there are, how many are odd steps, and how many leave the block
 * (T(n) = 0 counts as leaving). Counts all chords, degenerate or not.
 */
export function blockCrossings({ N, m = 3, c = 0 }) {
    const rows = new Map();
    for (let n = -N; n <= N; n++) {
        if (n === 0) continue;
        const k = dyadicIntervalIndex(n);
        const t = step(n, m, c);
        const r = rows.get(k) ?? { k, chords: 0, odd: 0, crossing: 0, oddCrossing: 0 };
        const odd = n % 2 !== 0;
        const crosses = t === 0 || dyadicIntervalIndex(t) !== k;
        r.chords++;
        if (odd) r.odd++;
        if (crosses) r.crossing++;
        if (crosses && odd) r.oddCrossing++;
        rows.set(k, r);
    }
    return [...rows.values()].sort((a, b) => a.k - b.k);
}

/**
 * Fate of n under T(n) = n/2 | m n + c, within maxSteps steps.
 * Returns { fate: 'cycle', key, steps } where key is the cycle element of least
 * |value| (ties: the negative one), { fate: 'zero' } if it hits 0, or
 * { fate: 'unsettled' } if no repeat is seen within maxSteps steps or a value
 * leaves the safe-integer range.
 */
export function trajectoryFate(n, { m = 3, c = 1, maxSteps = 500 } = {}) {
    const seen = new Map();
    let x = n;
    for (let s = 0; s <= maxSteps; s++) {
        if (x === 0) return { fate: 'zero', steps: s };
        if (seen.has(x)) {
            const cyc = [];
            let y = x;
            do { cyc.push(y); y = step(y, m, c); } while (y !== x);
            const key = cyc.reduce((best, v) =>
                (Math.abs(v) < Math.abs(best) || (Math.abs(v) === Math.abs(best) && v < best)) ? v : best);
            return { fate: 'cycle', key, steps: seen.get(x) };
        }
        seen.set(x, s);
        const next = m * Math.abs(x) + Math.abs(c);
        if (!Number.isSafeInteger(next)) return { fate: 'unsettled', steps: s };
        x = step(x, m, c);
    }
    return { fate: 'unsettled', steps: maxSteps };
}

/** Normalise a density grid to [0, 1] on a log(1 + G) scale (vmax: shared maximum, optional). */
export function logNormalise(grid, vmax) {
    let mx = vmax;
    if (mx === undefined) {
        mx = 0;
        for (const v of grid) if (v > mx) mx = v;
    }
    const lm = Math.log1p(mx) || 1;
    const out = new Float64Array(grid.length);
    for (let i = 0; i < grid.length; i++) out[i] = Math.min(1, Math.log1p(grid[i]) / lm);
    return out;
}

/** Binary mask: value >= threshold. */
export function threshold(values, t) {
    const m = new Uint8Array(values.length);
    for (let i = 0; i < values.length; i++) m[i] = values[i] >= t ? 1 : 0;
    return m;
}

/** Number of s x s boxes (aligned to the grid, partial edge boxes included) containing a set pixel. */
export function boxCount(mask, size, s) {
    let count = 0;
    for (let J = 0; J < size; J += s) {
        for (let I = 0; I < size; I += s) {
            let hit = false;
            for (let j = J; j < Math.min(J + s, size) && !hit; j++) {
                const row = j * size;
                for (let i = I; i < Math.min(I + s, size); i++) {
                    if (mask[row + i]) { hit = true; break; }
                }
            }
            if (hit) count++;
        }
    }
    return count;
}

/** Least-squares line through (x, y) points; returns { slope, intercept, r2 }. */
export function linearFit(xs, ys) {
    const n = xs.length;
    const mx = xs.reduce((a, b) => a + b, 0) / n;
    const my = ys.reduce((a, b) => a + b, 0) / n;
    let sxx = 0, sxy = 0, syy = 0;
    for (let i = 0; i < n; i++) {
        sxx += (xs[i] - mx) ** 2;
        sxy += (xs[i] - mx) * (ys[i] - my);
        syy += (ys[i] - my) ** 2;
    }
    const slope = sxy / sxx;
    return { slope, intercept: my - slope * mx, r2: syy === 0 ? 1 : (sxy * sxy) / (sxx * syy) };
}

/**
 * Box-counting dimension estimate: slope of log N(s) against log(1/s).
 * Returns { slope, r2, rows: [{ s, count }] }.
 */
export function boxCountingDimension(mask, size, boxSizes = [2, 4, 8, 16, 32, 64]) {
    const rows = boxSizes.map(s => ({ s, count: boxCount(mask, size, s) }));
    const used = rows.filter(r => r.count > 0);
    const fit = linearFit(used.map(r => Math.log(1 / r.s)), used.map(r => Math.log(r.count)));
    return { slope: fit.slope, r2: fit.r2, rows };
}

/** Overlap of two masks: intersection over union and the share of each covered by the other. */
export function maskOverlap(a, b) {
    let inter = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) {
        if (a[i]) na++;
        if (b[i]) nb++;
        if (a[i] && b[i]) inter++;
    }
    const union = na + nb - inter;
    return { iou: union ? inter / union : 1, aInB: na ? inter / na : 1, bInA: nb ? inter / nb : 1, na, nb };
}

/** Pearson correlation of two equal-length arrays. */
export function correlation(a, b) {
    const n = a.length;
    let ma = 0, mb = 0;
    for (let i = 0; i < n; i++) { ma += a[i]; mb += b[i]; }
    ma /= n; mb /= n;
    let sab = 0, saa = 0, sbb = 0;
    for (let i = 0; i < n; i++) {
        const da = a[i] - ma, db = b[i] - mb;
        sab += da * db; saa += da * da; sbb += db * db;
    }
    return saa && sbb ? sab / Math.sqrt(saa * sbb) : 0;
}

/** 'inferno'-like ramp for v in [0, 1] -> [r, g, b] bytes. */
export function rampColour(v) {
    const stops = [
        [0, 0, 0, 4], [0.25, 87, 16, 110], [0.5, 188, 55, 84], [0.75, 249, 142, 9], [1, 252, 255, 164],
    ];
    const x = Math.max(0, Math.min(1, v));
    for (let i = 1; i < stops.length; i++) {
        if (x <= stops[i][0]) {
            const [x0, ...c0] = stops[i - 1];
            const [x1, ...c1] = stops[i];
            const t = (x - x0) / (x1 - x0);
            return c0.map((c, k) => Math.round(c + t * (c1[k] - c)));
        }
    }
    return stops[stops.length - 1].slice(1);
}

/** RGBA bytes (Uint8ClampedArray) for a normalised grid, via rampColour. */
export function toRGBA(norm) {
    const out = new Uint8ClampedArray(norm.length * 4);
    for (let i = 0; i < norm.length; i++) {
        const [r, g, b] = rampColour(norm[i]);
        out[4 * i] = r; out[4 * i + 1] = g; out[4 * i + 2] = b; out[4 * i + 3] = 255;
    }
    return out;
}

/** RGBA bytes for a colourDensity result: hue = mean chord colour, brightness = log density. */
export function colourToRGBA({ r, g, b, total }) {
    let mx = 0;
    for (const v of total) if (v > mx) mx = v;
    const lm = Math.log1p(mx) || 1;
    const out = new Uint8ClampedArray(total.length * 4);
    for (let i = 0; i < total.length; i++) {
        const t = total[i];
        const lum = t > 0 ? Math.log1p(t) / lm : 0;
        const k = t > 0 ? (255 * Math.min(1, 0.15 + 0.85 * lum)) / t : 0;
        out[4 * i] = r[i] * k; out[4 * i + 1] = g[i] * k; out[4 * i + 2] = b[i] * k;
        out[4 * i + 3] = 255;
    }
    return out;
}
