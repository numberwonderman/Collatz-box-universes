"""Run the pytest suite, record the pass count in results.json, and write REPORT.md
using only numbers read from results.json."""
import json
import re
import subprocess
import sys

proc = subprocess.run([sys.executable, "-m", "pytest", "-q", "tests"],
                      capture_output=True, text=True)
tail = proc.stdout.strip().splitlines()[-1]
passed = int(m.group(1)) if (m := re.search(r"(\d+) passed", tail)) else 0
failed = int(m.group(1)) if (m := re.search(r"(\d+) failed", tail)) else 0

with open("results.json") as f:
    d = json.load(f)
d["tests"] = {"passed": passed, "failed": failed, "summary": tail}
with open("results.json", "w") as f:
    json.dump(d, f, indent=2)

N = d["primes_checked"]
h = d["histogram"]
L = []
L.append("# Wall–Sun–Sun residues for primes p < 1,000,000\n")
L.append(f"Convention: {d['convention']}. R(p) = F_{{p−(5/p)}} mod p², with (5/p) = +1 for "
         "p ≡ ±1 (mod 5) and −1 for p ≡ ±2 (mod 5). Every number below is read from `results.json`.\n")
L.append("## Checks\n")
L.append(f"- Test suite (`pytest tests`): **{passed} passed, {failed} failed** (`{tail}`).")
for a in d["anchors"]:
    ok = "holds" if a["value"] == a["expected"] else "FAILS"
    L.append(f"- Anchor p = {a['p']}: F_{a['n']} mod {a['m']} = {a['value']} (expected {a['expected']}): {ok}.")
L.append("")
L.append("## Part 1: the search\n")
L.append(f"- Primes checked: **{N}** (every prime p < {d['limit']:,} except p = 5; the largest is {d['largest_prime_checked']}).")
L.append(f"- Any R(p) = 0: **{'yes' if d['any_zero_residue'] else 'no'}**. No Wall–Sun–Sun prime below {d['limit']:,}.\n")
L.append("## Part 2: the residues\n")
L.append("r(p) is the centred residue in (−p²/2, p²/2] and ρ(p) = r(p)/p². Because p always divides "
         "F_{p−(5/p)}, r(p) is a multiple of p, so ρ(p) = q/p for an integer q, the centred Fibonacci quotient.\n")
L.append(f"### 1. Histogram of ρ (20 bins, each (lo, hi])\n")
L.append("![histogram](rho_histogram.png)\n")
L.append(f"Uniform-heuristic expectation per bin: {N} / 20 = {h['expected_per_bin_uniform']:.2f}.\n")
L.append("| bin | lo | hi | count | uniform expectation |")
L.append("|---:|---:|---:|---:|---:|")
for i, b in enumerate(h["bins"]):
    L.append(f"| {i+1} | {b['lo']:+.2f} | {b['hi']:+.2f} | {b['count']} | {h['expected_per_bin_uniform']:.2f} |")
L.append("")
L.append("### 2. The 20 primes with the smallest |ρ|\n")
L.append("| rank | p | r(p) | ρ(p) |")
L.append("|---:|---:|---:|---:|")
for i, s in enumerate(d["smallest_abs_rho"]):
    L.append(f"| {i+1} | {s['p']} | {s['r']} | {s['rho']:.6e} |")
L.append("")
L.append("### 3. Record minima of |ρ| as p increases\n")
L.append("| p | r(p) | ρ(p) | abs(ρ) |")
L.append("|---:|---:|---:|---:|")
for s in d["record_minima"]:
    L.append(f"| {s['p']} | {s['r']} | {s['rho']:.6e} | {s['abs_rho']:.6e} |")
L.append("")
L.append("### 4. Small-|ρ| counts\n")
L.append("Expectation under the uniform heuristic = primes checked × 2c.\n")
L.append("| threshold c | primes with abs(ρ) < c | uniform expectation |")
L.append("|---:|---:|---:|")
for t in d["threshold_counts"]:
    L.append(f"| {t['c']:g} | {t['count']} | {t['expected']:.3f} |")
L.append("")
L.append("## Reproduce\n")
L.append("```\npip install matplotlib pytest\npython run_search.py   # writes results.json, rho_histogram.png\n"
         "python make_report.py  # runs pytest, adds the pass count to results.json, writes REPORT.md\n```")
with open("REPORT.md", "w") as f:
    f.write("\n".join(L) + "\n")
print(tail)
sys.exit(0 if failed == 0 and passed > 0 else 1)
