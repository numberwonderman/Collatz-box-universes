import { describe, it, expect, vi } from 'vitest';
import { calculateCollatzSequence, hexToRgb, render9Net } from '../utils.js';
import { cycleRunner, isParadoxical } from '../index.js';

const paradoxical = (r) => r.paradoxicalOccurrences.some(o => o.reason !== 'Cycle detected');

describe('coefficient stopping time and paradoxical check (utils.js)', () => {
  it('uses Y^q / X^(j-q): standard Collatz n=3 has tau = 6 and is not paradoxical', () => {
    const r = calculateCollatzSequence(3, 2, 3, 1);
    expect(r.coefficientStoppingTime_tau).toBe(6);
    expect(r.firstDescentStep).toBe(6);
    expect(r.oddSteps_q).toBe(2);
    expect(paradoxical(r)).toBe(false);
  });

  it('flags no paradoxical starts for 3n+1 up to 2000 (Terras: tau = sigma)', () => {
    for (let n = 2; n <= 2000; n++) expect(paradoxical(calculateCollatzSequence(n, 2, 3, 1))).toBe(false);
  });

  it('flags 5n+1 from 13 (cycle with 5^3 / 2^7 < 1, value never below 13)', () => {
    const r = calculateCollatzSequence(13, 2, 5, 1);
    expect(r.type).toBe('Cycle Detected');
    expect(paradoxical(r)).toBe(true);
    expect(isParadoxical(r)).toBe(true);
  });
});

describe('small utils fixes', () => {
  it('hexToRgb accepts 3-digit colours', () => {
    expect(hexToRgb('#f00')).toEqual({ r: 255, g: 0, b: 0 });
  });

  it('render9Net colours cells by the given divisor, not always 2', () => {
    const fills = [];
    const ctx = { clearRect: vi.fn(), fillRect: vi.fn(), strokeRect: vi.fn(), fillText: vi.fn(),
      set fillStyle(v) { fills.push(v); }, get fillStyle() { return fills.at(-1); } };
    const canvas = { width: 90, height: 90, getContext: () => ctx };
    render9Net(canvas, [9], '#00ff00', '#ff0000', null, 3);
    expect(fills[0]).toBe('#00ff00'); // 9 is divisible by 3 but not by 2
  });
});

describe('home page cycle runner', () => {
  it('returns just the cycle for 3n-1 from 5', async () => {
    const res = await cycleRunner(2, 3, -1)(5n, null, 1000);
    expect(res.type).toBe('cycle');
    expect(res.sequence).toEqual([5, 14, 7, 20, 10]);
  });

  it('reports converging rules as non-cycles', async () => {
    const res = await cycleRunner(2, 3, 1)(27n, null, 1000);
    expect(res.type).toBe('Converges to 1');
  });
});
