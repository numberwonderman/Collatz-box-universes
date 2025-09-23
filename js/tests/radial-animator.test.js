import { describe, it, expect, vi } from 'vitest';
import { generalizedCollatz, renderRadialVisualization, displaySequenceStats } from '../radial-animator.js';

// Mock the DOM elements for testing purposes
const mockCanvas = {
    getContext: () => ({
        clearRect: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        fillText: vi.fn(),
        scale: vi.fn(),
    }),
    width: 600,
    height: 600,
    offsetWidth: 600,
    offsetHeight: 600
};

const mockStatsDiv = {
    innerHTML: '',
    classList: {
        remove: vi.fn()
    }
};

const mockButton = {
    addEventListener: vi.fn()
};

const mockInput = {
    addEventListener: vi.fn()
};

// Global mocks for DOM elements used in the file
vi.stubGlobal('document', {
    getElementById: vi.fn((id) => {
        if (id === 'collatzCanvas') return mockCanvas;
        if (id === 'statsDisplay') return mockStatsDiv;
        if (id.includes('Input')) return mockInput;
        if (id === 'calculateButton') return mockButton;
        if (id === 'x-star') return { style: { display: 'none' }};
        if (id === 'y-star') return { style: { display: 'none' }};
        if (id === 'z-star') return { style: { display: 'none' }};
        return null;
    }),
});

vi.stubGlobal('window', {
    addEventListener: vi.fn((event, callback) => {
        if (event === 'load' || event === 'DOMContentLoaded') {
            callback();
        }
    }),
    location: {
        search: ''
    },
    devicePixelRatio: 1,
});

vi.stubGlobal('MathJax', {
    typesetPromise: vi.fn().mockResolvedValue(),
});

describe('generalizedCollatz', () => {
    it('should correctly calculate the standard Collatz sequence for n=6', () => {
        const result = generalizedCollatz(6, 2, 3, 1);
        const expectedSequence = [6, 3, 10, 5, 16, 8, 4, 2, 1];
        
        expect(result.sequence).toEqual(expectedSequence);
        expect(result.steps).toBe(8);
        expect(result.type).toBe("Normal");
    });

    it('should correctly calculate the long Collatz sequence for n=27', () => {
        const result = generalizedCollatz(27, 2, 3, 1);
        expect(result.steps).toBe(111);
        expect(result.max).toBe(9232);
        expect(result.type).toBe("Normal");
    });

    it('should handle a custom rule (5n+1, div by 2) for n=3', () => {
        const result = generalizedCollatz(3, 2, 5, 1);
        const expectedSequence = [3, 16, 8, 4, 2, 1];
        expect(result.sequence).toEqual(expectedSequence);
        expect(result.steps).toBe(5);
        expect(result.type).toBe("Normal");
    });
    
    it('should detect a paradoxical sequence (2n+1) for n=3', () => {
        // The sequence should continue indefinitely, so the loop limit should be reached
        const result = generalizedCollatz(3, 2, 2, 1);
        expect(result.sequence.length).toBe(100001); // 1 start + 100000 iterations
        expect(result.isParadoxical).toBe(true);
    }, 90000); // Increased timeout for this long-running test
    
    it('should correctly handle the starting number n=1', () => {
        const result = generalizedCollatz(1, 2, 3, 1);
        expect(result.sequence).toEqual([1]);
        expect(result.steps).toBe(0);
        expect(result.type).toBe("Converges to 1");
    });
});
