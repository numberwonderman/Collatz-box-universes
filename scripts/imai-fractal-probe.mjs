// Fractal probe for the Dyadic Circle (Imai) view: renders the PNGs under
// docs/fractal-probe/ and prints the numbers quoted in docs/imai-embedding-notes.md.
//
//   node scripts/imai-fractal-probe.mjs            (from the repo root)
//
// Exploratory. See the "Fractal probe (Nov 2026)" section of the notes for caveats.

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    probeChords, densityGrid, colourDensity, blockChords, doubleAngles, blockCrossings,
    trajectoryFate, logNormalise, threshold, boxCountingDimension, maskOverlap, correlation,
    toRGBA, colourToRGBA,
} from '../js/imaiFractalProbe.js';
import { dyadicIntervalIndex } from '../js/imaiDyadicCircle.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'docs', 'fractal-probe');
mkdirSync(OUT, { recursive: true });

const SIZE = 1024;
const EPS0 = 4;                      // eps = EPS0 / N in unit-circle units (R = N, eps = 4)
const epsFor = N => EPS0 / N;

// ---------- PNG writer (RGBA, 8-bit) ----------
const CRC = new Uint32Array(256).map((_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
});
function crc32(buf) {
    let c = 0xffffffff;
    for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
}
function writePNG(path, rgba, w, h) {
    const raw = Buffer.alloc((w * 4 + 1) * h);
    for (let y = 0; y < h; y++) {
        raw[y * (w * 4 + 1)] = 0;
        Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
    }
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
    ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
    writeFileSync(path, Buffer.concat([
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
        chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
    ]));
}
// place several square panels side by side, with a gap
function hstack(panels, size, gap = 16) {
    const w = panels.length * size + (panels.length - 1) * gap;
    const out = new Uint8ClampedArray(w * size * 4).fill(255);
    panels.forEach((p, k) => {
        for (let y = 0; y < size; y++) {
            out.set(p.subarray(y * size * 4, (y + 1) * size * 4), (y * w + k * (size + gap)) * 4);
        }
    });
    return { rgba: out, w, h: size };
}

const report = {};
const t0 = Date.now();
const time = () => `${((Date.now() - t0) / 1000).toFixed(1)} s`;

// ---------- 1. Density renders ----------
report.density = [];
const densities = {};
for (const c of [0, 1]) {
    const grids = [];
    for (const N of [1023, 4095, 16383]) {
        const chords = probeChords({ N, m: 3, c });
        const d = densityGrid(chords, { size: SIZE, eps: epsFor(N) });
        grids.push({ N, d, chords: chords.length });
        densities[`${c}_${N}`] = d;
    }
    // common log scale per map across the three N (as the paper does for Fig. 3c)
    let vmax = 0;
    for (const { d } of grids) for (const v of d.grid) if (v > vmax) vmax = v;
    for (const { N, d, chords } of grids) {
        const name = `density-m3-c${c}-N${N}.png`;
        writePNG(join(OUT, name), toRGBA(logNormalise(d.grid, vmax)), SIZE, SIZE);
        report.density.push({ file: name, N, c, chords, epsPx: +d.epsPx.toFixed(3), mode: d.mode });
    }
}
console.log('density done', time());

// ---------- 2. Self-similarity: full set vs top block, angles doubled ----------
function lineMaskAndLog(chords) {
    const d = densityGrid(chords, { size: SIZE, eps: 1e-6 }); // length mode: pure line density
    return logNormalise(d.grid);
}
report.selfSimilarity = [];
const K = 12; // N = 2^K - 1 = 4095
for (const c of [0, 1]) {
    const N = 2 ** K - 1;
    const full = probeChords({ N, m: 3, c });
    const top = blockChords(full, K - 1);
    const topDoubled = top.map(doubleAngles);
    const prev = blockChords(full, K - 2);
    const imgFull = lineMaskAndLog(full);
    const imgDbl = lineMaskAndLog(topDoubled);
    const imgTop = lineMaskAndLog(top);
    const imgPrev = lineMaskAndLog(prev);
    const cmp = (a, b) => {
        const ov = maskOverlap(threshold(a, 0.5), threshold(b, 0.5));
        return { corr: +correlation(a, b).toFixed(3), iou: +ov.iou.toFixed(3) };
    };
    report.selfSimilarity.push({
        c, N, topBlock: K - 1, fullChords: full.length, topChords: top.length,
        fullVsTopDoubled: cmp(imgFull, imgDbl),
        fullVsTopUndoubled: cmp(imgFull, imgTop),
        topVsPreviousBlockUndoubled: cmp(imgTop, imgPrev),
    });
    // panels: (a) full, (b) top block doubled, (c) overlay of (a) grey + (b) orange,
    // (d) overlay of (a) grey + top block undoubled orange
    const overlay = (base, over) => {
        const out = new Uint8ClampedArray(SIZE * SIZE * 4);
        for (let i = 0; i < base.length; i++) {
            const g = 255 - 200 * base[i];
            const o = over[i];
            out[4 * i] = g * (1 - o) + 230 * o;
            out[4 * i + 1] = g * (1 - o) + 90 * o;
            out[4 * i + 2] = g * (1 - o) + 20 * o;
            out[4 * i + 3] = 255;
        }
        return out;
    };
    const grey = img => overlay(img, new Float64Array(img.length));
    const { rgba, w, h } = hstack([grey(imgFull), grey(imgDbl), overlay(imgFull, imgDbl), overlay(imgFull, imgTop)], SIZE);
    writePNG(join(OUT, `selfsim-m3-c${c}-N${N}.png`), rgba, w, h);
}
report.blockCrossings = {
    c0: blockCrossings({ N: 4095, m: 3, c: 0 }),
    c1: blockCrossings({ N: 4095, m: 3, c: 1 }),
};
console.log('self-similarity done', time());

