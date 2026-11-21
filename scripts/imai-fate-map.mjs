// F as a function of n and r (Imai, 21 Nov 2026): colour maps of the windowed
// fate correlation. Writes docs/fate-map/fate-map.json and four PNGs.
//
//   node scripts/imai-fate-map.mjs             (from the repo root; ~1 min)
//
// Fates: fateCodes (js/imaiFateCorrelation.js) -> trajectoryFate, step cap 2000,
// for every odd negative n with |n| <= 2^22 - 1. Convention for F_W(r): see
// js/imaiFateMap.js (partner n + 2r may lie outside W but must be in the table).

import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { fateCodes } from '../js/imaiFateCorrelation.js';
import { windowF, windowBaseline, fateGrid, blockWindows, slidingWindows, valuationResiduals } from '../js/imaiFateMap.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'docs', 'fate-map');
mkdirSync(OUT, { recursive: true });
const t0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)} s]`, ...a);
const rd = (x, d = 5) => (x === null || x === undefined ? null : +x.toFixed(d));
const fail = msg => { console.error(`SANITY CHECK FAILED: ${msg}`); process.exit(1); };

const K_TABLE = 22, N = 2 ** K_TABLE - 1, CAP = 2000;
const { codes, keys, unsettled } = fateCodes({ N, m: 3, c: 1, maxSteps: CAP, sign: -1 });
log(`fate table |n| <= ${N}: ${codes.length} odd n, unsettled ${JSON.stringify(unsettled)}`);
if (unsettled.cap || unsettled.overflow) fail(`unsettled orbits: ${JSON.stringify(unsettled)}`);

// ---------- sanity checks ----------
const checks = {};
{   // 3. fate counts
    const c = [0, 0, 0];
    for (let i = 0; i < 8192; i++) c[codes[i]]++;
    if (c.join() !== '2673,2667,2852') fail(`fate counts ${c}`);
    checks.fateCounts16383 = { observed: { [-1]: c[0], [-5]: c[1], [-17]: c[2] }, expected: { [-1]: 2673, [-5]: 2667, [-17]: 2852 }, passed: true };
}
{   // 1. global F(r) over |n| <= 16,383 against docs/fate-correlation
    const ref = JSON.parse(readFileSync(join(ROOT, 'docs/fate-correlation/fate-correlation.json'), 'utf8')).m3.N16383.F;
    let worst = 0;
    for (const row of ref) {
        const f = windowF(codes, 0, 8192, row.r);
        if (f.pairs !== row.pairs) fail(`global r=${row.r}: pairs ${f.pairs} vs ${row.pairs}`);
        worst = Math.max(worst, Math.abs(+f.F.toFixed(4) - row.F));
    }
    if (worst > 0) fail(`global F(r) differs from fate-correlation.json by ${worst}`);
    const f1 = windowF(codes, 0, 8192, 1);
    checks.globalF16383 = { F1: rd(f1.F, 4), pairs: f1.pairs, rCompared: ref.length, maxDiffAt4dp: worst, passed: true };
}
{   // 2. block F(1) against docs/fate-partition (block k there = B_(k-1) here)
    const fp = JSON.parse(readFileSync(join(ROOT, 'docs/fate-partition/fate-partition.json'), 'utf8'));
    const rows = [];
    for (const b of blockWindows(10, codes.length)) {
        const ref = fp.ladder.find(x => x.k === b.k + 1)?.block;
        if (!ref) continue;
        const mapA = windowF(codes, b.from, b.to, 1);          // this study's convention
        const inside = windowF(codes, b.from + 1, b.to, 1);    // both members inside the block (fate-partition convention)
        if (inside.pairs !== ref.pairs || +inside.F.toFixed(5) !== ref.F1) fail(`B_${b.k}: inside-block F(1) ${inside.F} (${inside.pairs} pairs) vs fate-partition ${ref.F1} (${ref.pairs})`);
        const extraPairs = mapA.pairs - inside.pairs;
        // one extra pair (the block's lowest-|n| element with its partner in the block below) moves F by at most 1/pairs
        if (extraPairs !== 1 || Math.abs(mapA.F - inside.F) > 1 / mapA.pairs + 1e-15) fail(`B_${b.k}: convention difference not explained by one boundary pair`);
        rows.push({ k: b.k, fatePartitionBlockK: b.k + 1, pairsMapA: mapA.pairs, F1MapA: rd(mapA.F), pairsInsideBlock: inside.pairs, F1InsideBlock: rd(inside.F), F1FatePartition: ref.F1, diffMapAMinusFatePartition: rd(mapA.F - inside.F, 6) });
    }
    checks.blockF1 = {
        passed: true,
        note: 'With pairs restricted to the block (the fate-partition convention) every block reproduces fate-partition.json exactly. Map A uses this study\'s convention, which adds exactly one pair per block (lowest-|n| element paired into the block below); its F(1) differs by at most 1/pairs.',
        rows,
    };
}
log('sanity checks passed');

// ---------- grids ----------
const R_A = 128, R_B = 64;
const blocks = blockWindows(10, codes.length);
const mapA = fateGrid(codes, blocks, R_A);
log(`Map A: ${mapA.length} blocks x ${R_A}`);
const windows = slidingWindows(2 ** 12, 16384, 4096, codes.length); // |n| from 2^13 + 1
const mapB = fateGrid(codes, windows, R_B);
log(`Map B: ${mapB.length} windows x ${R_B}`);

const arr = a => Array.from(a, v => rd(v));
const report = {
    convention: 'F_W(r) = #{n in W : n + 2r in table, L(n + 2r) = L(n)} / #{n in W : n + 2r in table}; for negative n the partner n + 2r is closer to zero and may lie outside W. Baseline = sum of p_i^2 over fate shares within W. Excess = F_W(r) - baseline.',
    fateTable: { range: `odd n, -${N} <= n <= -1`, values: codes.length, stepCap: CAP, unsettled, keys },
    sanityChecks: checks,
    mapA: {
        definition: 'rows: dyadic blocks B_k = odd n with 2^k <= |n| < 2^(k+1); columns r = 1..128',
        rows: mapA.map(x => ({ k: x.k, nFrom: x.nFrom, nTo: x.nTo, size: x.to - x.from, shares: x.shares.map(v => rd(v)), baseline: rd(x.baseline), F: arr(x.F), excess: arr(x.excess), pairs: Array.from(x.pairs) })),
    },
    mapB: {
        definition: 'rows: windows of 16,384 consecutive odd n, sliding by 4,096 odd n, starting at |n| = 8,193 (= 2^13 + 1); columns r = 1..64',
        rows: mapB.map(x => ({ nFrom: x.nFrom, nTo: x.nTo, baseline: rd(x.baseline), F: arr(x.F), excess: arr(x.excess) })),
        windowedF1: mapB.map(x => ({ nFrom: x.nFrom, F1: rd(x.F[0]), baseline: rd(x.baseline) })),
    },
};

// ---------- summaries quoted in the notes ----------
{
    const s = {};
    s.blocks = mapA.map(x => {
        const ex = Array.from(x.excess);
        const half = r => ex.findIndex(v => v < ex[0] / 2) + 1 || null;
        return {
            k: x.k, baseline: rd(x.baseline), excessR1: rd(ex[0]), excessR2: rd(ex[1]), excessR8: rd(ex[7]), excessR32: rd(ex[31]),
            excessR128: rd(ex[127]), meanExcessR1to128: rd(ex.reduce((a, b) => a + b, 0) / ex.length),
            firstRWhereExcessBelowHalfOfR1: half(),
            minExcess: rd(Math.min(...ex)), rOfMinExcess: ex.indexOf(Math.min(...ex)) + 1,
            negativeExcessCount: ex.filter(v => v < 0).length,
            valuationResiduals: valuationResiduals(x.excess).map(v => ({ ...v, meanResidual: rd(v.meanResidual) })),
        };
    });
    // even vs odd r excess, per block
    s.evenMinusOdd = mapA.map(x => {
        let e = 0, o = 0, ne = 0, no = 0;
        for (let r = 1; r <= R_A; r++) { if (r % 2) { o += x.excess[r - 1]; no++; } else { e += x.excess[r - 1]; ne++; } }
        return { k: x.k, meanEvenMinusMeanOdd: rd(e / ne - o / no) };
    });
    // Map B: F(1) by position, grouped by the dyadic block containing the window's start
    const f1 = mapB.map(x => ({ a: -x.nFrom, F1: x.F[0], ex1: x.excess[0] }));
    s.mapBF1 = { min: rd(Math.min(...f1.map(x => x.F1))), max: rd(Math.max(...f1.map(x => x.F1))) };
    s.mapBByBlock = [];
    for (let k = 13; k <= 21; k++) {
        const g = f1.filter(x => x.a >= 2 ** k && x.a < 2 ** (k + 1));
        if (!g.length) continue;
        const m = g.reduce((a, b) => a + b.F1, 0) / g.length;
        const sd = Math.sqrt(g.reduce((a, b) => a + (b.F1 - m) ** 2, 0) / g.length);
        s.mapBByBlock.push({ k, windows: g.length, meanF1: rd(m), sdF1: rd(sd), minF1: rd(Math.min(...g.map(x => x.F1))), maxF1: rd(Math.max(...g.map(x => x.F1))) });
    }
    // naive per-window binomial SE at r = 1 for reference (windows overlap 75%, so neighbours are not independent)
    s.mapBNaiveSeF1 = rd(Math.sqrt(0.5 * 0.5 / 16384));
    // windows whose F(1) sits far from a running mean of the 8 windows either side (non-overlapping ones excluded)
    const out = [];
    for (let i = 0; i < f1.length; i++) {
        const nb = [];
        for (let j = i - 12; j <= i + 12; j++) if (j >= 0 && j < f1.length && Math.abs(j - i) >= 4) nb.push(f1[j].F1);
        const m = nb.reduce((a, b) => a + b, 0) / nb.length;
        out.push({ nFrom: -f1[i].a, F1: f1[i].F1, dev: f1[i].F1 - m });
    }
    out.sort((a, b) => Math.abs(b.dev) - Math.abs(a.dev));
    s.mapBLargestLocalDeviations = out.slice(0, 6).map(x => ({ nFrom: x.nFrom, F1: rd(x.F1), deviationFromNeighbours: rd(x.dev) }));
    // r at which Map B excess first drops below 0.02, per window: does the correlation range grow with position?
    s.mapBRangeAt002 = [];
    for (let k = 13; k <= 21; k++) {
        const g = mapB.filter(x => -x.nFrom >= 2 ** k && -x.nFrom < 2 ** (k + 1));
        if (!g.length) continue;
        const rs = g.map(x => { const i = Array.from(x.excess).findIndex(v => v < 0.02); return i < 0 ? R_B + 1 : i + 1; });
        s.mapBRangeAt002.push({ k, windows: g.length, medianR: rs.sort((a, b) => a - b)[Math.floor(rs.length / 2)], share_noDropWithin64: rd(rs.filter(v => v > R_B).length / rs.length, 3) });
    }
    // local fate-share fluctuation: sd of each fate's share across disjoint windows inside each block,
    // against the binomial sd an independent assignment would give
    s.shareFluctuation = [];
    for (const W of [1024, 4096, 16384]) {
        for (let k = 14; k <= 21; k++) {
            const sh = [];
            for (let f = 2 ** (k - 1); f + W <= 2 ** k; f += W) sh.push(windowBaseline(codes, f, f + W).shares);
            if (sh.length < 4) continue;
            const sd = j => { const m = sh.reduce((a, x) => a + x[j], 0) / sh.length; return Math.sqrt(sh.reduce((a, x) => a + (x[j] - m) ** 2, 0) / (sh.length - 1)); };
            const sds = [0, 1, 2].map(sd);
            const ext = [0, 1, 2].map(j => [Math.min(...sh.map(x => x[j])), Math.max(...sh.map(x => x[j]))]);
            s.shareFluctuation.push({ windowSize: W, k, windows: sh.length, sdShare: Object.fromEntries(keys.map((key, j) => [key, rd(sds[j], 4)])), meanSd: rd((sds[0] + sds[1] + sds[2]) / 3, 4), binomialSd: rd(Math.sqrt((1 / 3) * (2 / 3) / W), 4), shareRange: Object.fromEntries(keys.map((key, j) => [key, ext[j].map(v => rd(v, 3))])) });
        }
    }
    const bl = mapB.map(x => x.baseline).sort((a, b) => a - b);
    s.mapBBaselines = { min: rd(bl[0]), median: rd(bl[Math.floor(bl.length / 2)]), max: rd(bl.at(-1)) };
    report.summaries = s;
}
writeFileSync(join(OUT, 'fate-map.json'), JSON.stringify(report) + '\n');
log('json written');

// ---------- colour maps ----------
const browser = await chromium.launch().catch(() =>
    chromium.launch({ executablePath: process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium' }));
const page = await browser.newPage();
await page.setContent('<canvas id="c"></canvas>');

async function heatmap(file, spec) {
    const url = await page.evaluate(spec => {
        // OKLab interpolation between colour stops -> perceptually even ramp
        const toLin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
        const toSrgb = v => 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);
        const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
        const lab = h => {
            const [r, g, b] = hex(h).map(toLin);
            const l = Math.cbrt(0.4122214708 * r + 0.5363015887 * g + 0.0514459929 * b);
            const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
            const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
            return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
        };
        const rgb = ([L, a, b]) => {
            const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
            return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s]
                .map(v => Math.max(0, Math.min(255, Math.round(toSrgb(Math.max(0, Math.min(1, v)))))));
        };
        const stops = spec.stops.map(lab);
        const colour = t => {
            t = Math.max(0, Math.min(1, t));
            const x = t * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(x)), f = x - i;
            return rgb(stops[i].map((v, j) => v + f * (stops[i + 1][j] - v)));
        };
        const scale = v => (v - spec.vmin) / (spec.vmax - spec.vmin);
        const C = { surface: '#fcfcfb', text: '#1a1a19', text2: '#5f5e58', muted: '#8c8b84', axis: '#b9b8b0' };
        const W = spec.W, H = spec.H, L = spec.L, T = 104, R = 215, B = 78;
        const c = document.getElementById('c');
        c.width = W * 2; c.height = H * 2;
        const g = c.getContext('2d'); g.scale(2, 2);
        g.fillStyle = C.surface; g.fillRect(0, 0, W, H);
        g.fillStyle = C.text; g.font = '600 19px system-ui, sans-serif'; g.textBaseline = 'top';
        g.fillText(spec.title, L, 16);
        g.font = '13px system-ui, sans-serif'; g.fillStyle = C.text2;
        spec.subtitle.forEach((s, i) => g.fillText(s, L, 44 + 18 * i));
        const PW = W - L - R - (spec.baselineCol ? 36 : 0), PH = H - T - B;
        const nr = spec.rows.length, nc = spec.rows[0].length;
        const cw = PW / nc, ch = PH / nr;
        for (let i = 0; i < nr; i++) {
            for (let j = 0; j < nc; j++) {
                g.fillStyle = `rgb(${colour(scale(spec.rows[i][j]))})`;
                g.fillRect(L + j * cw, T + i * ch, Math.ceil(cw + 0.5), Math.ceil(ch + 0.5));
            }
        }
        // baseline column (raw maps): each row's baseline in the same colour scale
        if (spec.baselineCol) {
            const bx = L + PW + 8;
            for (let i = 0; i < nr; i++) { g.fillStyle = `rgb(${colour(scale(spec.baselineCol[i]))})`; g.fillRect(bx, T + i * ch, 22, Math.ceil(ch + 0.5)); }
            g.save(); g.translate(bx + 11, T - 6); g.fillStyle = C.text2; g.font = '11px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'bottom';
            g.fillText('baseline', 0, 0); g.restore();
        }
        // horizontal guides (block boundaries) and y labels
        g.font = '12px system-ui, sans-serif'; g.textAlign = 'right'; g.textBaseline = 'middle';
        let lastLabelY = -1e9;
        for (const t of spec.yTicks) {
            const y = T + t.pos * PH;
            if (t.guide) { g.strokeStyle = 'rgba(26,26,25,0.55)'; g.lineWidth = 1; g.setLineDash([4, 3]); g.beginPath(); g.moveTo(L, y); g.lineTo(L + PW, y); g.stroke(); g.setLineDash([]); }
            const ly = t.mid ? T + t.mid * PH : y;
            if (ly - lastLabelY < 15) continue; // keep the guide, drop a label that would collide
            g.fillStyle = C.muted; g.fillText(t.label, L - 8, ly);
            lastLabelY = ly;
        }
        g.textAlign = 'center'; g.textBaseline = 'top';
        for (const r of spec.xTicks) { const x = L + (r - 0.5) * cw; g.strokeStyle = C.axis; g.beginPath(); g.moveTo(x, T + PH); g.lineTo(x, T + PH + 5); g.stroke(); g.fillStyle = C.muted; g.fillText(String(r), x, T + PH + 8); }
        g.fillStyle = C.text2; g.font = '13px system-ui, sans-serif';
        g.fillText(spec.xLabel, L + PW / 2, T + PH + 28);
        g.save(); g.translate(16, T + PH / 2); g.rotate(-Math.PI / 2); g.fillText(spec.yLabel, 0, 0); g.restore();
        // colour bar
        const bx = W - R + 52, bh = PH, bw = 18;
        for (let y = 0; y < bh; y++) { g.fillStyle = `rgb(${colour(1 - y / bh)})`; g.fillRect(bx, T + y, bw, 1.5); }
        g.font = '12px system-ui, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle';
        for (const t of spec.barTicks) {
            const y = T + (1 - scale(t.v)) * bh;
            g.strokeStyle = C.text; g.lineWidth = t.strong ? 2 : 1; g.beginPath(); g.moveTo(bx - (t.strong ? 6 : 0), y); g.lineTo(bx + bw + 4, y); g.stroke();
            g.fillStyle = t.strong ? C.text : C.muted; g.fillText(t.label, bx + bw + 8, y);
        }
        g.fillStyle = C.text2; g.textAlign = 'center'; g.textBaseline = 'bottom'; g.fillText(spec.barLabel, bx + bw / 2, T - 8);
        if (spec.note) { g.fillStyle = C.muted; g.font = '12px system-ui, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'bottom'; spec.note.forEach((s, i, a) => g.fillText(s, L, H - 8 - 16 * (a.length - 1 - i))); }
        return c.toDataURL('image/png');
    }, spec);
    writeFileSync(join(OUT, file), Buffer.from(url.split(',')[1], 'base64'));
}

const SEQ = ['#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#184f95', '#0d366b']; // blue ramp 100..700
const DIV = ['#0d366b', '#2a78d6', '#9ec5f4', '#f0efec', '#f3b3b2', '#e34948', '#7d1d1d']; // blue - grey - red
const fmt = v => v.toFixed(3);
const blockBaselines = mapA.map(x => x.baseline);
const bMean = blockBaselines.reduce((a, b) => a + b, 0) / blockBaselines.length;

// Map A
{
    const rows = mapA.map(x => Array.from(x.F));
    const all = rows.flat();
    const vmin = Math.min(...all, ...blockBaselines) - 0.002, vmax = Math.max(...all) + 0.002;
    const yTicks = mapA.map((x, i) => ({ pos: i / mapA.length, mid: (i + 0.5) / mapA.length, label: `B_${x.k}  (|n| ${(2 ** x.k).toLocaleString('en-US')}–${(2 ** (x.k + 1) - 1).toLocaleString('en-US')})` }));
    const base = { W: 1300, H: 640, L: 250, rows, yTicks, xTicks: [1, 8, 16, 32, 48, 64, 80, 96, 112, 128], xLabel: 'separation r (pairs n, n + 2r)', yLabel: 'dyadic block B_k (|n| grows downward)' };
    await heatmap('mapA-blocks-raw.png', {
        ...base, stops: SEQ, vmin, vmax, baselineCol: blockBaselines,
        title: 'F_W(r) by dyadic block — 3n + 1 fates of negative odd n',
        subtitle: ['Each cell: share of n in block B_k whose partner n + 2r reaches the same cycle (−1, −5 or −17). Darker = higher F.',
            `Right-hand column: each block's independence baseline Σp² (all within ${fmt(Math.min(...blockBaselines))}–${fmt(Math.max(...blockBaselines))}); marked on the colour bar.`],
        barLabel: 'F', barTicks: [...[0.35, 0.40, 0.45, 0.50].filter(v => v > vmin && v < vmax).map(v => ({ v, label: v.toFixed(2) })), { v: bMean, label: `baseline ≈ ${fmt(bMean)}`, strong: true }],
    });
    const ex = mapA.map(x => Array.from(x.excess));
    const m = Math.max(...ex.flat().map(Math.abs));
    await heatmap('mapA-blocks-excess.png', {
        ...base, rows: ex, stops: DIV, vmin: -m, vmax: m,
        title: 'Excess F_W(r) − Σp² by dyadic block',
        subtitle: ['Excess over each block\'s own independence baseline. Grey = 0 (independent fates); red = more agreement than chance, blue = less.',
            `Symmetric scale ±${m.toFixed(3)} (the largest |excess| in the map), so zero is the neutral midpoint.`],
        barLabel: 'excess', barTicks: [{ v: m, label: `+${m.toFixed(3)}` }, { v: m / 2, label: `+${(m / 2).toFixed(3)}` }, { v: 0, label: '0 (baseline)', strong: true }, { v: -m / 2, label: `−${(m / 2).toFixed(3)}` }, { v: -m, label: `−${m.toFixed(3)}` }],
    });
}
log('map A done');

