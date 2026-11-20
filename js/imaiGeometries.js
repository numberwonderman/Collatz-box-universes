/**
 * Dyadic embeddings on a cylinder and a sphere: generalisations of Imai's
 * dyadic circle (see docs/imai-embedding-notes.md, "Other geometries").
 *
 * Reuses theta(n), the dyadic level k(n) and T(n) = n/2 | m n + c from
 * js/imaiDyadicCircle.js.
 *
 * Cylinder:  C(n) = (cos theta(n), h(n), sin theta(n)), h(n) = sign(n) k(|n|).
 *            Unit circle in the XZ plane, y vertical. Doubling n -> 2n keeps
 *            theta and adds sign(n) to h; n -> n/2 subtracts it.
 * Unrolled:  (u, h) with u = theta(n) / 2 pi in [0, 1): positives fill
 *            u in [0, 1/2) above h = 0, negatives u in [1/2, 1) below.
 * Sphere:    for n > 0 in block k, longitude lambda = theta(n) in [0, pi) and
 *            latitude lat = pi/2 - (k + 1) pi / (2 (K + 2)), K = the largest
 *            block of the rendered range; S(n) = (cos lat cos lambda, sin lat,
 *            cos lat sin lambda). For n < 0, S(n) = -S(-n) (the antipode).
 *            With K fixed, a block above K is still placed by the same
 *            formula: block K + 1 lands on the equator, block K + 2 south of it.
 */

import { theta, dyadicLevel, step, TWO_PI } from './imaiDyadicCircle.js';

/** Signed height h(n) = sign(n) k(|n|). */
export function cylinderHeight(n) {
    const k = dyadicLevel(Math.abs(n));
    return n > 0 ? k : -k;
}

/** C(n) = (cos theta, h, sin theta). */
export function cylinderPoint(n) {
    const t = theta(n);
    const h = cylinderHeight(n);
    return { x: Math.cos(t), y: h, z: Math.sin(t), theta: t, h };
}

/** Unrolled cylinder: u = theta / 2 pi in [0, 1), h = signed height. */
export function unrolledPoint(n) {
    const t = theta(n);
    return { u: t / TWO_PI, h: cylinderHeight(n), theta: t };
}

/** Latitude of dyadic block k when K is the largest rendered block. */
export function sphereLatitude(k, K) {
    return Math.PI / 2 - ((k + 1) * Math.PI) / (2 * (K + 2));
}

/** S(n) on the unit sphere; S(-n) is computed as -S(n), never from a formula. */
export function spherePoint(n, K) {
    if (n < 0) {
        const p = spherePoint(-n, K);
        return { x: -p.x, y: -p.y, z: -p.z, lon: p.lon + Math.PI, lat: -p.lat, k: p.k };
    }
    const k = dyadicLevel(n);
    const lat = sphereLatitude(k, K);
    const lon = theta(n);
    return { x: Math.cos(lat) * Math.cos(lon), y: Math.sin(lat), z: Math.cos(lat) * Math.sin(lon), lon, lat, k };
}

/** Largest dyadic block in 1..N. */
export function topBlock(N) {
    return dyadicLevel(N);
}

/**
 * Chords [P(n), P(T(n))] for 1 <= |n| <= N on the chosen geometry
 * ('cylinder' | 'unrolled' | 'sphere'). All chords are kept, including
 * images outside [-N, N] (flagged inRange: false) and even steps, which are
 * not degenerate here. T(n) = 0 is dropped.
 */
export function geometryChords({ N, m = 3, c = 0, geometry = 'cylinder', K = topBlock(N) }) {
    const place = geometry === 'sphere' ? n => spherePoint(n, K)
        : geometry === 'unrolled' ? unrolledPoint : cylinderPoint;
    const out = [];
    for (let n = -N; n <= N; n++) {
        if (n === 0) continue;
        const t = step(n, m, c);
        if (t === 0) continue;
        out.push({
            n, t, from: place(n), to: place(t),
            odd: n % 2 !== 0, sign: n > 0 ? 1 : -1, inRange: Math.abs(t) <= N,
        });
    }
    return out;
}

/**
 * Distribution of chord height changes dh = h(T(n)) - h(n) on the cylinder,
 * split by parity and sign of n, with the share of images outside [-N, N].
 * Returns { odd: { pos, neg }, even: { pos, neg } } where each leaf is
 * { total, outOfRange, dh: { [value]: count } }.
 */
