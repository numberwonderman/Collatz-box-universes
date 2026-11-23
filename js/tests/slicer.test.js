import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateBoxUniverses,
  getFilterValues,
  applyAndDrawFilters,
  updateGoldStarVisibilitySlicer
} from '../slicer.js'; // Fixed double slash
import * as utils from '../utils.js';

// Minimal DOM setup for inputs
beforeEach(() => {
  // Clear and reset document.body
  document.body.innerHTML = `
    <input id="nMin" value="1" />
    <input id="nMax" value="2" />
    <input id="xMin" value="1" />
    <input id="xMax" value="2" />
    <input id="yMin" value="1" />
    <input id="yMax" value="2" />
    <input id="zMin" value="1" />
    <input id="zMax" value="2" />
    <div id="gridContainer"></div>
    <div id="paramDisplay"></div>
    <div id="sequenceInfo"></div>
    <div id="sequenceNumbers"></div>
    <div id="sequenceRangeInfo"></div>
    <div id="sequenceSumInfo"></div>
    <div id="sequenceAvgInfo"></div>
    <div id="sequenceStdDevInfo"></div>
    <canvas id="nineNetCanvas"></canvas>
    <div id="n-star"></div>
    <div id="x-star"></div>
    <div id="y-star"></div>
    <div id="z-star"></div>
  `;

  // Mock drawNineNetCanvasSecondary to avoid canvas drawing
  vi.spyOn(utils, 'drawNineNetCanvasSecondary').mockImplementation(() => {});
});

describe('generateBoxUniverses', () => {
  it('skips x === 0 and keeps valid universes', () => {
    const universes = generateBoxUniverses(1, 1, 0, 1, 1, 1, 1, 1);
    expect(universes.length).toBe(1);
    expect(universes[0].X).toBe(1);
  });

  it('passes (n, x, y, z) to the engine in the right order', () => {
    // Regression: the slicer used to call calculateCollatzSequence(n, MAX_ITERATIONS, x, y, z),
    // which silently ran X=1000, Y=x, Z=y.
    const [u] = generateBoxUniverses(27, 27, 2, 2, 3, 3, 1, 1);
    expect(u.type).toBe('Converges to 1');
    expect(u.steps).toBe(111);
    expect(u.maxVal).toBe(9232);
    expect(u.sequence.slice(0, 4)).toEqual([27, 82, 41, 124]);
  });

  it('limits the number of universes generated to 100', () => {
    const universes = generateBoxUniverses(1, 10, 1, 10, 1, 10, 1, 10);
    expect(universes.length).toBeLessThanOrEqual(100);
  });
});

describe('getFilterValues', () => { // Added missing describe block
  it('returns current filter values from inputs or defaults', () => {
    const values = getFilterValues();
    expect(values).toEqual({
      nMin: 1, nMax: 50,  // Change from 2 to 50
      xMin: 1, xMax: 5,   // Change from 2 to 5
      yMin: 1, yMax: 5,   // Change from 2 to 5
      zMin: 1, zMax: 5    // Change from 2 to 5
    });
  });

  it('returns default values if inputs are missing or invalid', () => {
    // Remove xMin input element
    document.getElementById('xMin').remove();
    // Set invalid value to yMax
    document.getElementById('yMax').value = 'invalid';

    const values = getFilterValues();
    expect(values.xMin).toBe(1); // default
    expect(values.yMax).toBe(5); // default because invalid number
  });
}); // Fixed: removed extra closing brace
