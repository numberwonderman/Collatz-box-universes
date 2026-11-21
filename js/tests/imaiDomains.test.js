import { describe, it, expect } from 'vitest';
import {
    tileWindows, dominantFate, extractDomains, summary, blockDomainStats, windowShareTable,
    domainPrediction, fitLine, fitAlpha,
} from '../imaiDomains.js';
import { fateCodes } from '../imaiFateCorrelation.js';
import { windowF, windowBaseline } from '../imaiFateMap.js';

// Synthetic fates by hand (index i <-> n = -(2i + 1)).
// Block 4 = indices [8, 16), block 5 = indices [16, 32); w = 4.
const codes = new Int8Array(32);
codes.set([0, 0, 1, 1, 2, 2, 2, 0], 8);                                    // block 4
codes.set([0, 0, 0, 1, 0, 0, 2, 1, 1, 2, 0, 2, 0, 1, 2, 1], 16);          // block 5
// block 5 windows (w = 4):
//   W0 [16,20): 0 0 0 1 -> shares (.75, .25, 0)   dominated by 0 (tau .5 and .55)
//   W1 [20,24): 0 0 2 1 -> (.5, .25, .25)         dominated by 0 at tau .5 only
//   W2 [24,28): 1 2 0 2 -> (.25, .25, .5)         dominated by 2 at tau .5 only
//   W3 [28,32): 0 1 2 1 -> (.25, .5, .25)         dominated by 1 at tau .5 only
// block 4 windows: [8,12): (.5, .5, 0) ;  [12,16): (.25, 0, .75)

describe('domains: hand-checked synthetic case', () => {
    it('window tiling and dominance', () => {
        const w = tileWindows(codes, 16, 32, 4);
        expect(w.map(x => x.shares)).toEqual([[0.75, 0.25, 0], [0.5, 0.25, 0.25], [0.25, 0.25, 0.5], [0.25, 0.5, 0.25]]);
        expect(w.map(x => dominantFate(x.shares, 0.5))).toEqual([0, 0, 2, 1]);
        expect(w.map(x => dominantFate(x.shares, 0.55))).toEqual([0, -1, -1, -1]);
        expect(tileWindows(codes, 16, 30, 4).length).toBe(3); // a partial tail window is dropped
    });

    it('domain extraction at tau = 0.5: [0 x2] [2] [1]', () => {
        const d = extractDomains(tileWindows(codes, 16, 32, 4), 0.5, 4);
        expect(d).toEqual([
            { fate: 0, firstWindow: 0, windows: 2, length: 8 },
            { fate: 2, firstWindow: 2, windows: 1, length: 4 },
            { fate: 1, firstWindow: 3, windows: 1, length: 4 },
        ]);
    });

    it('blockDomainStats on block 5 (w = 4)', () => {
        const s = blockDomainStats(codes, 5, 4, 0.5);
        expect(s).toMatchObject({ windows: 4, blockSize: 16, domains: 3, fractionInDomains: 1 });
        expect(s.lengths).toEqual({ count: 3, mean: 16 / 3, median: 4, max: 8 });
        expect(s.byFate[0]).toEqual({ count: 1, mean: 8, median: 8, max: 8 });
        const s55 = blockDomainStats(codes, 5, 4, 0.55);
        expect(s55).toMatchObject({ domains: 1, fractionInDomains: 0.25 });
        expect(s55.lengths.max).toBe(4);
    });

    it('domain-only prediction A_dom(1) on block 5 = 6.5 / 16 by hand', () => {
        // pairs (i, i-1), i = 16..31:
        //   i=16 (W0 with block-4 window [12,16)): .75*.25 = .1875
        //   i=17..19 W0.W0 = .625 each; i=20 W1.W0 = .4375; i=21..23 W1.W1 = .375 each
        //   i=24 W2.W1 = .3125; i=25..27 W2.W2 = .375 each; i=28 W3.W2 = .3125; i=29..31 W3.W3 = .375 each
        //   total 6.5 over 16 pairs
        const table = windowShareTable(codes, 4, 5, 4);
        const p = domainPrediction(codes, table, 16, 32, 1);
        expect(p.pairs).toBe(16);
        expect(p.Adom).toBeCloseTo(6.5 / 16, 12);
        // indices below block 4 are not tiled: pairs into them are skipped
        expect(domainPrediction(codes, table, 8, 16, 1).pairs).toBe(7); // i = 8 pairs with 7 (untiled) -> skipped, 7 remain
    });

    it('summary uses the lower median', () => {
        expect(summary([4, 8, 4, 12])).toEqual({ count: 4, mean: 7, median: 4, max: 12 });
        expect(summary([])).toEqual({ count: 0, mean: null, median: null, max: null });
    });

    it('fitAlpha recovers a known power law and skips blocks without domains', () => {
        const pts = [14, 15, 16, 17, 18].map(k => ({ k, size: 2 ** (0.5 * k + 3) }));
        pts.push({ k: 13, size: null });
        const f = fitAlpha(pts);
        expect(f.alpha).toBeCloseTo(0.5, 12);
        expect(f.r2).toBeCloseTo(1, 12);
        expect(f.blocksUsed).toEqual([14, 15, 16, 17, 18]);
        expect(fitLine([1], [2]).slope).toBe(null);
    });
});

describe('domains: real data', () => {
    it('with one window per block the prediction is the block baseline (no domain excess)', () => {
        const { codes: c } = fateCodes({ N: 2 ** 15 - 1 }); // blocks up to B_14
        const table = windowShareTable(c, 13, 14, 8192);    // w = whole block B_14
        const p = domainPrediction(c, table, 2 ** 13, 2 ** 14, 300); // partners all inside B_14
        const base = windowBaseline(c, 2 ** 13, 2 ** 14).baseline;
        expect(p.Adom).toBeCloseTo(base, 12);
        expect(windowF(c, 2 ** 13, 2 ** 14, 1).pairs).toBe(8192);
    });
});
