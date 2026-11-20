import { describe, it, expect } from 'vitest';
import {
    fateLabels, cycleOf, fateShares, fateCorrelation, coSettling, blockFateCorrelation, v2,
    residualByValuation,
} from '../imaiFateCorrelation.js';
import { trajectoryFate } from '../imaiFractalProbe.js';

describe('fate lookup', () => {
    it('labels the negative odd n down to -9 by hand-checked 3n+1 orbits', () => {
        // -1 -> -2 -> -1;  -3 -> -8 -> -4 -> -2 -> -1;  -5 is on the 5-cycle;
        // -7 -> -20 -> -10 -> -5;  -9 -> -26 -> -13 -> -38 -> -19 -> -56 -> -28 -> -14 -> -7 -> ... -5
        const { ns, labels, unsettled } = fateLabels({ N: 9, m: 3, c: 1 });
        expect(ns).toEqual([-1, -3, -5, -7, -9]);
        expect(labels).toEqual([-1, -1, -5, -5, -5]);
        expect(unsettled).toEqual({ cap: 0, overflow: 0 });
    });

    it('never assigns a fate to an orbit that hits the cap or overflows', () => {
        const capped = fateLabels({ N: 27, m: 3, c: 1, maxSteps: 20, sign: 1 });
        expect(capped.labels[13]).toBe(null); // n = 27 needs 111 steps
        expect(capped.unsettled.cap).toBeGreaterThan(0);
        // 7n+1: 1 -> 8 -> 4 -> 2 -> 1 and 5 -> 36 -> 18 -> 9 -> 64 -> ... -> 1 settle; 3 and 7 overflow
        const diverging = fateLabels({ N: 7, m: 7, c: 1, sign: 1 });
        expect(diverging.labels).toEqual([1, null, 1, null]);
        expect(diverging.unsettled).toEqual({ cap: 0, overflow: 2 });
        expect(trajectoryFate(7, { m: 7, c: 1 })).toMatchObject({ fate: 'unsettled', reason: 'overflow' });
        expect(trajectoryFate(27, { m: 3, c: 1, maxSteps: 20 })).toMatchObject({ fate: 'unsettled', reason: 'cap' });
    });
});

describe('cycle detection', () => {
    it('recovers the known 3n+1 cycles', () => {
        expect(cycleOf(-1)).toEqual([-1, -2]);
        expect(cycleOf(-5)).toEqual([-5, -14, -7, -20, -10]);
        const c17 = cycleOf(-17);
        expect(c17.length).toBe(18);
        expect(c17).toContain(-272);
        expect(cycleOf(1)).toEqual([1, 4, 2]);
    });

    it('recovers the 5n+1 cycles through 13 and 17', () => {
        expect(cycleOf(13, 5, 1)).toEqual([13, 66, 33, 166, 83, 416, 208, 104, 52, 26]);
        expect(cycleOf(17, 5, 1)).toEqual([17, 86, 43, 216, 108, 54, 27, 136, 68, 34]);
        expect(cycleOf(-1, 5, 1)).toEqual([-1, -4, -2]);
    });

    it('trajectoryFate keys a whole cycle by its least-|.| element', () => {
        for (const v of cycleOf(-17)) expect(trajectoryFate(v).key).toBe(-17);
        for (const v of cycleOf(13, 5, 1)) expect(trajectoryFate(v, { m: 5, c: 1 }).key).toBe(13);
    });
});

