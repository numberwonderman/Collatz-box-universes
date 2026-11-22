import { describe, it, expect } from 'vitest';
import { v2, perRDecomposition, groupByV2, detrend } from '../imaiModulationSplit.js';
import { fateCodes } from '../imaiFateCorrelation.js';
import { windowShareTable, domainPrediction } from '../imaiDomains.js';
import { windowF, windowBaseline, blockRange } from '../imaiFateMap.js';

describe('grouping and detrending on hand-made rows', () => {
    // r = 1..8; E = 0.1 everywhere except a bump of 0.2 at r = 4; Edom flat 0.03
    const rows = Array.from({ length: 8 }, (_, i) => {
        const r = i + 1, E = r === 4 ? 0.3 : 0.1;
        return { r, v2: v2(r), E, Edom: 0.03, residual: E - 0.03 };
    });

    it('v2 groups and their means', () => {
        const g = groupByV2(rows);
        expect(g.map(x => [x.v2, x.n])).toEqual([[0, 4], [1, 2], [2, 1], [3, 1]]);
        const g2 = g.find(x => x.v2 === 2);
        expect(g2.E).toBeCloseTo(0.3, 12);
        expect(g2.Edom).toBeCloseTo(0.03, 12);
        expect(g2.shareRes).toBeCloseTo(0.9, 12);
        for (const x of g) expect(x.Edom + x.residual).toBeCloseTo(x.E, 12);
    });

    it('detrending puts the bump in the residual and leaves the flat domain part at 0', () => {
        const d = detrend(rows);
        expect(d.map(x => x.r)).toEqual([3, 4, 5, 6]);
        const at4 = d.find(x => x.r === 4);
        expect(at4.E).toBeCloseTo(0.2, 12);        // 0.3 - mean(0.1 x 4)
        expect(at4.Edom).toBeCloseTo(0, 12);
        expect(at4.residual).toBeCloseTo(0.2, 12);
        expect(d.find(x => x.r === 3).E).toBeCloseTo(0.1 - (0.1 + 0.1 + 0.3 + 0.1) / 4, 12);
    });

    it('v2 values', () => {
        expect([1, 2, 3, 4, 8, 12, 64, 96, 128].map(v2)).toEqual([0, 1, 0, 2, 3, 2, 6, 5, 7]);
    });
});

describe('per-r decomposition equals Build 8 functions', () => {
    it('B_16, r = 1..16: E, E_dom and residual from windowF and domainPrediction', () => {
        const { codes } = fateCodes({ N: 2 ** 17 - 1 });
        const d = perRDecomposition(codes, 16, 16, 1024);
        const { from, to } = blockRange(16);
        const table = windowShareTable(codes, 15, 16, 1024);
        const base = windowBaseline(codes, from, to).baseline;
        for (const x of d.rows) {
            expect(x.E).toBe(windowF(codes, from, to, x.r).F - base);
            expect(x.Edom).toBeCloseTo(domainPrediction(codes, table, from, to, x.r).Adom - base, 14);
            expect(x.Edom + x.residual).toBeCloseTo(x.E, 14);
        }
    });
});

describe('the domain component is linear in r by construction (2r < w)', () => {
    it('second differences of E_dom over r = 1..64 vanish (B_16, w = 1024), so it cannot vary with v2(r)', () => {
        const { codes } = fateCodes({ N: 2 ** 17 - 1 });
        const d = perRDecomposition(codes, 16, 64, 1024);
        for (let i = 1; i < d.rows.length - 1; i++) {
            const second = d.rows[i + 1].Edom - 2 * d.rows[i].Edom + d.rows[i - 1].Edom;
            expect(Math.abs(second)).toBeLessThan(1e-12);
        }
        for (const x of detrend(d.rows)) expect(Math.abs(x.Edom)).toBeLessThan(1e-12);
    });
});