// ---------- 3. Colour probes at N = 4095, m = 3, c = 1 ----------
{
    const N = 4095;
    const chords = probeChords({ N, m: 3, c: 1 });
    const kmax = dyadicIntervalIndex(N);
    const hsl = (hDeg, s, l) => {
        const a = s * Math.min(l, 1 - l);
        const f = n => { const k = (n + hDeg / 30) % 12; return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
        return [f(0), f(8), f(4)];
    };
    const byBlock = chords.map(ch => ({ ...ch, rgb: hsl(250 - 250 * dyadicIntervalIndex(ch.n) / kmax, 0.9, 0.55) }));
    writePNG(join(OUT, 'colour-block-m3-c1-N4095.png'), colourToRGBA(colourDensity(byBlock, { size: SIZE })), SIZE, SIZE);

    const FATE_RGB = { 1: [0.22, 0.53, 0.9], [-1]: [0.2, 0.75, 0.35], [-5]: [0.96, 0.69, 0.25], [-17]: [0.9, 0.28, 0.3] };
    const tally = {};
    const byFate = chords.map(ch => {
        const f = trajectoryFate(ch.n, { m: 3, c: 1, maxSteps: 500 });
        const key = f.fate === 'cycle' ? String(f.key) : f.fate;
        const sign = ch.n > 0 ? 'pos' : 'neg';
        tally[sign] ??= {};
        tally[sign][key] = (tally[sign][key] ?? 0) + 1;
        return { ...ch, rgb: FATE_RGB[key] ?? [1, 1, 1] };
    });
    // fates of every n in range (not only chord sources), for the notes
    const allFates = { pos: {}, neg: {} };
    for (let n = -N; n <= N; n++) {
        if (n === 0) continue;
        const f = trajectoryFate(n, { m: 3, c: 1, maxSteps: 500 });
        const key = f.fate === 'cycle' ? String(f.key) : f.fate;
        const s = n > 0 ? 'pos' : 'neg';
        allFates[s][key] = (allFates[s][key] ?? 0) + 1;
    }
    report.fates = { chordSources: tally, allN: allFates };
    writePNG(join(OUT, 'colour-fate-m3-c1-N4095.png'), colourToRGBA(colourDensity(byFate, { size: SIZE })), SIZE, SIZE);
}
console.log('colour probes done', time());

// ---------- 4. Box counting (exploratory) ----------
report.boxCounting = [];
const BOXES = [2, 4, 8, 16, 32, 64, 128];
for (const key of ['0_16383', '0_4095', '0_1023', '1_16383']) {
    const d = densities[key];
    const norm = logNormalise(d.grid);
    for (const t of [0.3, 0.5, 0.7]) {
        const mask = threshold(norm, t);
        const filled = mask.reduce((a, b) => a + b, 0) / mask.length;
        const res = boxCountingDimension(mask, SIZE, BOXES);
        report.boxCounting.push({
            c: +key.split('_')[0], N: +key.split('_')[1], threshold: t,
            filledFraction: +filled.toFixed(4), slope: +res.slope.toFixed(3), r2: +res.r2.toFixed(4),
            counts: res.rows.map(r => r.count),
        });
    }
}
// the thresholded mask used for the headline number, saved so it can be inspected
{
    const mask = threshold(logNormalise(densities['0_16383'].grid), 0.5);
    const rgba = new Uint8ClampedArray(SIZE * SIZE * 4);
    for (let i = 0; i < mask.length; i++) {
        const v = mask[i] ? 0 : 255;
        rgba[4 * i] = rgba[4 * i + 1] = rgba[4 * i + 2] = v; rgba[4 * i + 3] = 255;
    }
    writePNG(join(OUT, 'boxcount-mask-m3-c0-N16383-t0.5.png'), rgba, SIZE, SIZE);
}
report.boxSizes = BOXES;
report.imageSize = SIZE;
report.eps = `eps = ${EPS0}/N (unit circle), i.e. eps = ${EPS0} at R = N`;
writeFileSync(join(OUT, 'probe-numbers.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 1));
console.log('all done', time());
