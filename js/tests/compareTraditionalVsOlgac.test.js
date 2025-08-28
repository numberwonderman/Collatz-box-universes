import { describe, it, expect } from 'vitest';
import { reversePredecessors } from '../src/binaryRotation.js';
import { IncrementalTree } from '../src/incrementalEncoding.js';

/**
 * Classic reverse-tree builder (BFS) for baseline checks.
 * Returns { children: Map, parent: Map, visited: Set }
 */
function buildClassic({ root=1n, depthLimit=12, valueLimit=50000n }) {
  const visited = new Set([root]);
  const parent = new Map([[root, null]]);
  const children = new Map([[root, []]]);
  const depth = new Map([[root, 0]]);
  const q = [{ node: root, d: 0 }];

  while (q.length) {
    const { node: m, d } = q.shift();
    if (d >= depthLimit) continue;

    for (const p of reversePredecessors(m)) {
      if (p <= 0n) continue;
      if (valueLimit !== undefined && p > valueLimit) continue;

      if (!visited.has(p)) {
        visited.add(p);
        parent.set(p, m);
        if (!children.has(m)) children.set(m, []);
        if (!children.has(p)) children.set(p, []);
        children.get(m).push(p);
        depth.set(p, d + 1);
        q.push({ node: p, d: d + 1 });
      }
    }
  }

  return { children, parent, visited };
}

// DFS subtree collector (baseline)
function dfsSubtree(children, u) {
  const out = [];
  const stack = [u];
  while (stack.length) {
    const x = stack.pop();
    out.push(x);
    const kids = children.get(x) || [];
    for (let i = kids.length - 1; i >= 0; i--) stack.push(kids[i]);
  }
  return new Set(out);
}

function setEq(a, b) {
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

describe('Traditional reverse vs. Olgac incremental encoding (Q1/Q2)', () => {
  const ROOT = 1n;
  const DEPTH = 14;          // keep modest for speed
  const VALUE_LIMIT = 60000n;

  it('Visited sets match when both use the same predecessor generator', () => {
    const classic = buildClassic({ root: ROOT, depthLimit: DEPTH, valueLimit: VALUE_LIMIT });
    const olgac  = IncrementalTree.buildFromReverse({
      root: ROOT,
      predecessors: reversePredecessors, // same generator
      depthLimit: DEPTH,
      valueLimit: VALUE_LIMIT,
    });

    expect(classic.visited.size).toBeGreaterThan(1);
    // The incremental tree doesn't track 'visited' explicitly; derive from Q1 (or Q2)
    const incVisited = new Set(olgac.Q1);
    expect(setEq(classic.visited, incVisited)).toBe(true);
  });

  it('Reachability parity: Q1/Q2 positions match classic ancestry (sampled pairs)', () => {
    const classic = buildClassic({ root: ROOT, depthLimit: DEPTH, valueLimit: VALUE_LIMIT });
    const olgac  = IncrementalTree.buildFromReverse({
      root: ROOT,
      predecessors: reversePredecessors,
      depthLimit: DEPTH,
      valueLimit: VALUE_LIMIT,
    });

    const sample = [...classic.visited].slice(0, 200); // take first ~200 nodes
    // helper to check classic ancestry
    const isAncestorClassic = (u, v) => {
      let x = v;
      while (x != null) {
        if (x === u) return true;
        x = classic.parent.get(x) ?? null;
      }
      return false;
    };

    for (let i = 0; i < sample.length; i += 5) {
      const u = sample[i];
      const v = sample[(i * 7 + 13) % sample.length];
      const a = isAncestorClassic(u, v);
      const b = olgac.reaches(u, v);
      expect(b).toBe(a);
    }
  });

  it('Subtree contiguity: Q2 slice equals classic DFS subtree (samples)', () => {
    const classic = buildClassic({ root: ROOT, depthLimit: DEPTH, valueLimit: VALUE_LIMIT });
    const olgac  = IncrementalTree.buildFromReverse({
      root: ROOT,
      predecessors: reversePredecessors,
      depthLimit: DEPTH,
      valueLimit: VALUE_LIMIT,
    });

    // pick ~15 nodes to check
    const picks = [...classic.visited].slice(0, 15);
    for (const u of picks) {
      const baselineSet = dfsSubtree(classic.children, u);
      const incSliceSet = new Set(olgac.subtreeMembersQ2(u));
      expect(setEq(baselineSet, incSliceSet)).toBe(true);
    }
  });
});
