import { describe, it, expect } from 'vitest';
import { IncrementalTree } from '../incrementalEncoding.js';
import { getPredecessorsShortcuts } from '../collatzLogic.js';

/**
 * Generates a small, controlled dataset of parent-child relationships for testing.
 * This avoids building a large tree in memory and prevents the heap overflow.
 */
const generateTestDataset = (root, depthLimit, predecessorsFn) => {
  const dataset = new Map();
  const q = [{ node: root, d: 0 }];
  const seen = new Set([root]);
  
  let head = 0;
  while (head < q.length) {
    const { node, d } = q[head++];
    if (d >= depthLimit) continue;
    
    for (const p of predecessorsFn(node)) {
      if (p <= 0n || seen.has(p)) continue;
      
      if (!dataset.has(node)) {
        dataset.set(node, []);
      }
      dataset.get(node).push(p);
      seen.add(p);
      q.push({ node: p, d: d + 1 });
    }
  }
  return dataset;
};

// Helper to compare two sets for equality
const setEq = (set1, set2) => {
  if (set1.size !== set2.size) return false;
  for (const elem of set1) {
    if (!set2.has(elem)) return false;
  }
  return true;
};

describe('Incremental encoding vs. traditional parent-child relationships', () => {
  const root = 1n;
  const depthLimit = 4;
  const predecessors = getPredecessorsShortcuts();
  
  // Create a small, verifiable dataset to test against
  const testDataset = generateTestDataset(root, depthLimit, predecessors);
  
  // Initialize the incremental tree and populate it with the test data
  const olgac = new IncrementalTree(root);
  for (const [parent, children] of testDataset.entries()) {
    for (const child of children) {
      olgac.insertChild(parent, child);
    }
  }

  it('Parent-child relationships are correctly encoded', () => {
    // Iterate over the nodes in our controlled dataset
    for (const [parent, children] of testDataset.entries()) {
      // Check that the incremental tree's child-finding method is correct
      const olgacChildren = new Set(olgac.children.get(parent) || []);
      const expectedChildren = new Set(children);
      expect(setEq(olgacChildren, expectedChildren)).toBe(true);
      
      // Check that the incremental tree's parent-finding method is correct
      for (const child of children) {
        const olgacParent = olgac.parent.get(child);
        expect(olgacParent).toBe(parent);
      }
    }
  });
});
