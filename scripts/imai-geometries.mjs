// Cylinder and sphere renders for the Dyadic Circle (Imai) generalisations.
// Writes PNGs and geometry-numbers.json to docs/geometries/.
//
//   node scripts/imai-geometries.mjs            (from the repo root)
//
// Chords are rasterised in Node (colourDensity from js/imaiFractalProbe.js);
// headless Chromium (Playwright, already a dependency) only adds titles, axes
// and legends. If Playwright's own browser is missing, set PW_CHROMIUM to a
// Chromium executable (default fallback: /opt/pw-browsers/chromium).

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import {
    geometryChords, heightChangeTable, distinctness, projectChords, topBlock, spherePoint,
} from '../js/imaiGeometries.js';
import { colourDensity, colourToRGBA, trajectoryFate } from '../js/imaiFractalProbe.js';
import { dyadicLevel, theta } from '../js/imaiDyadicCircle.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'docs', 'geometries');
mkdirSync(OUT, { recursive: true });

const SIZE = 1024;
const POS = [0.22, 0.53, 0.9], NEG = [0.9, 0.28, 0.3], GREY = [0.75, 0.75, 0.75];
const FATE = { 1: [0.22, 0.53, 0.9], [-1]: [0.2, 0.75, 0.35], [-5]: [0.96, 0.69, 0.25], [-17]: [0.9, 0.28, 0.3] };
// gamma lift for the depth-dimmed 3D views (display only; the numbers do not use it)
function lift(rgba, gamma = 0.5) {
    const lut = Uint8ClampedArray.from({ length: 256 }, (_, v) => 255 * (v / 255) ** gamma);
    for (let i = 0; i < rgba.length; i += 4) { rgba[i] = lut[rgba[i]]; rgba[i + 1] = lut[rgba[i + 1]]; rgba[i + 2] = lut[rgba[i + 2]]; }
    return rgba;
}
const css = rgb => `rgb(${rgb.map(v => Math.round(v * 255)).join(',')})`;
const signColour = ch => (ch.sign > 0 ? POS : NEG);

