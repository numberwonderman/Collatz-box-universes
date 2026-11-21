// The fate partition in Imai's angular placement (dyadic_fate.py, Nov 2026).
// Writes docs/angular-fate/angular-fate.json and the PNGs beside it.
//
//   node scripts/imai-angular-fate.mjs           (from the repo root; ~1 min)
//
// Fates: fateCodes (js/imaiFateCorrelation.js) -> unchanged trajectoryFate,
// step cap 2000, odd negative n with |n| <= 2^22 - 1 (j <= 2,097,151).
// Placement: js/imaiAngularFate.js (Imai's theta, ported from the formula in
// the task description; his script itself was not available in this session).

import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { fateCodes } from '../js/imaiFateCorrelation.js';
import { windowF } from '../js/imaiFateMap.js';
import {
    imaiTheta, jBlock, baselineOf, blockAngularAgreement, overlayOrder, overlayNeighbourStats,
    cyclicRuns, fatesAlong, shuffledRunRange,
} from '../js/imaiAngularFate.js';
import { mulberry32 } from '../js/eocRealizers.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'docs', 'angular-fate');
mkdirSync(OUT, { recursive: true });
const t0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)} s]`, ...a);
const rd = (x, d = 5) => (x === null || x === undefined ? null : +x.toFixed(d));
const fail = msg => { console.error(`SANITY CHECK FAILED: ${msg}`); process.exit(1); };
const KEYS = [-1, -5, -17];

const N = 2 ** 22 - 1, CAP = 2000;
const { codes, unsettled } = fateCodes({ N, m: 3, c: 1, maxSteps: CAP, sign: -1 });
log(`fate table: ${codes.length} odd n (j = 0..${codes.length - 1}), unsettled ${JSON.stringify(unsettled)}`);
if (unsettled.cap || unsettled.overflow) fail('unsettled orbits');

// ---------- sanity checks ----------
const checks = {};
{
    const all = j => Array.from({ length: j }, (_, i) => i);
    const imai = baselineOf(codes, all(16384)).counts;
    if (imai.join() !== '5418,5317,5649') fail(`counts for N = 2^15 - 1 are ${imai}, Imai printed 5418, 5317, 5649`);
    checks.imaiCountsN32767 = { observed: Object.fromEntries(KEYS.map((k, i) => [k, imai[i]])), imaiPrinted: { [-1]: 5418, [-5]: 5317, [-17]: 5649 }, passed: true };
    const c16 = baselineOf(codes, all(8192)).counts;
    if (c16.join() !== '2673,2667,2852') fail(`counts at |n| <= 16383: ${c16}`);
    const f1 = windowF(codes, 0, 8192, 1);
    if (f1.pairs !== 8191 || +f1.F.toFixed(4) !== 0.4293) fail(`global F(1) ${f1.F} over ${f1.pairs} pairs`);
    checks.existing = { counts16383: { [-1]: 2673, [-5]: 2667, [-17]: 2852 }, globalF1: 0.4293, pairs: 8191, passed: true };
    const ang = [[0, 0], [1, Math.PI], [2, Math.PI / 2], [3, 3 * Math.PI / 2], [4, Math.PI / 4]];
    for (const [j, t] of ang) if (Math.abs(imaiTheta(j) - t) > 1e-14) fail(`theta(${j})`);
    checks.angles = { j0: 0, j1: 'pi', j2: 'pi/2', j3: '3pi/2', j4: 'pi/4', passed: true, alsoUnitTests: true };
    checks.syntheticHandCase = { location: 'js/tests/imaiAngularFate.test.js', passed: 'see test run' };
}
log('sanity checks passed');

// ---------- Part 1: per-block angular agreement ----------
const M = 128;
const part1 = [];
let eq = { maxRaw: 0, maxRawAt: null, maxRawM1: 0, storedGridEqualsRecomputation: true, differenceIsExactlyMBoundaryPairs: true };
{
    const fm = JSON.parse(readFileSync(join(ROOT, 'docs/fate-map/fate-map.json'), 'utf8'));
    for (let k = 10; k <= 20; k++) {
        const A = blockAngularAgreement(codes, k, M);
        const ref = fm.mapA.rows.find(r => r.k === k + 1); // fate-map B_(k+1) = odd n with 2^(k+1) <= |n| < 2^(k+2) = j-block k
        for (const x of A.rows) {
            const json = ref.F[x.m - 1];
            const conv = windowF(codes, 2 ** k, 2 ** (k + 1), x.m);
            if (+conv.F.toFixed(5) !== json) eq.storedGridEqualsRecomputation = false;
            if (conv.pairs - x.pairs !== x.m || Math.abs(x.A - conv.F) > x.m / conv.pairs + 1e-12) eq.differenceIsExactlyMBoundaryPairs = false;
            const raw = Math.abs(x.A - json);
            if (raw > eq.maxRaw) { eq.maxRaw = raw; eq.maxRawAt = { k, m: x.m, A: rd(x.A), fateMap: json, extraPairsInFateMap: x.m, pairsHere: x.pairs }; }
            if (x.m === 1) eq.maxRawM1 = Math.max(eq.maxRawM1, raw);
        }
        part1.push(A);
    }
    if (!eq.storedGridEqualsRecomputation || !eq.differenceIsExactlyMBoundaryPairs) fail('Part 1 does not coincide with fate-map up to the boundary-pair convention');
    if (eq.maxRawM1 > 0.00085) fail(`Part 1 discrepancy at m = 1 is ${eq.maxRawM1} > 0.00085`);
    eq = { ...eq, maxRaw: rd(eq.maxRaw, 6), maxRawM1: rd(eq.maxRawM1, 6), passed: true,
        note: 'j-block k = fate-map block B_(k+1). Here pairs (i, i + m) both lie in the block; the fate-map convention lets the m lowest-|n| points pair into the block below, i.e. exactly m extra pairs. Every cell differs by exactly those m pairs (bound m/pairs); at m = 1 the largest difference is within the documented 0.00085. The raw maximum over m = 1..128 is larger because the boundary effect grows with m.' };
}
log('Part 1 done');

// ---------- Part 2: the full overlay ----------
const part2 = {};
for (const K of [15, 18, 21]) {
    const order = overlayOrder(K);
    const seq = fatesAlong(codes, order);
    const st = overlayNeighbourStats(codes, order);
    const allJ = Array.from({ length: 2 ** K }, (_, j) => j);
    const base = baselineOf(codes, allJ);
    const runs = cyclicRuns(seq);
    const sims = shuffledRunRange(seq, 20, mulberry32(1000 + K));
    // block shares, for the cross-block independence expectation sum_i p_i(top) p_i(k')
    const blockShares = {};
    for (let k = 0; k < K; k++) blockShares[k] = baselineOf(codes, Array.from({ length: 2 ** k }, (_, s) => 2 ** k + s)).shares;
    blockShares[-1] = baselineOf(codes, [0]).shares;
    const topShares = blockShares[K - 1];
    const byCoarser = Object.entries(st.byCoarserK).map(([k, v]) => {
        const exp = topShares.reduce((s, p, i) => s + p * blockShares[k][i], 0);
        return { coarserBlock: +k, pairs: v.pairs, same: v.same, agreement: rd(v.same / v.pairs), independentExpectation: rd(exp), excess: rd(v.same / v.pairs - exp) };
    }).sort((a, b) => a.coarserBlock - b.coarserBlock);
    // identity check: overlay agreement = agreement of each top-block odd n with its even neighbours n +- 1 on the line
    const oddIdx = x => { while (x % 2 === 0) x /= 2; return (x - 1) / 2; }; // |even| -> j of its odd part
    let idPairs = 0, idSame = 0;
    for (let s = 0; s < 2 ** (K - 1); s++) {
        const j = 2 ** (K - 1) + s, a = 2 * j + 1;
        for (const nb of [a - 1, a + 1]) {
            if (nb === 2 ** (K + 1)) { idPairs++; if (codes[j] === codes[0]) idSame++; continue; } // wrap: |n| + 1 = 2^(K+1) -> odd part 1
            idPairs++; if (codes[j] === codes[oddIdx(nb)]) idSame++;
        }
    }
    const identityHolds = idPairs === st.pairs && idSame === st.same;
    // sequence identity: position t of the overlay carries the odd part of 2^K + t, i.e. the overlay in angular
    // order is the run of consecutive negative integers -2^K ... -(2^(K+1) - 1), each even one shown by its odd part
    let seqOK = true;
    for (let t = 0; t < order.length; t++) {
        let x = 2 ** K + t;
        while (x % 2 === 0) x /= 2;
        if (order[t] !== (x - 1) / 2) { seqOK = false; break; }
    }
    if (!seqOK) fail(`sequence identity failed at K = ${K}`);
    // for contrast, the line: adjacent odd pairs in the top block (n, n + 2), this study's within-block convention
    const lineTop = blockAngularAgreement(codes, K - 1, 1).rows[0];
    part2[`K${K}`] = {
        points: 2 ** K, range: `j < 2^${K}  (n = -1 to -${2 ** (K + 1) - 1})`,
        a_overall: { neighbourPairs: st.pairs, same: st.same, agreement: rd(st.agreement), baseline: rd(base.baseline), excess: rd(st.agreement - base.baseline),
            shares: Object.fromEntries(KEYS.map((k, i) => [k, rd(base.shares[i])])) },
        b_pairTypes: { sameBlock: st.sameBlock, crossBlock: { ...st.crossBlock, agreement: rd(st.crossBlock.same / st.crossBlock.pairs) },
            note: 'same-block pairs cannot occur: the overlay is the grid t pi/2^(K-1), every pair (t, t+1) has one odd t, i.e. one point of the top block K-1, and the other point in a coarser block' },
        c_runs: {
            observed: { runs: runs.runs, mean: rd(runs.mean, 4), median: runs.median, longest: runs.max,
                longestStartsAt: { j: order[runs.maxStartIndex], n: -(2 * order[runs.maxStartIndex] + 1), theta: rd(imaiTheta(order[runs.maxStartIndex]), 6), fate: KEYS[seq[runs.maxStartIndex]] } },
            shuffledSameShares: { method: 'the same fate multiset shuffled over the circle positions (Fisher-Yates, mulberry32 seed ' + (1000 + K) + '), 20 shuffles',
                runs: [Math.min(...sims.map(s => s.runs)), Math.max(...sims.map(s => s.runs))], longest: [Math.min(...sims.map(s => s.max)), Math.max(...sims.map(s => s.max))],
                mean: [rd(Math.min(...sims.map(s => s.mean)), 4), rd(Math.max(...sims.map(s => s.mean)), 4)], agreement: [rd(Math.min(...sims.map(s => s.agreement))), rd(Math.max(...sims.map(s => s.agreement)))] },
            histogram: Object.fromEntries([...runs.histogram.entries()].sort((a, b) => a[0] - b[0])),
        },
        d_byLargerK: Object.fromEntries(Object.entries(st.byLargerK).map(([k, v]) => [k, { ...v, agreement: rd(v.same / v.pairs) }])),
        d_note: 'the larger block of every pair is K-1 (see b_pairTypes), so grouping by the larger k gives a single group; byCoarserBlock groups by the other point\'s block instead',
        byCoarserBlock: byCoarser,
        integerSequenceIdentity: { statement: `point t of the overlay (in angular order) is the odd part of 2^${K} + t, so the circle lists the fates of the consecutive negative integers -${2 ** K} to -${2 ** (K + 1) - 1} (every parity; an even integer is shown by its odd part, which has the same fate)`, holds: seqOK },
        identityCheck: { statement: 'overlay neighbours of a top-block odd n are the odd parts of |n| +- 1, so overlay agreement = agreement of odd n with the even integers n -+ 1 on the line', pairs: idPairs, same: idSame, holds: identityHolds },
        lineContrast: { note: 'adjacent odd pairs (n, n + 2) inside the top j-block, this study\'s within-block convention', pairs: lineTop.pairs, agreement: rd(lineTop.A) },
    };
    if (!identityHolds) fail(`identity check failed at K = ${K}`);
    log(`Part 2 K=${K}: agreement ${st.agreement.toFixed(4)} baseline ${base.baseline.toFixed(4)}, runs ${runs.runs} longest ${runs.max}`);
}

const report = {
    placement: "theta(n) for n = -(2j+1): k = floor(log2(max(j,1))), theta = (2(j - 2^k) + 1) pi / 2^k for j >= 1, theta(-1) = 0. Ported from the formula given in the task (Imai's dyadic_fate.py); his script was not available in this session, and his printed counts are reproduced exactly.",
    fateTable: { range: `odd n, -${N} <= n <= -1 (j = 0..${codes.length - 1})`, values: codes.length, stepCap: CAP, unsettled },
    sanityChecks: checks,
    part1: {
        convention: 'A_k(m): points of j-block k (2^k <= j < 2^(k+1)) in angular order (= j order); pairs (i, i+m) in that order with both points in the block; linear, not cyclic. Baseline sum p^2 over the block; excess = A - baseline.',
        equivalenceCheck: eq,
        rows: part1.map(r => ({ k: r.k, size: r.size, shares: r.shares.map(v => rd(v)), baseline: rd(r.baseline), A: r.rows.map(x => rd(x.A)), excess: r.rows.map(x => rd(x.excess)), pairs: r.rows.map(x => x.pairs) })),
    },
    part2,
};
writeFileSync(join(OUT, 'angular-fate.json'), JSON.stringify(report) + '\n');
log('json written');

// ---------- renders ----------
const browser = await chromium.launch().catch(() =>
    chromium.launch({ executablePath: process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium' }));
const page = await browser.newPage();
await page.setContent('<canvas id="c"></canvas>');

async function heatmap(file, spec) {
    const url = await page.evaluate(spec => {
        const toLin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
        const toSrgb = v => 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);
        const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
        const lab = h => { const [r, g, b] = hex(h).map(toLin); const l = Math.cbrt(0.4122214708 * r + 0.5363015887 * g + 0.0514459929 * b), m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b), s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b); return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s]; };
        const rgb = ([L, a, b]) => { const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3; return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s].map(v => Math.max(0, Math.min(255, Math.round(toSrgb(Math.max(0, Math.min(1, v))))))); };
        const stops = spec.stops.map(lab);
        const colour = t => { t = Math.max(0, Math.min(1, t)); const x = t * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(x)), f = x - i; return rgb(stops[i].map((v, j) => v + f * (stops[i + 1][j] - v))); };
        const scale = v => (v - spec.vmin) / (spec.vmax - spec.vmin);
        const C = { surface: '#fcfcfb', text: '#1a1a19', text2: '#5f5e58', muted: '#8c8b84', axis: '#b9b8b0' };
        const W = 1300, H = 620, L = 250, T = 104, R = 215, B = 78;
        const c = document.getElementById('c'); c.width = W * 2; c.height = H * 2;
        const g = c.getContext('2d'); g.scale(2, 2);
        g.fillStyle = C.surface; g.fillRect(0, 0, W, H);
        g.fillStyle = C.text; g.font = '600 19px system-ui, sans-serif'; g.textBaseline = 'top'; g.fillText(spec.title, L, 16);
        g.font = '13px system-ui, sans-serif'; g.fillStyle = C.text2; spec.subtitle.forEach((s, i) => g.fillText(s, L, 44 + 18 * i));
        const PW = W - L - R - (spec.baselineCol ? 36 : 0), PH = H - T - B, nr = spec.rows.length, nc = spec.rows[0].length, cw = PW / nc, ch = PH / nr;
        for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) { g.fillStyle = `rgb(${colour(scale(spec.rows[i][j]))})`; g.fillRect(L + j * cw, T + i * ch, Math.ceil(cw + 0.5), Math.ceil(ch + 0.5)); }
        if (spec.baselineCol) {
            const bx = L + PW + 8;
            for (let i = 0; i < nr; i++) { g.fillStyle = `rgb(${colour(scale(spec.baselineCol[i]))})`; g.fillRect(bx, T + i * ch, 22, Math.ceil(ch + 0.5)); }
            g.fillStyle = C.text2; g.font = '11px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'bottom'; g.fillText('baseline', bx + 11, T - 6);
        }
        g.font = '12px system-ui, sans-serif'; g.textAlign = 'right'; g.textBaseline = 'middle';
        spec.yLabels.forEach((s, i) => { g.fillStyle = C.muted; g.fillText(s, L - 8, T + (i + 0.5) * ch); });
        g.textAlign = 'center'; g.textBaseline = 'top';
        for (const m of spec.xTicks) { const x = L + (m - 0.5) * cw; g.strokeStyle = C.axis; g.beginPath(); g.moveTo(x, T + PH); g.lineTo(x, T + PH + 5); g.stroke(); g.fillStyle = C.muted; g.fillText(String(m), x, T + PH + 8); }
        g.fillStyle = C.text2; g.font = '13px system-ui, sans-serif'; g.fillText(spec.xLabel, L + PW / 2, T + PH + 28);
        g.save(); g.translate(16, T + PH / 2); g.rotate(-Math.PI / 2); g.fillText(spec.yLabel, 0, 0); g.restore();
        const bx = W - R + 52, bw = 18;
        for (let y = 0; y < PH; y++) { g.fillStyle = `rgb(${colour(1 - y / PH)})`; g.fillRect(bx, T + y, bw, 1.5); }
        g.font = '12px system-ui, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle';
        for (const t of spec.barTicks) { const y = T + (1 - scale(t.v)) * PH; g.strokeStyle = C.text; g.lineWidth = t.strong ? 2 : 1; g.beginPath(); g.moveTo(bx - (t.strong ? 6 : 0), y); g.lineTo(bx + bw + 4, y); g.stroke(); g.fillStyle = t.strong ? C.text : C.muted; g.fillText(t.label, bx + bw + 8, y); }
        g.fillStyle = C.text2; g.textAlign = 'center'; g.textBaseline = 'bottom'; g.fillText(spec.barLabel, bx + bw / 2, T - 8);
        return c.toDataURL('image/png');
    }, spec);
    writeFileSync(join(OUT, file), Buffer.from(url.split(',')[1], 'base64'));
}
const SEQ = ['#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#184f95', '#0d366b'];
const DIV = ['#0d366b', '#2a78d6', '#9ec5f4', '#f0efec', '#f3b3b2', '#e34948', '#7d1d1d'];
{
    const rows = part1.map(r => r.rows.map(x => x.A)), bl = part1.map(r => r.baseline);
    const vmin = Math.min(...rows.flat(), ...bl) - 0.002, vmax = Math.max(...rows.flat()) + 0.002;
    const bMean = bl.reduce((a, b) => a + b, 0) / bl.length;
    const yLabels = part1.map(r => `j-block ${r.k}  (|n| ${(2 ** (r.k + 1) + 1).toLocaleString('en-US')}–${(2 ** (r.k + 2) - 1).toLocaleString('en-US')})`);
    const base = { rows, yLabels, xTicks: [1, 8, 16, 32, 48, 64, 80, 96, 112, 128], xLabel: 'separation m in angular order (pairs i, i + m within the block)', yLabel: 'j-block k (|n| grows downward)' };
    await heatmap('mapC-angular-blocks-raw.png', {
        ...base, stops: SEQ, vmin, vmax, baselineCol: bl,
        title: "A_k(m): fate agreement in Imai's angular order, per j-block",
        subtitle: ['Within a block, angular order is j order, so this is the per-block F of the colour-map study in angular coordinates (see notes for the m-pair boundary convention).',
            `Right-hand column: each block's independence baseline Σp² (${Math.min(...bl).toFixed(3)}–${Math.max(...bl).toFixed(3)}).`],
        barLabel: 'A', barTicks: [...[0.35, 0.40, 0.45, 0.50].filter(v => v > vmin && v < vmax).map(v => ({ v, label: v.toFixed(2) })), { v: bMean, label: `baseline ≈ ${bMean.toFixed(3)}`, strong: true }],
    });
    const ex = part1.map(r => r.rows.map(x => x.excess)), m = Math.max(...ex.flat().map(Math.abs));
    await heatmap('mapC-angular-blocks-excess.png', {
        ...base, rows: ex, stops: DIV, vmin: -m, vmax: m,
        title: 'Excess A_k(m) − Σp², per j-block',
        subtitle: ['Grey = 0 (independent fates); red = more agreement than chance, blue = less.', `Symmetric scale ±${m.toFixed(3)} (the largest |excess| in the map).`],
        barLabel: 'excess', barTicks: [{ v: m, label: `+${m.toFixed(3)}` }, { v: m / 2, label: `+${(m / 2).toFixed(3)}` }, { v: 0, label: '0 (baseline)', strong: true }, { v: -m / 2, label: `−${(m / 2).toFixed(3)}` }, { v: -m, label: `−${m.toFixed(3)}` }],
    });
}
log('map C done');

