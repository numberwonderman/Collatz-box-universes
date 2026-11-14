// Independent cross-check: the JS (BigInt) implementation against the Python scan.
// Usage: node vasilyev_results/crosscheck_js_vs_python.mjs [limit=100000]
import { findCyclesTS } from '../js/vasilyevMaps.js';
import { execFileSync } from 'node:child_process';
import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const limit = Number(process.argv[2] || 100000);
const py = JSON.parse(execFileSync('python3', ['-c', `
import json,sys
sys.path.insert(0, ${JSON.stringify(root)})
from vasilyev_maps import find_cycles
out={}
for S in [(),(1,),(2,3),(3,)]:
    r=find_cycles(${limit},S)
    out[",".join(map(str,S))]={",".join(map(str,c)):n for c,n in r.cycles.items()}
print(json.dumps(out))`], { encoding: 'utf8', maxBuffer: 1 << 26 }));
let allOk = true;
for (const S of [[], [1], [2, 3], [3]]) {
  const t = Date.now();
  const { cycles, unresolved } = findCyclesTS(limit, S, { maxSteps: 1000000 });
  const js = Object.fromEntries(cycles.map(c => [c.cycle.join(','), c.count]));
  const ref = py[S.join(',')];
  const ok = unresolved.length === 0 && JSON.stringify(Object.entries(js).sort()) === JSON.stringify(Object.entries(ref).sort());
  allOk &&= ok;
  console.log(`S={${S}} n<${limit}: JS found ${cycles.length} cycle(s), counts [${cycles.map(c => c.count)}]; identical to Python: ${ok} (${((Date.now() - t) / 1000).toFixed(1)} s)`);
}
console.log(allOk ? 'JS and Python agree on every cycle and every count.' : 'MISMATCH');
