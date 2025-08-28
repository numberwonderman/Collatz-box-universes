// Run with: npx vitest
import { describe, it, expect } from 'vitest';
import {
  reversePredecessors,
  shortcutOddPredecessors,
  reversePredecessorsWithShortcuts,
  acceleratedForward,
  toBinary,
  evenPredecessorBinary
} from '../src/binaryRotation.js';

describe('binaryRotation helpers', () => {
  it('immediate reverse predecessors: even and optional odd', () => {
    // m = 8: preds are 16 and (8-1)/3 not integer => just 16
    expect(reversePredecessors(8n)).toEqual([16n]);

    // m = 10: preds are 20 and 3 (since (10-1)/3 = 3)
    const preds10 = reversePredecessors(10n);
    expect(preds10).toContain(20n);
    expect(preds10).toContain(3n);
  });

  it('even predecessor binary helper is left shift', () => {
    // m=5 (0b101) -> even predecessor is 10 (0b1010); string should append '0'
    expect(evenPredecessorBinary(5n)).toBe('1010');
  });

  it('shortcut odd predecessors satisfy (3p+1) = 2^k * m', () => {
    const m = 10n;
    const shorts = shortcutOddPredecessors(m, 10); // should include k=1 => p=3
    const found = shorts.find(s => s.p === 3n && s.k === 1);
    expect(found).toBeTruthy();
    // validate proof equality
    expect(found.proof.lhs.toString()).toBe(found.proof.rhs.toString());
  });

  it('accelerated forward matches bundled reverse', () => {
    // Pick an odd p, accelerate forward to m, then see p appear in m’s shortcuts
    const p = 27n;
    const { next: m, k } = acceleratedForward(p); // T(p) = m
    const shorts = shortcutOddPredecessors(m, 100);
    const hit = shorts.find(s => s.p === p && s.k === Number(k));
    expect(hit).toBeTruthy();
  });

  it('reversePredecessorsWithShortcuts includes immediates and bundled ones', () => {
    const m = 8n;
    const all = reversePredecessorsWithShortcuts(m, 8);
    // Immediate even predecessor 16 must be present
    expect(all).toContain(16n);
    // Any shortcut predecessors must also be present
    const shorts = shortcutOddPredecessors(m, 8);
    for (const s of shorts) {
      expect(all).toContain(s.p);
    }
  });

  it('random spot checks for consistency', () => {
    const nums = [5n, 7n, 10n, 13n, 25n, 33n, 65n, 97n];
    for (const m of nums) {
      // Every immediate odd predecessor (if any) must show as a shortcut with k=1
      const immed = reversePredecessors(m);
      const odd = immed.find(x => (x & 1n) === 1n && x !== (m << 1n));
      if (odd !== undefined) {
        const shorts = shortcutOddPredecessors(m, 2); // k=1 should suffice
        const k1 = shorts.find(s => s.k === 1 && s.p === odd);
        expect(k1).toBeTruthy();
        // Also verify (3*odd+1) >> v2 == m
        const { next } = acceleratedForward(odd);
        expect(next).toBe(m);
      }
    }
  });
});
