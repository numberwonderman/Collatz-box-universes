// Fate-dominated domains: sizes, and how much of F they explain (Nov 2026).
// Writes docs/domains/domains.json and two PNGs.
//
//   node scripts/imai-domains.mjs                 (from the repo root; ~1 min)
//
// Fates: fateCodes (js/imaiFateCorrelation.js) -> unchanged trajectoryFate,
// step cap 2000, odd negative n with |n| <= 2^22 - 1.

import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { fateCodes } from '../js/imaiFateCorrelation.js';
import { windowF, windowBaseline, slidingWindows, blockRange } from '../js/imaiFateMap.js';
import { tileWindows, blockDomainStats, windowShareTable, domainPrediction, fitAlpha, fitLine } from '../js/imaiDomains.js';
import { mulberry32 } from '../js/eocRealizers.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'docs', 'domains');
mkdirSync(OUT, { recursive: true });
const t0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)} s]`, ...a);
const rd = (x, d = 5) => (x === null || x === undefined || Number.isNaN(x) ? null : +x.toFixed(d));
const fail = msg => { console.error(`SANITY CHECK FAILED: ${msg}`); process.exit(1); };
const KEYS = [-1, -5, -17];

const N = 2 ** 22 - 1;
const { codes, unsettled } = fateCodes({ N, m: 3, c: 1, maxSteps: 2000, sign: -1 });
log(`fate table ${codes.length} odd n, unsettled ${JSON.stringify(unsettled)}`);

// ---------- sanity checks ----------
const checks = {};
{
    if (unsettled.cap || unsettled.overflow) fail('unsettled orbits');
    const c = windowBaseline(codes, 0, 8192).counts;
    if (c.join() !== '2673,2667,2852') fail(`counts ${c}`);
    const f1 = windowF(codes, 0, 8192, 1);
    if (f1.pairs !== 8191 || +f1.F.toFixed(4) !== 0.4293) fail(`F(1) ${f1.F} over ${f1.pairs}`);
    checks.fateTable = { range: `|n| <= ${N}`, values: codes.length, unsettled, counts16383: { [-1]: 2673, [-5]: 2667, [-17]: 2852 }, F1: 0.4293, pairs: 8191, passed: true };
}
{
    const fm = JSON.parse(readFileSync(join(ROOT, 'docs/fate-map/fate-map.json'), 'utf8'));
    // (a) Map B windows: baseline range
    const bl = slidingWindows(2 ** 12, 16384, 4096, codes.length).map(w => windowBaseline(codes, w.from, w.to).baseline);
    const lo = rd(Math.min(...bl)), hi = rd(Math.max(...bl));
    if (lo !== fm.summaries.mapBBaselines.min || hi !== fm.summaries.mapBBaselines.max) fail(`Map B baselines [${lo}, ${hi}] vs [${fm.summaries.mapBBaselines.min}, ${fm.summaries.mapBBaselines.max}]`);
    // (b) B_21, 1,024-wide windows: single-fate share range and mean sd
    const { from, to } = blockRange(21);
    const sh = tileWindows(codes, from, to, 1024).map(w => w.shares);
    const sd = j => { const m = sh.reduce((a, x) => a + x[j], 0) / sh.length; return Math.sqrt(sh.reduce((a, x) => a + (x[j] - m) ** 2, 0) / (sh.length - 1)); };
    const meanSd = (sd(0) + sd(1) + sd(2)) / 3;
    const minShare = Math.min(...sh.flat()), maxShare = Math.max(...sh.flat());
    const ref = fm.summaries.shareFluctuation.find(x => x.windowSize === 1024 && x.k === 21);
    if (rd(meanSd, 4) !== ref.meanSd || rd(minShare, 3) !== 0.045 || rd(maxShare, 3) !== 0.685) fail(`B_21 w=1024: sd ${meanSd}, range [${minShare}, ${maxShare}]`);
    checks.colourMapWindows = {
        mapBBaselineRange: [lo, hi], expected: [0.33334, 0.36313],
        B21_w1024: { minShare: rd(minShare, 3), maxShare: rd(maxShare, 3), meanSd: rd(meanSd, 4), independentSd: rd(Math.sqrt((1 / 3) * (2 / 3) / 1024), 4), expected: { range: [0.045, 0.685], meanSd: 0.1152, independentSd: 0.0147 } },
        passed: true,
    };
    checks.syntheticHandCase = { location: 'js/tests/imaiDomains.test.js', passed: 'see test run' };
}
log('sanity checks passed');

// ---------- Part 1: domain-size distribution ----------
const SETTINGS = [
    { w: 1024, tau: 0.5, primary: true }, { w: 256, tau: 0.5 }, { w: 4096, tau: 0.5 }, { w: 1024, tau: 0.45 }, { w: 1024, tau: 0.55 },
];
const MIN_DOMAINS = 10; // a block enters the scaling fit only with at least this many domains
const part1 = [];
for (const s of SETTINGS) {
    const blocks = [];
    for (let k = 10; k <= 21; k++) {
        const { from, to } = blockRange(k);
        if (to - from < s.w) continue;
        const st = blockDomainStats(codes, k, s.w, s.tau);
        blocks.push({
            k, windows: st.windows, domains: st.domains, fractionInDomains: rd(st.fractionInDomains, 4),
            lengths: { ...st.lengths, mean: rd(st.lengths.mean, 1) },
            byFate: Object.fromEntries(Object.entries(st.byFate).map(([f, v]) => [KEYS[f], { ...v, mean: rd(v.mean, 1) }])),
            singleWindowDomains: st.domainList.filter(d => d.windows === 1).length,
        });
    }
    const inFit = blocks.filter(b => b.k >= 14 && b.k <= 21 && b.domains >= MIN_DOMAINS);
    const fitMean = fitAlpha(inFit.map(b => ({ k: b.k, size: b.lengths.mean })));
    const fitMedian = fitAlpha(inFit.map(b => ({ k: b.k, size: b.lengths.median })));
    const fitFrac = fitLine(inFit.map(b => b.k), inFit.map(b => Math.log2(b.fractionInDomains)));
    part1.push({
        setting: s, blocks,
        scalingFit: {
            rule: `blocks k = 14..21 with at least ${MIN_DOMAINS} domains`,
            blocksUsed: inFit.map(b => b.k),
            blocksWithoutDomains: blocks.filter(b => b.k >= 14 && b.domains === 0).map(b => b.k),
            mean: { alpha: rd(fitMean.alpha, 3), r2: rd(fitMean.r2, 3) },
            median: { alpha: rd(fitMedian.alpha, 3), r2: rd(fitMedian.r2, 3), note: 'domain lengths are whole multiples of w, so the median cannot fall below w' },
            fractionInDomains: { slopePerDoubling: rd(fitFrac.slope, 3), r2: rd(fitFrac.r2, 3) },
        },
    });
    log(`Part 1 w=${s.w} tau=${s.tau}: fit blocks ${inFit.map(b => b.k)} alpha(mean) ${fitMean.alpha?.toFixed(3)} r2 ${fitMean.r2?.toFixed(3)}`);
}
// companion: sd of window shares against w, per block
const sdTable = [];
for (let k = 14; k <= 21; k++) {
    const { from, to } = blockRange(k);
    const row = { k, byW: [] };
    for (const w of [256, 1024, 4096, 16384]) {
        const sh = tileWindows(codes, from, to, w).map(x => x.shares);
        if (sh.length < 4) continue;
        const sd = j => { const m = sh.reduce((a, x) => a + x[j], 0) / sh.length; return Math.sqrt(sh.reduce((a, x) => a + (x[j] - m) ** 2, 0) / (sh.length - 1)); };
        const meanSd = (sd(0) + sd(1) + sd(2)) / 3, ind = Math.sqrt((1 / 3) * (2 / 3) / w);
        row.byW.push({ w, windows: sh.length, meanSd: rd(meanSd, 4), independentSd: rd(ind, 4), varianceInflation: rd((meanSd / ind) ** 2, 1) });
    }
    if (row.byW.length >= 2) {
        const f = fitLine(row.byW.map(x => Math.log2(x.w)), row.byW.map(x => Math.log2(x.meanSd)));
        row.decayExponent = rd(f.slope, 3); row.decayR2 = rd(f.r2, 3);
    }
    sdTable.push(row);
}
log('share-sd table done');

// ---------- Part 2: domain contribution to F ----------
const R = 128;
const fm = JSON.parse(readFileSync(join(ROOT, 'docs/fate-map/fate-map.json'), 'utf8'));
function part2For(w, codesUsed, full) {
    const table = windowShareTable(codesUsed, 13, 21, w);
    const out = [];
    for (let k = 14; k <= 21; k++) {
        const { from, to } = blockRange(k);
        const base = windowBaseline(codesUsed, from, to).baseline;
        const rows = [];
        for (let r = 1; r <= (full ? R : 1); r++) {
            const F = windowF(codesUsed, from, to, r);
            const p = domainPrediction(codesUsed, table, from, to, r);
            const E = F.F - base, Ed = p.Adom - base;
            rows.push({ r, E, Edom: Ed, residual: E - Ed, pairs: F.pairs, pairsPred: p.pairs });
        }
        out.push({ k, baseline: base, rows });
    }
    return out;
}
const primary = part2For(1024, codes, true);
// check E_k(r) against fate-map.json Map A (same convention)
let maxDiff = 0;
for (const b of primary) {
    const ref = fm.mapA.rows.find(x => x.k === b.k);
    for (const x of b.rows) maxDiff = Math.max(maxDiff, Math.abs(+x.E.toFixed(5) - ref.excess[x.r - 1]));
}
if (maxDiff > 1e-5) fail(`E_k(r) differs from fate-map.json by ${maxDiff}`);
checks.excessMatchesFateMap = { blocks: '14..21', r: '1..128', maxAbsDiffAt5dp: maxDiff, passed: true };
log(`Part 2 primary done (E_k(r) matches fate-map.json, max diff ${maxDiff})`);
// independence floor: fates shuffled within each block, same tiling
const shuffled = Int8Array.from(codes);
{
    const rng = mulberry32(2611);
    for (let k = 13; k <= 21; k++) {
        const { from, to } = blockRange(k);
        for (let i = to - 1; i > from; i--) { const j = from + Math.floor(rng() * (i - from + 1)); const t = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = t; }
    }
}
const floor = part2For(1024, shuffled, false);
const robust = { 256: part2For(256, codes, false), 4096: part2For(4096, codes, false) };
const vif1024 = k => sdTable.find(x => x.k === k)?.byW.find(x => x.w === 1024)?.varianceInflation ?? null;
const part2 = primary.map((b, i) => {
    const r1 = b.rows[0];
    const ratios = b.rows.map(x => x.Edom / x.E);
    const se = Math.sqrt((r1.E + b.baseline) * (1 - r1.E - b.baseline) / r1.pairs);
    const vif = vif1024(b.k);
    return {
        k: b.k, baseline: rd(b.baseline),
        r1: {
            E: rd(r1.E), Edom: rd(r1.Edom), ratio: rd(r1.Edom / r1.E, 4), residual: rd(r1.residual),
            naiveSeF1: rd(se, 5), roughSeWithVIF: vif ? rd(se * Math.sqrt(vif), 5) : null,
            EdomShuffledFloor: rd(floor[i].rows[0].Edom, 5),
        },
        meanRatio_r1to128: rd(ratios.reduce((a, b) => a + b, 0) / ratios.length, 4),
        ratioAt: Object.fromEntries([1, 8, 32, 64, 128].map(r => [r, rd(ratios[r - 1], 4)])),
        robustnessRatioR1: { 256: rd(robust[256][i].rows[0].Edom / robust[256][i].rows[0].E, 4), 1024: rd(r1.Edom / r1.E, 4), 4096: rd(robust[4096][i].rows[0].Edom / robust[4096][i].rows[0].E, 4) },
        E: b.rows.map(x => rd(x.E)), Edom: b.rows.map(x => rd(x.Edom)),
    };
});
log('Part 2 done');

const report = {
    definitions: {
        fates: 'L(n) for odd negative n under 3n + 1 (cycle -1, -5 or -17), trajectoryFate, step cap 2000',
        blocks: 'B_k = odd n with 2^k <= |n| < 2^(k+1)',
        windows: 'non-overlapping tiles of w consecutive odd n within one block, increasing |n|, from the block\'s lowest |n|',
        dominated: 'one fate has share >= tau in the window',
        domain: 'maximal run of consecutive windows of one block dominated by the same fate; length = windows * w odd integers; runs stop at block boundaries',
        F: 'F_W(r) with the fate-map pair convention; baseline = sum p^2 over the block; excess = F - baseline',
        domainPrediction: 'A_dom(r) = mean over pairs (n, n + 2r) of sum_i p_i(W(n)) p_i(W(n + 2r)), W(x) = the w-window containing x (block tiling); E_dom = A_dom - baseline',
    },
    sanityChecks: checks,
    part1: { settings: part1, shareSdVersusW: sdTable, minDomainsForFit: MIN_DOMAINS },
    part2: { primaryW: 1024, blocks: part2 },
};
writeFileSync(join(OUT, 'domains.json'), JSON.stringify(report) + '\n');
log('json written');

// ---------- plots ----------
const browser = await chromium.launch().catch(() =>
    chromium.launch({ executablePath: process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium' }));
const page = await browser.newPage();
await page.setContent('<canvas id="c"></canvas>');
async function chart(file, spec) {
    const url = await page.evaluate(spec => {
        const C = { surface: '#fcfcfb', text: '#1a1a19', text2: '#5f5e58', muted: '#8c8b84', grid: '#e7e6e1', axis: '#b9b8b0' };
        const W = 1100, H = 640, L = 86, R = 190, T = 100, B = 92;
        const c = document.getElementById('c'); c.width = W * 2; c.height = H * 2;
        const g = c.getContext('2d'); g.scale(2, 2);
        g.fillStyle = C.surface; g.fillRect(0, 0, W, H);
        g.fillStyle = C.text; g.font = '600 19px system-ui, sans-serif'; g.textBaseline = 'top'; g.fillText(spec.title, L, 16);
        g.font = '13px system-ui, sans-serif'; g.fillStyle = C.text2; spec.subtitle.forEach((s, i) => g.fillText(s, L, 44 + 18 * i));
        const PW = W - L - R, PH = H - T - B;
        const tx = v => (spec.logX ? Math.log2(v) : v), ty = v => (spec.logY ? Math.log2(v) : v);
        const X = v => L + (tx(v) - tx(spec.x[0])) / (tx(spec.x[1]) - tx(spec.x[0])) * PW;
        const Y = v => T + (ty(spec.y[1]) - ty(v)) / (ty(spec.y[1]) - ty(spec.y[0])) * PH;
        g.font = '12px system-ui, sans-serif'; g.textBaseline = 'middle';
        for (const v of spec.yTicks) { g.strokeStyle = C.grid; g.lineWidth = 1; g.beginPath(); g.moveTo(L, Y(v)); g.lineTo(L + PW, Y(v)); g.stroke(); g.fillStyle = C.muted; g.textAlign = 'right'; g.fillText(spec.yFmt === 'int' ? v.toLocaleString('en-US') : v.toFixed(2), L - 8, Y(v)); }
        g.strokeStyle = C.axis; g.beginPath(); g.moveTo(L, T + PH); g.lineTo(L + PW, T + PH); g.stroke();
        g.textAlign = 'center'; g.textBaseline = 'top';
        for (const [v, lab] of spec.xTicks) { g.fillStyle = C.muted; g.fillText(lab, X(v), T + PH + 6); }
        g.fillStyle = C.text2; g.font = '13px system-ui, sans-serif'; g.fillText(spec.xLabel, L + PW / 2, T + PH + 28);
        g.save(); g.translate(18, T + PH / 2); g.rotate(-Math.PI / 2); g.fillText(spec.yLabel, 0, 0); g.restore();
        for (const s of spec.series) {
            g.strokeStyle = s.colour; g.lineWidth = 2; g.setLineDash(s.dash ?? []);
            g.beginPath(); s.points.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y)))); g.stroke(); g.setLineDash([]);
            if (s.markers) for (const [x, y] of s.points) { g.beginPath(); g.arc(X(x), Y(y), 4.5, 0, 2 * Math.PI); g.fillStyle = s.colour; g.fill(); g.strokeStyle = C.surface; g.lineWidth = 2; g.stroke(); }
            if (s.label) { const [lx, ly] = s.points[s.points.length - 1]; g.fillStyle = C.text; g.textAlign = 'left'; g.textBaseline = 'middle'; g.font = '13px system-ui, sans-serif'; g.fillText(s.label, X(lx) + 10, Y(ly) + (s.dy ?? 0)); }
        }
        let ly = T + 6; g.font = '13px system-ui, sans-serif'; g.textAlign = 'right'; g.textBaseline = 'middle';
        for (const s of spec.series.filter(x => x.legend)) {
            g.fillStyle = C.text; g.fillText(s.legend, L + PW - 30, ly);
            g.strokeStyle = s.colour; g.lineWidth = 2; g.setLineDash(s.dash ?? []); g.beginPath(); g.moveTo(L + PW - 24, ly); g.lineTo(L + PW - 4, ly); g.stroke(); g.setLineDash([]);
            ly += 20;
        }
        g.fillStyle = C.muted; g.font = '12px system-ui, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'bottom';
        spec.note.forEach((s, i, a) => g.fillText(s, L, H - 10 - 16 * (a.length - 1 - i)));
        return c.toDataURL('image/png');
    }, spec);
    writeFileSync(join(OUT, file), Buffer.from(url.split(',')[1], 'base64'));
}
const BLUE = '#2a78d6', ORANGE = '#eb6834', AQUA = '#1baf7a', GREY = '#8c8b84';
{
    const p = part1.find(x => x.setting.primary);
    const pts = p.blocks.filter(b => b.k >= 14 && b.domains > 0);
    const mid = k => 1.5 * 2 ** k;
    const fit = p.scalingFit.mean;
    const used = p.blocks.filter(b => p.scalingFit.blocksUsed.includes(b.k));
    const c0 = used.length ? Math.log2(used[0].lengths.mean) - fit.alpha * used[0].k : 0;
    await chart('domain-size-vs-scale.png', {
        title: 'Typical domain size against |n| (w = 1,024, τ = 0.5)',
        subtitle: [`Domains: runs of consecutive 1,024-wide windows dominated (share ≥ 0.5) by one fate, within a dyadic block. Log–log axes.`,
            `Blocks B_14–B_16 contain no domains and are not plotted; B_17 has 1. Fit over B_${p.scalingFit.blocksUsed[0]}–B_${p.scalingFit.blocksUsed.at(-1)} (≥ ${MIN_DOMAINS} domains).`],
        x: [mid(16.6), mid(21.4)], y: [700, 6000], logX: true, logY: true,
        xTicks: [17, 18, 19, 20, 21].map(k => [mid(k), `B_${k} (|n| ≈ ${(mid(k) / 1e6).toFixed(2)}M)`]), yTicks: [1024, 2048, 4096], yFmt: 'int',
        xLabel: 'block mid-|n| (log scale)', yLabel: 'domain length, odd integers (log scale)',
        series: [
            { colour: BLUE, legend: 'mean domain length', label: 'mean', markers: true, points: pts.map(b => [mid(b.k), b.lengths.mean]), dy: -8 },
            { colour: ORANGE, legend: 'median domain length', label: 'median', markers: true, points: pts.map(b => [mid(b.k), b.lengths.median]), dy: 8 },
            { colour: GREY, dash: [6, 4], legend: `fit to mean: size ∝ |n|^${fit.alpha} (R² ${fit.r2})`, points: [16.8, 21.2].map(k => [mid(k), 2 ** (c0 + fit.alpha * k)]) },
            { colour: AQUA, dash: [2, 3], legend: 'one window (the resolution floor, 1,024)', points: [[mid(16.6), 1024], [mid(21.4), 1024]] },
        ],
        note: ['Domain lengths are whole multiples of w, so the median cannot fall below 1,024: it sits on the floor in every block.',
            'The mean grows slowly; the fraction of each block inside domains grows much faster (see notes and domains.json).'],
    });
}
{
    const b18 = part2.find(x => x.k === 18), b21 = part2.find(x => x.k === 21), b14 = part2.find(x => x.k === 14);
    const rs = Array.from({ length: R }, (_, i) => i + 1);
    await chart('domain-contribution.png', {
        title: 'Measured excess vs domain-only predicted excess, by separation r',
        subtitle: ['Solid: measured excess E_k(r) = F − Σp². Dashed: domain-only prediction E_dom,k(r), fates independent given their 1,024-window shares.',
            'The gap between solid and dashed is the pair-level structure the domains do not explain.'],
        x: [1, 128], y: [0, 0.19], logX: true,
        xTicks: [1, 2, 4, 8, 16, 32, 64, 128].map(r => [r, String(r)]), yTicks: [0, 0.05, 0.10, 0.15],
        xLabel: 'separation r (log scale)', yLabel: 'excess over the block baseline',
        series: [
            { colour: BLUE, legend: 'B_21 measured', points: rs.map(r => [r, b21.E[r - 1]]) },
            { colour: BLUE, dash: [6, 4], legend: 'B_21 domain-only', points: rs.map(r => [r, b21.Edom[r - 1]]) },
            { colour: ORANGE, legend: 'B_18 measured', points: rs.map(r => [r, b18.E[r - 1]]) },
            { colour: ORANGE, dash: [6, 4], legend: 'B_18 domain-only', points: rs.map(r => [r, b18.Edom[r - 1]]) },
            { colour: AQUA, legend: 'B_14 measured', points: rs.map(r => [r, b14.E[r - 1]]) },
            { colour: AQUA, dash: [6, 4], legend: 'B_14 domain-only', points: rs.map(r => [r, b14.Edom[r - 1]]) },
        ],
        note: [`Domains explain ${(b21.r1.ratio * 100).toFixed(0)}% of the r = 1 excess in B_21 (${(b18.r1.ratio * 100).toFixed(0)}% in B_18, ${(b14.r1.ratio * 100).toFixed(1)}% in B_14),`,
            `and ${(b21.ratioAt[128] * 100).toFixed(0)}% of it at r = 128 in B_21. Shuffled-fate floor of E_dom at r = 1: ≈ ${b21.r1.EdomShuffledFloor}.`],
    });
}
log('plots done');
await browser.close();
console.log(JSON.stringify({ checks, fits: part1.map(p => ({ s: p.setting, fit: p.scalingFit })), primaryBlocks: part1[0].blocks.filter(b => b.k >= 14).map(b => ({ k: b.k, d: b.domains, mean: b.lengths.mean, med: b.lengths.median, max: b.lengths.max, frac: b.fractionInDomains, single: b.singleWindowDomains, byFate: b.byFate })), sd: sdTable.map(r => ({ k: r.k, dec: r.decayExponent, r2: r.decayR2, vif: r.byW.map(x => x.w + ':' + x.varianceInflation) })), part2: part2.map(b => ({ k: b.k, r1: b.r1, mean: b.meanRatio_r1to128, at: b.ratioAt, rob: b.robustnessRatioR1 })) }));
