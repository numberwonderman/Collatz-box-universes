import { describe, it, expect } from 'vitest';
import { catalogCycles } from '../CycleCataloge.js';

describe('catalogCycles', () => {
  it('returns cycle data with length signature', async () => {
    const starts = [1n, 2n];
    const runSequence = async (start, _params, _maxSteps) => {
      return {
        sequence: [start, start + 1n, start + 2n, start],
        type: 'cycle'
      };
    };
    const result = await catalogCycles({ starts, signature: 'length' }, runSequence);
    expect(result).toHaveLength(2);
    expect(result[0]).toHaveProperty('signature', 'len:4');
    expect(result[0].cycleSample).toEqual([
      starts[0].toString(),
      (starts[0] + 1n).toString(),
      (starts[0] + 2n).toString(),
      starts[0].toString()
    ]);
  });

  it('returns cycle data with binary signature', async () => {
    const starts = [3n];
    const runSequence = async (start, _params, _maxSteps) => {
      return {
        sequence: [2n, 3n, 4n, 5n],
        type: 'cycle'
      };
    };
    const result = await catalogCycles({ starts }, runSequence);
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty('signature');
    expect(typeof result[0].signature).toBe('string');
  });

  it('handles non-cycle results by skipping', async () => {
    const starts = [1n];
    const runSequence = async () => ({ sequence: [], type: 'max_iterations_reached' });
    const result = await catalogCycles({ starts }, runSequence);
    expect(result).toEqual([]);
  });

  it('catches errors and returns error data', async () => {
    const starts = [1n];
    const runSequence = async () => { throw new Error('Test error'); };
    const result = await catalogCycles({ starts }, runSequence);
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty('error');
    expect(result[0].error).toContain('Test error');
  });
});
