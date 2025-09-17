import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import {
  calculateMean,
  calculateStandardDeviation,
  calculateSum,
  calculateCollatzSequence,
  formatSequenceOutput,
  hexToRgb,
  isLight,
  getUrlParams,
  showMessage,
  saveToHistory,
  generateLinkURL,
  updateGoldStarVisibility,
  drawNineNetCanvasSecondary,
  render9Net,
  drawNecklaceCanvas
} from '../utils.js';

vi.mock('../state.js', () => ({
  getExplorationSetting: () => false,
}));

beforeAll(() => {
  global.window = {
    location: {
      origin: 'http://localhost',
      pathname: '/app/',
      search: '?param1=value1&param2=value2',
    }
  };

  const messageBox = {
    _text: '',
    get textContent() { return this._text; },
    set textContent(val) { this._text = val; },

    _class: 'mb-4 p-3 rounded-md text-center text-white',
    get className() {
      return this._class || '';
    },
    set className(val) {
      this._class = val || '';
    }
  };

  // Proxy-based classList to properly track add/remove/contains
  messageBox.classList = new Proxy({}, {
    get(target, prop) {
      if (prop === 'add') return (cls) => {
        if (!messageBox._class.includes(cls)) {
          messageBox._class += (messageBox._class ? ' ' : '') + cls;
        }
      };
      if (prop === 'remove') return (cls) => {
        messageBox._class = (messageBox._class || '')
          .split(' ')
          .filter(c => c !== cls)
          .join(' ');
      };
      if (prop === 'contains') return (cls) => {
        return (messageBox._class || '').split(' ').includes(cls);
      };
      return () => {};
    }
  });

  const children = [];
  const runsHistory = {
    children,
    prepend: (child) => children.unshift(child),
    innerHTML: '',
    get textContent() {
      return children.map(child => child.innerHTML || '').join(' ');
    }
  };

  let hidden = true;
  const classList = {
    add: () => { hidden = true; },
    remove: () => { hidden = false; },
    contains: () => hidden,
  };

  global.document = {
    body: {
      innerHTML: '',
      prepend: vi.fn(),
    },
    getElementById: vi.fn(id => {
      if (id === 'message-box') return messageBox;
      if (id === 'runsHistory') return runsHistory;
      if (id === 'goldStar') return { classList };
      return null;
    }),
    createElement: vi.fn(() => ({
      className: '',
      innerHTML: '',
    })),
  };
});

describe('Statistical Helpers', () => {
  it('calculateMean returns 0 for empty array', () => {
    expect(calculateMean([])).toBe(0);
  });

  it('calculateMean returns correct mean', () => {
    expect(calculateMean([1, 2, 3])).toBeCloseTo(2);
  });

  it('calculateStandardDeviation returns 0 for empty or single element arrays', () => {
    expect(calculateStandardDeviation([], 0)).toBe(0);
    expect(calculateStandardDeviation([5], 5)).toBe(0);
  });

  it('calculateStandardDeviation returns correct result', () => {
    const seq = [2, 4, 4, 4, 5, 5, 7, 9];
    const mean = calculateMean(seq);
    expect(calculateStandardDeviation(seq, mean)).toBeCloseTo(2);
  });

  it('calculateSum returns 0 for empty array and sums correctly', () => {
    expect(calculateSum([])).toBe(0);
    expect(calculateSum([1, 2, 3])).toBe(6);
  });
});

describe('calculateCollatzSequence', () => {
  it('handles invalid parameter x_param=0', () => {
    const result = calculateCollatzSequence(5, 0, 3, 1, 100);
    expect(result.type).toBe('Invalid Parameters (X is 0)');
  });

  it('returns sequence converging to 1 for standard params', () => {
    const result = calculateCollatzSequence(6, 2, 3, 1, 1000);
    expect(result.sequence[result.sequence.length - 1]).toBe(1);
    expect(result.type).toBe('Converges to 1');
  });

  it('returns max iteration reached if not converged', () => {
    const result = calculateCollatzSequence(27, 2, 3, 1, 10);
    expect(result.type).toBe('Max Iterations Reached');
  });

  it('detects cycle and records paradoxical occurrences', () => {
    const result = calculateCollatzSequence(5, 2, 3, 1, 100);
    expect(['Cycle Detected', 'Converges to 1']).toContain(result.type);
  });
});

describe('formatSequenceOutput', () => {
  it('returns message for empty or no input', () => {
    expect(formatSequenceOutput()).toBe('No sequence to display.');
    expect(formatSequenceOutput([])).toBe('No sequence to display.');
  });

  it('returns full sequence string if not too long', () => {
    const seq = [1, 2, 3];
    expect(formatSequenceOutput(seq)).toBe('[1, 2, 3]');
  });

  it('truncates output if sequence too long', () => {
    const longSeq = Array(150).fill(1);
    expect(formatSequenceOutput(longSeq)).toMatch(/sequence truncated/);
  });
});

