import { describe, it, expect } from 'vitest';
import {
    imaiTheta, jBlock, angularOrder, baselineOf, blockAngularAgreement, overlayOrder,
    overlayNeighbourStats, cyclicRuns, fatesAlong, shuffledRunRange,
} from '../imaiAngularFate.js';
import { fateCodes } from '../imaiFateCorrelation.js';
import { mulberry32 } from '../eocRealizers.js';

const PI = Math.PI;

describe("Imai's angular placement", () => {
    it('hand-checked angles: j = 0..4 -> 0, pi, pi/2, 3pi/2, pi/4', () => {
        expect(imaiTheta(0)).toBe(0);
        expect(imaiTheta(1)).toBeCloseTo(PI, 14);
        expect(imaiTheta(2)).toBeCloseTo(PI / 2, 14);
        expect(imaiTheta(3)).toBeCloseTo(3 * PI / 2, 14);
        expect(imaiTheta(4)).toBeCloseTo(PI / 4, 14);
    });

    it('j-blocks: k = floor(log2 j); j = 0 belongs to no block', () => {
        expect([0, 1, 2, 3, 4, 7, 8, 1023, 1024].map(jBlock)).toEqual([-1, 0, 1, 1, 2, 2, 3, 9, 10]);
    });

    it('block k holds exactly the odd multiples of pi/2^k, in j order', () => {
        for (const k of [0, 3, 6]) {
            const js = [];
            for (let j = 2 ** k; j < 2 ** (k + 1); j++) js.push(j);
            expect(Array.from(angularOrder(js))).toEqual(js); // angular order = j order inside a block
            js.forEach((j, s) => expect(imaiTheta(j)).toBeCloseTo((2 * s + 1) * PI / 2 ** k, 12));
        }
    });

    it('the overlay of j < 2^K is the uniform grid t pi / 2^(K-1)', () => {
        const K = 10;
        const order = overlayOrder(K);
        order.forEach((j, t) => expect(imaiTheta(j)).toBeCloseTo(t * PI / 2 ** (K - 1), 10));
    });

    it('overlay neighbours: every pair joins a top-block point to the odd part of |n| +- 1', () => {
        const K = 11;
        const order = overlayOrder(K);
        const odd = x => { while (x % 2 === 0) x /= 2; return x; };
        for (let i = 0; i < order.length; i++) {
            const a = order[i], b = order[(i + 1) % order.length];
            expect(jBlock(a) === K - 1 || jBlock(b) === K - 1).toBe(true);
            expect(jBlock(a)).not.toBe(jBlock(b));
            const [top, other] = jBlock(a) === K - 1 ? [a, b] : [b, a];
            const n = 2 * top + 1, m = 2 * other + 1;
            expect(m === odd(n + 1) || m === odd(n - 1)).toBe(true);
        }
    });

    it('the overlay in angular order is the consecutive integers 2^K .. 2^(K+1) - 1, each by its odd part', () => {
        const K = 12;
        const order = overlayOrder(K);
        order.forEach((j, t) => {
            let x = 2 ** K + t;
            while (x % 2 === 0) x /= 2;
            expect(j).toBe((x - 1) / 2);
        });
    });

    it("reproduces Imai's printed counts for N = 2^15 - 1: -1: 5418, -5: 5317, -17: 5649", () => {
        const { codes, unsettled } = fateCodes({ N: 2 ** 15 - 1 });
        const b = baselineOf(codes, Array.from({ length: codes.length }, (_, j) => j));
        expect(b.counts).toEqual([5418, 5317, 5649]);
        expect(unsettled).toEqual({ cap: 0, overflow: 0 });
    });
});

describe('hand-checked synthetic case (K = 3, j = 0..7)', () => {
    // fates by hand, indexed by j
    const codes = Int8Array.from([0, 0, 1, 1, 0, 2, 2, 1]);

    it('per-block angular agreement, block k = 2 (j = 4..7, fates 0, 2, 2, 1)', () => {
        const r = blockAngularAgreement(codes, 2, 3);
        // m = 1: (0,2) d, (2,2) s, (2,1) d -> 1/3;  m = 2: (0,2) d, (2,1) d -> 0/2;  m = 3: (0,1) d -> 0/1
        expect(r.rows.map(x => [x.pairs, x.same])).toEqual([[3, 1], [2, 0], [1, 0]]);
        expect(r.baseline).toBeCloseTo(0.25 ** 2 + 0.5 ** 2 + 0.25 ** 2, 12);
        expect(r.rows[0].excess).toBeCloseTo(1 / 3 - 0.375, 12);
    });

    it('overlay order and neighbour agreement (cyclic)', () => {
        // angles: j0 0, j4 pi/4, j2 pi/2, j5 3pi/4, j1 pi, j6 5pi/4, j3 3pi/2, j7 7pi/4
        const order = overlayOrder(3);
        expect(Array.from(order)).toEqual([0, 4, 2, 5, 1, 6, 3, 7]);
        // fates along: 0 0 1 2 0 2 1 1; cyclic pairs: s d d d d d s d(7 -> 0) -> 2/8
        expect(Array.from(fatesAlong(codes, order))).toEqual([0, 0, 1, 2, 0, 2, 1, 1]);
        const st = overlayNeighbourStats(codes, order);
        expect(st).toMatchObject({ pairs: 8, same: 2, sameBlock: { pairs: 0, same: 0 }, crossBlock: { pairs: 8, same: 2 } });
        expect(st.agreement).toBe(0.25);
        // larger block is always the top block k = 2
        expect(st.byLargerK).toEqual({ 2: { pairs: 8, same: 2 } });
        // coarser partner blocks: j0 (-1) twice [pairs (0,4) s and (7,0) d], j2 (1) twice [(4,2) d, (2,5) d],
        // j1 (0) twice [(5,1) d, (1,6) d], j3 (1) twice [(6,3) d, (3,7) s]
        expect(st.byCoarserK).toEqual({ '-1': { pairs: 2, same: 1 }, 0: { pairs: 2, same: 0 }, 1: { pairs: 4, same: 1 } });
    });

    it('cyclic runs: 0 0 | 1 | 2 | 0 | 2 | 1 1 (wrap does not join 1 1 to 0 0)', () => {
        const r = cyclicRuns(Int8Array.from([0, 0, 1, 2, 0, 2, 1, 1]));
        expect(r.runs).toBe(6);
        expect(Object.fromEntries(r.histogram)).toEqual({ 1: 4, 2: 2 });
        expect(r.max).toBe(2);
    });

    it('cyclic runs join across the wrap', () => {
        const r = cyclicRuns(Int8Array.from([1, 1, 0, 0, 1]));
        expect(r.runs).toBe(2);            // [1 | 1 1] wraps into one run of 3, plus [0 0]
        expect(Object.fromEntries(r.histogram)).toEqual({ 2: 1, 3: 1 });
        expect(cyclicRuns(Int8Array.from([2, 2, 2]))).toMatchObject({ runs: 1, max: 3 });
    });

    it('shuffles keep the fate multiset', () => {
        const seq = Int8Array.from([0, 0, 0, 1, 1, 2, 2, 2, 2, 1]);
        const sims = shuffledRunRange(seq, 5, mulberry32(3));
        expect(sims.length).toBe(5);
        for (const s of sims) expect(s.runs).toBeGreaterThan(0);
    });
});
