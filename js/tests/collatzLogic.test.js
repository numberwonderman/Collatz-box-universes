import { describe, it, expect } from 'vitest';
import {
  generalizedCollatz,
  getPredecessors,
  getPredecessorsShortcuts
} from '../collatzLogic.js';

describe('generalizedCollatz', () => {
  it('computes sequence correctly for positive input', () => {
    const result = generalizedCollatz(13n);
    expect(result.sequence).toContain(1n);
    expect(result.length).toBeGreaterThan(0);
  });

  it('throws error for non-positive input', () => {
    expect(() => generalizedCollatz(0n)).toThrow();
  });
});

describe('getPredecessors', () => {
  it('generates correct predecessors for a number', () => {
    const gen = getPredecessors(10n);
    const preds = [...gen];
    expect(preds).toContain(20n); // even predecessor
    // For odd predecessor, check if applicable
  });
});

describe('getPredecessorsShortcuts', () => {
  it('generates predecessors with shortcuts', () => {
    const gen = getPredecessorsShortcuts();
    const results = [...gen(10n)];
    expect(results).toContain(20n); // standard even predecessor
  });
});
