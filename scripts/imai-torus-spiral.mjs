// Build 9: torus and spiral drawings of the fate partition (Franklin's own question, Nov 2026).
// Writes docs/torus-spiral/torus-spiral.json and PNGs.
//
//   node scripts/imai-torus-spiral.mjs            (from the repo root; ~10 s)

import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { fateCodes } from '../js/imaiFateCorrelation.js';
import { windowF, windowBaseline } from '../js/imaiFateMap.js';
import { heightChangeTable } from '../js/imaiGeometries.js';
import { theta } from '../js/imaiDyadicCircle.js';
import { fateOfInteger, latticeAgreement, latticeHeight, sharesOf, ulamCoords, spiralAgreement } from '../js/imaiTorusSpiral.js';
import { mulberry32 } from '../js/eocRealizers.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'docs', 'torus-spiral');
mkdirSync(OUT, { recursive: true });
const t0 = Date.now();
let tStep = Date.now();
const log = (...a) => { console.log(`[${((Date.now() - t0) / 1000).toFixed(1)} s]`, ...a); };
const STEP_LIMIT_S = 120; // tripwire: stop and report rather than silently cut a range
const step = name => { const s = (Date.now() - tStep) / 1000; if (s > STEP_LIMIT_S) { console.error(`STOP: step "${name}" took ${s.toFixed(0)} s (> ${STEP_LIMIT_S} s)`); process.exit(2); } tStep = Date.now(); };
const rd = (x, d = 5) => (x === null || x === undefined ? null : +x.toFixed(d));
const fail = msg => { console.error(`SANITY CHECK FAILED: ${msg}`); process.exit(1); };
const KEYS = [-1, -5, -17];

const K_TORUS = [15, 18];
const N = 2 ** Math.max(...K_TORUS) - 1;
const { codes, unsettled } = fateCodes({ N, m: 3, c: 1, maxSteps: 2000, sign: -1 });
step('fate table');
log(`fate table |n| <= ${N}: ${codes.length} odd n, unsettled ${JSON.stringify(unsettled)}`);

// ---------- sanity checks ----------
const checks = {};
{
    if (unsettled.cap || unsettled.overflow) fail('unsettled orbits');
    const c = windowBaseline(codes, 0, 8192).counts;
    if (c.join() !== '2673,2667,2852') fail(`counts ${c}`);
    checks.fateCounts16383 = { observed: { [-1]: c[0], [-5]: c[1], [-17]: c[2] }, passed: true };
    const f1 = windowF(codes, 0, 8192, 1);
    if (f1.pairs !== 8191 || +f1.F.toFixed(4) !== 0.4293) fail(`F(1) ${f1.F} over ${f1.pairs}`);
    checks.F1_16383 = { F1: rd(f1.F, 4), pairs: f1.pairs, passed: true };
    const g = JSON.parse(readFileSync(join(ROOT, 'docs/geometries/geometry-numbers.json'), 'utf8'));
    const ref = g.heightChanges.N4095_c1.odd.neg.dh;
    const t = heightChangeTable({ N: 4095, m: 3, c: 1 }).odd.neg.dh;
    if (t[-1] !== ref[-1] || t[-2] !== ref[-2] || t[-1] !== 683 || t[-2] !== 1365) fail(`climb split ${JSON.stringify(t)} vs ${JSON.stringify(ref)}`);
    const tp = heightChangeTable({ N: 4095, m: 3, c: 0 }).odd.pos.dh;
    checks.climbSplit = {
        range: 'odd n, 1 <= |n| <= 4095 (Build 3 range), 3n + 1',
        negativeOddSteps: { climbBy1: t[-1], climbBy2: t[-2], shares: [rd(t[-1] / 2048, 4), rd(t[-2] / 2048, 4)] },
        positiveOddSteps_c0: { climbBy1: tp[1], climbBy2: tp[2] },
        note: 'climb = |change in height| on an odd step; 683 / 1365 of 2048 (x < 1/3 rule, Build 3)',
        passed: true,
    };
    checks.syntheticSpiral = { location: 'js/tests/imaiTorusSpiral.test.js', handCount: '17 of 40 grid pairs for j = 1..25', passed: 'see test run' };
}
log('sanity checks passed');

