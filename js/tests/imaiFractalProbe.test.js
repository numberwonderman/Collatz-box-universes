import { describe, it, expect } from 'vitest';
import {
    pointSegmentDistance, gridGeometry, densityGrid, colourDensity, probeChords, blockChords,
    doubleAngles, blockCrossings, trajectoryFate, logNormalise, threshold, boxCount,
    boxCountingDimension, linearFit, maskOverlap, correlation,
} from '../imaiFractalProbe.js';
import { theta, dyadicIntervalIndex } from '../imaiDyadicCircle.js';

const seg = (ax, ay, bx, by) => ({ from: { x: ax, y: ay }, to: { x: bx, y: by } });
const sum = a => a.reduce((s, v) => s + v, 0);

describe('fractal probe: geometry', () => {
    it('pointSegmentDistance: interior, endpoints, degenerate segment', () => {
        expect(pointSegmentDistance(0, 1, -1, 0, 1, 0)).toBeCloseTo(1, 12);
        expect(pointSegmentDistance(3, 4, -1, 0, 0, 0)).toBeCloseTo(5, 12);
        expect(pointSegmentDistance(2, 0, 0, 0, 0, 0)).toBeCloseTo(2, 12);
    });

    it('gridGeometry maps pixel centres and back', () => {
        const g = gridGeometry(100, 1);
        const [x, y] = g.centre(0, 0);
        expect(x).toBeCloseTo(-0.99, 12);
        expect(y).toBeCloseTo(0.99, 12);
        const [i, j] = g.toPx(x, y);
        expect(i).toBeCloseTo(0.5, 12);
        expect(j).toBeCloseTo(0.5, 12);
    });
});

describe('fractal probe: density sampling (eq. 4.4 kernel)', () => {
    it('Gaussian mode: value 1 on the segment, exp(-1/2) at distance eps', () => {
        const size = 200, extent = 1, h = 2 * extent / size;
        const eps = 5 * h;
        const { grid, mode } = densityGrid([seg(-0.5, h / 2, 0.5, h / 2)], { size, extent, eps });
        expect(mode).toBe('gaussian');
        // row whose centre is y = h/2 is j = size/2 - 1; that row lies on the segment
        const j = size / 2 - 1, i = size / 2;
        expect(grid[j * size + i]).toBeCloseTo(1, 10);
        expect(grid[(j - 5) * size + i]).toBeCloseTo(Math.exp(-0.5), 10);
        expect(grid[(j - 40) * size + i]).toBe(0); // beyond the 4 eps cutoff
    });

    it('Gaussian and length modes integrate to L sqrt(2 pi) eps over the plane', () => {
        const size = 400, extent = 1, h = 2 * extent / size;
        const L = 1.2;
        const segs = [seg(-0.6, 0.1, 0.6, 0.1)];
        for (const eps of [3 * h, 0.2 * h]) {
            const { grid, mode } = densityGrid(segs, { size, extent, eps });
            const integral = sum(grid) * h * h;
            expect(mode).toBe(eps / h >= 0.5 ? 'gaussian' : 'length');
            // Gaussian mode adds two round end caps, each half a 2-D Gaussian (pi eps^2)
            const expected = L * Math.sqrt(2 * Math.PI) * eps + (mode === 'gaussian' ? 2 * Math.PI * eps * eps : 0);
            expect(Math.abs(integral - expected) / expected).toBeLessThan(0.002);
        }
    });

    it('density is additive over segments', () => {
        const a = seg(-0.5, 0, 0.5, 0.3), b = seg(0, -0.7, 0.2, 0.7);
        const opt = { size: 64, eps: 0.05 };
        const g1 = densityGrid([a], opt).grid, g2 = densityGrid([b], opt).grid, g12 = densityGrid([a, b], opt).grid;
        for (let i = 0; i < g12.length; i++) expect(g12[i]).toBeCloseTo(g1[i] + g2[i], 12);
    });

    it('colourDensity splits length across channels by weight', () => {
        const { r, g, b, total } = colourDensity([{ ...seg(-0.5, 0, 0.5, 0), rgb: [1, 0.5, 0] }], { size: 64 });
        expect(sum(r)).toBeCloseTo(sum(total), 12);
        expect(sum(g)).toBeCloseTo(sum(total) / 2, 12);
        expect(sum(b)).toBe(0);
    });

    it('logNormalise maps into [0, 1] with the maximum at 1', () => {
        const n = logNormalise(Float64Array.from([0, 1, 3, 7]));
        expect(n[0]).toBe(0);
        expect(n[3]).toBe(1);
        expect(n[2]).toBeCloseTo(Math.log(4) / Math.log(8), 12);
        expect(logNormalise(Float64Array.from([0, 1]), 3)[1]).toBeCloseTo(Math.log(2) / Math.log(4), 12);
    });
});

