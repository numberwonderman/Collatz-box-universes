import { describe, it, expect } from 'vitest';
import { layoutTree } from '../layoutTree.js';
import { IncrementalTree } from '../incrementalEncoding.js';

describe('layoutTree', () => {
  it('returns an empty layout for a missing tree', () => {
    expect(layoutTree(undefined)).toEqual({ nodes: [], edges: [] });
  });

  it('centres a lone root', () => {
    const { nodes, edges } = layoutTree(new IncrementalTree(1), { width: 800, height: 600, padding: 20 });
    expect(edges).toEqual([]);
    expect(nodes).toEqual([{ id: 1, x: 400, y: 20 }]);
  });

  it('places parents over their children and spreads leaves across the width', () => {
    const T = new IncrementalTree(1);
    T.insertChild(1, 2);
    T.insertChild(1, 3);
    T.insertChild(2, 4);
    T.insertChild(2, 5);
    const { nodes, edges } = layoutTree(T, { width: 420, height: 220, padding: 10 });
    const at = Object.fromEntries(nodes.map(n => [n.id, n]));

    expect(nodes).toHaveLength(5);
    expect(edges).toHaveLength(4);
    // leaves 4, 5, 3 take slots 0, 1, 2 → x = 10, 210, 410
    expect([at[4].x, at[5].x, at[3].x]).toEqual([10, 210, 410]);
    expect(at[2].x).toBe((at[4].x + at[5].x) / 2);
    expect(at[1].x).toBe((at[2].x + at[3].x) / 2);
    expect([at[1].y, at[2].y, at[4].y]).toEqual([10, 110, 210]);
  });
});