// ---------- Part 1: torus vs cylinder ----------
const part1 = {};
const fmtL = l => ({
    pairs: l.pairs, same: l.same, agreement: rd(l.agreement),
    horizontal: { ...l.horizontal, agreement: rd(l.horizontal.same / l.horizontal.pairs) },
    vertical: { ...l.vertical, agreement: rd(l.vertical.same / l.vertical.pairs) },
    wrapPairs: l.wrapPairs,
});
for (const K of K_TORUS) {
    const count = 2 ** (K - 1);
    const sh = sharesOf(codes.subarray(0, count));
    const cyl = latticeAgreement(codes, K);
    const tor = Object.fromEntries([32, 64].map(H => [H, latticeAgreement(codes, K, H)]));
    for (const H of [32, 64]) if (tor[H].pairs !== cyl.pairs || tor[H].same !== cyl.same) fail(`torus H=${H} differs from cylinder at K=${K}`);
    step(`lattice K=${K}`);
    part1[`K${K}`] = {
        range: `odd n, 1 <= |n| <= ${2 ** K - 1} (${count} points), heights 0..${K - 1}`,
        shares: Object.fromEntries(KEYS.map((k, i) => [k, rd(sh.shares[i])])), baselineSumSquares: rd(sh.sumSquares),
        cylinder: fmtL(cyl),
        torus: Object.fromEntries([32, 64].map(H => [`H${H}`, { ...fmtL(tor[H]), identicalToCylinder: true }])),
        byRow: Object.fromEntries(Object.entries(cyl.byRow).map(([h, v]) => [h, {
            horizontal: v.horizontal.pairs ? rd(v.horizontal.same / v.horizontal.pairs, 4) : null,
            vertical: v.vertical.pairs ? rd(v.vertical.same / v.vertical.pairs, 4) : null,
            pairs: { horizontal: v.horizontal.pairs, vertical: v.vertical.pairs },
        }])),
        rowShares: Object.fromEntries(Array.from({ length: K - 1 }, (_, i) => i + 1).map(h => {
            const s = sharesOf(codes.subarray(2 ** (h - 1), 2 ** h));
            return [h, s.shares.map(v => rd(v, 4))];
        })),
    };
    log(`K=${K}: cylinder ${cyl.agreement.toFixed(4)} (h ${(cyl.horizontal.same / cyl.horizontal.pairs).toFixed(4)}, v ${(cyl.vertical.same / cyl.vertical.pairs).toFixed(4)}), baseline ${sh.sumSquares.toFixed(4)}`);
}
// cross-check: vertical pairs from row 14 up to row 15 are Build 7's overlay pairs at K = 15 with coarser block 13
{
    const ang = JSON.parse(readFileSync(join(ROOT, 'docs/angular-fate/angular-fate.json'), 'utf8'));
    const ref = ang.part2.K15.byCoarserBlock.find(x => x.coarserBlock === 13);
    const row14 = latticeAgreement(codes, 18).byRow[14].vertical;
    if (row14.pairs !== ref.pairs || row14.same !== ref.same) fail(`vertical row 14 (${row14.same}/${row14.pairs}) vs angular overlay (${ref.same}/${ref.pairs})`);
    checks.verticalEqualsAngularOverlay = { statement: 'lattice vertical pairs (m, 2m +- 1), m in row 14, are the K = 15 overlay pairs of Build 7 with coarser j-block 13', lattice: row14, angularFate: { pairs: ref.pairs, same: ref.same }, passed: true };
}
log('torus done');

