import { describe, it, expect } from 'vitest';
import { IncrementalTree } from '../incrementalEncoding.js';
import { getPredecessorsShortcuts } from '../collatzLogic.js';




// Helper function to build a classic tree for comparison
const buildClassicTree = (root, predecessors, depthLimit) => {
  const tree = new Map();
  const q = [{ node: root, d: 0 }];
  const seen = new Set([root]);
  tree.set(root, { parent: null, children: [] });

  console.log('Starting buildClassicTree with root:', root);

  let head = 0;
  while (head < q.length) {
    const { node, d } = q[head++];
    if (d >= depthLimit) continue;

    // Log current node and depth being processed
    console.log(`Processing node: ${node} at depth: ${d}`);

    for (const p of predecessors(node)) {
      if (p <= 0n || seen.has(p)) {
        console.log(`Skipping predecessor: ${p} (invalid or seen)`);
        continue;
      }

      console.log(`Adding predecessor: ${p} as child of node: ${node}`);

      seen.add(p);
      if (!tree.has(p)) tree.set(p, { parent: null, children: [] });
      tree.get(p).parent = node;
      tree.get(node).children.push(p);
      q.push({ node: p, d: d + 1 });
    }
  }

  console.log('Finished building tree. Nodes count:', tree.size);

  return tree;
};

// A corrected, robust DFS subtree traversal for classic trees
const dfsSubtree = (children, u) => {
  const stack = [u];
  const members = new Set();
 
  while (stack.length > 0) {
    const node = stack.pop();
    if (members.has(node)) continue;
   
    members.add(node);
    const kids = children.get(node) || [];
    for (let i = kids.length - 1; i >= 0; i--) {
      stack.push(kids[i]);
    }
  }
  return members;
};




// Helper to compare two sets for equality
const setEq = (set1, set2) => {
  if (set1.size !== set2.size) return false;
  for (const elem of set1) {
    if (!set2.has(elem)) return false;
  }
  return true;
};


describe('Traditional reverse vs. Olgac incremental encoding with shortcuts', () => {
  const root = 1n;
  const predecessors = getPredecessorsShortcuts();
  const olgac = new IncrementalTree(root);
  const classicTree = buildClassicTree(root, predecessors, 6);
// A corrected, robust ancestor check for classic trees
const isAncestorClassic = (u, v) => {
  let current = v;
  while (current !== null) {
    if (current === u) return true;
    current = classicTree.get(current)?.parent;
  }
  return false;
};


  // Re-build the IncrementalTree to ensure it's in sync with the classic tree
  const seen = new Set([root]);
  const q = [{ node: root, d: 0 }];
  let head = 0;
  while (head < q.length) {
    const { node, d } = q[head++];
    if (d >= 12) continue;


    const children = Array.from(predecessors(node));
    children.sort((a, b) => Number(a - b)); // Ensure consistent order
    for (const p of children) {
      if (p <= 0n || seen.has(p)) continue;
     
      olgac.insertChild(node, p);
      seen.add(p);
      q.push({ node: p, d: d + 1 });
    }
  }


 it('Subtree contiguity: Q2 slice equals classic DFS subtree (samples)', () => {
  // Build map of nodes to their children arrays from the classicTree
  const childrenMap = new Map();
  for (const [node, data] of classicTree.entries()) {
    childrenMap.set(node, data.children);
  }

  const sampledNodes = olgac.Q1.slice(0, 19);
  for (const u of sampledNodes) {
    const baselineSet = dfsSubtree(childrenMap, u);
    const incSliceSet = new Set(olgac.subtreeMembersQ2(u));

    // Debug output for failed cases:
    if (!setEq(baselineSet, incSliceSet)) {
      console.log('Mismatch for node:', u);
      console.log('baselineSet:', Array.from(baselineSet));
      console.log('incSliceSet:', Array.from(incSliceSet));
    }

    expect(setEq(baselineSet, incSliceSet)).toBe(true);
  }
}, 10000)
});