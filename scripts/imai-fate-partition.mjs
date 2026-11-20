// Fate partition portrait and F(1) convergence (Imai, 20 Nov 2026).
// Writes docs/fate-partition/fate-partition.json and the PNGs beside it.
//
//   node scripts/imai-fate-partition.mjs [kMax]     (from the repo root; default kMax = 26, ~5 min)
//
// Map: T(n) = n/2 (n even), 3n + 1 (n odd). L(n) = cycle reached by a negative
// odd n (-1, -5 or -17), via trajectoryFate (js/imaiFractalProbe.js), step cap
// 2000. Fates are computed once for |n| <= 2^kMax - 1; every smaller range is
// a prefix of that one computation.

import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import {
    fateCodes, runLengths, independentRunModel, simulateIndependentRuns, f1Ladder, adjacentAgreement,
} from '../js/imaiFateCorrelation.js';
import { mulberry32 } from '../js/eocRealizers.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'docs', 'fate-partition');
mkdirSync(OUT, { recursive: true });

const K_MAX = Number(process.argv[2] ?? 26);
const CAP = 2000;
const t0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)} s]`, ...a);
const round = (x, d = 4) => (x === null || x === undefined ? null : +x.toFixed(d));
const idxOf = a => (a - 1) / 2; // odd |n| -> code index
const nOf = i => -(2 * i + 1);

// ---------- one growing computation ----------
const N_MAX = 2 ** K_MAX - 1;
// Optional cache (FATE_CACHE=path): stores only the Int8 codes, keyed by N, to re-render without recomputing.
const CACHE = process.env.FATE_CACHE;
let codes, keys, unsettled;
if (CACHE && existsSync(CACHE + '.json') && JSON.parse(readFileSync(CACHE + '.json', 'utf8')).N === N_MAX) {
    const meta = JSON.parse(readFileSync(CACHE + '.json', 'utf8'));
    codes = new Int8Array(readFileSync(CACHE).buffer.slice(0));
    ({ keys, unsettled } = meta);
    log(`fates loaded from cache ${CACHE}`);
} else {
    ({ codes, keys, unsettled } = fateCodes({
        N: N_MAX, m: 3, c: 1, maxSteps: CAP, sign: -1,
        onProgress: i => i && log(`fates: ${i.toLocaleString()} / ${((N_MAX + 1) / 2).toLocaleString()}`),
    }));
    if (CACHE) {
        writeFileSync(CACHE, codes);
        writeFileSync(CACHE + '.json', JSON.stringify({ N: N_MAX, keys, unsettled }));
    }
}
log(`fates done for |n| <= ${N_MAX}; keys ${keys}; unsettled ${JSON.stringify(unsettled)}`);

// ---------- hard sanity checks ----------
const fail = msg => { console.error(`SANITY CHECK FAILED: ${msg}`); process.exit(1); };
{
    const c16 = [0, 0, 0];
    for (let i = 0; i < 8192; i++) c16[codes[i]]++;
    if (c16.join() !== '2673,2667,2852') fail(`fate counts at |n| <= 16383 are ${c16}, expected 2673,2667,2852`);
    const f14 = adjacentAgreement(codes, 0, 8192).F, f18 = adjacentAgreement(codes, 0, 131072).F;
    if (Math.abs(f14 - 0.4293) >= 5e-5) fail(`F(1) at |n| <= 16383 is ${f14}, expected 0.4293`);
    if (Math.abs(f18 - 0.4696) >= 5e-5) fail(`F(1) at |n| <= 262143 is ${f18}, expected 0.4696`);
    if (keys.length !== 3) fail(`unexpected cycles: ${keys}`);
    log(`sanity checks passed: counts 2673/2667/2852, F(1) ${f14.toFixed(4)} and ${f18.toFixed(4)}`);
}

const report = {
    map: 'T(n) = n/2 if n even, 3n + 1 if n odd; L(n) = cycle reached, labelled -1, -5, -17',
    stepCap: CAP,
    largestRange: `negative odd n, 1 <= |n| <= ${N_MAX} (${((N_MAX + 1) / 2).toLocaleString('en-US')} values)`,
    unsettled,
    blockConvention: 'block k = odd n with 2^(k-1) <= |n| < 2^k (block k here = block k-1 in the earlier fate-correlation notes)',
    sanityChecks: { countsAt16383: [2673, 2667, 2852], F1At16383: 0.4293, F1At262143: 0.4696, passed: true },
};

// ---------- Study 2: F(1) ladder ----------
const ladder = f1Ladder(codes, 10, K_MAX);
report.ladder = ladder.map(r => ({
    k: r.k, range: `|n| <= ${r.N}`,
    prefix: {
        pairs: r.prefix.pairs, F1: round(r.prefix.F, 5), delta: round(r.prefix.delta, 5),
        shares: Object.fromEntries(keys.map((k, i) => [k, round(r.prefix.shares[i], 5)])),
        sumSquares: round(r.prefix.shares.reduce((s, p) => s + p * p, 0), 5),
    },
    block: {
        range: `${r.block.from} <= |n| <= ${r.block.to}`, pairs: r.block.pairs, F1: round(r.block.F, 5),
        shares: Object.fromEntries(keys.map((k, i) => [k, round(r.block.shares[i], 5)])),
        // naive binomial standard error, ignores dependence between overlapping pairs
        seNaive: round(Math.sqrt(r.block.F * (1 - r.block.F) / r.block.pairs), 5),
    },
}));
{
    // labelled as a fit, not a measurement: least squares of block F(1) against k over the upper half of the ladder
    const pts = ladder.filter(r => r.k >= Math.ceil((10 + K_MAX) / 2)).map(r => [r.k, r.block.F]);
    const mx = pts.reduce((s, p) => s + p[0], 0) / pts.length, my = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    const sxx = pts.reduce((s, p) => s + (p[0] - mx) ** 2, 0), sxy = pts.reduce((s, p) => s + (p[0] - mx) * (p[1] - my), 0);
    const slope = sxy / sxx, intercept = my - slope * mx;
    const resid = pts.map(([x, y]) => y - (intercept + slope * x));
    report.ladderFit = {
        kind: 'FIT, not a measured limit: linear least squares of block F(1) against k (k = log2 of the range)',
        kRange: [pts[0][0], pts[pts.length - 1][0]],
        slopePerDoubling: round(slope, 5), intercept: round(intercept, 4),
        maxAbsResidual: round(Math.max(...resid.map(Math.abs)), 5),
    };
    const blockDiffs = ladder.slice(1).map((r, i) => r.block.F - ladder[i].block.F);
    report.ladderBlockDifferences = blockDiffs.map((d, i) => ({ k: ladder[i + 1].k, delta: round(d, 5) }));
}
log('ladder done');

// ---------- Study 1: run lengths over |n| <= 262,143 (and the full range) ----------
function runReport(count, label, sims, seed) {
    const obs = runLengths(codes, 0, count);
    const ag = adjacentAgreement(codes, 0, count);
    const shares = Object.fromEntries(keys.map((k, i) => [i, ag.shares[i]]));
    const model = independentRunModel(shares, count);
    const sim = simulateIndependentRuns(shares, count, sims, mulberry32(seed));
    const maxLen = Math.max(obs.max, ...sim.map(s => s.max));
    const hist = [];
    for (let L = 1; L <= maxLen; L++) {
        const simMean = sim.reduce((s, x) => s + (x.lengths.get(L) ?? 0), 0) / sims;
        hist.push({ L, observed: obs.lengths.get(L) ?? 0, independentExpected: round(model.pmf(L) * model.expectedRuns, 2), independentSimMean: round(simMean, 2) });
    }
    const perFate = keys.map((k, i) => {
        const h = obs.byCode.get(i) ?? new Map();
        const runs = [...h.values()].reduce((s, v) => s + v, 0);
        const tot = [...h.entries()].reduce((s, [L, v]) => s + L * v, 0);
        const p = ag.shares[i];
        let mx = 0;
        for (const L of h.keys()) mx = Math.max(mx, L);
        return { fate: k, runs, meanLength: round(tot / runs, 3), independentMeanLength: round(1 / (1 - p), 3), maxLength: mx };
    });
    return {
        range: label, values: count,
        observed: {
            runs: obs.runs, meanLength: round(obs.mean, 4), medianLength: obs.median, maxLength: obs.max,
            longestRun: { fate: keys[obs.maxCode], from: nOf(obs.maxAt), to: nOf(obs.maxAt + obs.max - 1) },
        },
        independent: {
            note: 'exact i.i.d. model with the observed fate shares; max from simulation (mulberry32 seed ' + seed + ', ' + sims + ' runs)',
            expectedRuns: round(model.expectedRuns, 1), meanLength: round(model.meanLength, 4), medianLength: model.median,
            simulatedMaxLength: { min: Math.min(...sim.map(s => s.max)), mean: round(sim.reduce((s, x) => s + x.max, 0) / sims, 2), max: Math.max(...sim.map(s => s.max)) },
            simulatedRuns: { min: Math.min(...sim.map(s => s.runs)), max: Math.max(...sim.map(s => s.runs)) },
        },
        perFate,
        histogram: hist,
    };
}
report.runs = runReport(131072, '|n| <= 262,143', 20, 2026);
log('runs (262143) done');
report.runsFullRange = runReport(codes.length, `|n| <= ${N_MAX.toLocaleString('en-US')}`, 3, 11);
log('runs (full) done');

// voids: longest gap between consecutive members of each fate (|n| <= 262,143), vs independent simulations
{
    const count = 131072;
    const gapOf = (seq, k) => {
        let last = -1, best = 0, bestAt = -1;
        for (let i = 0; i < count; i++) {
            if (seq[i] !== k) continue;
            if (last >= 0 && i - last - 1 > best) { best = i - last - 1; bestAt = last + 1; }
            last = i;
        }
        return { best, bestAt };
    };
    const shares = adjacentAgreement(codes, 0, count).shares;
    const rng = mulberry32(99);
    const sims = 20;
    const simGaps = keys.map(() => []);
    const cum = [shares[0], shares[0] + shares[1], 1];
    const seq = new Int8Array(count);
    for (let s = 0; s < sims; s++) {
        for (let i = 0; i < count; i++) { const u = rng(); seq[i] = u < cum[0] ? 0 : u < cum[1] ? 1 : 2; }
        keys.forEach((k, j) => simGaps[j].push(gapOf(seq, j).best));
    }
    report.voids262143 = keys.map((k, j) => {
        const g = gapOf(codes, j);
        return {
            fate: k, longestGap: g.best, gapFrom: nOf(g.bestAt), gapTo: nOf(g.bestAt + g.best - 1),
            independentSimulated: { min: Math.min(...simGaps[j]), max: Math.max(...simGaps[j]), sims, seed: 99 },
        };
    });
}

// longest runs in the 262,143 range, for the zoom window
{
    const top = [];
    let i = 0;
    while (i < 131072) {
        let j = i + 1;
        while (j < 131072 && codes[j] === codes[i]) j++;
        top.push({ len: j - i, from: nOf(i), to: nOf(j - 1), fate: keys[codes[i]] });
        i = j;
    }
    top.sort((a, b) => b.len - a.len);
    report.longestRuns262143 = top.slice(0, 10);
}

// ---------- plots ----------
const browser = await chromium.launch().catch(() =>
    chromium.launch({ executablePath: process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium' }));
const page = await browser.newPage();
await page.setContent('<canvas id="c"></canvas>');
const FATE_COL = ['#2a78d6', '#eb6834', '#1baf7a']; // categorical slots 1-3: -1, -5, -17

async function draw(file, spec) {
    const url = await page.evaluate(spec => {
        const C = { surface: '#fcfcfb', text: '#1a1a19', text2: '#5f5e58', muted: '#8c8b84', grid: '#e7e6e1', axis: '#b9b8b0' };
        const c = document.getElementById('c');
        const dpr = spec.dpr ?? 2;
        c.width = spec.W * dpr; c.height = spec.H * dpr;
        const g = c.getContext('2d');
        g.scale(dpr, dpr);
        g.fillStyle = C.surface; g.fillRect(0, 0, spec.W, spec.H);
        g.textBaseline = 'top'; g.fillStyle = C.text; g.font = '600 19px system-ui, sans-serif';
        g.fillText(spec.title, spec.L, 16);
        g.font = '13px system-ui, sans-serif'; g.fillStyle = C.text2;
        (Array.isArray(spec.subtitle) ? spec.subtitle : [spec.subtitle]).forEach((s, i) => g.fillText(s, spec.L, 42 + 18 * i));
        const PW = spec.W - spec.L - spec.R;
        if (spec.type === 'strip') {
            // rows: one per fate; columns: spec.cols, each with fraction (dense) or a single code (points)
            const rowH = spec.rowH, top = spec.T;
            spec.rows.forEach((r, k) => {
                const y = top + k * (rowH + 10);
                g.fillStyle = '#f1f0ec'; g.fillRect(spec.L, y, PW, rowH);
                g.fillStyle = C.text; g.font = '13px system-ui, sans-serif'; g.textAlign = 'right'; g.textBaseline = 'middle';
                g.fillText(r.label, spec.L - 10, y + rowH / 2);
                g.fillStyle = spec.colours[k];
                const n = spec.cols.length, cw = PW / n;
                for (let i = 0; i < n; i++) {
                    const v = spec.cols[i][k];
                    if (!v) continue;
                    if (spec.dense) { g.globalAlpha = Math.min(1, 0.08 + 0.92 * v); g.fillRect(spec.L + i * cw, y, Math.max(cw, 0.75), rowH); }
                    else { g.globalAlpha = 1; g.fillRect(spec.L + i * cw + cw * 0.15, y + 3, Math.max(cw * 0.7, 1), rowH - 6); }
                }
                g.globalAlpha = 1;
            });
            // highlight window
            if (spec.highlight) {
                const [a, b] = spec.highlight;
                g.strokeStyle = C.text; g.lineWidth = 1.5;
                g.strokeRect(spec.L + a * PW, top - 4, (b - a) * PW, spec.rows.length * (rowH + 10) - 2);
            }
            // x ticks
            const yAxis = top + spec.rows.length * (rowH + 10);
            g.textAlign = 'center'; g.textBaseline = 'top'; g.font = '12px system-ui, sans-serif';
            for (const [x, label] of spec.xTicks) {
                const px = spec.L + x * PW;
                g.strokeStyle = C.axis; g.beginPath(); g.moveTo(px, yAxis - 6); g.lineTo(px, yAxis); g.stroke();
                g.fillStyle = C.muted; g.fillText(label, px, yAxis + 4);
            }
            g.fillStyle = C.text2; g.font = '13px system-ui, sans-serif';
            g.fillText(spec.xLabel, spec.L + PW / 2, yAxis + 24);
        } else if (spec.type === 'lines' || spec.type === 'hist') {
            const PH = spec.H - spec.T - spec.B;
            const [x0, x1] = spec.x, [y0, y1] = spec.y;
            const ty = v => (spec.logY ? Math.log10(v) : v);
            const X = v => spec.L + (v - x0) / (x1 - x0) * PW;
            const Y = v => spec.T + (ty(y1) - ty(v)) / (ty(y1) - ty(y0)) * PH;
            g.font = '12px system-ui, sans-serif'; g.textBaseline = 'middle';
            for (const v of spec.yTicks) {
                g.strokeStyle = C.grid; g.lineWidth = 1;
                g.beginPath(); g.moveTo(spec.L, Y(v)); g.lineTo(spec.L + PW, Y(v)); g.stroke();
                g.fillStyle = C.muted; g.textAlign = 'right'; g.fillText(spec.yDecimals !== undefined ? v.toFixed(spec.yDecimals) : String(v), spec.L - 8, Y(v));
            }
            g.strokeStyle = C.axis; g.beginPath(); g.moveTo(spec.L, spec.T + PH); g.lineTo(spec.L + PW, spec.T + PH); g.stroke();
            g.textAlign = 'center'; g.textBaseline = 'top';
            for (const v of spec.xTicks) { g.fillStyle = C.muted; g.fillText(String(v), X(v), spec.T + PH + 6); }
            g.fillStyle = C.text2; g.font = '13px system-ui, sans-serif';
            g.fillText(spec.xLabel, spec.L + PW / 2, spec.T + PH + 26);
            g.save(); g.translate(18, spec.T + PH / 2); g.rotate(-Math.PI / 2); g.fillText(spec.yLabel, 0, 0); g.restore();
            for (const ref of spec.refs ?? []) {
                g.strokeStyle = C.muted; g.lineWidth = 1.5; g.setLineDash([6, 4]);
                g.beginPath(); g.moveTo(spec.L, Y(ref.y)); g.lineTo(spec.L + PW, Y(ref.y)); g.stroke(); g.setLineDash([]);
                g.fillStyle = C.text2; g.textAlign = 'left'; g.textBaseline = 'middle'; g.font = '12px system-ui, sans-serif';
                g.fillText(ref.label, spec.L + PW + 8, Y(ref.y));
            }
            if (spec.type === 'hist') {
                const bw = PW / (x1 - x0) * 0.38;
                for (const s of spec.bars) {
                    g.fillStyle = s.colour;
                    for (const [x, y] of s.points) {
                        if (y <= 0) continue;
                        const px = X(x) + s.offset * bw;
                        const yTop = Y(Math.max(y, y0));
                        g.fillRect(px - bw / 2, yTop, bw, spec.T + PH - yTop);
                    }
                }
            }
            for (const s of spec.series ?? []) {
                g.strokeStyle = s.colour; g.lineWidth = 2; g.setLineDash(s.dash ?? []);
                g.beginPath();
                s.points.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y))));
                g.stroke(); g.setLineDash([]);
                for (const [x, y] of s.points) {
                    g.beginPath(); g.arc(X(x), Y(y), 4, 0, 2 * Math.PI);
                    g.fillStyle = s.colour; g.fill(); g.strokeStyle = C.surface; g.lineWidth = 2; g.stroke();
                }
                if (s.label) {
                    const [lx, ly] = s.points[s.points.length - 1];
                    g.fillStyle = C.text; g.textAlign = 'left'; g.textBaseline = 'middle'; g.font = '13px system-ui, sans-serif';
                    g.fillText(s.label, X(lx) + 10, Y(ly) + (s.dy ?? 0));
                }
            }
            // legend
            const items = [...(spec.bars ?? []), ...(spec.series ?? [])].filter(s => s.legend);
            let ly = spec.T + 4;
            g.font = '13px system-ui, sans-serif'; g.textAlign = 'right'; g.textBaseline = 'middle';
            for (const s of items) {
                g.fillStyle = C.text; g.fillText(s.legend, spec.L + PW - 24, ly);
                g.fillStyle = s.colour; g.fillRect(spec.L + PW - 18, ly - 6, 14, 12);
                ly += 20;
            }
        }
        if (spec.note) {
            g.fillStyle = C.muted; g.font = '12px system-ui, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'bottom';
            (Array.isArray(spec.note) ? spec.note : [spec.note]).forEach((s, i, a) => g.fillText(s, spec.L, spec.H - 10 - 16 * (a.length - 1 - i)));
        }
        return c.toDataURL('image/png');
    }, spec);
    writeFileSync(join(OUT, file), Buffer.from(url.split(',')[1], 'base64'));
}

const ROWS = keys.map(k => ({ label: `→ ${k}` }));
const fmtN = a => (a === 1 ? '−1' : `−${a.toLocaleString('en-US')}`);
// dense strip: count odd n per column, fraction per fate
function denseColumns(fromIdx, toIdx, ncols) {
    const per = (toIdx - fromIdx) / ncols;
    const cols = [];
    for (let c = 0; c < ncols; c++) {
        const a = Math.floor(fromIdx + c * per), b = Math.floor(fromIdx + (c + 1) * per);
        const f = [0, 0, 0];
        for (let i = a; i < b; i++) f[codes[i]]++;
        cols.push(f.map(v => v / Math.max(1, b - a)));
    }
    return cols;
}
function pointColumns(fromIdx, count) {
    const cols = [];
    for (let i = fromIdx; i < fromIdx + count; i++) cols.push([0, 1, 2].map(k => (codes[i] === k ? 1 : 0)));
    return cols;
}
function ticksFor(fromIdx, toIdx, nt) {
    const t = [];
    for (let j = 0; j <= nt; j++) {
        const i = Math.round(fromIdx + (j / nt) * (toIdx - 1 - fromIdx));
        t.push([(i - fromIdx + 0.5) / (toIdx - fromIdx), fmtN(2 * i + 1)]);
    }
    return t;
}
const stripBase = { type: 'strip', W: 1400, L: 70, R: 30, T: 92, rowH: 54, colours: FATE_COL, rows: ROWS };
const stripH = 92 + 3 * 64 + 100;

await draw('strip-full-262143.png', {
    ...stripBase, H: stripH, dense: true, cols: denseColumns(0, 131072, 1300),
    title: 'Fate partition of the negative odd integers, |n| ≤ 262,143',
    subtitle: ['Each row: the odd n whose 3n+1 orbit ends in that cycle. |n| grows to the right (n = −1 at the left).',
        'Overplotted: each pixel column holds about 100 odd n; shade = share of that column in the row\'s fate.'],
    xTicks: ticksFor(0, 131072, 8), xLabel: 'n (negative odd)', note: 'Rendering compromise: individual integers are not resolved at this width; see the zoomed strips.',
});
await draw('strip-16383.png', {
    ...stripBase, H: stripH, dense: true, cols: denseColumns(0, 8192, 1300),
    title: 'Fate partition, |n| ≤ 16,383',
    subtitle: ['|n| grows to the right. About 6.3 odd n per pixel column; shade = share of the column in the row\'s fate.'],
    xTicks: ticksFor(0, 8192, 8), xLabel: 'n (negative odd)',
});
const zooms = [
    { file: 'strip-zoom-first-512.png', from: 0, label: 'the first 512 negative odd n: n = −1 to −1,023' },
    { file: 'strip-zoom-mid-512.png', from: idxOf(131073), label: 'a mid-range window: n = −131,073 to −132,095' },
];
const lr = report.longestRuns262143[0];
const lrIdx = idxOf(-lr.from);
zooms.push({ file: 'strip-zoom-longest-run-512.png', from: Math.max(0, lrIdx - 256), label: `the window around the longest run (${lr.len} × ${lr.fate}, n = ${lr.from.toLocaleString('en-US')} to ${lr.to.toLocaleString('en-US')})` });
report.zoomWindows = [];
for (const z of zooms) {
    const cols = pointColumns(z.from, 512);
    const rl = runLengths(codes, z.from, z.from + 512);
    const ag = adjacentAgreement(codes, z.from, z.from + 512);
    report.zoomWindows.push({ file: z.file, from: nOf(z.from), to: nOf(z.from + 511), runs: rl.runs, maxRun: rl.max, F1: round(ag.F, 4) });
    await draw(z.file, {
        ...stripBase, H: stripH, dense: false, cols,
        title: `Fate partition, zoomed: ${z.label}`,
        subtitle: [`One mark per odd n (512 values, |n| grows to the right). ${rl.runs} runs, longest ${rl.max}; F(1) in this window ${ag.F.toFixed(3)}.`],
        xTicks: ticksFor(z.from, z.from + 512, 8), xLabel: 'n (negative odd)',
    });
}
log('strips done');

// run-length histogram: observed vs independent
{
    const h = report.runs.histogram.filter(x => x.L <= 24);
    await draw('run-lengths-262143.png', {
        type: 'hist', W: 1100, H: 600, L: 80, R: 40, T: 96, B: 70, dpr: 2,
        x: [0.5, 24.5], y: [0.5, 100000], logY: true,
        xTicks: [1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24], yTicks: [1, 10, 100, 1000, 10000, 100000],
        xLabel: 'run length (consecutive odd n with the same fate)', yLabel: 'number of runs (log scale)',
        title: 'Run lengths of the fate partition vs independent fates, |n| ≤ 262,143',
        subtitle: [`Observed: ${report.runs.observed.runs.toLocaleString('en-US')} runs, mean ${report.runs.observed.meanLength}, longest ${report.runs.observed.maxLength}. ` +
            `Independent with the same shares: ${report.runs.independent.expectedRuns.toLocaleString('en-US')} runs, mean ${report.runs.independent.meanLength}, longest ${report.runs.independent.simulatedMaxLength.min}–${report.runs.independent.simulatedMaxLength.max} in 20 simulations.`],
        bars: [
            { colour: '#2a78d6', offset: -0.5, legend: 'observed', points: h.map(x => [x.L, x.observed]) },
            { colour: '#b9b8b0', offset: 0.5, legend: 'independent fates (exact expectation)', points: h.map(x => [x.L, x.independentExpected]) },
        ],
        note: 'Independent baseline: i.i.d. fates with the observed shares, run length geometric per fate. Bars below 1 are not drawn.',
    });
}
// ladder plot
{
    const pts = report.ladder;
    const ys = pts.flatMap(r => [r.prefix.F1, r.block.F1]);
    await draw('f1-ladder.png', {
        type: 'lines', W: 1100, H: 620, L: 80, R: 160, T: 96, B: 70, dpr: 2,
        x: [9.5, K_MAX + 0.5], y: [0.30, Math.ceil(Math.max(...ys) * 20) / 20 + 0.05],
        xTicks: pts.map(r => r.k), yTicks: [0.30, 0.35, 0.40, 0.45, 0.50, 0.55, 0.60].filter(v => v <= Math.ceil(Math.max(...ys) * 20) / 20 + 0.05),
        yDecimals: 2,
        xLabel: 'k   (prefix: |n| ≤ 2^k − 1;   block: 2^(k−1) ≤ |n| < 2^k)', yLabel: 'F(1) = P[L(n) = L(n + 2)]',
        title: 'F(1) as the range of negative odd n grows',
        subtitle: ['Prefix: all odd n with |n| ≤ 2^k − 1. Block: only the odd n in the newest dyadic block. Every n settled within 2000 steps.'],
        refs: [{ y: 1 / 3, label: '1/3 ≈ Σp²' }],
        series: [
            { colour: '#2a78d6', legend: 'prefix |n| ≤ 2^k − 1', label: 'prefix', points: pts.map(r => [r.k, r.prefix.F1]), dy: 10 },
            { colour: '#eb6834', legend: 'single block k', label: 'block', points: pts.map(r => [r.k, r.block.F1]), dy: -10 },
        ],
        note: [`Largest range: |n| ≤ ${N_MAX.toLocaleString('en-US')} (k = ${K_MAX}). Σp² stays within 0.001 of 1/3 at every k.`],
    });
}
log('plots done');
await browser.close();

writeFileSync(join(OUT, 'fate-partition.json'), JSON.stringify(report, (k, v) => (v instanceof Map ? Object.fromEntries(v) : v), 2) + '\n');
log('json written');
console.log(JSON.stringify(report.voids262143)); console.log(JSON.stringify({ ladder: report.ladder.map(r => [r.k, r.prefix.F1, r.prefix.delta, r.block.F1]), fit: report.ladderFit, runs: { obs: report.runs.observed, ind: report.runs.independent, perFate: report.runs.perFate }, full: { obs: report.runsFullRange.observed, ind: report.runsFullRange.independent }, longest: report.longestRuns262143.slice(0, 5), zooms: report.zoomWindows }));
