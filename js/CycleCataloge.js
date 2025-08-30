// CycleCatalog.js
// Scan a set of starts and catalog cycles by a simple signature.

export async function catalogCycles(
  { starts, signature = 'binary', maxSteps = 5000 },
  runSequence // async (start: BigInt, params: any, maxSteps: number) -> { sequence: BigInt[], type: string }
) {
  const out = [];
  for (const s of starts) {
    try {
      const res = await runSequence(s, /* params */ null, maxSteps);
      if (res?.type === 'cycle') {
        const seq = res.sequence.map(x => BigInt(x));
        // Simple signatures: length or binary parity string
        let sig;
        if (signature === 'length') {
          sig = `len:${seq.length}`;
        } else {
          // 'binary': D/M parity path (even=0, odd=1) for the cycle tail
          const bits = seq.map(x => (x & 1n) === 0n ? '0' : '1').join('');
          sig = bits.slice(-32); // keep tail manageable
        }
        out.push({ start: s.toString(), signature: sig, cycleSample: seq.slice(-10).map(x => x.toString()) });
      }
    } catch (e) {
      out.push({ start: s.toString(), error: String(e) });
    }
  }
  return out;
}
