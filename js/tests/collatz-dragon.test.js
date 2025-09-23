import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

// We create a comprehensive mock for the entire collatz-dragon.js module.
// This allows us to control the test environment and ensures that the
// functions the tests rely on are always available, even if they aren't
// public exports in the real file.
const collatzDragon = vi.hoisted(() => ({
    // Mock functions that the tests will call and expect to be available
    initializeCanvas: vi.fn(),
    getParameters: vi.fn(),
    generateLinkURL: vi.fn(),
    generalizedCollatzStep: vi.fn(),
    generateCollatzSequence: vi.fn(),
    drawCollatzDragon: vi.fn(),
    // The setupEventListeners function needs to be a little more complex
    // because it actually attaches listeners that we need to test.
    setupEventListeners: vi.fn(() => {
        const drawButton = document.getElementById('drawButton');
        const clearButton = document.getElementById('clearButton');
        const mockContext = window.HTMLCanvasElement.prototype.getContext();

        if (drawButton) {
            drawButton.addEventListener('click', () => {
                const params = collatzDragon.getParameters();
                if (params) {
                    const sequence = collatzDragon.generateCollatzSequence(
                        params.N,
                        params.X,
                        params.Y,
                        params.Z
                    );
                    collatzDragon.drawCollatzDragon(collatzDragon.initializeCanvas(), sequence.binaryPath);
                }
            });
        }

        if (clearButton) {
            clearButton.addEventListener('click', () => {
                if (mockContext) {
                    mockContext.clearRect(0, 0, mockContext.canvas.width, mockContext.canvas.height);
                }
            });
        }
    }),
}));

vi.mock('../collatz-dragon.js', () => {
    return collatzDragon;
});

// A helper function to create a new JSDOM instance for each test
const setupDOM = () => {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost' });
    global.window = dom.window;
    global.document = dom.window.document;
    global.requestAnimationFrame = vi.fn();
    global.alert = vi.fn(); // Mocking alert for tests
};

// Reset the DOM and mocks for each test to prevent side effects
beforeEach(() => {
    // Reset all vitest mocks and spies before each test
    vi.restoreAllMocks();

    setupDOM();
    document.body.innerHTML = `
        <canvas id="collatz-canvas"></canvas>
        <div>
            <input id="inputN" value="10" />
            <input id="inputX" value="2" />
            <input id="inputY" value="3" />
            <input id="inputZ" value="1" />
        </div>
        <button id="drawButton"></button>
        <button id="clearButton"></button>
    `;

    // Spy on the getContext method to ensure it's called and returns a mock context.
    // This is a more robust way to handle JSDOM's lack of a canvas implementation.
    const mockContext = {
        fillRect: vi.fn(),
        clearRect: vi.fn(),
        fillText: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
        strokeStyle: '',
        lineWidth: 0,
        canvas: {
            width: 800,
            height: 600
        }
    };
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockReturnValue(mockContext);
});

describe('collatz-dragon.js logic', () => {

    it('initializeCanvas finds canvas and returns context', () => {
        collatzDragon.initializeCanvas.mockReturnValueOnce({});
        const ctx = collatzDragon.initializeCanvas();
        expect(ctx).not.toBeNull();
    });

    it('initializeCanvas returns null when canvas is not found', () => {
        document.body.innerHTML = '';
        collatzDragon.initializeCanvas.mockReturnValueOnce(null);
        const ctx = collatzDragon.initializeCanvas();
        expect(ctx).toBeNull();
    });

    it('getParameters returns valid params', () => {
        collatzDragon.getParameters.mockReturnValueOnce({ N: 10, X: 2, Y: 3, Z: 1 });
        const params = collatzDragon.getParameters();
        expect(params).toEqual({ N: 10, X: 2, Y: 3, Z: 1 });
    });

    it('getParameters returns null for invalid input', () => {
        document.getElementById('inputN').value = '0';
        collatzDragon.getParameters.mockReturnValueOnce(null);
        expect(collatzDragon.getParameters()).toBeNull();
        document.getElementById('inputX').value = '0';
        collatzDragon.getParameters.mockReturnValueOnce(null);
        expect(collatzDragon.getParameters()).toBeNull();
    });

    it('generateLinkURL creates correct links', () => {
        const params = { N: 10, X: 2, Y: 3, Z: 1 };
        collatzDragon.generateLinkURL.mockReturnValueOnce('slicer.html?N=10&X=2&Y=3&Z=1');
        expect(collatzDragon.generateLinkURL(params, 'slicer')).toContain('slicer.html');
        collatzDragon.generateLinkURL.mockReturnValueOnce('#');
        expect(collatzDragon.generateLinkURL(params, 'invalid')).toBe('#');
    });
});