describe('fractal probe: block filtering', () => {
    it('probeChords drops degenerate (even-step) chords', () => {
        const ch = probeChords({ N: 255, m: 3, c: 0 });
        expect(ch.every(c => c.odd)).toBe(true);
        expect(ch.length).toBe(256); // odd n in [-255, 255]
    });

    it('blockChords keeps exactly the sources with 2^k <= |n| < 2^(k+1)', () => {
        const ch = probeChords({ N: 1023, m: 3, c: 1 });
        const top = blockChords(ch, 9);
        expect(top.length).toBe(512); // 256 odd n on each side
        expect(top.every(c => Math.abs(c.n) >= 512 && Math.abs(c.n) < 1024)).toBe(true);
        expect([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].reduce((s, k) => s + blockChords(ch, k).length, 0)).toBe(ch.length);
    });

    it('doubleAngles doubles both endpoint angles mod 2 pi', () => {
        const [ch] = probeChords({ N: 7, m: 3, c: 0 }).filter(c => c.n === 5);
        const d = doubleAngles(ch);
        expect(d.from.theta).toBeCloseTo((2 * theta(5)) % (2 * Math.PI), 12);
        expect(d.to.theta).toBeCloseTo((2 * theta(15)) % (2 * Math.PI), 12);
        expect(Math.hypot(d.to.x, d.to.y)).toBeCloseTo(1, 12);
    });

    it('under T_m (m >= 3) every chord leaves its dyadic block', () => {
        for (const c of [0, 1]) {
            for (const row of blockCrossings({ N: 1023, m: 3, c })) {
                expect(row.crossing).toBe(row.chords);
                expect(row.chords).toBe(2 * 2 ** row.k);
            }
        }
    });

    it('a map that can stay inside a block is counted correctly (m = 1, c = 0: odd n is fixed)', () => {
        const rows = blockCrossings({ N: 15, m: 1, c: 0 });
        for (const r of rows) expect(r.crossing).toBe(r.chords - r.odd); // even steps leave, odd stay
    });
});

describe('fractal probe: trajectory fate', () => {
    it('classifies 3n+1 fates by the least-|.| element of the cycle reached', () => {
        expect(trajectoryFate(27).key).toBe(1);
        expect(trajectoryFate(-3).key).toBe(-1);   // -3 -> -8 -> -4 -> -2 -> -1
        expect(trajectoryFate(-7).key).toBe(-5);
        expect(trajectoryFate(-25).key).toBe(-17);
        expect(trajectoryFate(-17)).toMatchObject({ fate: 'cycle', key: -17, steps: 0 });
    });

    it('reports unsettled when the step budget runs out, and zero for 0', () => {
        expect(trajectoryFate(27, { maxSteps: 50 }).fate).toBe('unsettled');
        expect(trajectoryFate(0).fate).toBe('zero');
        expect(trajectoryFate(1, { m: 3, c: 0 }).fate).toBe('unsettled'); // 1 -> 3 -> 9 -> ... never repeats
    });
});

