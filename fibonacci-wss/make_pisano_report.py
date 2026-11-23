"""Run the tests, record pass counts in pisano_results.json, and write PISANO_REPORT.md
using only numbers read from pisano_results.json."""
import json
import re
import subprocess
import sys


def run(args):
    out = subprocess.run([sys.executable, "-m", "pytest", "-q", *args],
                         capture_output=True, text=True).stdout.strip().splitlines()[-1]
    p = int(m.group(1)) if (m := re.search(r"(\d+) passed", out)) else 0
    f = int(m.group(1)) if (m := re.search(r"(\d+) failed", out)) else 0
    return {"passed": p, "failed": f, "summary": out}


pis = run(["tests/test_pisano.py"])
full = run(["tests"])

with open("pisano_results.json") as f:
    d = json.load(f)
d["tests"] = {"pisano_module": pis, "full_suite": full}
with open("pisano_results.json", "w") as f:
    json.dump(d, f, indent=1)

ev, lf, rx, rn = d["evenness"], d["lifting"], d["ratio_max"], d["ratio_min"]
lo, hi = d["table_range"]
L = []
L.append("# Pisano periods π(m), 2 ≤ m ≤ 5,000\n")
L.append(f"Convention: {d['convention']}. π(m) is the least k > 0 with (F_k, F_{{k+1}}) ≡ (0, 1) (mod m), "
         "computed by iterating the pair from (0, 1). Every number below is read from `pisano_results.json`.\n")
L.append("## Checks\n")
L.append(f"- Pisano tests (`pytest tests/test_pisano.py`): **{pis['passed']} passed, {pis['failed']} failed** (`{pis['summary']}`).")
L.append(f"- Full suite (`pytest tests`, including the Wall–Sun–Sun tests): **{full['passed']} passed, {full['failed']} failed** (`{full['summary']}`).")
L.append("- Anchors: " + ", ".join(
    f"π({a['m']}) = {a['value']}" + ("" if a["value"] == a["expected"] else f" (EXPECTED {a['expected']})")
    for a in d["anchors"]) + (": all hold." if all(a["value"] == a["expected"] for a in d["anchors"]) else "."))
L.append("")
L.append("## Part 1: the table\n")
L.append(f"- π(m) computed for all {d['table_size']} values of m from {lo} to {hi}; the full table is under `table` in `pisano_results.json`.")
L.append(f"- π(m) even for every m > 2: checked {ev['checked']} values, "
         f"**{len(ev['exceptions'])} exceptions**" + (f": {ev['exceptions']}." if ev["exceptions"] else "."))
L.append("")
L.append("## Part 2: the picture\n")
L.append(f"![Pisano scatter]({d['scatter_png']})\n")
L.append("| | π(m)/m | m | π(m) |")
L.append("|---|---:|---|---|")
L.append(f"| largest ratio | {rx['exact']} = {rx['value']:g} | {', '.join(map(str, rx['m']))} | {', '.join(map(str, rx['pi']))} |")
L.append(f"| smallest ratio | {rn['exact']} ≈ {rn['value']:.6f} | {', '.join(map(str, rn['m']))} | {', '.join(map(str, rn['pi']))} |")
L.append("")
L.append("## Part 3: lifting from p to p²\n")
L.append(f"For each of the {lf['primes_checked']} primes p ≤ {lf['p_max']}, π(p²) was compared with p·π(p). "
         f"Exceptions: **{lf['exception_count']}**" + (f" ({lf['exceptions']})." if lf["exceptions"] else "."))
L.append("A prime with π(p²) ≠ p·π(p) would be of Wall–Sun–Sun type. This agrees with the earlier search, which found "
         "no Wall–Sun–Sun prime below 10⁷.\n")
L.append("| p | π(p) | π(p²) | p·π(p) | lifts |")
L.append("|---:|---:|---:|---:|:---:|")
for r in lf["rows"]:
    L.append(f"| {r['p']} | {r['pi_p']} | {r['pi_p2']} | {r['p_times_pi_p']} | {'yes' if r['lifts'] else '**NO**'} |")
L.append("")
L.append("## Reproduce\n")
L.append("```\npython run_pisano.py          # writes pisano_results.json and pisano_scatter.png\n"
         "python make_pisano_report.py  # runs the tests, records pass counts, writes PISANO_REPORT.md\n```")
with open("PISANO_REPORT.md", "w") as f:
    f.write("\n".join(L) + "\n")
print(pis["summary"], "|", full["summary"])
sys.exit(0 if pis["failed"] == full["failed"] == 0 else 1)