// Part 3: Imai's figure at K = 15 -- one spoke per point, his colours (-1 green, -5 orange, -17 blue)
{
    const K = 15, n = 2 ** K;
    const fates = Array.from({ length: n }, (_, j) => codes[j]);
    const thetas = Array.from({ length: n }, (_, j) => imaiTheta(j));
    const url = await page.evaluate(({ fates, thetas }) => {
        const S = 1000, c = document.getElementById('c');
        c.width = S * 2; c.height = (S + 90) * 2;
        const g = c.getContext('2d'); g.scale(2, 2);
        g.fillStyle = '#ffffff'; g.fillRect(0, 0, S, S + 90);
        g.fillStyle = '#1a1a19'; g.font = '600 24px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'top';
        g.fillText('Basins of the Negative Collatz Map', S / 2, 18);
        const col = ['#008300', '#eb6834', '#2a78d6']; // -1 green, -5 orange, -17 blue (Imai's assignment)
        const cx = S / 2, cy = S / 2 + 60, R = S / 2 - 60;
        // spokes drawn one by one in angular order, so no fate is systematically painted last
        g.lineWidth = 0.35; g.globalAlpha = 0.6;
        const order = thetas.map((t, j) => j).sort((a, b) => thetas[a] - thetas[b]);
        for (const j of order) {
            g.strokeStyle = col[fates[j]]; g.beginPath();
            g.moveTo(cx, cy); g.lineTo(cx + R * Math.cos(thetas[j]), cy - R * Math.sin(thetas[j]));
            g.stroke();
        }
        g.globalAlpha = 1; g.strokeStyle = '#555'; g.lineWidth = 1; g.beginPath(); g.arc(cx, cy, R, 0, 2 * Math.PI); g.stroke();
        const labels = ['Basin of −1', 'Basin of −5', 'Basin of −17'];
        g.font = '15px system-ui, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle';
        labels.forEach((s, k) => { g.fillStyle = col[k]; g.fillRect(24, 70 + 26 * k, 16, 16); g.fillStyle = '#1a1a19'; g.fillText(s, 48, 78 + 26 * k); });
        g.fillStyle = '#5f5e58'; g.font = '13px system-ui, sans-serif'; g.textAlign = 'center';
        g.fillText(`${fates.length.toLocaleString('en-US')} negative odd n (j < 2^15, n = −1 to −65,535); one spoke per n at Imai's angle θ(n), drawn in angular order.`, S / 2, S + 60);
        g.fillText('Spokes overlap heavily toward the centre; individual spokes are resolved only near the rim.', S / 2, S + 78);
        return c.toDataURL('image/png');
    }, { fates, thetas });
    writeFileSync(join(OUT, 'imai-circle-k15.png'), Buffer.from(url.split(',')[1], 'base64'));
}
log('figure done');
await browser.close();
console.log(JSON.stringify({ eq: report.part1.equivalenceCheck, part2: Object.fromEntries(Object.entries(part2).map(([k, v]) => [k, { a: v.a_overall, b: v.b_pairTypes, c: { obs: v.c_runs.observed, sh: v.c_runs.shuffledSameShares }, coarser: v.byCoarserBlock, id: v.identityCheck.holds, line: v.lineContrast }])) }));
