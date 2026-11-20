import { describe, it, expect } from 'vitest';
import {
    cylinderHeight, cylinderPoint, unrolledPoint, sphereLatitude, spherePoint, topBlock,
    geometryChords, heightChangeTable, distinctness, project, projectChords,
} from '../imaiGeometries.js';
import { theta, dyadicLevel } from '../imaiDyadicCircle.js';

const PI = Math.PI;

describe('cylinder', () => {
    it('reuses theta(n) for the angle and sign(n) k(|n|) for the height', () => {
        for (const n of [1, 3, 5, 7, 12, 1023, -1, -6, -1024]) {
            const p = cylinderPoint(n);
            expect(p.theta).toBe(theta(n));
            expect(p.x).toBeCloseTo(Math.cos(theta(n)), 14);
            expect(p.z).toBeCloseTo(Math.sin(theta(n)), 14);
            expect(p.y).toBe(Math.sign(n) * dyadicLevel(Math.abs(n)));
        }
        expect(cylinderHeight(1)).toBe(0);
        expect(cylinderHeight(-1)).toBe(-0);
    });

    it('doubling is a pure vertical step: same angle, height +1 (n > 0) or -1 (n < 0)', () => {
        for (let n = 1; n <= 2048; n++) {
            const a = cylinderPoint(n), b = cylinderPoint(2 * n);
            expect(b.theta).toBe(a.theta);
            expect(b.x).toBe(a.x);
            expect(b.z).toBe(a.z);
            expect(b.h - a.h).toBe(1);
            expect(cylinderPoint(-2 * n).h - cylinderPoint(-n).h).toBe(-1);
        }
    });

    it('C(-n) is C(n) turned by pi about the vertical axis with height negated (= -C(n))', () => {
        for (let n = 1; n <= 4096; n++) {
            const p = cylinderPoint(n), q = cylinderPoint(-n);
            // rotation by pi about y: (x, z) -> (-x, -z)
            expect(q.x).toBeCloseTo(-p.x, 12);
            expect(q.z).toBeCloseTo(-p.z, 12);
            expect(q.y).toBe(-p.y);
        }
    });

    it('unrolled: positives in u < 1/2 at h >= 0, negatives in u >= 1/2 at h <= 0', () => {
        for (let n = 1; n <= 1023; n++) {
            const p = unrolledPoint(n), q = unrolledPoint(-n);
            expect(p.u).toBeGreaterThanOrEqual(0);
            expect(p.u).toBeLessThan(0.5);
            expect(q.u).toBeGreaterThanOrEqual(0.5);
            expect(q.u).toBeLessThan(1);
            expect(p.h).toBeGreaterThanOrEqual(0);
            expect(q.h).toBeLessThanOrEqual(0);
            expect(q.u - p.u).toBeCloseTo(0.5, 14);
        }
    });

    it('height changes for m = 3 over |n| <= 4095: even steps exactly -/+1, odd steps +/-1 or +/-2', () => {
        for (const c of [0, 1]) {
            const t = heightChangeTable({ N: 4095, m: 3, c });
            expect(t.even.pos.dh).toEqual({ '-1': 2047 });
            expect(t.even.neg.dh).toEqual({ 1: 2047 });
            expect(t.even.pos.outOfRange + t.even.neg.outOfRange).toBe(0);
            expect(Object.keys(t.odd.pos.dh).sort()).toEqual(['1', '2']);
            expect(Object.keys(t.odd.neg.dh).sort()).toEqual(['-1', '-2']);
            expect(t.odd.neg.dh).toEqual({ '-1': 683, '-2': 1365 });
        }
        // c = 0: dh = +1 exactly when x = n/2^k - 1 < 1/3; c = 1 adds n = (4^i - 1)/3, where 3n + 1 = 4^i
        expect(heightChangeTable({ N: 4095, m: 3, c: 0 }).odd.pos.dh).toEqual({ 1: 683, 2: 1365 });
        expect(heightChangeTable({ N: 4095, m: 3, c: 1 }).odd.pos.dh).toEqual({ 1: 677, 2: 1371 });
    });

    it('the six extra +2 steps for c = 1 are exactly n = 1, 5, 21, 85, 341, 1365', () => {
        const extra = [];
        for (let n = 1; n <= 4095; n += 2) {
            const d0 = cylinderHeight(3 * n) - cylinderHeight(n);
            const d1 = cylinderHeight(3 * n + 1) - cylinderHeight(n);
            if (d1 !== d0) extra.push(n);
        }
        expect(extra).toEqual([1, 5, 21, 85, 341, 1365]);
    });

    it('no two integers share a point on the cylinder for |n| <= 4095', () => {
        const r = distinctness({ N: 4095, geometry: 'cylinder' });
        expect(r.points).toBe(8190);
        expect(r.collisions).toEqual([]);
        expect(r.minDistance).toBeGreaterThan(1e-3);
    });
});

