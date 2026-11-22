// Build 12: the depth-pairing table (Franklin's own question, Nov 2026).
// Writes docs/depth-pairing/depth-pairing.json.
//
//   node scripts/imai-depth-pairing.mjs           (from the repo root; ~30 s)

import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fateCodes } from '../js/imaiFateCorrelation.js';
import { depthTable, cellStats } from '../js/imaiDepthPairing.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'docs', 'depth-pairing');
mkdirSync(OUT, { recursive: true });
const t0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)} s]`, ...a);
const rd = (x, d = 5) => (x === null || x === undefined ? null : +x.toFixed(d));
const fail = msg => { console.error(`SANITY CHECK FAILED: ${msg}`); process.exit(1); };
const KEYS = [-1, -5, -17];

const { codes, unsettled } = fateCodes({ N: 2 ** 22 - 1 }); // j < 2^21
if (unsettled.cap || unsettled.overflow) fail('unsettled');
log('fate table done');
const b7 = JSON.parse(readFileSync(join(ROOT, 'docs/angular-fate/angular-fate.json'), 'utf8'));

const checks = {};
const out = {};
for (const K of [18, 21]) {
    const t = depthTable(codes, K);
    const ref = b7.part2[`K${K}`];
    // check 3: every pair is a Build 7 overlay pair
    if (t.pairs !== ref.a_overall.neighbourPairs) fail(`K = ${K}: ${t.pairs} pairs vs Build 7's ${ref.a_overall.neighbourPairs}`);
    // checks 1-2: overall agreement and the coarser-member marginal, cell by cell
    if (rd(t.same / t.pairs) !== ref.a_overall.agreement) fail(`K = ${K}: agreement ${t.same / t.pairs} vs ${ref.a_overall.agreement}`);
    for (const row of ref.byCoarserBlock) {
        const v = K - 1 - row.coarserBlock;
        const c = t.byCoarser.get(v);
        if (!c || c.pairs !== row.pairs || c.same !== row.same) fail(`K = ${K}, v = ${v}: ${c?.same}/${c?.pairs} vs ${row.same}/${row.pairs}`);
    }
    checks[`K${K}`] = {
        overallAgreement: rd(t.same / t.pairs), expected: ref.a_overall.agreement, pairs: t.pairs, expectedPairs: ref.a_overall.neighbourPairs,
        coarserMarginalMatchesBuild7: true,
        coarserMarginal: Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8].map(v => [v, rd(t.byCoarser.get(v).same / t.byCoarser.get(v).pairs, 4)])),
        passed: true,
    };
    const statsOf = c => { const s = cellStats(c); return { pairs: s.pairs, same: s.same, agreement: rd(s.agreement), pooledSumSquares: rd(s.pooledSumSquares), independentGivenSides: rd(s.independentGivenSides) }; };
    const sortNum = m => [...m.entries()].sort((a, b) => a[0] - b[0]);
    out[`K${K}`] = {
        pairs: t.pairs, agreement: rd(t.same / t.pairs),
        order: 'each pair listed coarser member (larger depth v) first',
        jointTable: [...t.joint.entries()].map(([k, c]) => { const [vc, vf] = k.split(',').map(Number); return { vCoarser: vc, vFiner: vf, ...statsOf(c) }; })
            .sort((a, b) => a.vCoarser - b.vCoarser || a.vFiner - b.vFiner),
        distinctFinerDepths: [...new Set([...t.joint.keys()].map(k => +k.split(',')[1]))],
        byMin: sortNum(t.byMin).map(([v, c]) => ({ v, ...statsOf(c) })),
        byMax: sortNum(t.byMax).map(([v, c]) => ({ v, ...statsOf(c) })),
        byCoarserBuild7: sortNum(t.byCoarser).map(([v, c]) => ({ v, ...statsOf(c) })),
        perFate: Object.fromEntries([1, 2, 3, 4].map(v => [v, t.peakByFate.get(v).map((c, f) => ({
            coarserFate: KEYS[f], pairs: c.pairs, same: c.same, agreement: rd(c.same / c.pairs),
            expectedIfIndependent: rd(t.byCoarser.get(v).finerFate[f] / t.byCoarser.get(v).pairs),
            note: 'expectedIfIndependent = share of fate f among the finer members of ALL pairs at this depth v: the agreement expected if the finer member were independent of the coarser one',
        }))])),
    };
    log(`K = ${K}: ${t.pairs} pairs, joint cells ${[...t.joint.keys()].join(' ')}`);
}
checks.syntheticHandCase = { location: 'js/tests/imaiDepthPairing.test.js', passed: 'see test run' };
const report = {
    note: "Build 12 is Franklin's own question, not an Imai request.",
    reuse: 'Build 7 exactly: Imai\'s placement, the cyclic overlay of j < 2^K, its neighbour pairs, and depth v = K - 1 - (j-block) of a circle point (v = v2(|n| +- 1) for the coarser member; j = 0 has v = K)',
    structuralFact: 'Build 7 proved every overlay pair joins a top-block point (v = 0) with a coarser point. So every pair falls in a cell (v, 0): the joint table is one column, the min marginal is identically 0, and the max marginal equals Build 7\'s coarser-member marginal.',
    sanityChecks: checks,
    ...out,
};
writeFileSync(join(OUT, 'depth-pairing.json'), JSON.stringify(report, null, 1) + '\n');
log('json written');
for (const K of [18, 21]) {
    console.log(`K${K} joint:`, out[`K${K}`].jointTable.filter(x => x.vCoarser <= 8).map(x => `(${x.vCoarser},${x.vFiner}) ${x.agreement} [${x.pooledSumSquares}|${x.independentGivenSides}] n=${x.pairs}`).join('  '));
    for (const v of [1, 2, 3, 4]) console.log(`  v=${v} by coarser fate:`, out[`K${K}`].perFate[v].map(x => `${x.coarserFate}: ${x.agreement} vs ${x.expectedIfIndependent} (n=${x.pairs})`).join('  '));
}
