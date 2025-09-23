import { describe, it, expect, vi, beforeEach } from 'vitest';
import { drawTree } from '../treeRenderer.js';

describe('drawTree', () => {
  let mockCanvas;
  let mockCtx;

  beforeEach(() => {
    // Mock canvas and context methods used in drawTree
    mockCtx = {
      clearRect: vi.fn(),
      getContext: vi.fn(),
      strokeStyle: '',
      lineWidth: 0,
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fillStyle: '',
      arc: vi.fn(),
      fill: vi.fn(),
    };

    mockCanvas = {
      getContext: vi.fn(() => mockCtx),
      width: 200,
      height: 100,
    };
  });

  it('should draw edges and nodes on canvas', () => {
    const nodes = [
      { id: 1, x: 10, y: 20 },
      { id: 2, x: 30, y: 40 },
    ];
    const edges = [
      { u: 1, v: 2 },
    ];

    drawTree(mockCanvas, { nodes, edges });

    // Validate clearRect called to reset canvas
    expect(mockCtx.clearRect).toHaveBeenCalledWith(0, 0, mockCanvas.width, mockCanvas.height);

    // Validate strokeStyle and lineWidth set
    expect(mockCtx.strokeStyle).toBe('#6B7280');
    expect(mockCtx.lineWidth).toBe(1);

    // Validate path drawing calls
    expect(mockCtx.beginPath).toHaveBeenCalled();
    expect(mockCtx.moveTo).toHaveBeenCalledWith(10, 20);
    expect(mockCtx.lineTo).toHaveBeenCalledWith(30, 40);
    expect(mockCtx.stroke).toHaveBeenCalled();

    // Validate node fill style set
    expect(mockCtx.fillStyle).toBe('#10B981');

    // Validate arc and fill calls for each node
    expect(mockCtx.arc).toHaveBeenCalledTimes(nodes.length);
    expect(mockCtx.fill).toHaveBeenCalledTimes(nodes.length);
  });

  it('should ignore edges with missing nodes', () => {
    const nodes = [
      { id: 1, x: 10, y: 20 }
    ];
    const edges = [
      { u: 1, v: 2 },  // toNode missing
      { u: 3, v: 1 },  // fromNode missing
    ];

    drawTree(mockCanvas, { nodes, edges });

    // -> No moveTo/lineTo calls for missing node edges
    expect(mockCtx.moveTo).not.toHaveBeenCalledWith(undefined, expect.any(Number));
    expect(mockCtx.lineTo).not.toHaveBeenCalledWith(undefined, expect.any(Number));
  });
});
