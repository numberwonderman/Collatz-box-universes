// Build 13: which component carries the 2-adic modulation? (Franklin's own question, Nov 2026)
// Writes docs/modulation-split/modulation-split.json.
//
//   node scripts/imai-modulation-split.mjs        (from the repo root; ~40 s)

import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fateCodes } from '../js/imaiFateCorrelation.js';
import { windowShareTable } from '../js/imaiDomains.js';
import { perRDecomposition, groupByV2, detrend } from '../js/imaiModulationSplit.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'docs', 'modulation-split');
mkdirSync(OUT, { recursive: true });
const t0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)} s]`, ...a);
const rd = (x, d = 5) => (x === null || x === undefined ? null : +x.toFixed(d));
const fail = msg => { console.error(`SANITY CHECK FAILED: ${msg}`); process.exit(1); };

const { codes, unsettled } = fateCodes({ N: 2 ** 22 - 1 }); // blocks to B_21
if (unsettled.cap || unsettled.overflow) fail('unsettled');
log('fate table done');
const table = windowShareTable(codes, 13, 21, 1024); // Build 8's primary tiling
const dom = JSON.parse(readFileSync(join(ROOT, 'docs/domains/domains.json'), 'utf8'));
const fm = JSON.parse(readFileSync(join(ROOT, 'docs/fate-map/fate-map.json'), 'utf8'));

const blocks = {};
for (const k of [21, 18]) {
    const d = perRDecomposition(codes, k, 128, 1024, table);
    // the per-r values must be Build 8's committed arrays and Build 6's committed excess
    const b8 = dom.part2.blocks.find(x => x.k === k), b6 = fm.mapA.rows.find(x => x.k === k);
    for (const x of d.rows) {
        if (rd(x.E) !== b8.E[x.r - 1] || rd(x.Edom) !== b8.Edom[x.r - 1]) fail(`B_${k} r=${x.r}: E/Edom differ from domains.json`);
        if (rd(x.E) !== b6.excess[x.r - 1]) fail(`B_${k} r=${x.r}: E differs from fate-map.json`);
        if (Math.abs(x.Edom + x.residual - x.E) > 1e-12) fail(`B_${k} r=${x.r}: components do not sum`);
    }
    blocks[k] = d;
    log(`B_${k} decomposed`);
}

// ---------- sanity checks ----------
const checks = {};
{
    const r21 = blocks[21].rows;
    const s1 = r21[0].Edom / r21[0].E, s128 = r21[127].Edom / r21[127].E;
    if (rd(s1, 3) !== 0.227 || rd(s128, 3) !== 0.651) fail(`B_21 shares ${s1}, ${s128}`);
    checks.build8Shares = { B21_r1: rd(s1, 4), B21_r128: rd(s128, 4), expected: { r1: 0.2273, r128: 0.6512 }, passed: true };
    const odd = r21.filter(x => x.v2 === 0), hi = r21.filter(x => x.v2 >= 3);
    const mOdd = odd.reduce((s, x) => s + x.E, 0) / odd.length, mHi = hi.reduce((s, x) => s + x.E, 0) / hi.length;
    if (rd(r21[0].E, 3) !== 0.175 || !(mHi > mOdd)) fail(`B_21: E(1) ${r21[0].E}, mean v2>=3 ${mHi} vs odd ${mOdd}`);
    checks.build6Totals = { B21_E1: rd(r21[0].E), meanExcessV2ge3: rd(mHi), meanExcessOdd: rd(mOdd), modulationPresent: true, perREqualsFateMapJson: true, passed: true };
    checks.componentsSum = { statement: 'E_dom + residual = E at every r in both blocks (exact; per-r E and E_dom also equal domains.json to 5 dp)', passed: true };
}
log('sanity checks passed');

const fmtG = g => g.map(x => ({ v2: x.v2, n: x.n, rs: x.rs, E: rd(x.E), Edom: rd(x.Edom), residual: rd(x.residual), shareDomain: rd(x.shareDom, 3), shareResidual: rd(x.shareRes, 3) }));
const fmtD = g => g.map(x => ({ v2: x.v2, n: x.n, rs: x.rs, E: rd(x.E, 6), Edom: rd(x.Edom, 6), residual: rd(x.residual, 6) }));
const out = {};
for (const k of [21, 18]) {
    const d = blocks[k];
    const det = detrend(d.rows);
    out[`B${k}`] = {
        baseline: rd(d.baseline),
        rawByV2: fmtG(groupByV2(d.rows)),
        detrendedByV2: fmtD(groupByV2(det).map(x => ({ ...x }))),
        perR: d.rows.map(x => ({ r: x.r, v2: x.v2, E: rd(x.E), Edom: rd(x.Edom), residual: rd(x.residual) })),
    };
}
const report = {
    note: "Build 13 is Franklin's own question, not an Imai request. A measurement, not a mechanism.",
    settings: {
        blocks: 'B_k = odd n with 2^k <= |n| < 2^(k+1); B_21 primary, B_18 stability check',
        F: "Build 6's pair convention (fate-map), r = 1..128",
        decomposition: "Build 8 primary setting: block-internal windows w = 1024 (tau = 0.5 only enters domain counting, not the split); E = F - baseline, E_dom = A_dom - baseline, residual = E - E_dom",
        groupings: {
            raw: 'mean over the r of each v2 group (as requested); confounded with the decay in r, since the groups sit at different r (v2 = 6, 7 are the single values r = 64, 128)',
            detrended: "Build 6's method: each r minus the mean of r-2, r-1, r+1, r+2 (3 <= r <= 126), then averaged by v2",
        },
    },
    sanityChecks: checks,
    ...out,
};
writeFileSync(join(OUT, 'modulation-split.json'), JSON.stringify(report, null, 1) + '\n');
log('json written');
for (const k of [21, 18]) {
    console.log(`B${k} raw:`, out[`B${k}`].rawByV2.map(x => `v${x.v2}(n${x.n}) E${x.E} D${x.Edom} R${x.residual} [${x.shareDomain}/${x.shareResidual}]`).join(' | '));
    console.log(`B${k} detrended:`, out[`B${k}`].detrendedByV2.map(x => `v${x.v2}(n${x.n}) E${x.E} D${x.Edom} R${x.residual}`).join(' | '));
}
