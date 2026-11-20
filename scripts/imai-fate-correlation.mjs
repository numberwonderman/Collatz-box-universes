// Fate correlation F(r) (Imai's suggestion) and other odd multipliers.
// Writes docs/fate-correlation/fate-correlation.json and the plots beside it.
//
//   node scripts/imai-fate-correlation.mjs        (from the repo root)
//
// Map: T(n) = n/2 (n even), m n + c (n odd), c = 1, from js/imaiDyadicCircle.js.
// Fates: trajectoryFate (js/imaiFractalProbe.js), step cap 2000; an orbit that
// hits the cap or exceeds 2^53 is "unsettled" and gets no fate.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import {
    fateLabels, cycleOf, fateShares, fateCorrelation, coSettling, blockFateCorrelation,
    residualByValuation,
} from '../js/imaiFateCorrelation.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'docs', 'fate-correlation');
mkdirSync(OUT, { recursive: true });

const CAP = 2000;
const R_MAX = 128;
const t0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)} s]`, ...a);
const round = (x, d = 4) => (x === null ? null : +x.toFixed(d));

const report = {
    map: 'T(n) = n/2 if n even, m*n + 1 if n odd (c = 1)',
    stepCap: CAP,
    unsettledRule: 'orbits that hit the step cap or exceed 2^53 get no fate; pairs involving them are skipped',
    m3: {},
    otherM: {},
};

// ---------- Build 1: m = 3 ----------
const m3 = {};
for (const N of [16383, 262143]) {
    const L = fateLabels({ N, m: 3, c: 1, maxSteps: CAP, sign: -1 });
    const sh = fateShares(L.labels);
    const rows = fateCorrelation(L.labels, R_MAX);
    // peaks / dips: F(r) beyond both neighbours by more than 2 naive standard errors
    const peaks = [], dips = [];
    for (let i = 1; i < rows.length - 1; i++) {
        const { r, F, se } = rows[i];
        if (F > Math.max(rows[i - 1].F, rows[i + 1].F) + 2 * se) peaks.push(r);
        if (F < Math.min(rows[i - 1].F, rows[i + 1].F) - 2 * se) dips.push(r);
    }
    m3[N] = { L, rows };
    report.m3[`N${N}`] = {
        range: `negative odd n, 1 <= |n| <= ${N}`,
        sampleSize: L.labels.length,
        unsettled: L.unsettled,
        fateCounts: sh.counts,
        shares: Object.fromEntries(Object.entries(sh.shares).map(([k, v]) => [k, round(v)])),
        baselineEqualShares: round(1 / 3),
        baselineSumSquares: round(sh.sumSquares),
        F: rows.map(x => ({ r: x.r, pairs: x.pairs, same: x.same, F: round(x.F), se: round(x.se) })),
        residualByValuation: residualByValuation(rows).map(x => ({ ...x, meanResidual: round(x.meanResidual) })),
        peaksBeyond2se: peaks,
        dipsBeyond2se: dips,
        rAboveSumSquaresBy2se: rows.filter(x => x.F - 2 * x.se > sh.sumSquares).length,
        rBelowSumSquaresBy2se: rows.filter(x => x.F + 2 * x.se < sh.sumSquares).map(x => x.r),
    };
    log(`m=3 N=${N} F(1)=${rows[0].F.toFixed(4)} peaks ${peaks} dips ${dips}`);
}
// block-wise F and the dyadic collapse test, on the larger range
{
    const L = m3[262143].L.labels;
    const blocks = [];
    for (const k of [13, 14, 15, 16, 17]) {
        for (const r of [1, 2, 4, 8, 16, 32, 64]) {
            const b = blockFateCorrelation(L, k, r);
            blocks.push({ k, r, pairs: b.pairs, F: round(b.F) });
        }
    }
    const get = (k, r) => blockFateCorrelation(L, k, r).F;
    const collapse = [];
    for (const k of [13, 14, 15, 16]) {
        for (const r of [1, 2, 4, 8, 16]) {
            collapse.push({ k, r, F_k_r: round(get(k, r)), F_k1_2r: round(get(k + 1, 2 * r)), F_k1_r: round(get(k + 1, r)) });
        }
    }
    const meanAbs = key => collapse.reduce((s, x) => s + Math.abs(x[key] - x.F_k_r), 0) / collapse.length;
    report.m3.blocks = {
        note: 'F within dyadic block k only: pairs of odd |n|, |n| + 2r both in [2^k, 2^(k+1)), range |n| <= 262143',
        table: blocks,
        collapse,
        meanAbsDiff_sameRelativeDistance: round(meanAbs('F_k1_2r')),
        meanAbsDiff_sameAbsoluteDistance: round(meanAbs('F_k1_r')),
        blockBaselines: Object.fromEntries([13, 14, 15, 16, 17].map(k => {
            const sub = [];
            for (let a = 2 ** k + 1; a < 2 ** (k + 1); a += 2) sub.push(L[(a - 1) / 2]);
            return [k, round(fateShares(sub).sumSquares)];
        })),
    };
    log('blocks done');
}

// ---------- Build 2: m = 2^k +- 1 ----------
const OTHER = [5, 7, 9, 15, 17];
const NM = 16383, R_M = 64;
for (const m of [3, ...OTHER]) {
    report.otherM[m] = {};
    for (const [side, sign] of [['negative', -1], ['positive', 1]]) {
        const L = fateLabels({ N: NM, m, c: 1, maxSteps: CAP, sign });
        const sh = fateShares(L.labels);
        const entry = {
            range: `${side} odd n, 1 <= |n| <= ${NM}`,
            sampleSize: L.labels.length,
            settled: sh.settled,
            settledShare: round(sh.settled / L.labels.length, 5),
            unsettled: L.unsettled,
            cycles: Object.fromEntries(Object.entries(sh.counts).map(([k, v]) => [k, {
                count: v, shareOfSettled: round(v / sh.settled), length: cycleOf(+k, m, 1).length,
                elements: cycleOf(+k, m, 1),
            }])),
        };
        if (sh.cycles >= 2) {
            entry.baselineSumSquares = round(sh.sumSquares);
            entry.F = fateCorrelation(L.labels, R_M).map(x => ({ r: x.r, pairs: x.pairs, F: round(x.F) }));
        } else {
            entry.F = sh.cycles === 1 ? 'trivial: only one cycle is reached, so F(r) = 1 for every settled pair'
                : 'undefined: no n settles';
        }
        if (sh.settled > 0 && sh.unsettled > 0) {
            entry.coSettling = coSettling(L.labels, R_M).map(x => ({ r: x.r, settledPairs: x.settledPairs, both: x.both, S: round(x.S) }));
        }
        report.otherM[m][side] = entry;
    }
    const n = report.otherM[m].negative, p = report.otherM[m].positive;
    log(`m=${m}: neg settled ${n.settled}/${n.sampleSize} cycles ${Object.keys(n.cycles)}; pos settled ${p.settled}/${p.sampleSize} cycles ${Object.keys(p.cycles)}`);
}
writeFileSync(join(OUT, 'fate-correlation.json'), JSON.stringify(report, null, 2) + '\n');
log('json written');

// ---------- Plots ----------
const browser = await chromium.launch().catch(() =>
    chromium.launch({ executablePath: process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium' }));
const page = await browser.newPage({ deviceScaleFactor: 2 });
await page.setContent('<canvas id="c"></canvas>');

async function plot(file, spec) {
    const dataUrl = await page.evaluate(spec => {
        const W = 1100, H = 620, L = 78, R = 150, T = 78, B = 70;
        const c = document.getElementById('c');
        const dpr = 2;
        c.width = W * dpr; c.height = H * dpr;
        const g = c.getContext('2d');
        g.scale(dpr, dpr);
        const C = { surface: '#fcfcfb', text: '#1a1a19', text2: '#5f5e58', muted: '#8c8b84', grid: '#e7e6e1', axis: '#b9b8b0' };
        g.fillStyle = C.surface; g.fillRect(0, 0, W, H);
        const [x0, x1] = spec.x, [y0, y1] = spec.y;
        const tx = v => (spec.logX ? Math.log2(v) : v);
        const X = v => L + (tx(v) - tx(x0)) / (tx(x1) - tx(x0)) * (W - L - R);
        const Y = v => T + (y1 - v) / (y1 - y0) * (H - T - B);
        g.font = '600 20px system-ui, sans-serif'; g.fillStyle = C.text; g.textBaseline = 'top';
        g.fillText(spec.title, L, 18);
        g.font = '14px system-ui, sans-serif'; g.fillStyle = C.text2;
        g.fillText(spec.subtitle, L, 46);
        // grid + y ticks
        g.font = '12px system-ui, sans-serif'; g.textBaseline = 'middle';
        for (const v of spec.yTicks) {
            g.strokeStyle = C.grid; g.lineWidth = 1;
            g.beginPath(); g.moveTo(L, Y(v)); g.lineTo(W - R, Y(v)); g.stroke();
            g.fillStyle = C.muted; g.textAlign = 'right'; g.fillText(v.toFixed(2), L - 8, Y(v));
        }
        // x ticks (powers of two get a faint vertical guide)
        g.textAlign = 'center'; g.textBaseline = 'top';
        for (const v of spec.xTicks) {
            g.strokeStyle = C.grid; g.setLineDash([2, 3]);
            g.beginPath(); g.moveTo(X(v), T); g.lineTo(X(v), H - B); g.stroke(); g.setLineDash([]);
            g.fillStyle = C.muted; g.fillText(String(v), X(v), H - B + 8);
        }
        g.strokeStyle = C.axis; g.beginPath(); g.moveTo(L, H - B); g.lineTo(W - R, H - B); g.stroke();
        g.fillStyle = C.text2; g.font = '13px system-ui, sans-serif';
        g.fillText(spec.xLabel, (L + W - R) / 2, H - B + 30);
        g.save(); g.translate(22, (T + H - B) / 2); g.rotate(-Math.PI / 2); g.textBaseline = 'top';
        g.fillText(spec.yLabel, 0, 0); g.restore();
        // reference lines
        for (const ref of spec.refs) {
            g.strokeStyle = C.muted; g.lineWidth = 1.5; g.setLineDash([6, 4]);
            g.beginPath(); g.moveTo(L, Y(ref.y)); g.lineTo(W - R, Y(ref.y)); g.stroke(); g.setLineDash([]);
            g.fillStyle = C.text2; g.textAlign = 'left'; g.textBaseline = 'middle'; g.font = '12px system-ui, sans-serif';
            g.fillText(ref.label, W - R + 8, Y(ref.y) + (ref.dy ?? 0));
        }
        // series: 2px lines, small markers, direct label at the line end
        for (const s of spec.series) {
            g.strokeStyle = s.colour; g.lineWidth = 2; g.lineJoin = 'round';
            g.beginPath();
            s.points.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y))));
            g.stroke();
            if (spec.markers) {
                for (const [x, y] of s.points) {
                    g.beginPath(); g.arc(X(x), Y(y), 4, 0, 2 * Math.PI);
                    g.fillStyle = s.colour; g.fill(); g.strokeStyle = C.surface; g.lineWidth = 2; g.stroke();
                }
            }
            if (spec.series.length <= 4) {
                const [lx, ly] = s.points[s.points.length - 1];
                g.fillStyle = C.text; g.font = '13px system-ui, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle';
                g.fillText(s.label, X(lx) + 8, Y(ly) + (s.dy ?? 0));
            }
        }
        // legend (top right, >= 2 series)
        if (spec.series.length >= 2) {
            let ly = T + 6;
            g.font = '13px system-ui, sans-serif'; g.textAlign = 'right'; g.textBaseline = 'middle';
            for (const s of spec.series) {
                g.fillStyle = C.text; g.fillText(s.legend, W - R - 26, ly);
                g.strokeStyle = s.colour; g.lineWidth = 2;
                g.beginPath(); g.moveTo(W - R - 20, ly); g.lineTo(W - R - 4, ly); g.stroke();
                ly += 20;
            }
        }
        if (spec.note) {
            g.fillStyle = C.muted; g.font = '12px system-ui, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'top';
            g.fillText(spec.note, L, H - 22);
        }
        return c.toDataURL('image/png');
    }, spec);
    writeFileSync(join(OUT, file), Buffer.from(dataUrl.split(',')[1], 'base64'));
}

const BLUE = '#2a78d6', ORANGE = '#eb6834';
const small = report.m3.N16383, large = report.m3.N262143;
await plot('fate-correlation-m3.png', {
    title: 'F(r) = P[L(n) = L(n + 2r)] for 3n + 1 on negative odd n',
    subtitle: 'L(n) = cycle reached (−1, −5 or −17). Every n settled within 2000 steps. Dashed: independent-assignment baselines.',
    x: [0, R_MAX], y: [0.30, 0.50],
    xTicks: [1, 2, 4, 8, 16, 32, 64, 128], yTicks: [0.30, 0.35, 0.40, 0.45, 0.50],
    xLabel: 'r   (pairs n and n + 2r; dotted guides at powers of two)', yLabel: 'F(r): share of pairs with the same cycle',
    refs: [
        { y: 1 / 3, label: '1/3 (equal shares)', dy: 9 },
        { y: large.baselineSumSquares, label: `Σp² = ${large.baselineSumSquares.toFixed(4)}`, dy: -9 },
    ],
    series: [
        { colour: BLUE, label: '|n| ≤ 16,383', legend: `|n| ≤ 16,383 (${small.sampleSize.toLocaleString()} n)`, points: small.F.map(x => [x.r, x.F]), dy: 8 },
        { colour: ORANGE, label: '|n| ≤ 262,143', legend: `|n| ≤ 262,143 (${large.sampleSize.toLocaleString()} n)`, points: large.F.map(x => [x.r, x.F]), dy: -6 },
    ],
    note: `Σp² is ${small.baselineSumSquares.toFixed(4)} (smaller range) and ${large.baselineSumSquares.toFixed(4)} (larger range): both within 0.001 of 1/3, so the two dashed lines nearly coincide.`,
});
log('plot 1 done');

// block-wise curves: F within each dyadic block, against r measured in units of 2^(k-13)
{
    const tbl = report.m3.blocks.table;
    const pal = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#6250d6'];
    const ks = [13, 14, 15, 16, 17];
    await plot('fate-correlation-m3-by-block.png', {
        title: 'F inside one dyadic block, 3n + 1, negative odd n',
        subtitle: 'Each line: pairs with |n| and |n| + 2r both in [2^k, 2^(k+1)). Higher blocks sit higher at the same r.',
        x: [1, 64], y: [0.30, 0.50], logX: true, markers: true,
        xTicks: [1, 2, 4, 8, 16, 32, 64], yTicks: [0.30, 0.35, 0.40, 0.45, 0.50],
        xLabel: 'r (log scale; measured only at powers of two)', yLabel: 'F within block k',
        refs: [{ y: 1 / 3, label: '1/3' }],
        series: ks.map((k, i) => ({
            colour: pal[i], label: `k = ${k}`, legend: `block k = ${k}`,
            points: tbl.filter(x => x.k === k).map(x => [x.r, x.F]), dy: [-10, -2, 6, 0, 0][i],
        })),
        note: 'Doubling both k and r changes F by ' + report.m3.blocks.meanAbsDiff_sameRelativeDistance.toFixed(3) +
            ' on average; keeping r and moving up one block changes it by ' + report.m3.blocks.meanAbsDiff_sameAbsoluteDistance.toFixed(3) + '.',
    });
}
log('plot 2 done');
await browser.close();
