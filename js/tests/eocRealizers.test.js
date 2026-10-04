import { describe, it, expect } from 'vitest';
import {
    leastRealizer, accelOrbit, accelOrbitToOne, carrySum, periodicWord, beattyWord,
    betaConvergents, recordHolders, lifetime, lifetimeRecords, occupation, trajectoryStats,
    heightAmortization, depthLawTable, buildThreeClasses, summarizeClasses, LOG2_3, log2Big,
    residueGroup, carryWalk, residueTower, periodicLimitTower, vp, geometricWord, mulberry32,
    ordinaryMatched, actualTrajectory, selectionSummary,
    seedTables, recordExclusion, signTestP, nearRecordControl,
} from '../eocRealizers.js';

// Smallest odd m whose first word.length accelerated valuations equal word.
function bruteRealizer(word, bits) {
    for (let m = 1n; m < (1n << BigInt(bits)); m += 2n) {
        if (accelOrbit(m, word.length).word.join() === word.join()) return m;
    }
    return null;
}

describe('eocRealizers', () => {
    it('finds known least realizers', () => {
        expect(leastRealizer([2, 2, 2]).realizer).toBe(1n);   // 1 -> 1 with d = 2
        expect(leastRealizer([1]).realizer).toBe(3n);         // 3 -> 5
        expect(leastRealizer([4]).realizer).toBe(5n);         // 5 -> 1
        expect(leastRealizer([1, 1]).realizer).toBe(7n);      // 7 -> 11 -> 17
    });

    it('matches brute force on every word over {1,2,3} up to length 4', () => {
        const words = [[]];
        for (let len = 0; len < 4; len++) {
            for (const w of words.filter(w => w.length === len)) {
                for (const a of [1, 2, 3]) words.push([...w, a]);
            }
        }
        for (const w of words.slice(1)) {
            const { realizer, modulusBits } = leastRealizer(w);
            expect(realizer).toBe(bruteRealizer(w, modulusBits));
        }
    });

    it('agrees with the closed form r(D) = (2^S - C_N) 3^-N mod 2^(S+1) (EOC Prop. 5.2)', () => {
        for (const w of [[1, 2, 1, 2, 2], [3, 1, 1, 4], beattyWord(LOG2_3, 0, 40)]) {
            const S = w.reduce((a, b) => a + b, 0);
            const M = 1n << BigInt(S + 1);
            const t = 3n ** BigInt(w.length) % M;
            let inv = 1n;
            for (let i = 0; i < 12; i++) inv = (inv * (2n - t * inv)) % M;
            inv = ((inv % M) + M) % M;
            const r = ((((1n << BigInt(S)) - carrySum(w)) % M + M) % M) * inv % M;
            expect(leastRealizer(w).realizer).toBe(r);
        }
    });

    it('realizer class has modulus 2^(S_N+1), not 2^S_N', () => {
        const w = beattyWord(LOG2_3, 0.3, 200);
        const { realizer, modulusBits, image } = leastRealizer(w);
        expect(modulusBits).toBe(w.reduce((s, a) => s + a, 0) + 1);
        const { word, orbit } = accelOrbit(realizer, w.length);
        expect(word).toEqual(w);
        expect(orbit[orbit.length - 1]).toBe(image);
        expect(accelOrbit(realizer + (1n << BigInt(modulusBits)), w.length).word).toEqual(w);
        expect(accelOrbit(realizer + (1n << BigInt(modulusBits - 1)), w.length).word).not.toEqual(w);
    });

    it('periodic words have period p and block sum q', () => {
        const w = periodicWord(12, 19, 48);
        expect(w.slice(0, 12)).toEqual(w.slice(12, 24));
        expect(w.slice(0, 12).reduce((s, a) => s + a, 0)).toBe(19);
    });

    it('convergents of beta = log3 2 match the Sturmian paper (Convention 5.1)', () => {
        const c = betaConvergents(15);
        expect(c.slice(1, 8).map(x => `${x.p}/${x.q}`))
            .toEqual(['1/1', '1/2', '2/3', '5/8', '12/19', '41/65', '53/84']);
        expect(c[13]).toMatchObject({ p: 111202, q: 176251 });
        expect(c[14]).toMatchObject({ p: 190537, q: 301994 });
    });

    it('reproduces the depth law lcp(1c_beta, w_n^inf) (Sturmian paper, Thm. 5.3)', () => {
        for (const row of depthLawTable(9)) {
            expect(row.observed).toBe(row.predicted);
            expect(row.twoAdic).toBe(row.predicted); // independent 2-adic check
        }
    });

    it('Sturmian words have factor complexity L + 1 and stay in a unit band', () => {
        const w = beattyWord(LOG2_3, 0, 400);
        const s = trajectoryStats(w, accelOrbit(leastRealizer(w).realizer, w.length).orbit);
        expect(s.complexity[4]).toBe(5);
        expect(s.complexity[8]).toBe(9);
        expect(s.balance).toBeLessThan(1);
        expect(s.Rmax - s.Rmin).toBeLessThan(1); // band rigidity (EOC App. A)
        expect(s.occupancy[5]).toBe(0);
    });

    it('height amortization separates periodic from Sturmian (EOC Obs. 5.9)', () => {
        expect(heightAmortization(periodicWord(12, 19, 120), 12)).toBeLessThan(0.5);
        expect(heightAmortization(beattyWord(LOG2_3, 0, 120))).toBeGreaterThan(1);
    });

    it('lifetime and occupation match the EOC example m0 = 285175 (Rem. 6.2)', () => {
        expect(lifetime(285175, 1)).toBe(14);
        // Paper reports O_1 = 97; counting every n >= 0 with R_n <= 1 exactly gives 98.
        expect(occupation(285175, 1)).toBe(98);
    });

    it('finds the classic delay records and L_1 lifetime records', () => {
        const { delay } = recordHolders(1000);
        expect(delay.map(r => r.n)).toEqual(expect.arrayContaining([27, 703, 871]));
        expect(delay.find(r => r.n === 27).delay).toBe(111);
        expect(lifetimeRecords(1000).map(r => r.n)).toEqual(expect.arrayContaining([27, 703]));
    });

    it('an actual orbit is its own least realizer', () => {
        for (const n of [27n, 703n, 77031n]) {
            const { word } = accelOrbitToOne(n);
            expect(leastRealizer(word).realizer).toBe(n);
        }
    });

    it('Eliahou-Rozier: R_n = log2(m0/mn) + E_n with E_n >= 0 (EOC Lem. 2.2)', () => {
        const { orbit, word } = accelOrbitToOne(27n);
        let S = 0;
        for (let i = 1; i < orbit.length; i++) {
            S += word[i - 1];
            const En = (S - i * LOG2_3) - (log2Big(orbit[0]) - log2Big(orbit[i]));
            expect(En).toBeGreaterThanOrEqual(-1e-9);
            expect(En).toBeLessThan(1);
        }
    });

    it('endpoint depth separates actual orbits from every synthetic class', () => {
        for (const actualKind of ['delay', 'lifetime']) {
            const sum = summarizeClasses(buildThreeClasses({ N: 60, recordLimit: 20000, actualKind }));
            expect(sum.actual.depthPerS.mean).toBeGreaterThan(0.8);
            for (const c of ['periodic', 'sturmian', 'generic']) {
                expect(Math.abs(sum[c].depthPerS.mean)).toBeLessThan(0.05);
            }
        }
    });

    describe('carry-walk residue tower', () => {
        it('K_e = <2,3> mod p^e has the expected sizes', () => {
            expect([1, 2, 3].map(e => residueGroup(11 ** e).length)).toEqual([10, 110, 1210]);
            expect([1, 2, 3].map(e => residueGroup(13 ** e).length)).toEqual([12, 156, 2028]);
        });

        it('carry sum factors through the walk: C_N = 3^(N-1) sum u_j (mod q)', () => {
            const w = beattyWord(LOG2_3, 0.3, 80);
            for (const q of [125, 343, 1331, 2197]) {
                const sum = BigInt(carryWalk(w, q).reduce((a, b) => a + b, 0));
                expect((3n ** 79n * sum) % BigInt(q)).toBe(carrySum(w) % BigInt(q));
            }
        });

        it('energy splits exactly into inherited plus new sectors', () => {
            const w = geometricWord(3000, mulberry32(5));
            for (const p of [5, 7, 13]) {
                const t = residueTower(w, p);
                let acc = 0;
                for (const l of t) {
                    acc += l.fresh;
                    expect(l.energy).toBeCloseTo(acc, 10);
                }
            }
        });

        it('periodic limit tower matches a long simulation', () => {
            const block = periodicWord(5, 8, 5);
            expect(periodicLimitTower(block, 13).map(l => l.fresh)).toEqual([expect.closeTo(1.4, 10), 0, 0]);
            expect(periodicLimitTower(block, 7).map(l => l.fresh)).toEqual([0, expect.closeTo(0.4, 10), 0]);
            const sim = residueTower(periodicWord(5, 8, 5 * 4000), 7);
            expect(sim[1].fresh).toBeCloseTo(0.4, 4);
        });

        it('detects the EOC denominators 13 | 3^5 - 2^8 and 11 | 3^53 - 2^84', () => {
            expect(vp(3n ** 5n - 2n ** 8n, 13)).toBe(1);
            expect(vp(3n ** 53n - 2n ** 84n, 11)).toBe(1);
            expect(periodicLimitTower(periodicWord(53, 84, 53), 11)[0].fresh).toBeGreaterThan(0);
        });

        it('critical Sturmian walk: new-sector energy at 7^3 decays with N', () => {
            const at = N => residueTower(beattyWord(LOG2_3, 0, N), 7)[2].fresh;
            expect(at(32000)).toBeLessThan(at(4000) / 5);
        });
    });

    describe('selection-effect controls', () => {
        const small = { N: 60, recordLimit: 20000 };

        it('ordinary orbits are non-records matched on N (or S_N) to each record holder', () => {
            for (const matchOn of ['N', 'S']) {
                const C = buildThreeClasses({ ...small, matchOn });
                const records = new Set(C.actual.map(t => t.orbit[0]));
                expect(C.meta.unmatchedOrdinary).toBe(0);
                expect(C.ordinary.length).toBe(C.actual.length);
                for (const o of C.ordinary) {
                    const rec = C.actual.find(t => t.orbit[0] === o.matchedTo);
                    expect(records.has(o.orbit[0])).toBe(false);
                    if (matchOn === 'N') expect(o.word.length).toBe(rec.word.length);
                    else expect(o.stats.SN).toBe(rec.stats.SN);
                    expect(o.orbit[o.orbit.length - 1]).toBe(1n);
                }
            }
        });

        it('L1 controls have the same lifetime and are not records', () => {
            const C = buildThreeClasses({ ...small, actualKind: 'lifetime' });
            for (const o of C.ordinary) {
                const rec = C.actual.find(t => t.orbit[0] === o.matchedTo);
                expect(o.orbit[0] > rec.orbit[0]).toBe(true);
                expect(lifetime(o.orbit[0], 1)).toBe(rec.word.length);
                expect(o.word.length).toBe(rec.word.length);
            }
        });

        it('residual log2(m0 / r(D)) is exactly 0 whenever m0 < 2^(S_N+1)', () => {
            for (const actualKind of ['delay', 'lifetime']) {
                const C = buildThreeClasses({ ...small, actualKind });
                for (const t of [...C.actual, ...C.ordinary]) {
                    expect(t.selection.seedBelowModulus).toBe(true);
                    expect(t.realizer).toBe(t.orbit[0]);
                    expect(t.selection.residual).toBe(0);
                }
            }
        });

        it('a short prefix of a large seed has r(D) < m0 and a positive residual', () => {
            const t = actualTrajectory(837799n, {}, 3);       // S_3 + 1 < log2 m0
            expect(t.selection.seedBelowModulus).toBe(false);
            expect(t.realizer < t.orbit[0]).toBe(true);
            expect(t.selection.residual).toBeGreaterThan(0);
            expect((t.orbit[0] - t.realizer) % (1n << BigInt(t.modulusBits))).toBe(0n);
        });

        it('E(D) = N log2 3 + E_N - log2 m_N exactly (Lem. 2.2 with r(D) = m0)', () => {
            const C = buildThreeClasses(small);
            const sum = selectionSummary(C);
            expect(sum.actual.maxIdentityGap).toBeLessThan(1e-9);
            expect(sum.ordinary.maxIdentityGap).toBeLessThan(1e-9);
        });

        it('records and N-matched ordinary orbits share E(D)/N; E(D)/S_N differs only via log2 m0 / S_N', () => {
            const sum = selectionSummary(buildThreeClasses(small));
            expect(Math.abs(sum.actual.EperN.mean - sum.ordinary.EperN.mean)).toBeLessThan(0.02);
            expect(sum.actual.EperS.mean).toBeGreaterThan(sum.ordinary.EperS.mean);
            const gapE = sum.actual.EperS.mean - sum.ordinary.EperS.mean;
            const gapSeed = sum.ordinary.log2m0PerS.mean - sum.actual.log2m0PerS.mean;
            expect(gapE).toBeCloseTo(gapSeed, 10); // E/S = 1 - log2 m0 / S when r(D) = m0
        });

        it('ordinaryMatched reports unmatched records instead of inventing matches', () => {
            const rec = actualTrajectory(27n, { cls: 'actual' });
            const { list, unmatched } = ordinaryMatched([rec], { maxTries: 0 });
            expect(list).toEqual([]);
            expect(unmatched).toBe(1);
        });
    });

    describe('near-record control', () => {
        const tables = seedTables(1000000);
        const exclude = recordExclusion(tables);

        it('seed tables agree with direct orbits', () => {
            for (const m of [3, 27, 703, 77031, 837799, 999999]) {
                const { word } = accelOrbitToOne(BigInt(m));
                expect(tables.N(m)).toBe(word.length);
                expect(tables.S(m)).toBe(word.reduce((a, b) => a + b, 0));
            }
        });

        it('exclusion set contains every odd delay and glide record holder', () => {
            const { delay, glide } = recordHolders(1000000);
            for (const r of [...delay, ...glide]) if (r.n % 2 === 1 && r.n > 1) expect(exclude.has(r.n)).toBe(true);
        });

        it('exact sign test', () => {
            expect(signTestP(0, 10)).toBeCloseTo(2 / 1024, 12);
            expect(signTestP(5, 10)).toBe(1);
            expect(signTestP(0, 0)).toBe(1);
        });

        it('neighbours are non-records within dN of the record length, K per record', () => {
            const C = buildThreeClasses({ N: 60, recordLimit: 20000 });
            const r = nearRecordControl(C.actual, { tables, exclude, K: 20, dN: 3 });
            expect(r.perRecord.length).toBe(C.actual.length);
            for (const row of r.perRecord) {
                expect(row.neighbourSeeds.length).toBe(20);
                for (const m of row.neighbourSeeds) {
                    expect(exclude.has(m)).toBe(false);
                    expect(m).not.toBe(row.n);
                    expect(Math.abs(tables.N(m) - row.N)).toBeLessThanOrEqual(3);
                }
                for (const st of r.summary) expect(Number.isFinite(row.z[st.key])).toBe(true);
            }
            expect(r.bonferroni).toBeCloseTo(0.05 / 6, 12);
        });

        it('pinned statistic: mu - log2 3 - kappa equals E_N / N for every record', () => {
            const C = buildThreeClasses({ N: 60, recordLimit: 20000 });
            for (const t of C.actual) {
                const kappa = Math.log2(Number(t.orbit[0])) / t.word.length;
                expect(t.stats.mu - LOG2_3 - kappa).toBeCloseTo(t.selection.carryExcess / t.word.length, 9);
            }
        });
    });
});
