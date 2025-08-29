// js/cycleCatalog.js

// --- rotation-invariant binary signature for a cycle ---
// given an array of BigInt or numbers 'cycle', return a canonical string
export function cycleSignatureBinary(cycle) {
  const bins = cycle.map(n => (BigInt(n)).toString(2));
  // all rotations of the joined-with-sep representation (or rotate array, then join)
  const rotate = (arr, k) => arr.slice(k).concat(arr.slice(0, k));
  let best = null;
  for (let k = 0; k < bins.length; k++) {
    const cand = rotate(bins, k).join("|");
    if (best === null || cand < best) best = cand;
  }
  return best; // stable ID for same cycle up to rotation
}

// If you prefer parity patterns (D/M) instead of raw values:
export function cycleSignatureParity(cycle, xDiv = 2n) {
  // label step type by divisibility w.r.t xDiv (e.g., 2)
  const labels = cycle.map(n => ((BigInt(n) % xDiv) === 0n ? "D" : "M"));
  const rotate = (arr, k) => arr.slice(k).concat(arr.slice(0, k));
  let best = null;
  for (let k = 0; k < labels.length; k++) {
    const cand = rotate(labels, k).join("");
    if (best === null || cand < best) best = cand;
  }
  return best;
}

// --- main catalog sweep over a tile (range of starts or params) ---
// deps: you provide runSequence(start, params) -> { sequence, type: 'cycle'|'...' }
export async function catalogCycles({ 
  starts = [1n,2n,3n,4n,5n], 
  params = {}, 
  maxSeq = 10000, 
  signature = "binary" // or "parity"
}, runSequence) {

  const seen = new Map(); // sig -> { length, rep, count, examples: [...] }

  for (const s of starts) {
    const { sequence, type } = await runSequence(s, params, maxSeq);
    if (type !== "cycle") continue;

    // isolate the tail cycle; if your runSequence already provides it, use that.
    const last = sequence[sequence.length - 1];
    let j = sequence.indexOf(last);
    if (j < 0) j = 0;
    const cyc = sequence.slice(j); // crude; swap for your precise cycle extraction

    const sig = signature === "parity" 
      ? cycleSignatureParity(cyc, 2n)
      : cycleSignatureBinary(cyc);

    const rec = seen.get(sig) || { length: cyc.length, rep: cyc[0], count: 0, examples: [] };
    rec.count += 1;
    if (rec.examples.length < 5) rec.examples.push({ start: s, first: cyc[0] });
    seen.set(sig, rec);
  }

  // flatten for UI/table
  return Array.from(seen.entries()).map(([sig, info]) => ({
    signature: sig,
    length: info.length,
    representative: String(info.rep),
    count: info.count,
    examples: info.examples.map(e => String(e.start)).join(", ")
  }));
}