export function heightChangeTable({ N, m = 3, c = 0 }) {
    const leaf = () => ({ total: 0, outOfRange: 0, dh: {} });
    const table = { odd: { pos: leaf(), neg: leaf() }, even: { pos: leaf(), neg: leaf() } };
    for (let n = -N; n <= N; n++) {
        if (n === 0) continue;
        const t = step(n, m, c);
        if (t === 0) continue;
        const cell = table[n % 2 !== 0 ? 'odd' : 'even'][n > 0 ? 'pos' : 'neg'];
        const d = cylinderHeight(t) - cylinderHeight(n);
        cell.total++;
        cell.dh[d] = (cell.dh[d] ?? 0) + 1;
        if (Math.abs(t) > N) cell.outOfRange++;
    }
    return table;
}

/**
 * Distinctness of the placement on 1 <= |n| <= N: the smallest distance
 * between the points of two different integers, and every pair closer than
 * tol. Uses a spatial hash, so it is linear in N.
 */
export function distinctness({ N, geometry = 'sphere', K = topBlock(N), tol = 1e-9 }) {
    const pts = [];
    for (let n = -N; n <= N; n++) {
        if (n === 0) continue;
        const p = geometry === 'sphere' ? spherePoint(n, K) : cylinderPoint(n);
        pts.push([n, p.x, p.y, p.z]);
    }
    // nearest-neighbour distance by brute force over a coarse hash on (x, y, z)
    const cell = geometry === 'sphere' ? 0.02 : 0.05;
    const grid = new Map();
    const key = (a, b, c) => `${a},${b},${c}`;
    for (const p of pts) {
        const k = key(Math.floor(p[1] / cell), Math.floor(p[2] / cell), Math.floor(p[3] / cell));
        if (!grid.has(k)) grid.set(k, []);
        grid.get(k).push(p);
    }
    let minDistance = Infinity, closest = null;
    const collisions = [];
    for (const p of pts) {
        const [a, b, c] = [p[1], p[2], p[3]].map(v => Math.floor(v / cell));
        for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let l = -1; l <= 1; l++) {
            for (const q of grid.get(key(a + i, b + j, c + l)) ?? []) {
                if (q[0] <= p[0]) continue;
                const d = Math.hypot(p[1] - q[1], p[2] - q[2], p[3] - q[3]);
                if (d < minDistance) { minDistance = d; closest = [p[0], q[0]]; }
                if (d < tol) collisions.push([p[0], q[0]]);
            }
        }
    }
    // a pair farther apart than one cell in every neighbourhood is not seen; report that bound
    return { points: pts.length, minDistance, closest, collisions, searchRadius: cell };
}

/**
 * Orthographic view: rotate by yaw about the vertical (y) axis, then by pitch
 * about the screen x axis. Returns screen (x, y) and depth (larger = nearer).
 */
export function project(p, { yaw = 0, pitch = 0 } = {}) {
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const x1 = cy * p.x + sy * p.z;
    const z1 = -sy * p.x + cy * p.z;
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const y2 = cp * p.y - sp * z1;
    const z2 = sp * p.y + cp * z1;
    return { x: x1, y: y2, depth: z2 };
}

/**
 * Turn 3D chords into 2D segments for colourDensity / canvas drawing: each
 * chord is cut into `pieces` sub-segments whose colour is scaled by a depth
 * weight (back = minWeight, front = 1). `scale` maps projected coordinates
 * into the drawing frame; `depthRange` = [far, near].
 */
export function projectChords(chords, view, { pieces = 8, minWeight = 0.2, scale = 1, depthRange = [-1, 1], colour }) {
    const out = [];
    const [far, near] = depthRange;
    for (const ch of chords) {
        const rgb = colour(ch);
        for (let s = 0; s < pieces; s++) {
            const t0 = s / pieces, t1 = (s + 1) / pieces;
            const at = t => ({
                x: ch.from.x + t * (ch.to.x - ch.from.x),
                y: ch.from.y + t * (ch.to.y - ch.from.y),
                z: ch.from.z + t * (ch.to.z - ch.from.z),
            });
            const a = project(at(t0), view), b = project(at(t1), view);
            const dm = (a.depth + b.depth) / 2;
            const w = minWeight + (1 - minWeight) * Math.max(0, Math.min(1, (dm - far) / (near - far)));
            out.push({
                from: { x: a.x * scale, y: a.y * scale }, to: { x: b.x * scale, y: b.y * scale },
                rgb: rgb.map(v => v * w), depth: dm, n: ch.n,
            });
        }
    }
    return out;
}