describe('F(r)', () => {
    it('hand-checked synthetic labels', () => {
        const L = ['A', 'A', 'B', 'A', null, 'B'];
        const rows = fateCorrelation(L, 3);
        // r = 1: (A,A) same, (A,B) diff, (B,A) diff, (A,null) skip, (null,B) skip -> 1/3
        expect(rows[0]).toMatchObject({ r: 1, pairs: 3, same: 1 });
        expect(rows[0].F).toBeCloseTo(1 / 3, 12);
        // r = 2: (A,B) diff, (A,A) same, (B,null) skip, (A,B) diff -> 1/3
        expect(rows[1]).toMatchObject({ r: 2, pairs: 3, same: 1 });
        // r = 3: (A,A) same, (A,null) skip, (B,B) same -> 2/2
        expect(rows[2]).toMatchObject({ r: 3, pairs: 2, same: 2, F: 1 });
    });

    it('hand-checked real fates: n = -1..-9 under 3n+1', () => {
        // labels [-1, -1, -5, -5, -5]: pairs (-1,-3) same, (-3,-5) diff, (-5,-7) same, (-7,-9) same
        const { labels } = fateLabels({ N: 9, m: 3, c: 1 });
        const [r1, r2] = fateCorrelation(labels, 2);
        expect(r1).toMatchObject({ pairs: 4, same: 3, F: 0.75 });
        // r = 2: (-1,-5) diff, (-3,-7) diff, (-5,-9) same -> 1/3
        expect(r2).toMatchObject({ pairs: 3, same: 1 });
    });

    it('constant labels give F = 1; alternating labels give F(1) = 0, F(2) = 1', () => {
        expect(fateCorrelation([1, 1, 1, 1], 2).map(x => x.F)).toEqual([1, 1]);
        expect(fateCorrelation([1, 2, 1, 2, 1, 2], 2).map(x => x.F)).toEqual([0, 1]);
    });

    it('reproduces the fractal probe: F(1) = 0.43 for negative odd |n| <= 16383, cap 2000', () => {
        const { labels, unsettled } = fateLabels({ N: 16383, m: 3, c: 1, maxSteps: 2000 });
        expect(unsettled).toEqual({ cap: 0, overflow: 0 });
        const [r1] = fateCorrelation(labels, 1);
        expect(r1.pairs).toBe(8191);
        expect(r1.F).toBeCloseTo(0.4293, 3);
    });

    it('fateShares gives the shares and sum of squares among settled labels', () => {
        const s = fateShares(['A', 'A', 'B', null]);
        expect(s.settled).toBe(3);
        expect(s.unsettled).toBe(1);
        expect(s.shares.A).toBeCloseTo(2 / 3, 12);
        expect(s.sumSquares).toBeCloseTo(4 / 9 + 1 / 9, 12);
    });
});

describe('co-settling, blocks, valuation', () => {
    it('coSettling counts pairs whose first member settled', () => {
        const rows = coSettling([1, null, 1, 1, null], 1);
        // i=0 settled, next null; i=2 settled, next settled; i=3 settled, next null -> 1/3
        expect(rows[0]).toMatchObject({ settledPairs: 3, both: 1 });
    });

    it('blockFateCorrelation restricts to one dyadic block', () => {
        // labels for |n| = 1, 3, 5, 7, 9, 11, 13, 15 (index (|n|-1)/2)
        const L = ['x', 'x', 'a', 'a', 'b', 'b', 'b', 'c'];
        // block 3 = [8, 16): odd 9, 11, 13, 15 -> b, b, b, c; r = 1 pairs (9,11),(11,13),(13,15)
        expect(blockFateCorrelation(L, 3, 1)).toMatchObject({ pairs: 3, F: 2 / 3 });
        // block 2 = [4, 8): odd 5, 7 -> a, a
        expect(blockFateCorrelation(L, 2, 1)).toMatchObject({ pairs: 1, F: 1 });
    });

    it('v2 and residualByValuation', () => {
        expect([1, 2, 3, 4, 12, 64].map(v2)).toEqual([0, 1, 0, 2, 2, 6]);
        // flat F with a bump at r = 4 only
        const rows = Array.from({ length: 8 }, (_, i) => ({ r: i + 1, F: i + 1 === 4 ? 0.5 : 0.3 }));
        const res = residualByValuation(rows);
        const g2 = res.find(x => x.v2 === 2);
        expect(g2.count).toBe(1);
        expect(g2.meanResidual).toBeCloseTo(0.2, 12);
    });
});
