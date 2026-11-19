import { describe, it, expect } from 'vitest';
import {
    dyadicLevel, theta, thetaNat, thetaAlpha, position, step, orbit, mapChords,
    numberLineSegments, scalingSegments, cyclesInRange, normAngle, angleDistance,
} from '../imaiDyadicCircle.js';

// Fixtures come from Imai, "Geometric Extensions of Dyadic Circular Embeddings
// to the Integers" (2026), hal-05858260v1. Page numbers are the paper's own
// printed page numbers (PDF page = printed page + 1, because of the HAL cover).

const PI = Math.PI;
const close = (a, b) => expect(angleDistance(a, b)).toBeLessThan(1e-12);

describe('Imai dyadic circle: embedding fixtures', () => {
    it('k(n) = floor(log2 n)  (eq. 2.1, p. 2)', () => {
        expect([1, 2, 3, 4, 7, 8, 15, 16, 1023, 1024].map(dyadicLevel))
            .toEqual([0, 1, 1, 2, 2, 3, 3, 4, 9, 10]);
    });

    // Fig. 1(b), p. 3: labelled positive odd integers 1..15 on the signed embedding.
    // Reading of the figure: 1 at angle 0, 3 at the top, 5 and 7 at 45 and 135
    // degrees, 9, 11, 13, 15 at 22.5, 67.5, 112.5, 157.5 degrees.
    it('reproduces Fig. 1(b) positions of positive odd integers  (eq. 2.2, p. 3)', () => {
        const expected = {
            1: 0, 3: PI / 2, 5: PI / 4, 7: 3 * PI / 4,
            9: PI / 8, 11: 3 * PI / 8, 13: 5 * PI / 8, 15: 7 * PI / 8,
        };
        for (const [n, t] of Object.entries(expected)) close(theta(Number(n)), t);
    });

    // Fig. 1(b), p. 3: -1 at the left, -3 at the bottom, -5 lower left, -7 lower right,
    // -9, -11, -13, -15 at 202.5, 247.5, 292.5, 337.5 degrees.
    it('reproduces Fig. 1(b) positions of negative odd integers  (eq. 2.3, p. 3)', () => {
        const expected = {
            [-1]: PI, [-3]: 3 * PI / 2, [-5]: 5 * PI / 4, [-7]: 7 * PI / 4,
            [-9]: 9 * PI / 8, [-11]: 11 * PI / 8, [-13]: 13 * PI / 8, [-15]: 15 * PI / 8,
        };
        for (const [n, t] of Object.entries(expected)) close(theta(Number(n)), t);
    });

    // Fig. 1(a), p. 3: the natural-number embedding (2.6) of positive odd 1..31.
    // 1 at 0, 3 at 180 degrees, 5 top, 7 bottom, 17 at 22.5 degrees, 31 at -22.5 degrees.
    it('reproduces Fig. 1(a) natural positions  (eq. 2.6, p. 2-3)', () => {
        const expected = {
            1: 0, 3: PI, 5: PI / 2, 7: 3 * PI / 2, 9: PI / 4, 11: 3 * PI / 4,
            13: 5 * PI / 4, 15: 7 * PI / 4, 17: PI / 8, 19: 3 * PI / 8, 21: 5 * PI / 8,
            23: 7 * PI / 8, 25: 9 * PI / 8, 27: 11 * PI / 8, 29: 13 * PI / 8, 31: 15 * PI / 8,
        };
        for (const [n, t] of Object.entries(expected)) close(thetaNat(Number(n)), t);
    });

    it('theta(n) = theta_nat(n) / 2  (eq. 2.7, p. 3)', () => {
        for (let n = 1; n <= 2048; n++) expect(theta(n)).toBeCloseTo(thetaNat(n) / 2, 14);
    });

    it('theta(2n) = theta(n)  (eq. 2.8, p. 3)', () => {
        for (let n = 1; n <= 2048; n++) expect(theta(2 * n)).toBe(theta(n));
    });

    it('theta(2^k + n) = theta(n)/2 for 2^k <= n < 2^(k+1)  (eq. 2.9, p. 3)', () => {
        for (let k = 0; k <= 10; k++) {
            for (let n = 2 ** k; n < 2 ** (k + 1); n++) {
                expect(theta(2 ** k + n)).toBeCloseTo(theta(n) / 2, 14);
            }
        }
    });

    it('alpha = 1/2 recovers the signed embedding; alpha = 1 the natural one  (eqs. 6.7-6.9, p. 8-9)', () => {
        for (let n = -1024; n <= 1024; n++) {
            if (n === 0) continue;
            expect(thetaAlpha(n, 0.5)).toBeCloseTo(theta(n), 14);
            if (n > 0) expect(thetaAlpha(n, 1)).toBeCloseTo(thetaNat(n), 14);
            else close(thetaAlpha(n, 1), thetaNat(-n) + PI);
        }
    });

    it('rejects n = 0, which the paper excludes', () => {
        expect(() => theta(0)).toThrow(RangeError);
    });
});

