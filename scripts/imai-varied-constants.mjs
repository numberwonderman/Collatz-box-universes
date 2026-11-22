// Build 10: varying the constant, fate partitions for 3n + c (Franklin's own question, Nov 2026).
// Writes docs/varied-constants/varied-constants.json.
//
//   node scripts/imai-varied-constants.mjs        (from the repo root; ~15 s)

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { classify, classifyRange, f1AndBaseline, cycleSetKey, STEP_CAP, MAG_CAP } from '../js/imaiVariedConstants.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'docs', 'varied-constants');
mkdirSync(OUT, { recursive: true });
const t0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)} s]`, ...a);
const rd = (x, d = 5) => (x === null || x === undefined ? null : +x.toFixed(d));
const fail = msg => { console.error(`SANITY CHECK FAILED: ${msg}`); process.exit(1); };
const TRIPWIRE_S = 120;
const timed = (label, f) => { const t = Date.now(); const r = f(); const s = (Date.now() - t) / 1000; if (s > TRIPWIRE_S) { console.error(`STOP: ${label} took ${s.toFixed(0)} s`); process.exit(2); } return { r, seconds: s }; };

const CS = [-5, -3, -1, 1, 3, 5];
const N_MAIN = 2 ** 15 - 1, N_EXT = 2 ** 18 - 1;
const odd = x => { while (x % 2 === 0) x /= 2; return x; };

// ---------- sanity check 1: c = +1 ----------
const checks = {};
{
    const r = classifyRange(1, 16383);
    const counts = Object.fromEntries(r.cycles.map(x => [x.key, x.count]));
    const f = f1AndBaseline(r);
    if (counts[-1] !== 2673 || counts[-5] !== 2667 || counts[-17] !== 2852 || r.unsettled || r.escaped) fail(`c = +1 counts ${JSON.stringify(counts)}`);
    if (f.pairs !== 8191 || +f.F1.toFixed(4) !== 0.4293) fail(`c = +1 F(1) ${f.F1} over ${f.pairs}`);
    checks.cPlus1 = { counts, F1: rd(f.F1, 4), pairs: f.pairs, passed: true };
    checks.handOrbits = { minus1UnderPlus3: '-1 -> 0 -> 0 (cycle [0])', minus1UnderMinus3: '-1 -> -6 -> -3 -> -12 -> -6 (cycle [-3, -12, -6])', location: 'js/tests/imaiVariedConstants.test.js', passed: 'see test run' };
}
log('sanity 1 passed');

// ---------- main range, both sides (mirror check 2) ----------
const perC = {};
const describe = r => ({
    cycles: r.cycles.map(x => ({ key: x.key, length: x.cycle.length, elements: x.cycle, count: x.count })),
    unsettled: r.unsettled, escaped: r.escaped, maxStepsToCycle: r.maxSteps,
});
const mirror = {};
for (const c of CS) {
    const neg = timed(`c=${c} negatives`, () => classifyRange(c, N_MAIN, -1));
    const pos = timed(`c=${-c} positives`, () => classifyRange(-c, N_MAIN, 1));
    const negSet = neg.r.cycles.map(x => cycleSetKey(x.cycle.map(v => -v))).sort();
    const posSet = pos.r.cycles.map(x => cycleSetKey(x.cycle)).sort();
    let perN = 0;
    for (let i = 0; i < neg.r.codes.length; i++) {
        const a = neg.r.codes[i], b = pos.r.codes[i];
        const ka = a >= 0 ? cycleSetKey(neg.r.cycles[a].cycle.map(v => -v)) : `status${a}`;
        const kb = b >= 0 ? cycleSetKey(pos.r.cycles[b].cycle) : `status${b}`;
        if (ka === kb) perN++;
    }
    if (JSON.stringify(negSet) !== JSON.stringify(posSet) || perN !== neg.r.codes.length || neg.r.unsettled !== pos.r.unsettled || neg.r.escaped !== pos.r.escaped) fail(`mirror identity fails for c = ${c}`);
    mirror[c] = {
        negativesUnderTc: { cycles: neg.r.cycles.map(x => x.cycle), unsettled: neg.r.unsettled, escaped: neg.r.escaped },
        positivesUnderTminusC: { cycles: pos.r.cycles.map(x => x.cycle), unsettled: pos.r.unsettled, escaped: pos.r.escaped },
        cycleSetsMatchAfterNegation: true, nWithMirroredFate: perN, of: neg.r.codes.length,
    };
    const f = f1AndBaseline(neg.r);
    perC[c] = {
        map: `T(n) = n/2 (n even), 3n ${c > 0 ? '+' : '-'} ${Math.abs(c)} (n odd)`,
        main: {
            range: `odd n, -${N_MAIN} <= n <= -1 (${neg.r.codes.length} values)`, seconds: rd(neg.seconds, 2),
            ...describe(neg.r),
            shares: Object.fromEntries(neg.r.cycles.map((x, i) => [x.key, rd(f.shares[i])])),
            F1: rd(f.F1), baseline: rd(f.baseline), excess: rd(f.F1 - f.baseline), pairs: f.pairs, same: f.same,
        },
        _r: neg.r,
    };
    log(`c=${c}: ${neg.r.cycles.length} cycles, F1 ${f.F1.toFixed(4)} vs ${f.baseline.toFixed(4)}`);
}
checks.mirror = { range: `|n| <= ${N_MAIN}, odd, both sides classified independently with the same classifier and caps`, perC: mirror, passed: true };
log('mirror check passed');

// ---------- extended range for c with >= 2 fates at >= 5% ----------
for (const c of CS) {
    const sh = Object.values(perC[c].main.shares);
    const qualifies = sh.filter(p => p >= 0.05).length >= 2;
    perC[c].qualifiesForExtension = qualifies;
    if (!qualifies) continue;
    const ext = timed(`c=${c} extended`, () => classifyRange(c, N_EXT, -1));
    const f = f1AndBaseline(ext.r);
    perC[c].extended = {
        range: `odd n, -${N_EXT} <= n <= -1 (${ext.r.codes.length} values)`, seconds: rd(ext.seconds, 2),
        ...describe(ext.r),
        shares: Object.fromEntries(ext.r.cycles.map((x, i) => [x.key, rd(f.shares[i])])),
        F1: rd(f.F1), baseline: rd(f.baseline), excess: rd(f.F1 - f.baseline), pairs: f.pairs, same: f.same,
    };
    perC[c]._ext = ext.r;
    log(`c=${c} extended: F1 ${f.F1.toFixed(4)} vs ${f.baseline.toFixed(4)} (${ext.seconds.toFixed(1)} s)`);
}
if (perC[1].extended && perC[1].extended.F1.toFixed(4) !== '0.4696') fail(`c = +1 at |n| <= ${N_EXT}: F(1) ${perC[1].extended.F1}, published 0.4696`);

// ---------- arithmetic structure ----------
const structure = {};
// c = +3: fate(n) = 3 x fate_{+1}(odd part of n + 1) for n != -1; F(1) pairs (n, n - 2) <-> consecutive integers m, m + 1
{
    const r = perC[3]._r;
    let pairs = 0, same = 0, idOK = true;
    for (let i = 1; i < r.codes.length; i++) {
        const n = -(2 * i + 1);
        const k3 = cycleSetKey(r.cycles[r.codes[i]].cycle.map(v => v / 3));
        if (k3 !== cycleSetKey(classify(odd(n + 1), 1).cycle)) idOK = false;
    }
    // consecutive integers m, m + 1 (m = 1..16382) under c = +1, each by its odd part
    for (let m = 1; m < 16383; m++) {
        pairs++;
        if (cycleSetKey(classify(-odd(m), 1).cycle) === cycleSetKey(classify(-odd(m + 1), 1).cycle)) same++;
    }
    let p3 = 0, s3 = 0;
    for (let i = 2; i < r.codes.length; i++) { p3++; if (r.codes[i] === r.codes[i - 1]) s3++; }
    structure.cPlus3 = {
        statement: 'for odd n != -1, T_3(n) = 3(n + 1); so the fate of n is 3 x (the c = +1 fate of the odd part of n + 1), and the pair (n, n - 2) corresponds to the consecutive integers m = (|n| - 1)/2 and m + 1 under c = +1',
        identityHoldsForEveryN: idOK,
        F1ExcludingNMinus1: { pairs: p3, same: s3, F1: rd(s3 / p3) },
        consecutiveIntegersUnderCPlus1: { m: '1..16383', pairs, same, agreement: rd(same / pairs) },
        equal: p3 === pairs && s3 === same,
    };
    if (!idOK || p3 !== pairs || s3 !== same) fail('c = +3 identity');
}
// c = +-5: residues mod 5 are invariant; multiples of 5 carry 5 x the c = +-1 partition
for (const c of [5, -5]) {
    const r = perC[c]._r;
    const isM5 = i => (2 * i + 1) % 5 === 0;
    const m5Keys = new Set(), otherKeys = new Set();
    for (let i = 0; i < r.codes.length; i++) (isM5(i) ? m5Keys : otherKeys).add(r.cycles[r.codes[i]].key);
    // pairs touching a multiple of 5
    let mixedPairs = 0, mixedSame = 0, inPairs = 0, inSame = 0;
    const inCounts = new Map();
    for (let i = 0; i < r.codes.length; i++) if (!isM5(i)) inCounts.set(r.codes[i], (inCounts.get(r.codes[i]) ?? 0) + 1);
    for (let i = 1; i < r.codes.length; i++) {
        if (isM5(i) || isM5(i - 1)) { mixedPairs++; if (r.codes[i] === r.codes[i - 1]) mixedSame++; }
        else { inPairs++; if (r.codes[i] === r.codes[i - 1]) inSame++; }
    }
    const inTot = [...inCounts.values()].reduce((a, b) => a + b, 0);
    const inBase = [...inCounts.values()].reduce((a, v) => a + (v / inTot) ** 2, 0);
    // multiples of 5: 5m with m odd; consecutive multiples (n, n - 10) <-> consecutive odd m under c / 5
    let idOK = true, mp = 0, ms = 0;
    const sub = classifyRange(c / 5, Math.floor(N_MAIN / 5), -1);
    for (let i = 0; i < r.codes.length; i++) {
        if (!isM5(i)) continue;
        const n = -(2 * i + 1), m = n / 5;
        if (cycleSetKey(r.cycles[r.codes[i]].cycle.map(v => v / 5)) !== cycleSetKey(classify(m, c / 5).cycle)) idOK = false;
    }
    for (let i = 0; i < r.codes.length; i++) {
        const j = i - 5; // n - 10
        if (!isM5(i) || j < 0) continue;
        mp++; if (r.codes[i] === r.codes[j]) ms++;
    }
    const subF = f1AndBaseline(sub);
    const otherShare = Object.fromEntries([...inCounts.entries()].map(([k, v]) => [r.cycles[k].key, rd(v / inTot)]));
    structure[`c${c > 0 ? 'Plus' : 'Minus'}5`] = {
        statement: `3n ${c > 0 ? '+' : '-'} 5 = 3n (mod 5) and halving keeps the residue, so multiples of 5 never enter or leave their class; on it T_${c}(5m) = 5 T_${c / 5}(m)`,
        cyclesOnMultiplesOf5: [...m5Keys], cyclesOnOtherOdd: [...otherKeys], classesDisjoint: [...m5Keys].every(k => !otherKeys.has(k)),
        multiplesOf5Are5xCpm1: idOK,
        pairsTouchingAMultipleOf5: { pairs: mixedPairs, same: mixedSame, note: 'never agree: the two classes have disjoint cycle sets' },
        pairsWithinNonMultiples: { pairs: inPairs, same: inSame, F1: rd(inSame / inPairs), baseline: rd(inBase), excess: rd(inSame / inPairs - inBase), shares: otherShare },
        consecutiveMultiplesOf5: { pairs: mp, same: ms, agreement: rd(ms / mp), equalsCpm1F1OverOddM: { range: `|m| <= ${Math.floor(N_MAIN / 5)}`, pairs: subF.pairs, same: subF.same, F1: rd(subF.F1) } },
    };
    if (!idOK || mixedSame !== 0) fail(`c = ${c} mod-5 structure`);
    log(`c=${c}: within non-multiples F1 ${(inSame / inPairs).toFixed(4)} vs ${inBase.toFixed(4)}`);
}
// c = -5, the one genuine partition: agreement within the non-multiples of 5 at the extended range too
{
    const r = perC[-5]._ext;
    const isM5 = i => (2 * i + 1) % 5 === 0;
    let p = 0, s = 0;
    const cnt = new Map();
    for (let i = 0; i < r.codes.length; i++) if (!isM5(i)) cnt.set(r.codes[i], (cnt.get(r.codes[i]) ?? 0) + 1);
    for (let i = 1; i < r.codes.length; i++) if (!isM5(i) && !isM5(i - 1)) { p++; if (r.codes[i] === r.codes[i - 1]) s++; }
    const tot = [...cnt.values()].reduce((a, b) => a + b, 0);
    const base = [...cnt.values()].reduce((a, v) => a + (v / tot) ** 2, 0);
    structure.cMinus5.pairsWithinNonMultiplesExtended = {
        range: `odd n, -${N_EXT} <= n <= -1`, pairs: p, same: s, F1: rd(s / p), baseline: rd(base), excess: rd(s / p - base),
        naiveSe: rd(Math.sqrt((s / p) * (1 - s / p) / p)),
        shares: Object.fromEntries([...cnt.entries()].map(([k, v]) => [r.cycles[k].key, rd(v / tot)])),
    };
    log(`c=-5 extended within non-multiples: F1 ${(s / p).toFixed(4)} vs ${base.toFixed(4)} (${p} pairs)`);
}
for (const c of CS) { delete perC[c]._r; delete perC[c]._ext; }

const report = {
    note: "Build 10 is Franklin's own question, following Imai's multiplier question of Build 4 (which varied m for the +1 maps).",
    domain: 'negative integers; odd n classified, even n follow their odd part',
    caps: { stepCap: STEP_CAP, magnitudeCap: '2^40', unsettled: 'step cap hit without a repeated value', escaped: '|value| > 2^40' },
    extensionRule: 'a c is extended to |n| <= 2^18 - 1 when two or more fates each hold >= 5% of the settled main range',
    sanityChecks: checks, perC, structure,
};
writeFileSync(join(OUT, 'varied-constants.json'), JSON.stringify(report, null, 1) + '\n');
log('json written');
console.log(JSON.stringify({ perC: Object.fromEntries(CS.map(c => [c, { main: { cyc: perC[c].main.cycles.map(x => x.key + ':' + x.count + '/' + x.length), F1: perC[c].main.F1, base: perC[c].main.baseline, pairs: perC[c].main.pairs, uns: perC[c].main.unsettled, esc: perC[c].main.escaped, shares: perC[c].main.shares }, ext: perC[c].extended ? { F1: perC[c].extended.F1, base: perC[c].extended.baseline, shares: perC[c].extended.shares, uns: perC[c].extended.unsettled, esc: perC[c].extended.escaped, s: perC[c].extended.seconds, pairs: perC[c].extended.pairs } : null }])), structure }));