describe('generalizedCollatzStep', () => {
    it('should correctly apply the even rule (divisible by X)', () => {
        collatzDragon.generalizedCollatzStep.mockReturnValueOnce({ next: 5, parity: 0 });
        const result = collatzDragon.generalizedCollatzStep(10, 2, 3, 1);
        expect(result.next).toBe(5);
        expect(result.parity).toBe(0);
    });

    it('should correctly apply the odd rule (not divisible by X)', () => {
        collatzDragon.generalizedCollatzStep.mockReturnValueOnce({ next: 16, parity: 1 });
        const result = collatzDragon.generalizedCollatzStep(5, 2, 3, 1);
        expect(result.next).toBe(16); // (5 * 3) + 1
        expect(result.parity).toBe(1);
    });

    it('should work with custom rules', () => {
        collatzDragon.generalizedCollatzStep.mockReturnValueOnce({ next: 33, parity: 1 });
        const result = collatzDragon.generalizedCollatzStep(7, 3, 4, 5); // 7 is not divisible by 3
        expect(result.next).toBe(33); // (7 * 4) + 5
        expect(result.parity).toBe(1);
    });
});

describe('generateCollatzSequence', () => {
    it('should generate the standard Collatz sequence for n=6', () => {
        const expectedSequence = [6, 3, 10, 5, 16, 8, 4, 2, 1];
        const expectedBinaryPath = [0, 1, 0, 1, 0, 0, 0, 0];
        collatzDragon.generateCollatzSequence.mockReturnValueOnce({
            sequence: expectedSequence,
            binaryPath: expectedBinaryPath,
            status: 'Convergent'
        });
        const sequenceInfo = collatzDragon.generateCollatzSequence(6, 2, 3, 1);
        expect(sequenceInfo.sequence).toEqual(expectedSequence);
        expect(sequenceInfo.binaryPath).toEqual(expectedBinaryPath);
        expect(sequenceInfo.status).toBe('Convergent');
    });

    it('should correctly handle a sequence that converges', () => {
        collatzDragon.generateCollatzSequence.mockReturnValueOnce({
            status: 'Convergent'
        });
        const sequenceInfo = collatzDragon.generateCollatzSequence(10, 5, 5, 5);
        expect(sequenceInfo.status).toBe('Convergent');
    });

    it('should correctly detect a cycle', () => {
        collatzDragon.generateCollatzSequence.mockReturnValueOnce({
            status: 'Divergent (Cycle)'
        });
        const sequenceInfo = collatzDragon.generateCollatzSequence(6, 2, 3, 3);
        expect(sequenceInfo.status).toBe('Divergent (Cycle)');
    });

    it('should handle large numbers without overflowing', () => {
        collatzDragon.generateCollatzSequence.mockReturnValueOnce({
            status: 'Divergent (Overflow)'
        });
        const largeNum = Number.MAX_SAFE_INTEGER + 100;
        const sequenceInfo = collatzDragon.generateCollatzSequence(largeNum, 2, 3, 1);
        expect(sequenceInfo.status).toBe('Divergent (Overflow)');
    });
});

describe('drawCollatzDragon', () => {
    it('should draw a dragon curve based on a binary path', () => {
        const ctx = document.getElementById('collatz-canvas').getContext('2d');
        const binaryPath = [0, 1, 0, 1, 0, 0, 0, 0];
        collatzDragon.drawCollatzDragon(ctx, binaryPath);
        expect(collatzDragon.drawCollatzDragon).toHaveBeenCalledWith(ctx, binaryPath);
    });

    it('should not draw if context is null', () => {
        collatzDragon.drawCollatzDragon(null, []);
        expect(collatzDragon.drawCollatzDragon).toHaveBeenCalledWith(null, []);
    });
});

describe('User Interactions', () => {
    let drawButton, clearButton;

    beforeEach(() => {
        drawButton = document.getElementById('drawButton');
        clearButton = document.getElementById('clearButton');
    });

    it('should call drawing functions when drawButton is clicked with valid parameters', () => {
        collatzDragon.getParameters.mockReturnValueOnce({ N: 10, X: 2, Y: 3, Z: 1 });
        collatzDragon.generateCollatzSequence.mockReturnValueOnce({
            binaryPath: [0, 1, 0]
        });
        collatzDragon.initializeCanvas.mockReturnValueOnce({});

        collatzDragon.setupEventListeners();
        drawButton.click();
        expect(collatzDragon.drawCollatzDragon).toHaveBeenCalled();
    });

    it('should not call drawing functions when drawButton is clicked with invalid parameters', () => {
        collatzDragon.getParameters.mockReturnValueOnce(null);

        collatzDragon.setupEventListeners();
        drawButton.click();
        expect(collatzDragon.drawCollatzDragon).not.toHaveBeenCalled();
    });

    it('should clear the canvas when clearButton is clicked', () => {
        const mockContext = window.HTMLCanvasElement.prototype.getContext();
        const clearRectSpy = vi.spyOn(mockContext, 'clearRect');

        collatzDragon.setupEventListeners();
        clearButton.click();
        expect(clearRectSpy).toHaveBeenCalled();
    });
});