describe('sphere', () => {
    it('latitude bands descend from near the north pole and stay north of the equator for k <= K', () => {
        const K = 9;
        for (let k = 0; k <= K; k++) {
            expect(sphereLatitude(k, K)).toBeLessThan(PI / 2);
            expect(sphereLatitude(k, K)).toBeGreaterThan(0);
        }
        expect(sphereLatitude(K + 1, K)).toBeCloseTo(0, 14);   // one block above K: the equator
        expect(sphereLatitude(K + 2, K)).toBeLessThan(0);      // two above: southern hemisphere
    });

    it('|S(n)| = 1 and S(-n) = -S(n) exactly, for 1 <= |n| <= 4096', () => {
        const K = topBlock(4096);
        for (let n = 1; n <= 4096; n++) {
            const p = spherePoint(n, K), q = spherePoint(-n, K);
            expect(Math.hypot(p.x, p.y, p.z)).toBeCloseTo(1, 14);
            expect(Math.hypot(q.x, q.y, q.z)).toBeCloseTo(1, 14);
            expect(q.x).toBe(-p.x);
            expect(q.y).toBe(-p.y);
            expect(q.z).toBe(-p.z);
        }
    });

    it('positives have longitude theta(n) in [0, pi); negatives sit at longitude + pi', () => {
        const K = 10;
        for (let n = 1; n <= 2047; n++) {
            const p = spherePoint(n, K);
            expect(p.lon).toBe(theta(n));
            expect(p.lon).toBeLessThan(PI);
            expect(spherePoint(-n, K).lon).toBeCloseTo(theta(n) + PI, 14);
        }
    });

    it('doubling keeps longitude and moves exactly one band toward the equator', () => {
        const K = 11;
        const band = PI / (2 * (K + 2));
        for (let n = 1; n <= 2047; n++) {
            const a = spherePoint(n, K), b = spherePoint(2 * n, K);
            expect(b.lon).toBe(a.lon);
            expect(a.lat - b.lat).toBeCloseTo(band, 14);
            const qa = spherePoint(-n, K), qb = spherePoint(-2 * n, K);
            expect(qb.lat - qa.lat).toBeCloseTo(band, 14); // southern side: also toward the equator
        }
    });

    it('distinctness: no two integers share a point for 1 <= |n| <= 4095', () => {
        const r = distinctness({ N: 4095, geometry: 'sphere' });
        expect(r.points).toBe(8190);
        expect(r.collisions).toEqual([]);
        expect(r.minDistance).toBeGreaterThan(1e-3);
        expect(r.minDistance).toBeLessThan(r.searchRadius); // the hash search radius covers the minimum
    });

    it('distinctness by construction: (block, odd part) determines n', () => {
        const seen = new Map();
        for (let n = 1; n <= 4095; n++) {
            let o = n;
            while (o % 2 === 0) o /= 2;
            const key = `${dyadicLevel(n)}:${o}`;
            expect(seen.has(key)).toBe(false);
            seen.set(key, n);
        }
    });

    it('with K = top rendered block, out-of-range images land on or below the equator', () => {
        const ch = geometryChords({ N: 1023, m: 3, c: 1, geometry: 'sphere' });
        const posOut = ch.filter(x => x.sign > 0 && !x.inRange);
        expect(posOut.length).toBe(342);
        expect(posOut.every(x => x.to.lat <= 1e-12)).toBe(true);
        expect(ch.filter(x => x.sign > 0 && x.inRange).every(x => x.to.lat > 0)).toBe(true);
    });
});

describe('chords and projection', () => {
    it('geometryChords keeps even steps (non-degenerate) and flags images out of range', () => {
        const ch = geometryChords({ N: 15, m: 3, c: 1, geometry: 'cylinder' });
        expect(ch.length).toBe(30);
        const c8 = ch.find(x => x.n === 8);
        expect(c8.t).toBe(4);
        expect(c8.from.y - c8.to.y).toBe(1);
        expect(c8.from.x).toBe(c8.to.x);
        expect(ch.find(x => x.n === 7).inRange).toBe(false); // 22 > 15
    });

    it('project: yaw pi turns front to back and mirrors x', () => {
        const p = { x: 0.3, y: 0.4, z: 0.5 };
        const f = project(p), b = project(p, { yaw: PI });
        expect(b.x).toBeCloseTo(-f.x, 14);
        expect(b.y).toBeCloseTo(f.y, 14);
        expect(b.depth).toBeCloseTo(-f.depth, 14);
        const q = project({ x: 0, y: 1, z: 0 }, { pitch: PI / 2 });
        expect(q.y).toBeCloseTo(0, 14);
        expect(q.depth).toBeCloseTo(1, 14);
    });

    it('projectChords splits each chord and dims the far side', () => {
        const ch = [{ n: 1, from: { x: 0, y: 0, z: -1 }, to: { x: 0, y: 0, z: 1 } }];
        const segs = projectChords(ch, {}, { pieces: 4, minWeight: 0.2, colour: () => [1, 1, 1] });
        expect(segs.length).toBe(4);
        expect(segs[0].rgb[0]).toBeLessThan(segs[3].rgb[0]);
        expect(segs[3].rgb[0]).toBeLessThanOrEqual(1);
        expect(segs[0].rgb[0]).toBeGreaterThanOrEqual(0.2);
    });
});