describe('Imai dyadic circle: antipodal property', () => {
    it('theta(-n) = theta(n) + pi (mod 2 pi) and P(-n) = -P(n) for 1 <= n <= 4096  (eqs. 2.3, 2.5)', () => {
        for (let n = 1; n <= 4096; n++) {
            close(theta(-n), theta(n) + PI);
            expect(angleDistance(theta(-n), theta(n))).toBeCloseTo(PI, 12);
            const p = position(n), q = position(-n);
            expect(q.x).toBeCloseTo(-p.x, 12);
            expect(q.y).toBeCloseTo(-p.y, 12);
        }
    });

    it('stays antipodal for every scaling parameter alpha  (eq. 6.9)', () => {
        for (const alpha of [0.1, 0.25, 0.5, 0.73, 1]) {
            for (let n = 1; n <= 512; n++) {
                expect(angleDistance(thetaAlpha(-n, alpha), thetaAlpha(n, alpha))).toBeCloseTo(PI, 12);
            }
        }
    });

    it('positive integers sit on the upper half circle, negatives on the lower', () => {
        for (let n = 1; n <= 1024; n++) {
            expect(theta(n)).toBeGreaterThanOrEqual(0);
            expect(theta(n)).toBeLessThan(PI);
            expect(normAngle(theta(-n))).toBeGreaterThanOrEqual(PI);
        }
    });
});

describe('Imai dyadic circle: maps', () => {
    it("paper's T_m has no additive term and is odd: T_m(-n) = -T_m(n)  (eqs. 1.2, 3.2)", () => {
        for (const m of [3, 5, 7, 9, 11, 13, 15, 17, 19]) {
            expect(step(7, m)).toBe(7 * m);
            expect(step(12, m)).toBe(6);
            for (let n = 1; n <= 300; n++) expect(step(-n, m)).toBe(-step(n, m));
        }
    });

    it('central symmetry of the chord set for c = 0  (eq. 3.3)', () => {
        const chords = mapChords({ N: 255, m: 5, c: 0, imagesInRange: false });
        const byN = new Map(chords.map(ch => [ch.n, ch]));
        for (const ch of chords) {
            const mirror = byN.get(-ch.n);
            expect(mirror.to.x).toBeCloseTo(-ch.to.x, 12);
            expect(mirror.to.y).toBeCloseTo(-ch.to.y, 12);
        }
    });

    it('standard Collatz 3n+1 on positives: 27 reaches 1 in 111 steps', () => {
        const o = orbit(27, 111, 3, 1);
        expect(o[111]).toBe(1);
        expect(o.slice(0, 111)).not.toContain(1);
    });
});

