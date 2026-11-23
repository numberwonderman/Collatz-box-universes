// index.js — Main Hub wiring: single calculator, 9-net, history, cycle catalog, tool launcher.
// (The previous index.js was removed in commit 7802093; this replaces it.)

import {
    calculateCollatzSequence,
    drawNineNetCanvasSecondary,
    formatSequenceOutput,
    saveToHistory,
    getUrlParams,
    DEFAULT_LINE_COLOR,
    DEFAULT_NODE_COLOR,
    MAX_ITERATIONS,
} from './utils.js';
import { getExplorationSetting, setExplorationSetting } from './state.js';
import { catalogCycles } from './CycleCataloge.js';

const $ = (id) => document.getElementById(id);

// ----------------------------------------------------------
// Inputs
// ----------------------------------------------------------
export function readParams() {
    const n = parseInt($('startNumber')?.value, 10);
    const x = parseInt($('xValue')?.value, 10);
    const y = parseInt($('yValue')?.value, 10);
    const z = parseInt($('zValue')?.value, 10);
    if ([n, x, y, z].some(Number.isNaN)) return { error: 'Please enter whole numbers for n, X, Y and Z.' };
    if (x === 0) return { error: 'X (the divisor) cannot be 0.' };
    if (n <= 0 && !getExplorationSetting()) return { error: 'n must be positive (or turn on negative number exploration).' };
    return { n, x, y, z };
}

function colors() {
    return {
        div: $('divColorPicker')?.value || DEFAULT_LINE_COLOR,
        mul: $('mulColorPicker')?.value || DEFAULT_NODE_COLOR,
    };
}

function updateGoldStars() {
    const want = { xValue: ['x-star', 2], yValue: ['y-star', 3], zValue: ['z-star', 1] };
    for (const [inputId, [starId, standard]] of Object.entries(want)) {
        const star = $(starId);
        if (star) star.style.display = parseInt($(inputId)?.value, 10) === standard ? 'inline-block' : 'none';
    }
}

// ----------------------------------------------------------
// Negative-number toggle
// ----------------------------------------------------------
function updateNegativeStatus() {
    const status = $('negativeStatus');
    if (!status) return;
    const on = getExplorationSetting();
    status.textContent = `Status: ${on ? 'Enabled' : 'Disabled'}`;
    status.classList.toggle('text-green-400', on);
    status.classList.toggle('text-red-400', !on);
}

// ----------------------------------------------------------
// Single calculator
// ----------------------------------------------------------
let lastResult = null;

const fmt = (v) => (typeof v === 'number' && Number.isFinite(v) ? v.toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(v));

export function isParadoxical(result) {
    return (result.paradoxicalOccurrences || []).some(o => o.reason !== 'Cycle detected');
}

function showError(message) {
    const out = $('currentSequenceOutput');
    $('currentSequenceDetails')?.classList.remove('hidden');
    if ($('currentType')) $('currentType').textContent = 'Error';
    if (out) out.textContent = message;
}

function renderResult(result, { n, x, y, z }) {
    const set = (id, value) => { if ($(id)) $(id).textContent = value; };
    set('currentParams', `N=${n}, X=${x}, Y=${y}, Z=${z}`);
    set('currentSteps', result.steps);
    set('currentType', result.type);
    set('currentMin', fmt(result.minVal));
    set('currentMax', fmt(result.maxVal));
    set('currentSum', fmt(result.sumVal));
    set('currentAvg', fmt(result.avgVal));
    set('currentStdDev', fmt(result.stdDev));
    set('currentStoppingTime', result.stoppingTime_t);
    set('currentCoeffStoppingTime', result.coefficientStoppingTime_tau);
    set('currentFirstDescentStep', result.firstDescentStep);
    set('currentIsParadoxical', isParadoxical(result) ? 'Yes' : 'No');
    set('currentSequenceOutput', formatSequenceOutput(result.sequence));
    $('currentSequenceDetails')?.classList.remove('hidden');

    const { div, mul } = colors();
    drawNineNetCanvasSecondary($('singleNineNetCanvas'), result.sequence, x, div, mul);
}

export function calculateSingle() {
    const params = readParams();
    if (params.error) { showError(params.error); return null; }
    const { n, x, y, z } = params;
    const result = calculateCollatzSequence(n, x, y, z, MAX_ITERATIONS);
    lastResult = { result, params };
    renderResult(result, params);
    saveToHistory({ ...result, x, y, z });
    $('historyContainer')?.classList.remove('hidden');
    return result;
}

