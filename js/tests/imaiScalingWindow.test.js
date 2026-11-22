import { describe, it, expect } from 'vitest';
import { windowFor, splitAllSettings, residualIncrements, peakBlock } from '../imaiScalingWindow.js';
import { blockSplit } from '../imaiDomainSaturation.js';
import { fateCodes } from '../imaiFateCorrelation.js';

describe('window settings', () => {
    it('fixed 1024; scaling 2^(k-10) (512 windows); half-scaling 2^(k-12) (2048 windows)', () => {
        expect(windowFor('fixed', 26)).toBe(1024);
        expect([19, 20, 26].map(k => windowFor('scaling', k))).toEqual([512, 1024, 65536]);
        expect([19, 22, 26].map(k => windowFor('halfScaling', k))).toEqual([128, 1024, 16384]);
        for (let k = 19; k <= 26; k++) {
            expect(2 ** (k - 1) / windowFor('scaling', k)).toBe(512);
            expect(2 ** (k - 1) / windowFor('halfScaling', k)).toBe(2048);
        }
        expect(() => windowFor('other', 20)).toThrow(RangeError);
    });
});

describe('split across settings (blocks up to B_20)', () => {
    const { codes } = fateCodes({ N: 2 ** 21 - 1 });

    it('F(1) and baseline are identical across settings; components sum', () => {
        for (const k of [18, 19, 20]) {
            const s = splitAllSettings(codes, k);
            expect(s.scaling.F1).toBe(s.fixed.F1);
            expect(s.halfScaling.F1).toBe(s.fixed.F1);
            expect(s.scaling.baseline).toBe(s.fixed.baseline);
            for (const v of Object.values(s)) expect(v.Edom + v.residual).toBeCloseTo(v.E, 14);
        }
    });

    it('at k = 20 the scaling setting is the fixed setting (w = 1024)', () => {
        const s = splitAllSettings(codes, 20);
        expect(s.scaling.w).toBe(1024);
        expect(s.scaling.Edom).toBe(s.fixed.Edom);
        expect(s.scaling.residual).toBe(s.fixed.residual);
        expect(s.fixed.Edom).toBe(blockSplit(codes, 20, 1024).Edom);
    });
});

describe('helpers', () => {
    it('increments and peak', () => {
        const rows = [{ k: 1, residual: 0.1, Edom: 0.01 }, { k: 2, residual: 0.13, Edom: 0.02 }, { k: 3, residual: 0.12, Edom: 0.035 }];
        const inc = residualIncrements(rows);
        expect(inc.map(x => [x.from, x.to])).toEqual([[1, 2], [2, 3]]);
        expect(inc[1].dResidual).toBeCloseTo(-0.01, 14);
        expect(inc[1].dEdom).toBeCloseTo(0.015, 14);
        expect(peakBlock(rows)).toBe(2);
    });
});