describe('Color Utilities', () => {
  it('hexToRgb converts correctly', () => {
    expect(hexToRgb('#34d399')).toEqual({ r: 52, g: 211, b: 153 });
  });

  it('isLight returns true for light colors', () => {
    expect(isLight('#FFFF99')).toBe(true);
  });

  it('isLight returns false for dark colors', () => {
    expect(isLight('#000066')).toBe(false);
  });
});

describe('getUrlParams', () => {
  it('parses URL parameters correctly', () => {
    const params = getUrlParams();
    expect(params.param1).toBe('value1');
    expect(params.param2).toBe('value2');
  });
});

describe('showMessage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('displays message with correct styles and hides after duration', () => {
    showMessage('hello', 'success');
    const box = document.getElementById('message-box');
    expect(box.textContent).toBe('hello');
    expect(box.className).toContain('bg-green-500');
    vi.advanceTimersByTime(3000);
    expect(box.className).toContain('hidden');
  });

  it('handles missing message box gracefully', () => {
    document.getElementById.mockReturnValueOnce(null);
    expect(() => showMessage('test')).not.toThrow();
  });
});

describe('saveToHistory', () => {
  it('adds a new run entry to history', () => {
    const data = {
      startN: 5, x: 2, y: 3, z: 1, steps: 10, type: 'Converges to 1',
      minVal: 1, maxVal: 16, avgVal: 5.5, stoppingTime_t: 7, coefficientStoppingTime_tau: 2
    };
    saveToHistory(data);
    const history = document.getElementById('runsHistory');
    expect(history.children.length).toBe(1);
    expect(history.textContent).toMatch(/Run: n=5/);
  });

  it('does nothing if history container missing', () => {
    document.getElementById.mockReturnValueOnce(null);
    expect(() => saveToHistory({})).not.toThrow();
  });
});

describe('generateLinkURL', () => {
  it('returns correct URL for known keys', () => {
    const url = generateLinkURL('collatz-dragon', { foo: 'bar' });
    expect(url).toMatch(/collatz-dragon.html/);
    expect(url).toContain('?foo=bar');
  });

  it('returns "#" for unknown keys', () => {
    const result = generateLinkURL('unknownkey');
    expect(result).toBe('#');
  });

  it('returns URL without query if no params provided', () => {
    const url = generateLinkURL('index');
    expect(url).toMatch(/index.html$/);
  });
});

describe('updateGoldStarVisibility', () => {
  it('shows gold star for specific parameters', () => {
    updateGoldStarVisibility(27, 2, 3, 1);
    const el = document.getElementById('goldStar');
    expect(el.classList.contains('hidden')).toBe(false);
  });

  it('hides gold star for other parameters', () => {
    updateGoldStarVisibility(5, 2, 3, 1);
    const el = document.getElementById('goldStar');
    expect(el.classList.contains('hidden')).toBe(true);
  });

  it('does nothing if gold star element missing', () => {
    document.getElementById.mockReturnValueOnce(null);
    expect(() => updateGoldStarVisibility(27, 2, 3, 1)).not.toThrow();
  });
});

describe('Canvas Drawing Functions', () => {
  let canvas, ctx;
  beforeEach(() => {
    ctx = {
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      arc: vi.fn(),
      fillText: vi.fn(),
      fill: vi.fn(),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      font: '',
      textAlign: '',
      textBaseline: ''
    };
    canvas = {
      getContext: () => ctx,
      width: 300,
      height: 300
    };
  });

  it('drawNineNetCanvasSecondary runs without errors', () => {
    drawNineNetCanvasSecondary(canvas, [1, 2, 3, 4, 5, 6, 7, 8, 9], 2, '#f00', '#0f0');
    expect(ctx.clearRect).toHaveBeenCalled();
    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it('drawNineNetCanvasSecondary handles missing canvas gracefully', () => {
    expect(() => drawNineNetCanvasSecondary(null, [], 2, '#f00', '#0f0')).not.toThrow();
  });

  it('render9Net draws grid and fills cells', () => {
    render9Net(canvas, [2, 3, 4], '#f00', '#0f0');
    expect(ctx.clearRect).toHaveBeenCalled();
    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it('render9Net handles missing canvas gracefully', () => {
    expect(() => render9Net(null, [], '#f00', '#0f0')).not.toThrow();
  });

  it('drawNecklaceCanvas draws nodes and lines correctly', () => {
    const data = {
      sequence: [1, 2, 3, 4, 5],
      type: 'Converges to 1'
    };
    drawNecklaceCanvas(canvas, data);
    expect(ctx.clearRect).toHaveBeenCalled();
    expect(ctx.arc).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
  });

  it('drawNecklaceCanvas handles cycle sequences correctly', () => {
    const data = {
      sequence: [5, 10, 16, 8, 5],
      type: 'Cycle Detected'
    };
    drawNecklaceCanvas(canvas, data);
    expect(ctx.clearRect).toHaveBeenCalled();
    expect(ctx.arc).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
  });
});
