// Build 14: does the residual still fall under a scaling window? (Franklin's own question, Nov 2026)
// Writes docs/scaling-window/scaling-window.json.
//
//   FATE_CACHE=<path written by scripts/imai-domain-saturation.mjs> node scripts/imai-scaling-window.mjs
//
// Reuses Build 11's fate table (odd n down to -(2^27 - 1)) from its FATE_CACHE file and does not
// recompute fates: without the cache it stops. Run Build 11's script with FATE_CACHE set to create it.

import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { splitAllSettings, residualIncrements, peakBlock, SETTINGS } from '../js/imaiScalingWindow.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'docs', 'scaling-window');
mkdirSync(OUT, { recursive: true });
const t0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)} s]`, ...a);
const rd = (x, d = 5) => (x === null || x === undefined ? null : +x.toFixed(d));
const fail = msg => { console.error(`SANITY CHECK FAILED: ${msg}`); process.exit(1); };
const BLOCK_LIMIT_S = 120;

const CACHE = process.env.FATE_CACHE;
const N = 2 ** 27 - 1;
if (!CACHE || !existsSync(CACHE) || !existsSync(CACHE + '.json')) {
    console.error('STOP: Build 11 fate cache not found (set FATE_CACHE). This build reuses that table and does not recompute fates.');
    process.exit(2);
}
const meta = JSON.parse(readFileSync(CACHE + '.json', 'utf8'));
if (meta.N !== N || meta.unsettled.cap || meta.unsettled.overflow) fail(`cache is for N = ${meta.N}, unsettled ${JSON.stringify(meta.unsettled)}`);
const codes = new Int8Array(readFileSync(CACHE).buffer.slice(0));
if (codes.length !== (N + 1) / 2) fail(`cache holds ${codes.length} codes`);
log(`Build 11 fate table loaded from cache: ${codes.length} odd n, unsettled ${JSON.stringify(meta.unsettled)}`);

const ref = JSON.parse(readFileSync(join(ROOT, 'docs/domain-saturation/domain-saturation.json'), 'utf8'));
const KS = [19, 20, 21, 22, 23, 24, 25, 26];
const rows = { fixed: [], scaling: [], halfScaling: [] };
for (const k of KS) {
    const t = Date.now();
    const s = splitAllSettings(codes, k);
    const sec = (Date.now() - t) / 1000;
    if (sec > BLOCK_LIMIT_S) { console.error(`STOP: block B_${k} took ${sec.toFixed(0)} s; B_19..B_${k - 1} completed`); process.exit(2); }
    for (const name of Object.keys(SETTINGS)) rows[name].push({ k, ...s[name] });
    log(`B_${k}: residual fixed ${s.fixed.residual.toFixed(5)} scaling ${s.scaling.residual.toFixed(5)} (w ${s.scaling.w}) half ${s.halfScaling.residual.toFixed(5)} (w ${s.halfScaling.w}) (${sec.toFixed(1)} s)`);
}

// ---------- sanity checks ----------
const checks = {};
{
    // 1. fixed rows = Build 11's committed table
    for (const r of rows.fixed) {
        const b = ref.blocks.find(x => x.k === r.k);
        for (const f of ['F1', 'baseline', 'E', 'Edom', 'residual']) if (rd(r[f]) !== b[f]) fail(`fixed B_${r.k} ${f}: ${rd(r[f])} vs Build 11 ${b[f]}`);
    }
    const b21 = rows.fixed.find(r => r.k === 21), b26 = rows.fixed.find(r => r.k === 26);
    if (rd(b21.Edom / b21.E, 4) !== 0.2273 || rd(b21.residual) !== 0.13545 || rd(b26.residual) !== 0.12577) fail('B_21 / B_26 headline values');
    checks.fixedEqualsBuild11 = { blocks: '19..26, all five quantities', B21: { domainShare: rd(b21.Edom / b21.E, 4), residual: rd(b21.residual) }, B26: { residual: rd(b26.residual) }, passed: true };
    // 2. coincidences
    const s20 = rows.scaling.find(r => r.k === 20), f20 = rows.fixed.find(r => r.k === 20);
    const h22 = rows.halfScaling.find(r => r.k === 22), f22 = rows.fixed.find(r => r.k === 22);
    if (s20.w !== 1024 || s20.Edom !== f20.Edom || s20.residual !== f20.residual || rd(s20.Edom) !== 0.0334 || rd(s20.residual) !== 0.1356) fail(`scaling B_20: ${s20.Edom} / ${s20.residual}`);
    if (h22.w !== 1024 || h22.Edom !== f22.Edom || h22.residual !== f22.residual || rd(h22.Edom) !== 0.04725 || rd(h22.residual) !== 0.13352) fail(`half-scaling B_22: ${h22.Edom} / ${h22.residual}`);
    checks.coincidences = { scalingB20: { w: s20.w, Edom: rd(s20.Edom), residual: rd(s20.residual) }, halfScalingB22: { w: h22.w, Edom: rd(h22.Edom), residual: rd(h22.residual) }, identicalToFixed: true, passed: true };
    // 3. F(1) identical; components sum
    for (const k of KS) {
        const f = rows.fixed.find(r => r.k === k), s = rows.scaling.find(r => r.k === k), h = rows.halfScaling.find(r => r.k === k);
        if (f.F1 !== s.F1 || f.F1 !== h.F1 || f.baseline !== s.baseline || f.baseline !== h.baseline) fail(`B_${k}: F(1) or baseline differs across settings`);
        for (const r of [f, s, h]) if (Math.abs(r.Edom + r.residual - r.E) > 1e-12) fail(`B_${k}: components do not sum`);
    }
    checks.F1IdenticalAndComponentsSum = { passed: true };
    checks.fateTable = { source: 'Build 11 cache (not recomputed)', N, values: codes.length, unsettled: meta.unsettled };
}
log('sanity checks passed');

const fmt = r => ({ k: r.k, w: r.w, windowsPerBlock: r.windows, F1: rd(r.F1), baseline: rd(r.baseline), E: rd(r.E), Edom: rd(r.Edom), residual: rd(r.residual), domainShare: rd(r.Edom / r.E, 4) });
const out = {};
for (const name of Object.keys(SETTINGS)) {
    const inc = residualIncrements(rows[name]);
    out[name] = {
        windowRule: { fixed: 'w = 1024', scaling: 'w_k = 2^(k-10), 512 windows per block', halfScaling: 'w_k = 2^(k-12), 2,048 windows per block' }[name],
        rows: rows[name].map(fmt),
        residualIncrements: inc.map(x => ({ from: x.from, to: x.to, dResidual: rd(x.dResidual), dEdom: rd(x.dEdom) })),
        residualPeakBlock: peakBlock(rows[name]),
    };
}
const report = {
    note: "Build 14 is Franklin's own question, testing Build 11's own caveat (the residual's fall may be an artefact of a fixed window). Not an Imai request.",
    settings: 'Build 11 split unchanged (blockSplit): blocks B_k = odd n with 2^k <= |n| < 2^(k+1); fate-map pair convention; block-internal windows; the lowest-|n| element pairs into B_(k-1), tiled at the same w',
    sanityChecks: checks,
    ...out,
};
writeFileSync(join(OUT, 'scaling-window.json'), JSON.stringify(report, null, 1) + '\n');
log('json written');
for (const name of Object.keys(SETTINGS)) console.log(name, 'peak B_' + out[name].residualPeakBlock, '| residual', out[name].rows.map(r => `${r.k}:${r.residual}`).join(' '), '| d', out[name].residualIncrements.map(x => x.dResidual).join(' '), '| share', out[name].rows.map(r => r.domainShare).join(' '));