// ---------- Part 2: Ulam spiral ----------
const J = 2 ** 15 - 1;
const fateJ = new Int8Array(J + 1);
for (let j = 1; j <= J; j++) fateJ[j] = fateOfInteger(codes, j);
const spiral = spiralAgreement(J, j => fateJ[j]);
const shJ = sharesOf(fateJ.subarray(1));
const rng = mulberry32(915);
const shuffles = [];
const perm = Int8Array.from(fateJ.subarray(1));
for (let s = 0; s < 20; s++) {
    for (let i = perm.length - 1; i > 0; i--) { const k = Math.floor(rng() * (i + 1)); const t = perm[i]; perm[i] = perm[k]; perm[k] = t; }
    shuffles.push(spiralAgreement(J, j => perm[j - 1]).agreement);
}
step('spiral');
// line contrast: consecutive integers (all parities) 1..J
let cs = 0;
for (let j = 1; j < J; j++) if (fateJ[j] === fateJ[j + 1]) cs++;
const { xs, ys } = ulamCoords(J);
let gapSum = 0, gapN = 0;
{
    const at = new Map();
    for (let j = 1; j <= J; j++) at.set(`${xs[j]},${ys[j]}`, j);
    for (let j = 1; j <= J; j++) for (const [dx, dy] of [[1, 0], [0, 1]]) { const k = at.get(`${xs[j] + dx},${ys[j] + dy}`); if (k !== undefined && Math.abs(j - k) !== 1) { gapSum += Math.abs(j - k); gapN++; } }
}
const part2 = {
    range: `j = -n = 1..${J} (n = -1 .. -${J}), every integer, evens by their odd part`,
    orientation: 'standard Ulam: 1 at the origin, 2 to the east, counter-clockwise',
    shares: Object.fromEntries(KEYS.map((k, i) => [k, rd(shJ.shares[i])])), baselineSumSquares: rd(shJ.sumSquares),
    gridAgreement: { pairs: spiral.pairs, same: spiral.same, agreement: rd(spiral.agreement) },
    shuffledControl: { shuffles: 20, seed: 915, mean: rd(shuffles.reduce((a, b) => a + b, 0) / 20), min: rd(Math.min(...shuffles)), max: rd(Math.max(...shuffles)) },
    byPairType: {
        consecutive: { ...spiral.consecutive, agreement: rd(spiral.consecutive.same / spiral.consecutive.pairs), note: 'grid neighbours that are consecutive integers j, j + 1' },
        crossRing: { ...spiral.crossRing, agreement: rd(spiral.crossRing.same / spiral.crossRing.pairs), meanSeparation: rd(gapSum / gapN, 1), note: 'grid neighbours on adjacent rings of the spiral' },
    },
    lineContrast: { note: 'all consecutive pairs (j, j + 1), j = 1..J - 1, on the plain integer line', pairs: J - 1, same: cs, agreement: rd(cs / (J - 1)) },
};
log(`spiral: ${spiral.agreement.toFixed(4)} vs baseline ${shJ.sumSquares.toFixed(4)} vs shuffled ${part2.shuffledControl.mean}`);

const report = {
    note: "Build 9 is Franklin's own question, not one of Imai's requests.",
    definitions: {
        fates: 'L(n), 3n + 1, cycles -1 / -5 / -17; even integers carry the fate of their odd part',
        torus: 'toroidal angle theta(n) (dyadic angle, Build 3), poloidal angle 2 pi (h mod H) / H with h = k(|n|), the cylinder height of Build 3 (dyadic block)',
        lattice: 'odd negative n; horizontal neighbours: |n|, |n| + 2 in the same row (block); vertical neighbours: 2|n| - 1 and 2|n| + 1 in the row above (the two points nearest the angle of |n|, which falls on the even 2|n|)',
        spiral: 'Ulam square spiral of j = -n, 4-neighbourhood, each unordered pair once',
    },
    sanityChecks: checks, part1, part2,
    naturalPeriod: 'none found: heights are dyadic block indices (0..K-1), each used once; the per-row agreement and share series (byRow, rowShares) were inspected and show a trend with no repeat; with 14-17 rows a period could not be established in any case',
};
writeFileSync(join(OUT, 'torus-spiral.json'), JSON.stringify(report, null, 1) + '\n');
log('json written');