describe('fractal probe: box counting on synthetic images', () => {
    const size = 256;
    const boxes = [1, 2, 4, 8, 16, 32];
    const mask = f => {
        const m = new Uint8Array(size * size);
        for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) m[j * size + i] = f(i, j) ? 1 : 0;
        return m;
    };

    it('boxCount counts occupied boxes', () => {
        const m = mask((i, j) => i === 0 && j === 0);
        expect(boxCount(m, size, 1)).toBe(1);
        expect(boxCount(m, size, 16)).toBe(1);
        expect(boxCount(mask(() => true), size, 16)).toBe(256);
    });

    it('filled square has dimension 2', () => {
        const r = boxCountingDimension(mask((i, j) => i >= 32 && i < 224 && j >= 32 && j < 224), size, boxes);
        expect(r.slope).toBeGreaterThan(1.9);
        expect(r.slope).toBeLessThan(2.05);
        expect(r.r2).toBeGreaterThan(0.99);
    });

    it('a straight line has dimension 1, a diagonal too', () => {
        expect(boxCountingDimension(mask((i, j) => j === 100), size, boxes).slope).toBeCloseTo(1, 2);
        const d = boxCountingDimension(mask((i, j) => i === j), size, boxes).slope;
        expect(d).toBeGreaterThan(0.95);
        expect(d).toBeLessThan(1.05);
    });

    it('a single point has dimension 0', () => {
        expect(boxCountingDimension(mask((i, j) => i === 77 && j === 13), size, boxes).slope).toBeCloseTo(0, 10);
    });

    it('Sierpinski carpet comes out near log 8 / log 3 = 1.893', () => {
        const S = 243; // 3^5
        const carpet = new Uint8Array(S * S);
        for (let j = 0; j < S; j++) {
            for (let i = 0; i < S; i++) {
                let a = i, b = j, hole = false;
                while (a > 0 || b > 0) { if (a % 3 === 1 && b % 3 === 1) { hole = true; break; } a = Math.floor(a / 3); b = Math.floor(b / 3); }
                carpet[j * S + i] = hole ? 0 : 1;
            }
        }
        const r = boxCountingDimension(carpet, S, [1, 3, 9, 27, 81]);
        expect(r.slope).toBeCloseTo(Math.log(8) / Math.log(3), 6);
    });

    it('linearFit recovers an exact line', () => {
        const f = linearFit([0, 1, 2, 3], [1, 3, 5, 7]);
        expect(f.slope).toBeCloseTo(2, 12);
        expect(f.intercept).toBeCloseTo(1, 12);
        expect(f.r2).toBeCloseTo(1, 12);
    });

    it('threshold, maskOverlap and correlation', () => {
        expect([...threshold(Float64Array.from([0.1, 0.5, 0.9]), 0.5)]).toEqual([0, 1, 1]);
        const o = maskOverlap(Uint8Array.from([1, 1, 0, 0]), Uint8Array.from([0, 1, 1, 0]));
        expect(o.iou).toBeCloseTo(1 / 3, 12);
        expect(o.aInB).toBeCloseTo(0.5, 12);
        expect(correlation([1, 2, 3], [2, 4, 6])).toBeCloseTo(1, 12);
        expect(correlation([1, 2, 3], [3, 2, 1])).toBeCloseTo(-1, 12);
    });
});

describe('fractal probe: block structure of the T_3 chord family', () => {
    // n = 2^k (1 + x), x in [0, 1): theta(n) = pi x, and 3n = 2^k * 3(1 + x) with 3(1 + x) in [3, 6),
    // so theta(3n) = pi (3(1 + x)/2 - 1) if x < 1/3, else pi (3(1 + x)/4 - 1): the same g(x) in every block.
    const g = x => (x < 1 / 3 ? Math.PI * (1.5 * (1 + x) - 1) : Math.PI * (0.75 * (1 + x) - 1));

    it('for c = 0, every odd chord is [P(pi x), P(g(x))] with g independent of the block k', () => {
        let checked = 0;
        for (const ch of probeChords({ N: 4095, m: 3, c: 0 })) {
            const a = Math.abs(ch.n);
            const k = dyadicIntervalIndex(a);
            const x = a / 2 ** k - 1;
            const off = ch.n < 0 ? Math.PI : 0;
            expect(ch.from.theta).toBeCloseTo(Math.PI * x + off, 12);
            expect(ch.to.theta).toBeCloseTo(g(x) + off, 12);
            checked++;
        }
        expect(checked).toBe(4096);
    });

    it('for c = 1, the +1 moves the image by at most pi / 2^k, except where 3n + 1 is a power of two', () => {
        const jumps = [];
        for (const ch of probeChords({ N: 4095, m: 3, c: 1 })) {
            if (ch.n < 0) continue;
            const k = dyadicIntervalIndex(ch.n);
            const x = ch.n / 2 ** k - 1;
            const d = Math.abs(ch.to.theta - g(x));
            if (d > Math.PI / 2 ** k + 1e-12) jumps.push(ch.n);
        }
        // n = (4^i - 1)/3: 3n + 1 = 4^i sits at theta = 0, while g(x) is near pi
        // (n = 1 is block 0, where the bound pi / 2^0 = pi is vacuous)
        expect(jumps).toEqual([5, 21, 85, 341, 1365]);
    });
});
