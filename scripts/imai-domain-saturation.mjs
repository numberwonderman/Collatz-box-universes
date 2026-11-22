// Build 11: does the domain component saturate? (Franklin's own question, Nov 2026)
// Writes docs/domain-saturation/domain-saturation.json.
//
//   node scripts/imai-domain-saturation.mjs        (from the repo root; ~10-12 min)
//
// Fates for every odd negative n with |n| <= 2^27 - 1 (needed for block B_26 = 2^26 <= |n| < 2^27
// in the Builds 6-8 convention), via fateCodes -> unchanged trajectoryFate, step cap 2000.
// Optional FATE_CACHE=path stores the Int8 codes so a rerun skips the sweep.

import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fateCodes, adjacentAgreement } from '../js/imaiFateCorrelation.js';
import { windowF, blockRange } from '../js/imaiFateMap.js';
import { blockSplit, increments } from '../js/imaiDomainSaturation.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'docs', 'domain-saturation');
mkdirSync(OUT, { recursive: true });
const t0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)} s]`, ...a);
const rd = (x, d = 5) => (x === null || x === undefined ? null : +x.toFixed(d));
const fail = msg => { console.error(`SANITY CHECK FAILED: ${msg}`); process.exit(1); };
const CHUNK_LIMIT_S = 60;   // one 2^20-value chunk normally takes ~9 s
const BLOCK_LIMIT_S = 120;  // one block split normally takes a few seconds

const K_MAX = 27, N = 2 ** K_MAX - 1;
const CACHE = process.env.FATE_CACHE;
let codes, unsettled;
if (CACHE && existsSync(CACHE + '.json') && JSON.parse(readFileSync(CACHE + '.json', 'utf8')).N === N) {
    codes = new Int8Array(readFileSync(CACHE).buffer.slice(0));
    ({ unsettled } = JSON.parse(readFileSync(CACHE + '.json', 'utf8')));
    log(`fates loaded from cache (${codes.length} values)`);
} else {
    let last = Date.now();
    ({ codes, unsettled } = fateCodes({
        N, m: 3, c: 1, maxSteps: 2000, sign: -1,
        onProgress: i => {
            if (!i) return;
            const s = (Date.now() - last) / 1000; last = Date.now();
            if (s > CHUNK_LIMIT_S) {
                const a = 2 * i + 1;
                console.error(`STOP: fate sweep slowed to ${s.toFixed(0)} s per 2^20 values; reached |n| = ${a.toLocaleString('en-US')} (block B_${Math.floor(Math.log2(a))}) of ${N.toLocaleString('en-US')}`);
                process.exit(2);
            }
            if ((i & 0x3fffff) === 0) log(`fates: ${i.toLocaleString('en-US')} / ${((N + 1) / 2).toLocaleString('en-US')}`);
        },
    }));
    if (CACHE) { writeFileSync(CACHE, codes); writeFileSync(CACHE + '.json', JSON.stringify({ N, unsettled })); }
}
log(`fate table |n| <= ${N}: ${codes.length} odd n, unsettled ${JSON.stringify(unsettled)}`);
if (unsettled.cap || unsettled.overflow) fail(`unsettled orbits ${JSON.stringify(unsettled)}`);

// ---------- sanity checks ----------
const checks = {};
{
    // 1. Build 8's B_21 decomposition
    const s = blockSplit(codes, 21, 1024);
    const ratio = s.Edom / s.E;
    if (Math.abs(s.residual - 0.13545) > 0.0005 || rd(ratio, 4) !== 0.2273) fail(`B_21: residual ${s.residual}, ratio ${ratio}`);
    checks.build8B21 = { residual: rd(s.residual), ratio: rd(ratio, 4), expected: { residual: 0.13545, ratio: 0.2273 }, passed: true };
    // 2. Build 5's ladder
    const f14 = windowF(codes, 0, 8192, 1);
    const p26 = adjacentAgreement(codes, 0, 2 ** 25);
    if (f14.pairs !== 8191 || +f14.F.toFixed(4) !== 0.4293) fail(`F(1) at 16383: ${f14.F} over ${f14.pairs}`);
    if (+p26.F.toFixed(4) !== 0.5245) fail(`cumulative F(1) at 2^26 - 1: ${p26.F}`);
    const fp = JSON.parse(readFileSync(join(ROOT, 'docs/fate-partition/fate-partition.json'), 'utf8'));
    const blocks = [];
    for (let k = 14; k <= 25; k++) {
        const ref = fp.ladder.find(x => x.k === k + 1).block; // fate-partition block k + 1 = B_k here
        const { from, to } = blockRange(k);
        const inside = windowF(codes, from + 1, to, 1);     // both members inside the block (fate-partition convention)
        if (inside.pairs !== ref.pairs || +inside.F.toFixed(5) !== ref.F1) fail(`B_${k}: inside-block F(1) ${inside.F} vs fate-partition ${ref.F1}`);
        blocks.push({ k, fatePartitionBlock: k + 1, F1InsideBlock: rd(inside.F), fatePartition: ref.F1 });
    }
    checks.build5Ladder = { F1At16383: rd(f14.F, 4), pairsAt16383: f14.pairs, cumulativeF1At2pow26m1: rd(p26.F, 4), cumulativePairs: p26.pairs, overlappingBlocks: blocks, passed: true,
        note: 'Build 5 numbers blocks one higher (its block k is 2^(k-1) <= |n| < 2^k). Its block values use pairs inside the block; this build\'s F(1) uses the fate-map convention, one extra pair per block, so the inside-block value is the one compared.' };
}
log('sanity checks 1-2 passed');

// ---------- the ladder ----------
const rows = [];
for (let k = 14; k <= 26; k++) {
    const t = Date.now();
    const s = blockSplit(codes, k, 1024);
    const sec = (Date.now() - t) / 1000;
    if (sec > BLOCK_LIMIT_S) { console.error(`STOP: block B_${k} took ${sec.toFixed(0)} s; blocks B_14..B_${k - 1} were completed`); process.exit(2); }
    if (Math.abs(s.Edom + s.residual - s.E) > 1e-12 || Math.abs(rd(s.Edom) + rd(s.residual) - rd(s.E)) > 1.5e-5) fail(`B_${k}: components do not sum`);
    rows.push(s);
    log(`B_${k}: F1 ${s.F1.toFixed(5)} E ${s.E.toFixed(5)} Edom ${s.Edom.toFixed(5)} residual ${s.residual.toFixed(5)} (${sec.toFixed(1)} s)`);
}
checks.componentsSum = { statement: 'E_dom + residual = E at every block (exact by construction; rounded values within 1.5e-5)', passed: true };
const inc = increments(rows);
// w-sensitivity at the largest block
const wSens = [256, 1024, 4096].map(w => {
    const s = blockSplit(codes, 26, w);
    return { w, Edom: rd(s.Edom), residual: rd(s.residual), shareOfE: rd(s.Edom / s.E, 4) };
});
log(`w-sensitivity B_26: ${wSens.map(x => `${x.w}: ${x.shareOfE}`).join(', ')}`);

const report = {
    note: "Build 11 is Franklin's own question, testing his own synthesis (21-22 Nov 2026); not an Imai request. Imai agreed to leave the domain growth law open in the joint note.",
    settings: {
        fates: `odd n, -${N} <= n <= -1 (${codes.length} values), 3n + 1, step cap 2000, all settled`,
        blocks: 'B_k = odd n with 2^k <= |n| < 2^(k+1) (Builds 6-8); k = 14..26',
        F1: 'fate-map convention (each n in B_k with n + 2; the lowest-|n| element pairs into B_(k-1))',
        decomposition: 'Build 8 primary setting: block-internal windows w = 1024, tau = 0.5 (tau only enters domain counting, not the split); E_dom = A_dom(1) - baseline; residual = E - E_dom',
    },
    sanityChecks: checks,
    blocks: rows.map(s => ({ k: s.k, size: s.size, pairs: s.pairs, F1: rd(s.F1), baseline: rd(s.baseline), shares: s.shares.map(v => rd(v)), E: rd(s.E), Edom: rd(s.Edom), residual: rd(s.residual), domainShareOfE: rd(s.Edom / s.E, 4) })),
    increments: inc.map(x => ({ from: x.from, to: x.to, dE: rd(x.dE), dEdom: rd(x.dEdom), dResidual: rd(x.dResidual), domainShareOfIncrement: rd(x.dEdom / x.dE, 3) })),
    wSensitivityLargestBlock: { block: 26, tau: 0.5, rows: wSens },
};
writeFileSync(join(OUT, 'domain-saturation.json'), JSON.stringify(report, null, 1) + '\n');
log('json written');
console.log(JSON.stringify({ checks: { b21: checks.build8B21, ladder: { f14: checks.build5Ladder.F1At16383, p26: checks.build5Ladder.cumulativeF1At2pow26m1 } }, blocks: report.blocks.map(b => [b.k, b.F1, b.baseline, b.E, b.Edom, b.residual, b.domainShareOfE]), inc: report.increments.map(x => [x.from + '->' + x.to, x.dE, x.dEdom, x.dResidual, x.domainShareOfIncrement]), wSens }));
