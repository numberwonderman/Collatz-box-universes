"""Run the tests, record pass counts in fibprimes_results.json, and write FIBPRIMES_REPORT.md
using only numbers read from fibprimes_results.json."""
import json
import re
import subprocess
import sys

SHOW_FIRST = 10


def run(args):
    out = subprocess.run([sys.executable, "-m", "pytest", "-q", *args],
                         capture_output=True, text=True).stdout.strip().splitlines()[-1]
    p = int(m.group(1)) if (m := re.search(r"(\d+) passed", out)) else 0
    f = int(m.group(1)) if (m := re.search(r"(\d+) failed", out)) else 0
    return {"passed": p, "failed": f, "summary": out}


mod = run(["tests/test_fibprimes.py"])
full = run(["tests"])

with open("fibprimes_results.json") as f:
    d = json.load(f)
d["tests"] = {"fibprimes_module": mod, "full_suite": full}
with open("fibprimes_results.json", "w") as f:
    json.dump(d, f, indent=1)

pm, p1, p2, p3 = d["primality_method"], d["part1"], d["part2"], d["part3"]
L = []
L.append("# Fibonacci primes F_p, p ≤ 2,000\n")
L.append(f"Convention: {d['convention']}. Every number below is read from `fibprimes_results.json`.\n")
L.append("## Checks\n")
L.append(f"- Fibonacci-prime tests (`pytest tests/test_fibprimes.py`): **{mod['passed']} passed, {mod['failed']} failed** (`{mod['summary']}`).")
L.append(f"- Full suite (`pytest tests`): **{full['passed']} passed, {full['failed']} failed** (`{full['summary']}`).")
for a in d["anchors"]:
    L.append(f"- Anchor: {a['anchor']}: {'holds' if a['holds'] else 'FAILS'}.")
L.append("")
L.append("## Primality test used\n")
L.append(f"- Small numbers: {pm['small']}.")
L.append(f"- Large numbers: {pm['large']}.")
L.append(f"- PARI/GP version: {pm['pari_version']} (bundled with cypari2).")
L.append("- How each F_n was decided: " + "; ".join(f"{k}: {v}" for k, v in pm["method_counts"].items()) + ".")
L.append("- Every composite verdict rests on an explicit divisor or Miller–Rabin witness, and every prime verdict on a proof. Nothing is only a probable prime.\n")
L.append("## Part 1: the hunt\n")
L.append(f"Tested {p1['indices_tested']} indices ({p1['note']}). F_n is prime for these **{len(p1['prime_indices'])}** indices:\n")
L.append(", ".join(map(str, p1["prime_indices"])) + "\n")
L.append("| n | digits of F_n |")
L.append("|---:|---:|")
for n in p1["prime_indices"]:
    L.append(f"| {n} | {p1['prime_index_digits'][str(n)]} |")
L.append("")
L.append("## Part 2: the factor structure\n")
L.append(f"For each of the **{p2['composite_count']}** prime indices p ≤ {p2['p_max']} with F_p composite, the smallest prime factor q was found "
         f"by trial division by every prime below {p2['trial_division_bound']:,} or, failing that, by a full PARI factorisation into proven primes. "
         "Trial division covers all primes, not only those ≡ ±1 (mod p), so the check does not assume the result it tests.\n")
L.append(f"- Violations (q not ≡ ±1 mod p): **{p2['violation_count']}**.")
L.append(f"- q ≡ +1 (mod p): {p2['class_counts']['+1']}; q ≡ −1 (mod p): {p2['class_counts']['-1']}.\n")
L.append(f"First {SHOW_FIRST} composite cases:\n")
L.append("| p | digits of F_p | smallest prime factor q | q mod p | class |")
L.append("|---:|---:|---:|---:|:---:|")
for r in p2["rows"][:SHOW_FIRST]:
    L.append(f"| {r['p']} | {r['digits']} | {r['smallest_prime_factor']} | {r['q_mod_p']} | {r['class'].replace('-', '−')} |")
r0 = p2["rows"][0]
L.append(f"\nThe first case is F_{r0['p']}, with q = {r0['smallest_prime_factor']} ≡ {r0['class'].replace('-', '−')} (mod {r0['p']}).\n")
big = sorted(p2["rows"], key=lambda r: -r["spf_digits"])[:5]
L.append("Composite cases with the largest smallest prime factor:\n")
L.append("| p | digits of F_p | digits of q | q | class | how found | seconds |")
L.append("|---:|---:|---:|---|:---:|---|---:|")
for r in big:
    L.append(f"| {r['p']} | {r['digits']} | {r['spf_digits']} | {r['smallest_prime_factor']} | {r['class'].replace('-', '−')} | {r['method']} | {r['seconds']} |")
L.append("\nThe full table is under `part2.rows` in the results file.\n")
L.append("## Part 3: the gaps\n")
L.append("| from | to | gap |")
L.append("|---:|---:|---:|")
for g in p3["gaps"]:
    L.append(f"| {g['from']} | {g['to']} | {g['gap']} |")
at = ", ".join(f"{g['from']} → {g['to']}" for g in p3["largest_gap_at"])
L.append(f"\n- Largest gap in range: **{p3['largest_gap']}** ({at}).")
L.append(f"- Fibonacci primes with index ≤ 2,000: **{p3['count_le_2000']}**; with index ≤ 500: **{p3['count_le_500']}**.")
L.append("  These counts include n = 4 (F_4 = 3).\n")
L.append("## Reproduce\n")
L.append("```\npip install cypari2 pytest\napt-get install gmp-ecm         # optional but much faster; PARI factor is the fallback\npython run_fibprimes.py          # writes fibprimes_results.json\n"
         "python make_fibprimes_report.py  # runs the tests, records pass counts, writes FIBPRIMES_REPORT.md\n```")
with open("FIBPRIMES_REPORT.md", "w") as f:
    f.write("\n".join(L) + "\n")
print(mod["summary"], "|", full["summary"])
sys.exit(0 if mod["failed"] == full["failed"] == 0 else 1)
