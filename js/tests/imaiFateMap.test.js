import { describe, it, expect } from 'vitest';
import {
    windowF, windowBaseline, blockRange, blockWindows, slidingWindows, fateGrid, v2, valuationResiduals,
} from '../imaiFateMap.js';
import { fateCodes, fateCorrelation, fateLabels } from '../imaiFateCorrelation.js';

describe('F_W(r): hand-checked synthetic case', () => {
    // index i <-> n = -(2i + 1); fates by hand (codes 0, 1, 2):
    // i:     0  1  2  3  4  5  6  7  8  9
    // code:  0  0  1  1  1  2  0  0  2  2
    const codes = Int8Array.from([0, 0, 1, 1, 1, 2, 0, 0, 2, 2]);

    it('W = whole array', () => {
        // r = 1: pairs (i, i-1), i = 1..9: (0,0)s (1,0)d (1,1)s (1,1)s (2,1)d (0,2)d (0,0)s (2,0)d (2,2)s -> 5/9
        expect(windowF(codes, 0, 10, 1)).toMatchObject({ pairs: 9, same: 5 });
        // r = 2: i = 2..9 vs i-2: (1,0)d (1,0)d (1,1)s (2,1)d (0,1)d (0,2)d (2,0)d (2,0)d -> 1/8
        expect(windowF(codes, 0, 10, 2)).toMatchObject({ pairs: 8, same: 1 });
        // r = 3: i = 3..9 vs i-3: (1,0)d (1,0)d (2,1)d (0,1)d (0,1)d (2,2)s (2,0)d -> 1/7
        expect(windowF(codes, 0, 10, 3)).toMatchObject({ pairs: 7, same: 1 });
    });

    it('W = indices [5, 10): partners may lie below W but must be in the table', () => {
        // r = 1: i = 5..9: (2,1)d (0,2)d (0,0)s (2,0)d (2,2)s -> 2/5
        expect(windowF(codes, 5, 10, 1)).toMatchObject({ pairs: 5, same: 2 });
        // r = 2: (2,1)d (0,1)d (0,2)d (2,0)d (2,0)d -> 0/5
        expect(windowF(codes, 5, 10, 2)).toMatchObject({ pairs: 5, same: 0, F: 0 });
        // r = 3: (2,0)d (0,1)d (0,1)d (2,1)d (2,2)s -> 1/5
        expect(windowF(codes, 5, 10, 3)).toMatchObject({ pairs: 5, same: 1 });
        // W = [0, 3), r = 3: no partner in the table
        expect(windowF(codes, 0, 3, 3)).toMatchObject({ pairs: 0, F: null });
    });

    it('baseline and excess for W = [5, 10)', () => {
        const b = windowBaseline(codes, 5, 10);
        expect(b.counts).toEqual([2, 0, 3]);
        expect(b.baseline).toBeCloseTo(0.4 ** 2 + 0.6 ** 2, 12);
        const [row] = fateGrid(codes, [{ from: 5, to: 10 }], 3);
        expect([...row.F]).toEqual([0.4, 0, 0.2]);
        expect(row.excess[0]).toBeCloseTo(0.4 - 0.52, 12);
        expect([...row.pairs]).toEqual([5, 5, 5]);
    });

    it('skips pairs with an unsettled member', () => {
        expect(windowF(Int8Array.from([0, -1, 0, 0]), 0, 4, 1)).toMatchObject({ pairs: 1, same: 1 });
    });
});

describe('windows', () => {
    it('blockRange covers odd n with 2^k <= |n| < 2^(k+1)', () => {
        const { from, to } = blockRange(10);
        expect(-(2 * from + 1)).toBe(-1025);
        expect(-(2 * (to - 1) + 1)).toBe(-2047);
        expect(to - from).toBe(512);
    });

    it('blockWindows stops at the last complete block', () => {
        const b = blockWindows(10, 2 ** 21); // table |n| <= 2^22 - 1
        expect(b.map(x => x.k)).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]);
        expect(b.at(-1)).toMatchObject({ nFrom: -2097153, nTo: -4194303 });
    });

    it('slidingWindows: 16,384 wide, stride 4,096, from |n| = 2^13 in a 2^22 table', () => {
        const w = slidingWindows(4096, 16384, 4096, 2 ** 21);
        expect(w.length).toBe(508);
        expect(w[0]).toMatchObject({ nFrom: -8193, nTo: -40959 });
        expect(w.at(-1).to).toBe(2 ** 21);
    });
});

describe('agreement with the earlier studies', () => {
    it('global W = |n| <= 16,383 reproduces fateCorrelation exactly (F(1) = 0.4293, 8191 pairs)', () => {
        const { codes } = fateCodes({ N: 16383 });
        const { labels } = fateLabels({ N: 16383, m: 3, c: 1, maxSteps: 2000 });
        const ref = fateCorrelation(labels, 128);
        const [row] = fateGrid(codes, [{ from: 0, to: 8192 }], 128);
        expect(row.pairs[0]).toBe(8191);
        expect(row.F[0]).toBeCloseTo(0.4293, 4);
        for (let r = 1; r <= 128; r++) {
            expect(row.pairs[r - 1]).toBe(ref[r - 1].pairs);
            expect(row.F[r - 1]).toBe(ref[r - 1].F);
        }
    });

    it('v2 and valuationResiduals on a bump at r = 4', () => {
        expect([1, 2, 4, 6, 64].map(v2)).toEqual([0, 1, 2, 1, 6]);
        const ex = Float64Array.from({ length: 8 }, (_, i) => (i + 1 === 4 ? 0.3 : 0.1));
        expect(valuationResiduals(ex).find(x => x.v2 === 2)).toMatchObject({ count: 1 });
        expect(valuationResiduals(ex).find(x => x.v2 === 2).meanResidual).toBeCloseTo(0.2, 12);
    });
});
