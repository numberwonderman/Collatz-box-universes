import { describe, it, expect } from 'vitest';
import { depth, depthTable, cellStats } from '../imaiDepthPairing.js';

describe('depth (Build 7 definition)', () => {
    it('v = K - 1 - j-block; top block is 0, j = 0 is K', () => {
        expect([0, 1, 2, 3, 4, 7].map(j => depth(j, 3))).toEqual([3, 2, 1, 1, 0, 0]);
    });
});

describe('hand-checked synthetic case (K = 3, j = 0..7)', () => {
    // Build 7's synthetic case: fates by hand, overlay order j0 j4 j2 j5 j1 j6 j3 j7 (cyclic)
    const codes = Int8Array.from([0, 0, 1, 1, 0, 2, 2, 1]);
    // depths (K = 3): j0 -> 3, j1 -> 2, j2, j3 -> 1, j4..j7 -> 0
    // pairs (coarser first): (j0,j4) v(3,0) s; (j2,j4) v(1,0) d; (j2,j5) (1,0) d; (j1,j5) (2,0) d;
    //   (j1,j6) (2,0) d; (j3,j6) (1,0) d; (j3,j7) (1,0) s; (j0,j7) (3,0) d
    it('joint table: every pair has a depth-0 member', () => {
        const t = depthTable(codes, 3);
        expect(t.pairs).toBe(8);
        expect(t.same).toBe(2);
        expect([...t.joint.keys()].sort()).toEqual(['1,0', '2,0', '3,0']);
        expect(t.joint.get('1,0')).toMatchObject({ pairs: 4, same: 1 });
        expect(t.joint.get('2,0')).toMatchObject({ pairs: 2, same: 0 });
        expect(t.joint.get('3,0')).toMatchObject({ pairs: 2, same: 1 });
        expect([...t.byMin.keys()]).toEqual([0]);
        expect(t.byMin.get(0)).toMatchObject({ pairs: 8, same: 2 });
        expect(t.byMax.get(1)).toMatchObject({ pairs: 4, same: 1 });
    });

    it('per-fate split and cell baselines', () => {
        const t = depthTable(codes, 3);
        // coarser depth 1: j2 (fate 1) twice: both differ; j3 (fate 1) twice: one same -> fate 1: 4 pairs, 1 same
        expect(t.peakByFate.get(1)[1]).toMatchObject({ pairs: 4, same: 1 });
        expect(t.peakByFate.get(1)[0]).toMatchObject({ pairs: 0, same: 0 });
        // cell (1,0): coarser fates 1,1,1,1; finer fates j4 0, j5 2, j6 2, j7 1
        const s = cellStats(t.joint.get('1,0'));
        expect(s.agreement).toBe(0.25);
        // pooled: fates {1 x5, 0 x1, 2 x2} over 8 -> (25 + 1 + 4) / 64
        expect(s.pooledSumSquares).toBeCloseTo(30 / 64, 12);
        // independent given sides: p_coarser = (0, 1, 0), p_finer = (.25, .25, .5) -> .25
        expect(s.independentGivenSides).toBeCloseTo(0.25, 12);
    });
});
