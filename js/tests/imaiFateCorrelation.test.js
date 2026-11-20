import { describe, it, expect } from 'vitest';
import {
    fateLabels, cycleOf, fateShares, fateCorrelation, coSettling, blockFateCorrelation, v2,
    residualByValuation, fateCodes, runLengths, histogramMedian, independentRunModel,
    simulateIndependentRuns, f1Ladder, adjacentAgreement,
} from '../imaiFateCorrelation.js';
import { mulberry32 } from '../eocRealizers.js';
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

describe('fate partition: compact codes and run lengths', () => {
    it('fateCodes gives the same fates as fateLabels (|n| <= 4095)', () => {
        const { codes, keys } = fateCodes({ N: 4095 });
        const { labels } = fateLabels({ N: 4095, m: 3, c: 1 });
        expect(keys).toEqual([-1, -5, -17]);
        expect([...codes].map(c => keys[c])).toEqual(labels);
    });

    it('reproduces the known fate counts at |n| <= 16383', () => {
        const { codes, unsettled } = fateCodes({ N: 16383 });
        const counts = [0, 0, 0];
        for (const c of codes) counts[c]++;
        expect(counts).toEqual([2673, 2667, 2852]);
        expect(unsettled).toEqual({ cap: 0, overflow: 0 });
    });

    it('runLengths on a hand-checked sequence (with an unsettled gap)', () => {
        // runs: [0,0] [1,1,1] [2] [0] | gap | [0,0]
        const r = runLengths(Int8Array.from([0, 0, 1, 1, 1, 2, 0, -1, 0, 0]));
        expect(r.runs).toBe(5);
        expect(Object.fromEntries(r.lengths)).toEqual({ 1: 2, 2: 2, 3: 1 });
        expect(r.mean).toBeCloseTo(9 / 5, 12);
        expect(r.median).toBe(2);
        expect(r).toMatchObject({ max: 3, maxAt: 2, maxCode: 1 });
        expect(Object.fromEntries(r.byCode.get(0))).toEqual({ 1: 1, 2: 2 });
    });

    it('runLengths on real fates n = -1..-9: [-1, -1, -5, -5, -5] is two runs', () => {
        const { codes } = fateCodes({ N: 9 });
        const r = runLengths(codes);
        expect(r.runs).toBe(2);
        expect(Object.fromEntries(r.lengths)).toEqual({ 2: 1, 3: 1 });
        expect(runLengths(codes, 1, 4).runs).toBe(2); // [-1] [-5, -5]
    });

    it('histogramMedian takes the lower median for an even count', () => {
        expect(histogramMedian(new Map([[1, 2], [5, 2]]))).toBe(1);
        expect(histogramMedian(new Map([[1, 1], [2, 1], [7, 1]]))).toBe(2);
    });

    it('independentRunModel: exact values for a fair coin', () => {
        const m = independentRunModel({ 0: 0.5, 1: 0.5 }, 3);
        expect(m.expectedRuns).toBeCloseTo(2, 12);           // 1 + 2 * (1 - 1/2)
        expect(m.pmf(1)).toBeCloseTo(0.5, 12);
        expect(m.pmf(2)).toBeCloseTo(0.25, 12);
        expect(m.median).toBe(1);
        let s = 0;
        for (let L = 1; L < 60; L++) s += m.pmf(L);
        expect(s).toBeCloseTo(1, 12);
    });

    it('simulated independent runs: certain fate is one run; simulation matches the model', () => {
        const one = simulateIndependentRuns({ 0: 1 }, 50, 1, mulberry32(1));
        expect(one[0]).toMatchObject({ runs: 1, max: 50 });
        const shares = { 0: 0.33, 1: 0.32, 2: 0.35 };
        const sims = simulateIndependentRuns(shares, 20000, 5, mulberry32(7));
        const model = independentRunModel(shares, 20000);
        for (const s of sims) expect(Math.abs(s.runs - model.expectedRuns) / model.expectedRuns).toBeLessThan(0.02);
    });
});

describe('F(1) ladder', () => {
    it('reproduces F(1) = 0.4293 at |n| <= 16383 and 0.4696 at |n| <= 262143', () => {
        const { codes } = fateCodes({ N: 262143 });
        const rows = f1Ladder(codes, 14, 18);
        expect(rows.map(r => r.N)).toEqual([16383, 32767, 65535, 131071, 262143]);
        expect(rows[0].prefix.pairs).toBe(8191);
        expect(rows[0].prefix.F).toBeCloseTo(0.4293, 4);
        expect(rows[4].prefix.pairs).toBe(131071);
        expect(rows[4].prefix.F).toBeCloseTo(0.4696, 4);
        expect(rows[1].prefix.delta).toBeCloseTo(rows[1].prefix.F - rows[0].prefix.F, 12);
        // block k = 14 is 8192 <= |n| < 16384 (block 13 in the earlier indexing): F(1) = 0.4374
        expect(rows[0].block).toMatchObject({ from: 8192, to: 16383, pairs: 4095 });
        expect(rows[0].block.F).toBeCloseTo(0.4374, 4);
        expect(f1Ladder(codes, 18, 19).length).toBe(1); // stops at the computed range
    });

    it('adjacentAgreement on a hand-checked sequence', () => {
        const a = adjacentAgreement(Int8Array.from([0, 0, 1, -1, 1, 1]), 0, 6);
        // pairs: (0,0) same, (0,1) diff, (1,-1) skip, (-1,1) skip, (1,1) same
        expect(a).toMatchObject({ pairs: 3, same: 2 });
        expect(a.shares).toEqual([0.4, 0.6, 0]);
    });
});