// ----------------------------------------------------------
// Cycle catalog (uses the current X, Y, Z)
// ----------------------------------------------------------
export function cycleRunner(x, y, z) {
    return async (start, _params, maxSteps) => {
        const res = calculateCollatzSequence(Number(start), x, y, z, maxSteps);
        if (res.type !== 'Cycle Detected') return { sequence: res.sequence, type: res.type };
        const hit = res.paradoxicalOccurrences.find(o => o.reason === 'Cycle detected');
        const from = res.sequence.indexOf(hit.value);
        return { sequence: res.sequence.slice(from), type: 'cycle' };
    };
}

async function scanCycles() {
    const out = $('catalogOut');
    const status = $('scanStatus');
    const params = readParams();
    if (params.error) { status.textContent = params.error; return; }
    const { x, y, z } = params;
    out.textContent = '';
    status.textContent = `Scanning n = 1..5000 with X=${x}, Y=${y}, Z=${z}…`;

    const run = cycleRunner(x, y, z);
    const rows = [];
    const BATCH = 250; // yield between batches so the page stays responsive
    for (let s = 1; s <= 5000; s += BATCH) {
        const starts = Array.from({ length: Math.min(BATCH, 5001 - s) }, (_, i) => BigInt(s + i));
        rows.push(...await catalogCycles({ starts, signature: 'binary', maxSteps: MAX_ITERATIONS }, run));
        status.textContent = `Scanning… ${Math.min(s + BATCH - 1, 5000)} / 5000`;
        await new Promise(r => setTimeout(r, 0));
    }

    // Group starts by the cycle they fall into (smallest member identifies the cycle).
    const cycles = new Map();
    for (const row of rows) {
        if (row.error) continue;
        const key = row.cycleSample.map(BigInt).reduce((a, b) => (b < a ? b : a)).toString();
        const entry = cycles.get(key) || { cycleMin: key, signature: row.signature, sample: row.cycleSample, starts: 0, firstStart: row.start };
        entry.starts++;
        cycles.set(key, entry);
    }
    const errors = rows.filter(r => r.error).length;
    status.textContent = `Done. ${cycles.size} distinct cycle(s) found from ${rows.length - errors} cycling start(s)` +
        (errors ? `, ${errors} error(s)` : '') + '. (Trajectories that reach 1 are counted as converging, not cycling.)';
    out.textContent = cycles.size ? JSON.stringify([...cycles.values()], null, 2) : 'No cycles other than the trivial one at 1.';
}

// ----------------------------------------------------------
// Tool launcher
// ----------------------------------------------------------
function launchSelectedTool() {
    const choice = document.querySelector('input[name="visualization"]:checked');
    if (!choice) return;
    const params = readParams();
    const query = params.error ? '' : '?' + new URLSearchParams({ n: params.n, x: params.x, y: params.y, z: params.z });
    window.location.href = choice.value + (choice.value === 'index.html' ? '' : query);
}

// ----------------------------------------------------------
// Startup
// ----------------------------------------------------------
export function init() {
    // Prefill from ?n=&x=&y=&z= so links from other tools land on the same rule.
    const url = getUrlParams();
    for (const [key, id] of [['n', 'startNumber'], ['x', 'xValue'], ['y', 'yValue'], ['z', 'zValue']]) {
        if (url[key] !== undefined && $(id) && !Number.isNaN(parseInt(url[key], 10))) $(id).value = parseInt(url[key], 10);
    }

    $('toggleNegativeNumbers')?.addEventListener('click', () => {
        setExplorationSetting(!getExplorationSetting());
        updateNegativeStatus();
    });
    $('calculateSingle')?.addEventListener('click', calculateSingle);
    for (const id of ['xValue', 'yValue', 'zValue']) $(id)?.addEventListener('input', updateGoldStars);
    for (const id of ['divColorPicker', 'mulColorPicker']) {
        $(id)?.addEventListener('input', () => { if (lastResult) renderResult(lastResult.result, lastResult.params); });
    }
    $('scanBtn')?.addEventListener('click', () => {
        scanCycles().catch(err => { $('scanStatus').textContent = 'Error: ' + (err?.message || err); });
    });
    $('launchVisualization')?.addEventListener('click', launchSelectedTool);

    updateNegativeStatus();
    updateGoldStars();
    calculateSingle();
}

if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
}
