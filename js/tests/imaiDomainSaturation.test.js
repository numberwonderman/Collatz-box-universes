import { describe, it, expect } from 'vitest';
import { blockSplit, increments } from '../imaiDomainSaturation.js';
import { fateCodes } from '../imaiFateCorrelation.js';
import { windowF, windowBaseline, blockRange } from '../imaiFateMap.js';
import { windowShareTable, domainPrediction } from '../imaiDomains.js';

describe('blockSplit matches Build 8 exactly', () => {
    const { codes } = fateCodes({ N: 2 ** 19 - 1 }); // blocks up to B_18

    it('F(1), baseline, A_dom and residual equal windowF + windowShareTable + domainPrediction (r = 1)', () => {
        for (const w of [256, 1024, 4096]) {
            const table = windowShareTable(codes, 12, 18, w);
            for (let k = 14; k <= 18; k++) {
                const s = blockSplit(codes, k, w);
                const { from, to } = blockRange(k);
                const f = windowF(codes, from, to, 1);
                const p = domainPrediction(codes, table, from, to, 1);
                expect(s.pairs).toBe(f.pairs);
                expect(s.F1).toBe(f.F);
                expect(s.baseline).toBeCloseTo(windowBaseline(codes, from, to).baseline, 14);
                expect(s.pairsPred).toBe(p.pairs);
                expect(s.Adom).toBeCloseTo(p.Adom, 14);
            }
        }
    });

    it('components sum: E_dom + residual = E', () => {
        const s = blockSplit(codes, 18);
        expect(s.Edom + s.residual).toBeCloseTo(s.E, 14);
    });
});

describe('hand-checked small case', () => {
    it('block B_3 (indices 4..7) with w = 2 and a hand-made fate array', () => {
        // indices 0..7: fates by hand
        const codes = Int8Array.from([0, 1, 1, 0, 0, 0, 2, 2]);
        // B_3 = indices [4, 8): fates 0 0 2 2; windows (w = 2): [4,6) = (1, 0, 0), [6,8) = (0, 0, 1)
        // B_2 = indices [2, 4): one window [2,4) fates 1 0 = (.5, .5, 0)
        // pairs (i, i-1), i = 4..7: (0,0) s, (0,0) s, (2,0) d, (2,2) s -> F(1) = 3/4
        // A_dom: i=4 with j=3 (B_2 window): (1,0,0).(.5,.5,0) = .5; i=5: W0.W0 = 1; i=6: W1.W0 = 0; i=7: W1.W1 = 1 -> 2.5/4
        // baseline over B_3: shares (.5, 0, .5) -> .5
        const s = blockSplit(codes, 3, 2);
        expect(s).toMatchObject({ pairs: 4, same: 3, pairsPred: 4 });
        expect(s.F1).toBe(0.75);
        expect(s.Adom).toBeCloseTo(0.625, 14);
        expect(s.baseline).toBeCloseTo(0.5, 14);
        expect(s.E).toBeCloseTo(0.25, 14);
        expect(s.Edom).toBeCloseTo(0.125, 14);
        expect(s.residual).toBeCloseTo(0.125, 14);
    });

    it('increments', () => {
        const inc = increments([{ k: 1, E: 0.1, Edom: 0.02, residual: 0.08 }, { k: 2, E: 0.15, Edom: 0.05, residual: 0.1 }]);
        expect(inc[0]).toMatchObject({ from: 1, to: 2 });
        expect(inc[0].dE).toBeCloseTo(0.05, 14);
        expect(inc[0].dEdom).toBeCloseTo(0.03, 14);
        expect(inc[0].dResidual).toBeCloseTo(0.02, 14);
    });
});