describe('Imai dyadic circle: negative 3n+1 cycles', () => {
    const cycles = {
        two: [-1, -2],
        five: [-5, -14, -7, -20, -10],
        eighteen: [-17, -50, -25, -74, -37, -110, -55, -164, -82, -41, -122, -61,
            -182, -91, -272, -136, -68, -34],
    };

    for (const [name, cy] of Object.entries(cycles)) {
        it(`${name}-cycle: each step is T(n) = 3n+1 / n/2 and the orbit closes`, () => {
            for (let i = 0; i < cy.length; i++) {
                expect(step(cy[i], 3, 1)).toBe(cy[(i + 1) % cy.length]);
            }
            expect(orbit(cy[0], cy.length, 3, 1)).toEqual([...cy, cy[0]]);
            expect(new Set(cy).size).toBe(cy.length); // primitive period
        });

        it(`${name}-cycle: chords form a closed loop (every image is in the cycle set)`, () => {
            const set = new Set(cy);
            const N = Math.max(...cy.map(Math.abs));
            const chords = mapChords({ N, m: 3, c: 1 }).filter(ch => set.has(ch.n));
            expect(chords.length).toBe(cy.length);
            for (const ch of chords) expect(set.has(ch.t)).toBe(true);
            // in-degree 1 for every node: the chords trace one loop
            expect(new Set(chords.map(ch => ch.t)).size).toBe(cy.length);
        });
    }

    it('finds exactly these three negative cycles (plus 1-4-2) inside [-272, 272]', () => {
        const found = cyclesInRange({ N: 272, m: 3, c: 1 });
        expect(found).toEqual([cycles.two, [1, 4, 2], cycles.five, cycles.eighteen]);
    });

    it('the -17 cycle is not fully in range below N = 272', () => {
        const found = cyclesInRange({ N: 271, m: 3, c: 1 });
        expect(found.some(cy => cy.includes(-17))).toBe(false);
    });

    it('T_3 with no additive term has no nonzero cycle', () => {
        expect(cyclesInRange({ N: 1023, m: 3, c: 0 })).toEqual([]);
    });
});

describe('Imai dyadic circle: segment builders', () => {
    it('even-step chords are degenerate (theta(2n) = theta(n)) for any alpha', () => {
        for (const alpha of [0.3, 0.5, 1]) {
            const chords = mapChords({ N: 127, m: 3, c: 1, alpha });
            for (const ch of chords) if (!ch.odd) expect(ch.degenerate).toBe(true);
        }
    });

    it('imagesInRange keeps only |T(n)| <= N', () => {
        const all = mapChords({ N: 100, m: 3, c: 0, imagesInRange: false });
        const kept = mapChords({ N: 100, m: 3, c: 0 });
        expect(all.length).toBe(200);
        expect(kept.every(ch => Math.abs(ch.t) <= 100)).toBe(true);
        expect(kept.length).toBeLessThan(all.length);
    });

    it('number-line segments run from P_{alpha,R}(n) to (n, 0) with R = N by default  (eqs. 4.3, 6.12)', () => {
        const segs = numberLineSegments({ N: 31 });
        expect(segs.length).toBe(62);
        const s3 = segs.find(s => s.n === 3);
        expect(s3.from.x).toBeCloseTo(0, 12);
        expect(s3.from.y).toBeCloseTo(31, 12);
        expect(s3.to).toEqual({ x: 3, y: 0 });
    });

    it('scaling segments collapse to points at alpha = 1  (eq. 6.6, Fig. 5)', () => {
        for (const s of scalingSegments({ N: 255, alpha: 1 })) {
            expect(Math.hypot(s.from.x - s.to.x, s.from.y - s.to.y)).toBeLessThan(1e-12);
        }
    });

    it('handles N = 511 quickly', () => {
        const t0 = performance.now();
        mapChords({ N: 511, m: 3, c: 1 });
        numberLineSegments({ N: 511 });
        cyclesInRange({ N: 511, m: 3, c: 1 });
        expect(performance.now() - t0).toBeLessThan(500);
    });
});