// ---------- figures ----------
const COL = [[0, 131, 0], [235, 104, 52], [42, 120, 214]]; // -1 green, -5 orange, -17 blue (Imai's figure colours)
const browser = await chromium.launch().catch(() => chromium.launch({ executablePath: process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium' }));
const page = await browser.newPage();
await page.setContent('<canvas id="c"></canvas>');
async function render(file, { W, H, plot, title, subtitle, axes }) {
    const b64 = Buffer.from(plot.rgba.buffer).toString('base64');
    const url = await page.evaluate(({ b64, W, H, plot, title, subtitle, axes }) => {
        const c = document.getElementById('c'); c.width = W * 2; c.height = H * 2;
        const g = c.getContext('2d'); g.scale(2, 2);
        g.fillStyle = '#fcfcfb'; g.fillRect(0, 0, W, H);
        g.fillStyle = '#1a1a19'; g.font = '600 19px system-ui, sans-serif'; g.textBaseline = 'top'; g.fillText(title, 70, 16);
        g.font = '13px system-ui, sans-serif'; g.fillStyle = '#5f5e58'; subtitle.forEach((s, i) => g.fillText(s, 70, 44 + 18 * i));
        const bytes = Uint8ClampedArray.from(atob(b64), ch => ch.charCodeAt(0));
        const off = document.createElement('canvas'); off.width = plot.w; off.height = plot.h;
        off.getContext('2d').putImageData(new ImageData(bytes, plot.w, plot.h), 0, 0);
        g.imageSmoothingEnabled = false;
        g.drawImage(off, plot.x, plot.y, plot.dw, plot.dh);
        g.strokeStyle = '#b9b8b0'; g.strokeRect(plot.x, plot.y, plot.dw, plot.dh);
        g.font = '12px system-ui, sans-serif'; g.fillStyle = '#8c8b84';
        for (const t of axes.x ?? []) { g.textAlign = 'center'; g.textBaseline = 'top'; g.fillText(t[1], plot.x + t[0] * plot.dw, plot.y + plot.dh + 6); }
        for (const t of axes.y ?? []) { g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillText(t[1], plot.x - 8, plot.y + t[0] * plot.dh); }
        g.fillStyle = '#5f5e58'; g.font = '13px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'top';
        if (axes.xLabel) g.fillText(axes.xLabel, plot.x + plot.dw / 2, plot.y + plot.dh + 26);
        if (axes.yLabel) { g.save(); g.translate(18, plot.y + plot.dh / 2); g.rotate(-Math.PI / 2); g.fillText(axes.yLabel, 0, 0); g.restore(); }
        const labels = ['→ −1', '→ −5', '→ −17'], cols = ['#008300', '#eb6834', '#2a78d6'];
        g.textAlign = 'left'; g.textBaseline = 'middle';
        labels.forEach((s, i) => { const x = plot.x + plot.dw - 270 + 90 * i; g.fillStyle = cols[i]; g.fillRect(x, plot.y - 22, 14, 14); g.fillStyle = '#1a1a19'; g.fillText(s, x + 20, plot.y - 15); });
        return c.toDataURL('image/png');
    }, { b64, W, H, plot: { ...plot, rgba: undefined }, title, subtitle, axes });
    writeFileSync(join(OUT, file), Buffer.from(url.split(',')[1], 'base64'));
}
// unwrapped torus (theta, h mod H), K = 18; each pixel column of a row shows the mean colour of its points
for (const Hw of [32, 64]) {
    const K = 18, w = 1200, rowPx = Math.max(6, Math.floor(640 / Hw)), h = Hw * rowPx;
    const rgba = new Uint8ClampedArray(w * h * 4).fill(252);
    const acc = new Float64Array(w * Hw * 4);
    for (let a = 1; a <= 2 ** K - 1; a += 2) {
        const hh = latticeHeight(-a) % Hw, t = theta(-a); // t in [pi, 2 pi) for negatives
        const col = Math.min(w - 1, Math.floor(((t - Math.PI) / Math.PI) * w));
        const cc = COL[codes[(a - 1) / 2]], o = 4 * (hh * w + col);
        acc[o] += cc[0]; acc[o + 1] += cc[1]; acc[o + 2] += cc[2]; acc[o + 3]++;
    }
    for (let r = 0; r < Hw; r++) for (let x = 0; x < w; x++) {
        const o = 4 * (r * w + x); if (!acc[o + 3]) continue;
        for (let y = 0; y < rowPx - 1; y++) {
            const p = 4 * (((Hw - 1 - r) * rowPx + y) * w + x);
            rgba[p] = acc[o] / acc[o + 3]; rgba[p + 1] = acc[o + 1] / acc[o + 3]; rgba[p + 2] = acc[o + 2] / acc[o + 3]; rgba[p + 3] = 255;
        }
    }
    for (let i = 3; i < rgba.length; i += 4) rgba[i] = 255;
    const yTicks = [0, 4, 8, 12, 16, Hw - 1].filter((v, i, a) => a.indexOf(v) === i).map(v => [(Hw - 1 - v + 0.5) / Hw, String(v)]);
    await render(`torus-unwrapped-H${Hw}.png`, {
        W: 1360, H: h + 190, plot: { rgba, w, h, x: 90, y: 110, dw: w, dh: h },
        title: `Torus, unwrapped: (θ, height mod ${Hw}) for odd n down to −${(2 ** K - 1).toLocaleString('en-US')}`,
        subtitle: [`Each row is one dyadic block (height h = k(|n|)); rows above h = ${K - 1} are empty because no height reaches ${Hw}: the wrap changes nothing.`,
            'Rows with more points than pixels show each pixel column\'s mean fate colour.'],
        axes: { x: [[0, 'θ = π'], [0.25, '5π/4'], [0.5, '3π/2'], [0.75, '7π/4'], [1, '2π']], y: yTicks, xLabel: 'toroidal angle θ(n) (negative n occupy [π, 2π))', yLabel: `poloidal coordinate: height mod ${Hw}` },
    });
}
// Ulam spiral
{
    let minX = 0, maxX = 0, minY = 0, maxY = 0;
    for (let j = 1; j <= J; j++) { minX = Math.min(minX, xs[j]); maxX = Math.max(maxX, xs[j]); minY = Math.min(minY, ys[j]); maxY = Math.max(maxY, ys[j]); }
    const gw = maxX - minX + 1, gh = maxY - minY + 1;
    const rgba = new Uint8ClampedArray(gw * gh * 4);
    for (let i = 0; i < rgba.length; i += 4) { rgba[i] = 236; rgba[i + 1] = 235; rgba[i + 2] = 231; rgba[i + 3] = 255; }
    for (let j = 1; j <= J; j++) { const p = 4 * ((maxY - ys[j]) * gw + (xs[j] - minX)); const cc = COL[fateJ[j]]; rgba[p] = cc[0]; rgba[p + 1] = cc[1]; rgba[p + 2] = cc[2]; }
    const cell = 5;
    await render('spiral-ulam.png', {
        W: gw * cell + 160, H: gh * cell + 200, plot: { rgba, w: gw, h: gh, x: 80, y: 120, dw: gw * cell, dh: gh * cell },
        title: `Ulam spiral of j = −n = 1 … ${J.toLocaleString('en-US')}, coloured by 3n + 1 fate`,
        subtitle: ['1 at the centre, 2 to its east, counter-clockwise. Each cell is one integer; even integers carry their odd part\'s fate.',
            `Grid agreement ${part2.gridAgreement.agreement} vs Σp² ${part2.baselineSumSquares} vs shuffled ${part2.shuffledControl.mean}.`],
        axes: {},
    });
}
step('figures');
log('figures done');
await browser.close();
console.log(JSON.stringify({ checks, part1: Object.fromEntries(Object.entries(part1).map(([k, v]) => [k, { base: v.baselineSumSquares, cyl: v.cylinder, tor32: v.torus.H32.agreement, tor64: v.torus.H64.agreement, byRow: v.byRow }])), part2 }));
