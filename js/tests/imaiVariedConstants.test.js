import { describe, it, expect } from 'vitest';
import {
    stepC, canonicalCycle, classify, orbitUntilRepeat, classifyRange, f1AndBaseline, cycleSetKey, STEP_CAP, MAG_CAP,
} from '../imaiVariedConstants.js';

describe('hand-checked orbits', () => {
    it('-1 under T_{+3}: -1 -> 3(-1) + 3 = 0 -> 0 (the fixed point [0])', () => {
        expect(orbitUntilRepeat(-1, 3)).toEqual([-1, 0, 0]);
        expect(classify(-1, 3)).toMatchObject({ status: 'cycle', key: 0, cycle: [0] });
    });

    it('-1 under T_{-3}: -1 -> -6 -> -3 -> -12 -> -6 (cycle -3, -12, -6)', () => {
        // -1 odd: 3(-1) - 3 = -6; -6 even: -3; -3 odd: -9 - 3 = -12; -12 even: -6 (repeat)
        expect(orbitUntilRepeat(-1, -3)).toEqual([-1, -6, -3, -12, -6]);
        expect(classify(-1, -3)).toMatchObject({ status: 'cycle', key: -3, cycle: [-3, -12, -6] });
    });

    it('stepC and canonical cycles', () => {
        expect([stepC(-7, 1), stepC(-7, 5), stepC(-10, 5)]).toEqual([-20, -16, -5]);
        expect(canonicalCycle([-14, -7, -20, -10, -5])).toEqual([-5, -14, -7, -20, -10]);
        expect(canonicalCycle([3, -3, 9])).toEqual([-3, 9, 3]); // tie between 3 and -3: the negative one
    });
});

describe('caps are reported, never dropped', () => {
    it('step cap -> unsettled, magnitude cap -> escaped', () => {
        expect(classify(-27, 1, { stepCap: 5 })).toMatchObject({ status: 'unsettled' });
        expect(classify(-27, 1, { magCap: 50 })).toMatchObject({ status: 'escaped' });
        const r = classifyRange(1, 63, -1, { stepCap: 5 });
        expect(r.unsettled).toBeGreaterThan(0);
        expect(r.codes.filter(x => x === -1).length).toBe(r.unsettled);
        expect([STEP_CAP, MAG_CAP]).toEqual([10000, 2 ** 40]);
    });
});

describe('sanity: c = +1 reproduces the known partition', () => {
    it('|n| <= 16,383: -1: 2673, -5: 2667, -17: 2852; F(1) = 0.4293 over 8,191 pairs', () => {
        const r = classifyRange(1, 16383);
        expect(Object.fromEntries(r.cycles.map(x => [x.key, x.count]))).toEqual({ [-1]: 2673, [-5]: 2667, [-17]: 2852 });
        expect(r.unsettled + r.escaped).toBe(0);
        const f = f1AndBaseline(r);
        expect(f.pairs).toBe(8191);
        expect(f.F1).toBeCloseTo(0.4293, 4);
        expect(r.cycles.find(x => x.key === -17).cycle.length).toBe(18);
    });
});

describe('mirror identity T_{-c}(-n) = -T_c(n), in the data', () => {
    it('negatives under T_c and positives under T_{-c}: same cycles negated, same fate for every n', () => {
        for (const c of [-5, -3, -1, 1, 3, 5]) {
            const neg = classifyRange(c, 2047, -1);
            const pos = classifyRange(-c, 2047, 1);
            expect(neg.cycles.map(x => cycleSetKey(x.cycle.map(v => -v))).sort()).toEqual(pos.cycles.map(x => cycleSetKey(x.cycle)).sort());
            for (let i = 0; i < neg.codes.length; i++) {
                expect(cycleSetKey(neg.cycles[neg.codes[i]].cycle.map(v => -v))).toBe(cycleSetKey(pos.cycles[pos.codes[i]].cycle));
            }
        }
    });
});

describe('arithmetic structure', () => {
    it('c = +-5: multiples of 5 never enter or leave their class; on it the map is 5 x T_{+-1}', () => {
        for (const c of [5, -5]) {
            for (const n of [-15, -35, -95]) {
                for (const v of orbitUntilRepeat(n, c)) expect(Math.abs(v % 5)).toBe(0);
                expect(classify(n, c).cycle.map(v => v / 5).sort()).toEqual(classify(n / 5, c / 5).cycle.sort());
            }
            for (const n of [-1, -7, -13]) for (const v of orbitUntilRepeat(n, c)) expect(Math.abs(v % 5)).not.toBe(0);
        }
    });

    it('c = +5: F(1) is fixed by residues mod 5 (a pair agrees iff neither member is a multiple of 5)', () => {
        const r = classifyRange(5, 32767);
        const f = f1AndBaseline(r);
        let expectSame = 0;
        for (let i = 1; i < r.codes.length; i++) if ((2 * i + 1) % 5 !== 0 && (2 * i - 1) % 5 !== 0) expectSame++;
        expect(f.same).toBe(expectSame);
    });

    it('c = +3: every odd n maps into 3 x (orbit of c = +1); cycles are 3 x the c = +1 cycles plus [0]', () => {
        const keys = classifyRange(3, 2047).cycles.map(x => x.key).sort((a, b) => a - b);
        expect(keys).toEqual([-51, -15, -3, 0]);
        // for odd n != -1: T_3(n) = 3(n + 1), so the fate of n under c = +3 is 3 x (the c = +1 fate of the
        // odd part of n + 1); e.g. -7 -> -18 = 3 x (-6), odd part -3, which reaches [-1, -2] under c = +1
        const odd = x => { while (x % 2 === 0) x /= 2; return x; };
        expect(classify(-7, 3).cycle.map(v => v / 3)).toEqual(classify(-3, 1).cycle);
        for (let n = -3; n >= -2047; n -= 2) {
            expect(cycleSetKey(classify(n, 3).cycle.map(v => v / 3))).toBe(cycleSetKey(classify(odd(n + 1), 1).cycle));
        }
    });
});