const browser = await chromium.launch().catch(() =>
    chromium.launch({ executablePath: process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium' }));
const page = await browser.newPage();
await page.setContent('<canvas id="c"></canvas>');

/**
 * Compose a final PNG: the raster `rgba` (SIZE x SIZE, covering [-extent, extent]^2)
 * drawn into a plot box, plus title, legend and optional unrolled-view axes.
 */
async function finish(file, rgba, extent, spec) {
    const b64 = Buffer.from(rgba.buffer, rgba.byteOffset, rgba.byteLength).toString('base64');
    const dataUrl = await page.evaluate(({ b64, SIZE, extent, spec }) => {
        const L = spec.axes ? 110 : 30, T = 90, R = 30, B = spec.axes ? 90 : 60;
        const c = document.getElementById('c');
        c.width = L + SIZE + R; c.height = T + SIZE + B;
        const g = c.getContext('2d');
        g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height);
        const bytes = Uint8ClampedArray.from(atob(b64), ch => ch.charCodeAt(0));
        g.putImageData(new ImageData(bytes, SIZE, SIZE), L, T);
        const toPx = (x, y) => [L + (x + extent) / (2 * extent) * SIZE, T + (extent - y) / (2 * extent) * SIZE];
        g.fillStyle = '#fff'; g.font = '600 26px sans-serif'; g.textBaseline = 'top';
        g.fillText(spec.title, L, 16);
        g.font = '17px sans-serif'; g.fillStyle = '#c3c2b7';
        g.fillText(spec.subtitle, L, 52);
        // legend, bottom right
        g.font = '17px sans-serif'; g.textBaseline = 'middle';
        let lx = L + SIZE;
        for (const [col, label] of [...spec.legend].reverse()) {
            const w = g.measureText(label).width;
            lx -= w + 34;
            g.fillStyle = col; g.fillRect(lx, T + SIZE + B - 30, 16, 16);
            g.fillStyle = '#ddd'; g.fillText(label, lx + 22, T + SIZE + B - 22);
        }
        if (spec.axes) {
            const { hmax, sx, sy } = spec.axes;
            g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 1;
            g.fillStyle = '#ddd'; g.font = '15px sans-serif';
            for (let h = -hmax; h <= hmax; h++) {
                const [, y] = toPx(0, h * sy);
                g.beginPath(); g.moveTo(L, y); g.lineTo(L + SIZE, y); g.stroke();
                if (h % (hmax > 12 ? 2 : 1) === 0) { g.textAlign = 'right'; g.fillText(String(h), L - 8, y); }
            }
            for (const u of [0, 0.25, 0.5, 0.75, 1]) {
                const [x] = toPx((2 * u - 1) * sx, 0);
                g.strokeStyle = u === 0.5 ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.18)';
                g.beginPath(); g.moveTo(x, T); g.lineTo(x, T + SIZE); g.stroke();
                g.textAlign = 'center'; g.textBaseline = 'top';
                g.fillText(u === 0 ? '0' : u === 1 ? '1' : String(u), x, T + SIZE + 8);
                g.textBaseline = 'middle';
            }
            g.font = '17px sans-serif'; g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'top';
            g.fillText('u = θ(n) / 2π   (n > 0 left of 1/2, n < 0 right)', L + SIZE / 2, T + SIZE + 34);
            g.save(); g.translate(26, T + SIZE / 2); g.rotate(-Math.PI / 2);
            g.fillText('height h(n) = sign(n) · k(|n|)', 0, 0); g.restore();
            g.textAlign = 'left'; g.textBaseline = 'top'; g.fillStyle = '#9ec5ff';
            g.fillText('n > 0', L + 10, T + 8);
            g.fillStyle = '#ff9ea1'; g.textAlign = 'right'; g.textBaseline = 'bottom';
            g.fillText('n < 0', L + SIZE - 10, T + SIZE - 8);
        }
        return c.toDataURL('image/png');
    }, { b64, SIZE, extent, spec });
    writeFileSync(join(OUT, file), Buffer.from(dataUrl.split(',')[1], 'base64'));
}

// faint guide geometry as extra chords (rings, outline)
function ring(points, rgb) {
    const segs = [];
    for (let i = 0; i < points.length; i++) {
        segs.push({ from: points[i], to: points[(i + 1) % points.length], rgb });
    }
    return segs;
}

const report = { notes: 'm = 3 throughout; chords for every n with 1 <= |n| <= N (images outside [-N, N] kept and placed by the same formula).' };

// ---------- 1. Cylinder: unrolled views ----------
for (const c of [0, 1]) {
    const N = 1023, K = topBlock(N), hmax = K + 2;
    const chords = geometryChords({ N, m: 3, c, geometry: 'unrolled' });
    const sx = 1, sy = 1 / hmax;
    const segs = chords.map(ch => ({
        from: { x: (2 * ch.from.u - 1) * sx, y: ch.from.h * sy },
        to: { x: (2 * ch.to.u - 1) * sx, y: ch.to.h * sy },
        rgb: ch.odd ? signColour(ch) : GREY,
    }));
    const rgba = colourToRGBA(colourDensity(segs, { size: SIZE, extent: 1.05 }));
    await finish(`cylinder-unrolled-m3-c${c}-N${N}.png`, rgba, 1.05, {
        title: `Cylinder, unrolled — T(n) = n/2 | 3n${c ? ' + 1' : ''}, |n| ≤ ${N}`,
        subtitle: `Segments drawn straight between unrolled endpoints; even steps are vertical unit moves toward h = 0.`,
        legend: [[css(POS), 'odd step, n > 0'], [css(NEG), 'odd step, n < 0'], [css(GREY), 'even step (halving)']],
        axes: { hmax, sx, sy },
    });
}

// ---------- 1b. Cylinder: projected oblique view ----------
{
    const N = 1023, K = topBlock(N), hmax = K + 2, c = 1;
    const vs = 1.4 / hmax; // vertical scale so the barrel fits the frame (heights shown as h * 1.4 / 11)
    const scaleY = p => ({ x: p.x, y: p.y * vs, z: p.z });
    const chords = geometryChords({ N, m: 3, c, geometry: 'cylinder' }).map(ch => ({ ...ch, from: scaleY(ch.from), to: scaleY(ch.to) }));
    const view = { yaw: 0.55, pitch: 0.42 };
    const segs = projectChords(chords, view, { pieces: 10, minWeight: 0.18, depthRange: [-1.2, 1.2], colour: ch => (ch.odd ? signColour(ch) : GREY) });
    const guides = [];
    for (const h of [-hmax, -K, 0, K, hmax]) {
        const pts = Array.from({ length: 96 }, (_, i) => ({ x: Math.cos(i * Math.PI / 48), y: h * vs, z: Math.sin(i * Math.PI / 48) }));
        guides.push(...projectChords(pts.map((p, i) => ({ from: p, to: pts[(i + 1) % pts.length] })), view, { pieces: 1, minWeight: 0.3, depthRange: [-1.2, 1.2], colour: () => [0.35, 0.35, 0.35] }));
    }
    const rgba = lift(colourToRGBA(colourDensity([...guides, ...segs], { size: SIZE, extent: 1.9 })));
    await finish(`cylinder-projected-m3-c1-N${N}.png`, rgba, 1.9, {
        title: `Cylinder, oblique orthographic view — 3n + 1, |n| ≤ ${N}`,
        subtitle: `C(n) = (cos θ, h, sin θ); height drawn at ${(1.4 / hmax).toFixed(3)} per level. Grey rings: h = 0, ±${K}, ±${hmax}. Far side dimmed.`,
        legend: [[css(POS), 'odd step, n > 0'], [css(NEG), 'odd step, n < 0'], [css(GREY), 'even step']],
    });
}

// ---------- 2. Sphere ----------
function sphereGuides(view) {
    const segs = [];
    const circle = f => Array.from({ length: 144 }, (_, i) => f((i * 2 * Math.PI) / 144));
    const eq = circle(a => ({ x: Math.cos(a), y: 0, z: Math.sin(a) }));
    for (const s of projectChords(eq.map((p, i) => ({ from: p, to: eq[(i + 1) % eq.length] })), view, { pieces: 1, minWeight: 0.25, colour: () => [0.4, 0.4, 0.4] })) segs.push(s);
    // silhouette (outline) of the sphere in screen space
    const out = circle(a => ({ x: Math.cos(a), y: Math.sin(a) }));
    for (let i = 0; i < out.length; i++) segs.push({ from: out[i], to: out[(i + 1) % out.length], rgb: [0.45, 0.45, 0.45] });
    return segs;
}
async function sphereView(file, { N, c, view, colour, legend, title, subtitle }) {
    const chords = geometryChords({ N, m: 3, c, geometry: 'sphere' });
    const segs = projectChords(chords, view, { pieces: 12, minWeight: 0.15, colour });
    const rgba = lift(colourToRGBA(colourDensity([...sphereGuides(view), ...segs], { size: SIZE, extent: 1.1 })));
    await finish(file, rgba, 1.1, { title, subtitle, legend });
    return chords;
}
const FRONT = { yaw: 0, pitch: 0.35 }, BACK = { yaw: Math.PI, pitch: 0.35 };
for (const [name, view, side] of [['front', FRONT, 'from +z (the n > 0 longitudes face the viewer)'], ['back', BACK, 'from −z (the n < 0 longitudes face the viewer)']]) {
    await sphereView(`sphere-${name}-m3-c1-N1023.png`, {
        N: 1023, c: 1, view, colour: signColour,
        legend: [[css(POS), 'n > 0'], [css(NEG), 'n < 0'], ['rgb(102,102,102)', 'equator / outline']],
        title: `Sphere, ${name} — 3n + 1, |n| ≤ 1023, K = 9`,
        subtitle: `Viewed ${side}, tilted 20° to show the north pole. Straight 3D chords; far side dimmed.`,
    });
}
const fateTally = {};
const fateOf = n => {
    const f = trajectoryFate(n, { m: 3, c: 1, maxSteps: 500 });
    return f.fate === 'cycle' ? String(f.key) : f.fate;
};
const fateLegend = [[css(FATE[1]), '→ 1-cycle'], [css(FATE[-1]), '→ −1'], [css(FATE[-5]), '→ −5'], [css(FATE[-17]), '→ −17'], ['rgb(255,255,255)', 'unsettled (500 steps)']];
const fateColour = ch => FATE[fateOf(ch.n)] ?? [1, 1, 1];
for (const [name, view, side] of [['front', FRONT, 'from +z'], ['back', BACK, 'from −z, where the n < 0 chords face the viewer']]) {
    await sphereView(`sphere-fate-${name}-m3-c1-N4095.png`, {
        N: 4095, c: 1, view, colour: fateColour, legend: fateLegend,
        title: `Sphere, ${name} — 3n + 1 chords coloured by fate of n, |n| ≤ 4095, K = 11`,
        subtitle: `Fate = cycle reached within 500 steps. Viewed ${side}, tilted 20°; far side dimmed.`,
    });
}
for (let n = -4095; n <= 4095; n++) if (n !== 0) { const k = fateOf(n); fateTally[k] = (fateTally[k] ?? 0) + 1; }
console.log('renders done');

// ---------- Numbers ----------
report.heightChanges = {
    N4095_c0: heightChangeTable({ N: 4095, m: 3, c: 0 }),
    N4095_c1: heightChangeTable({ N: 4095, m: 3, c: 1 }),
    N1023_c0: heightChangeTable({ N: 1023, m: 3, c: 0 }),
    N1023_c1: heightChangeTable({ N: 1023, m: 3, c: 1 }),
};
report.distinctness = {
    sphere_N4095: distinctness({ N: 4095, geometry: 'sphere' }),
    cylinder_N4095: distinctness({ N: 4095, geometry: 'cylinder' }),
};
report.sphereOutOfRangeImages = {};
for (const [N, c] of [[1023, 0], [1023, 1], [4095, 1]]) {
    const ch = geometryChords({ N, m: 3, c, geometry: 'sphere' });
    const pos = ch.filter(x => x.sign > 0);
    report.sphereOutOfRangeImages[`N${N}_c${c}`] = {
        K: topBlock(N), chords: ch.length, positiveChords: pos.length,
        positiveImagesOnEquator: pos.filter(x => Math.abs(x.to.lat) < 1e-12).length,
        positiveImagesSouthOfEquator: pos.filter(x => x.to.lat < -1e-12).length,
        imagesOutsideRange: ch.filter(x => !x.inRange).length,
    };
}
// fate structure that only the sphere / cylinder separates: fate share per dyadic block (negatives)
{
    const N = 4095;
    const perBlock = {};
    const neighbour = {};
    for (let k = 0; k <= dyadicLevel(N); k++) {
        const ns = [];
        for (let a = 2 ** k; a < 2 ** (k + 1) && a <= N; a++) ns.push(-a);
        const fates = ns.map(fateOf);
        const share = {};
        for (const f of fates) share[f] = (share[f] ?? 0) + 1;
        perBlock[k] = share;
        // longitude neighbours inside the band (sorted by theta), odd n only
        const odd = ns.filter(n => n % 2 !== 0).sort((x, y) => theta(x) - theta(y)).map(fateOf);
        let same = 0;
        for (let i = 1; i < odd.length; i++) if (odd[i] === odd[i - 1]) same++;
        if (odd.length > 8) neighbour[k] = +(same / (odd.length - 1)).toFixed(3);
    }
    report.fates = { allNInRangeN4095: fateTally, negativeShareByBlock: perBlock, negativeOddSameFateAsLongitudeNeighbour: neighbour };
}
writeFileSync(join(OUT, 'geometry-numbers.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report.sphereOutOfRangeImages), JSON.stringify(report.fates));
await browser.close();
