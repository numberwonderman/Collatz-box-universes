// Slow robustness check (about 8 minutes) for the fate tables: every n whose
// orbit leaves the safe-integer range (2^53) is continued in BigInt for up to
// 5000 steps in total, to see whether it settles later. Writes
// docs/fate-correlation/bigint-check.json.
//
//   node scripts/imai-fate-bigint-check.mjs      (from the repo root)
//
// Limitation: once a value exceeds 64 bits the visited set is not kept, so a
// cycle whose elements all exceed 2^64 would not be detected.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { trajectoryFate } from '../js/imaiFractalProbe.js';
const N = 16383, CAP = 5000;
const results = [];
function bigFate(n, m, c, cap) {
  let x = BigInt(n); const M = BigInt(m), C = BigInt(c); const seen = new Map();
  for (let s = 0; s <= cap; s++) {
    if (seen.has(x)) { let y = x, best = x; do { y = (y & 1n) ? M * y + C : y / 2n; const ay = y < 0n ? -y : y, ab = best < 0n ? -best : best; if (ay < ab || (ay === ab && y < best)) best = y; } while (y !== x); return { key: Number(best), steps: s }; }
    if (x.toString(2).length > 64) { seen.clear(); } // huge: cannot be on a small cycle yet; keep stepping
    else seen.set(x, s);
    x = (x & 1n) ? M * x + C : x / 2n;
  }
  return { key: null, bits: x.toString(2).length };
}
for (const m of [5, 7, 9, 15, 17]) {
  for (const sign of [-1, 1]) {
    const t = {}; let rescued = 0, maxBits = 0, minBits = 1e9;
    for (let a = 1; a <= N; a += 2) {
      const n = sign * a;
      const f = trajectoryFate(n, { m, c: 1, maxSteps: 2000 });
      let key;
      if (f.fate === 'cycle') key = f.key;
      else { const b = bigFate(n, m, 1, CAP); if (b.key !== null) { key = b.key; rescued++; } else { key = 'unsettled'; maxBits = Math.max(maxBits, b.bits); minBits = Math.min(minBits, b.bits); } }
      t[key] = (t[key] ?? 0) + 1;
    }
    results.push({ m, c: 1, side: sign < 0 ? 'negative odd' : 'positive odd', range: `1 <= |n| <= ${N}`, fates: t, settledOnlyAfter2pow53: rescued, unsettledBitLengthAfterCap: minBits === 1e9 ? null : [minBits, maxBits] });
    console.log(`m=${m} ${sign < 0 ? 'neg' : 'pos'}`, JSON.stringify(t), 'settled only after 2^53:', rescued, 'unsettled size after 5000 steps (bits):', minBits === 1e9 ? '-' : `${minBits}..${maxBits}`);
  }
}
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'fate-correlation', 'bigint-check.json');
writeFileSync(OUT, JSON.stringify({ stepCap: CAP, firstPassCap: 2000, results }, null, 2) + '\n');
