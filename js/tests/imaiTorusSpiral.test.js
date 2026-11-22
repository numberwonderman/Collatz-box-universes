import { describe, it, expect } from 'vitest';
import {
    fateOfInteger, latticeHeight, torusCoords, latticeAgreement, sharesOf, ulamCoords, spiralAgreement,
} from '../imaiTorusSpiral.js';
import { fateCodes } from '../imaiFateCorrelation.js';
import { trajectoryFate } from '../imaiFractalProbe.js';
import { theta } from '../imaiDyadicCircle.js';

const { codes } = fateCodes({ N: 2 ** 15 - 1 });
const fate = j => fateOfInteger(codes, j); // 0 = -1, 1 = -5, 2 = -17

describe('Ulam spiral: hand-checked first 25 integers', () => {
    // standard orientation (1 at centre, 2 east, counter-clockwise):
    //   y= 2:  17 16 15 14 13
    //   y= 1:  18  5  4  3 12
    //   y= 0:  19  6  1  2 11
    //   y=-1:  20  7  8  9 10
    //   y=-2:  21 22 23 24 25
    it('coordinates', () => {
        const { xs, ys } = ulamCoords(25);
        const grid = {};
        for (let j = 1; j <= 25; j++) grid[`${xs[j]},${ys[j]}`] = j;
        const rows = [2, 1, 0, -1, -2].map(y => [-2, -1, 0, 1, 2].map(x => grid[`${x},${y}`]));
        expect(rows).toEqual([
            [17, 16, 15, 14, 13], [18, 5, 4, 3, 12], [19, 6, 1, 2, 11], [20, 7, 8, 9, 10], [21, 22, 23, 24, 25],
        ]);
    });

    it('fates of -1..-25 (evens by their odd part)', () => {
        // A = -1, B = -5, C = -17:
        // 1A 2A 3A 4A 5B 6A 7B 8A 9B 10B 11A 12A 13B 14B 15A 16A 17C 18B 19B 20B 21C 22A 23C 24A 25C
        const keys = [-1, -5, -17];
        const expected = [-1, -1, -1, -1, -5, -1, -5, -1, -5, -5, -1, -1, -5, -5, -1, -1, -17, -5, -5, -5, -17, -1, -17, -1, -17];
        for (let j = 1; j <= 25; j++) {
            expect(keys[fate(j)]).toBe(expected[j - 1]);
            let o = j; while (o % 2 === 0) o /= 2;
            expect(trajectoryFate(-j).key).toBe(trajectoryFate(-o).key); // an even integer shares its odd part's fate
        }
    });

    it('grid-neighbour agreement by hand: 17 of 40 pairs', () => {
        // grid of fates:
        //   y= 2:  C A A B B      horizontal same: AA, BB            = 2
        //   y= 1:  B B A A A                       BB, AA, AA        = 3
        //   y= 0:  B A A A A                       AA, AA, AA        = 3
        //   y=-1:  B B A B B                       BB, BB            = 2
        //   y=-2:  C A C A C                       none              = 0   -> horizontal 10 / 20
        // vertical (columns x = -2..2, top to bottom):
        //   C B B B C: BB, BB = 2;  A B A B A: 0;  A A A A C: 3;  B A A B A: 1;  B A A B C: 1   -> vertical 7 / 20
        // consecutive pairs (j, j+1), all 24 are grid-adjacent: same at 1-2, 2-3, 3-4, 9-10, 11-12, 13-14,
        //   15-16, 18-19, 19-20 = 9 / 24;  cross-ring pairs: 8 / 16
        const s = spiralAgreement(25, fate);
        expect(s).toMatchObject({ pairs: 40, same: 17, consecutive: { pairs: 24, same: 9 }, crossRing: { pairs: 16, same: 8 } });
        expect(s.agreement).toBeCloseTo(17 / 40, 12);
        const sh = sharesOf(Array.from({ length: 25 }, (_, i) => fate(i + 1)));
        expect(sh.counts).toEqual([12, 9, 4]);
        expect(sh.sumSquares).toBeCloseTo(241 / 625, 12);
    });
});

describe('torus / cylinder lattice', () => {
    it('heights are the dyadic block, torus angles wrap them', () => {
        expect([1, 3, 5, 7, 9, 1023, 1025].map(a => latticeHeight(-a))).toEqual([0, 1, 2, 2, 3, 9, 10]);
        const t = torusCoords(-1025, 8);
        expect(t).toMatchObject({ h: 10, hWrapped: 2 });
        expect(t.poloidal).toBeCloseTo(2 * Math.PI * 2 / 8, 12);
        expect(t.toroidal).toBe(theta(-1025));
    });

    it('hand-checked lattice for |n| <= 7: horizontal (5,7); vertical (1,3), (3,5), (3,7)', () => {
        // fates: -1 -> -1, -3 -> -1, -5 -> -5, -7 -> -5
        // (5,7) same; (1,3) same; (3,5) differ; (3,7) differ  -> 2 / 4
        const l = latticeAgreement(codes, 3);
        expect(l).toMatchObject({ pairs: 4, same: 2, horizontal: { pairs: 1, same: 1 }, vertical: { pairs: 3, same: 1 }, wrapPairs: 0 });
    });

    it('wrapping with H above the largest height changes nothing', () => {
        const cyl = latticeAgreement(codes, 15);
        for (const H of [32, 64]) {
            const tor = latticeAgreement(codes, 15, H);
            expect(tor.pairs).toBe(cyl.pairs);
            expect(tor.same).toBe(cyl.same);
            expect(tor.wrapPairs).toBe(0);
        }
        expect(() => latticeAgreement(codes, 15, 14)).toThrow(RangeError);   // would superimpose rows
        expect(() => latticeAgreement(codes, 15, 15)).toThrow(RangeError);   // would join top row to row 0
    });

    it('horizontal lattice pairs are the within-block pairs (n, n + 2)', () => {
        const l = latticeAgreement(codes, 15);
        // blocks h = 1..14 have 2^(h-1) odd n, i.e. 2^(h-1) - 1 horizontal pairs each
        let expectPairs = 0;
        for (let h = 1; h <= 14; h++) expectPairs += 2 ** (h - 1) - 1;
        expect(l.horizontal.pairs).toBe(expectPairs);
        // every odd |n| >= 3 has exactly one parent (|n| -+ 1)/2 odd, so vertical pairs = odd n with 3 <= |n| <= 2^15 - 1
        expect(l.vertical.pairs).toBe(2 ** 14 - 1);
    });
});