// Map B
{
    const rows = mapB.map(x => Array.from(x.F));
    const all = rows.flat();
    const bl = mapB.map(x => x.baseline);
    const vmin = Math.min(...all, ...bl) - 0.002, vmax = Math.max(...all) + 0.002;
    const first = -mapB[0].nFrom, last = -mapB[mapB.length - 1].nFrom, nw = mapB.length;
    const posOf = a => (a - first) / (last - first + 4096 * 2) ; // row position of a window start |n|
    const yTicks = [];
    for (let k = 14; k <= 21; k++) {
        const a = 2 ** k + 1;
        const i = mapB.findIndex(x => -x.nFrom >= a);
        if (i > 0) yTicks.push({ pos: i / nw, label: `|n| ≈ ${(2 ** k).toLocaleString('en-US')} (2^${k})`, guide: true });
    }
    yTicks.unshift({ pos: 0, label: `|n| = ${first.toLocaleString('en-US')}` });
    const base = { W: 1100, H: 980, L: 190, rows, yTicks, xTicks: [1, 8, 16, 24, 32, 40, 48, 56, 64], xLabel: 'separation r', yLabel: 'window start |n| (grows downward, linear in |n|)' };
    void posOf;
    await heatmap('mapB-sliding-raw.png', {
        ...base, stops: SEQ, vmin, vmax, baselineCol: bl,
        title: 'F_W(r) in sliding windows — 16,384 odd n each, step 4,096',
        subtitle: [`${nw} windows from |n| = 8,193 to 4,194,303 (adjacent windows overlap by 75%). Dashed lines: dyadic boundaries 2^k (unlabelled where crowded).`,
            `Right-hand column: each window's own baseline Σp², which varies ${fmt(Math.min(...bl))}–${fmt(Math.max(...bl))} because local fate shares fluctuate (see notes).`],
        barLabel: 'F', barTicks: [...[0.35, 0.40, 0.45, 0.50, 0.55].filter(v => v > vmin && v < vmax).map(v => ({ v, label: v.toFixed(2) })), { v: bl.reduce((a, b) => a + b, 0) / bl.length, label: `baseline ≈ ${fmt(bl.reduce((a, b) => a + b, 0) / bl.length)}`, strong: true }],
    });
    const ex = mapB.map(x => Array.from(x.excess));
    const m = Math.max(...ex.flat().map(Math.abs));
    await heatmap('mapB-sliding-excess.png', {
        ...base, rows: ex, stops: DIV, vmin: -m, vmax: m,
        title: 'Excess F_W(r) − Σp² in sliding windows',
        subtitle: ['Grey = 0 (independent fates); red = more agreement than chance, blue = less. Dashed lines: dyadic boundaries 2^k.',
            `Symmetric scale ±${m.toFixed(3)} (the largest |excess| in the map).`],
        barLabel: 'excess', barTicks: [{ v: m, label: `+${m.toFixed(3)}` }, { v: m / 2, label: `+${(m / 2).toFixed(3)}` }, { v: 0, label: '0 (baseline)', strong: true }, { v: -m / 2, label: `−${(m / 2).toFixed(3)}` }, { v: -m, label: `−${m.toFixed(3)}` }],
    });
}
log('map B done');
await browser.close();
console.log(JSON.stringify(report.summaries));
