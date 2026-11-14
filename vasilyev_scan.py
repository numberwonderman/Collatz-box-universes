"""
vasilyev_scan.py — cycle scan for Vasilyev's maps T_S / T^-_S.

    python3 vasilyev_scan.py [limit] [--minus] [--out results.json]

Scans every start 1 <= n < limit (default 1,000,000) for S = {}, {1}, {2,3}, {3}
and prints exactly which cycles were found and how many starts end in each.
Every reported cycle is re-verified by applying the map to each element.
"""
import json
import sys
import time

from vasilyev_maps import T, find_cycles, format_S, normalize_S

SETS = [(), (1,), (2, 3), (3,)]


def main(argv):
    minus = "--minus" in argv
    out = argv[argv.index("--out") + 1] if "--out" in argv else None
    nums = [a for a in argv if a.isdigit()]
    limit = int(nums[0]) if nums else 1_000_000
    name = "T^-" if minus else "T"
    results = []
    for S in SETS:
        t0 = time.time()
        r = find_cycles(limit, S, minus)
        dt = time.time() - t0
        fs = normalize_S(S)
        for cyc in r.cycles:  # independent re-check of each cycle
            assert all(T(v, fs, minus) == cyc[(i + 1) % len(cyc)] for i, v in enumerate(cyc)), cyc
            assert cyc[0] == min(cyc) and len(set(cyc)) == len(cyc)
        assert sum(r.cycles.values()) + len(r.unresolved) == limit - 1
        print(f"\n{name}_S, S = {format_S(S)}: starts 1 <= n < {limit:,}  ({dt:.1f} s)")
        print(f"  distinct cycles found: {len(r.cycles)}   unresolved starts: {len(r.unresolved)}")
        for cyc, cnt in sorted(r.cycles.items()):
            print(f"  min {cyc[0]:>4}  length {len(cyc):>3}  starts ending here: {cnt:>9,} "
                  f"({100 * cnt / (limit - 1):.4f}%)\n      {cyc}")
        print(f"  longest walk before dropping below its start / closing a cycle: {r.max_steps_seen:,} steps")
        print(f"  largest value met: {r.max_value.bit_length()} bits (from start {r.max_value_start:,})")
        results.append({
            "map": name, "S": list(S), "limit": limit, "seconds": round(dt, 1),
            "cycles": [{"min": c[0], "length": len(c), "elements": list(c), "starts": n}
                       for c, n in sorted(r.cycles.items())],
            "unresolved": r.unresolved, "max_walk_steps": r.max_steps_seen,
            "max_value_bits": r.max_value.bit_length(), "max_value_start": r.max_value_start,
        })
    if out:
        with open(out, "w") as f:
            json.dump(results, f, indent=1)
        print(f"\nwrote {out}")


if __name__ == "__main__":
    main(sys.argv[1:])
