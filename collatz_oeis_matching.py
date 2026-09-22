"""
collatz_oeis_matching.py

Computes, for every n from 1 to 200,000, the Collatz (3n+1) total stopping
time (number of steps to reach 1) and the maximum value reached along the
trajectory. Both sequences are written to a CSV file. The first 30 terms of
each sequence -- plus the first 30 terms of two derived "record-breaker"
sequences -- are then queried against the OEIS search API to look for known
matches.

It also runs a digital-root stress test of an empirical claim from the
OEIS A025586 comments (Guy Chouraqui, 2023): that the digital root of the
maximum value in the Collatz orbit of n is always in {4, 7, 8} for n > 2.
See run_digital_root_experiment() below.

Usage:
    python collatz_oeis_matching.py [--limit N] [--csv PATH] [--no-oeis]
                                     [--skip-digital-root]
                                     [--dr-base-limit N] [--dr-attack-limit N]
                                     [--dr-report PATH] [--dr-counterexamples-csv PATH]

Requires the `requests` package in addition to the standard library.
"""

import argparse
import csv
import sys
import time
from urllib.parse import quote

import requests

OEIS_SEARCH_URL = "https://oeis.org/search"
USER_AGENT = "collatz-box-universes/1.0 (OEIS matching script; contact via GitHub repo)"
QUERY_TERMS = 30
DEFAULT_LIMIT = 200_000
DEFAULT_CSV = "collatz_stopping_times.csv"
POLITE_DELAY_SECONDS = 3

DR_ALLOWED = (4, 7, 8)
DR_CONJECTURE_STATEMENT = (
    "For every n > 2, the digital root of the maximum value in the Collatz "
    "orbit of n is always 7 or a multiple of 4, i.e. in {4, 7, 8} "
    "(OEIS A025586 comments, Guy Chouraqui, 2023)."
)
DEFAULT_DR_BASE_LIMIT = 200_000
DEFAULT_DR_ATTACK_LIMIT = 10_000_000
DEFAULT_DR_REPORT = "digital_root_report.txt"
DEFAULT_DR_COUNTEREXAMPLES_CSV = "digital_root_counterexamples.csv"


def compute_collatz_stats(limit):
    """
    Compute total stopping time and max trajectory value for every n in
    [1, limit], using memoization so previously-computed suffixes of a
    trajectory are reused instead of recomputed.

    Returns two dicts: stopping_time[n], max_value[n].
    """
    stopping_time = {1: 0}
    max_value = {1: 1}

    for start in range(1, limit + 1):
        if start in stopping_time:
            continue

        path = []
        current = start
        while current not in stopping_time:
            path.append(current)
            if current % 2 == 0:
                current //= 2
            else:
                current = 3 * current + 1

        next_val = current
        for val in reversed(path):
            stopping_time[val] = stopping_time[next_val] + 1
            max_value[val] = max(val, max_value[next_val])
            next_val = val

    return stopping_time, max_value


def write_csv(path, limit, stopping_time, max_value):
    with open(path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["n", "stopping_time", "max_value"])
        for n in range(1, limit + 1):
            writer.writerow([n, stopping_time[n], max_value[n]])


def record_breakers(limit, values_by_n):
    """
    Return the list of n (in increasing order, starting at n=1) for which
    values_by_n[n] strictly exceeds every values_by_n[k] for k < n.
    """
    breakers = []
    best = float("-inf")
    for n in range(1, limit + 1):
        v = values_by_n[n]
        if v > best:
            best = v
            breakers.append(n)
    return breakers


def overlap_length(query_terms, data_terms):
    """
    Best-alignment count of how many consecutive query_terms match a
    contiguous run within data_terms.
    """
    best = 0
    for i in range(len(data_terms)):
        run = 0
        while (
            i + run < len(data_terms)
            and run < len(query_terms)
            and data_terms[i + run] == query_terms[run]
        ):
            run += 1
        best = max(best, run)
    return best


def digital_root(k):
    """
    Repeated digit sum of k until a single digit remains (the digital root).
    Equivalent to 1 + (k - 1) % 9 for k > 0.
    """
    if k == 0:
        return 0
    return 1 + (k - 1) % 9


def digital_root_stats(max_value, start_n, limit, allowed=DR_ALLOWED):
    """
    For every n in [start_n, limit], compute digital_root(max_value[n]).

    Returns (counts, counterexamples):
      counts: dict mapping digital root 1..9 -> occurrence count
      counterexamples: list of (n, max_value, digital_root) tuples for which
                        the digital root is NOT in `allowed`, in increasing n
    """
    counts = {d: 0 for d in range(1, 10)}
    counterexamples = []
    for n in range(start_n, limit + 1):
        mv = max_value[n]
        d = digital_root(mv)
        counts[d] += 1
        if d not in allowed:
            counterexamples.append((n, mv, d))
    return counts, counterexamples


def format_distribution_table(counts, total):
    lines = [f"{'Digital root':<14}{'Count':>12}{'Percent':>10}   "]
    for d in range(1, 10):
        c = counts[d]
        pct = 100.0 * c / total if total else 0.0
        marker = "<-- allowed by conjecture" if d in DR_ALLOWED else ""
        lines.append(f"{d:<14}{c:>12}{pct:>9.3f}%   {marker}")
    return "\n".join(lines)


def write_counterexamples_csv(path, counterexamples):
    with open(path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["n", "max_value", "digital_root"])
        writer.writerows(counterexamples)


def run_digital_root_experiment(base_limit, attack_limit, report_path, counterexamples_csv):
    """
    Test the digital-root conjecture (see DR_CONJECTURE_STATEMENT) against
    real Collatz data:
      1. A "base run" over n = 3..base_limit, printing every counterexample.
      2. An "attack phase" pushing the range as far as attack_limit,
         reporting counterexample density and runtime.
      3. A targeted check of all record-holder n (A006877 stopping-time
         records UNION A006884 max-value records) within attack_limit.

    Writes a full report to report_path and, if any counterexamples are
    found in the attack phase, the complete list to counterexamples_csv
    (that list can be very large, so it is not printed to the console).
    """
    print("\n" + "=" * 78)
    print("DIGITAL ROOT EXPERIMENT")
    print("=" * 78)
    print(DR_CONJECTURE_STATEMENT)

    report = []
    report.append("DIGITAL ROOT CONJECTURE TEST")
    report.append("=" * 78)
    report.append("")
    report.append("Conjecture:")
    report.append(f"  {DR_CONJECTURE_STATEMENT}")
    report.append("")

    # One big memoized computation covers both the base run and the attack
    # phase; the base run is simply a filtered slice of the same data.
    print(f"\nComputing Collatz stats for n = 1..{attack_limit} (this covers both "
          f"the base run and the attack phase) ...")
    t_compute0 = time.time()
    stopping_time, max_value = compute_collatz_stats(attack_limit)
    compute_time = time.time() - t_compute0
    print(f"  done in {compute_time:.2f}s")

    # --- Base run: n = 3..base_limit ---
    print(f"\n--- Base run: n = 3..{base_limit} ---")
    t0 = time.time()
    base_counts, base_counterexamples = digital_root_stats(max_value, 3, base_limit)
    base_analysis_time = time.time() - t0
    base_total = base_limit - 2

    print(f"Analysis time: {base_analysis_time:.2f}s")
    print(f"Counterexamples found: {len(base_counterexamples)} / {base_total}")
    if base_counterexamples:
        print(f"Listing ALL {len(base_counterexamples)} counterexamples in n = 3..{base_limit}:")
        for n, mv, d in base_counterexamples:
            print(f"  n={n:<10} max_value={mv:<14} digital_root={d}")
    else:
        print("No counterexamples found in this range.")

    print(f"\nDigital root distribution (n = 3..{base_limit}):")
    print(format_distribution_table(base_counts, base_total))

    report.append(f"BASE RUN: n = 3..{base_limit}")
    report.append("-" * 78)
    report.append(f"Analysis time: {base_analysis_time:.2f}s")
    report.append(f"Counterexamples found: {len(base_counterexamples)} / {base_total}")
    if base_counterexamples:
        report.append(f"Full counterexample list ({len(base_counterexamples)} entries):")
        for n, mv, d in base_counterexamples:
            report.append(f"  n={n} max_value={mv} digital_root={d}")
    else:
        report.append("No counterexamples found.")
    report.append("")
    report.append("Digital root distribution:")
    report.append(format_distribution_table(base_counts, base_total))
    report.append("")

    # --- Attack phase: n = 3..attack_limit ---
    print(f"\n--- Attack phase: n = 3..{attack_limit} ---")
    t1 = time.time()
    attack_counts, attack_counterexamples = digital_root_stats(max_value, 3, attack_limit)
    attack_analysis_time = time.time() - t1
    attack_total = attack_limit - 2

    print(f"Analysis time: {attack_analysis_time:.2f}s")
    print(f"Counterexamples found: {len(attack_counterexamples)} / {attack_total} "
          f"({100.0 * len(attack_counterexamples) / attack_total:.3f}%)")

    if attack_counterexamples:
        first_n, first_mv, first_d = attack_counterexamples[0]
        print(f"First counterexample overall: n={first_n}, max_value={first_mv}, "
              f"digital_root={first_d}")
        write_counterexamples_csv(counterexamples_csv, attack_counterexamples)
        print(f"Full list of {len(attack_counterexamples)} counterexamples written to "
              f"{counterexamples_csv} (too large to print to console).")
    else:
        print("No counterexamples found in this range either.")

    print(f"\nDigital root distribution (n = 3..{attack_limit}):")
    print(format_distribution_table(attack_counts, attack_total))

    # --- Record-holder verification (A006877 UNION A006884) ---
    print("\n--- Record-holder verification (A006877 stopping-time records "
          "UNION A006884 max-value records) ---")
    st_breakers = record_breakers(attack_limit, stopping_time)
    mv_breakers = record_breakers(attack_limit, max_value)
    record_ns = sorted(n for n in set(st_breakers) | set(mv_breakers) if n >= 3)
    record_violations = [
        (n, max_value[n], digital_root(max_value[n]))
        for n in record_ns
        if digital_root(max_value[n]) not in DR_ALLOWED
    ]
    print(f"Record-holder n-values checked: {len(record_ns)} "
          f"({len(st_breakers)} stopping-time records, {len(mv_breakers)} max-value records)")
    print(f"Record-holder violations: {len(record_violations)}")
    if record_violations:
        print("Violating record-holders:")
        for n, mv, d in record_violations:
            print(f"  n={n:<10} max_value={mv:<14} digital_root={d}")

    total_runtime = compute_time + base_analysis_time + attack_analysis_time

    report.append(f"ATTACK PHASE: n = 3..{attack_limit}")
    report.append("-" * 78)
    report.append(f"Collatz compute time (n=1..{attack_limit}): {compute_time:.2f}s")
    report.append(f"Digital-root analysis time: {attack_analysis_time:.2f}s")
    report.append(f"Total runtime (compute + both analysis passes): {total_runtime:.2f}s")
    report.append(f"Counterexamples found: {len(attack_counterexamples)} / {attack_total} "
                   f"({100.0 * len(attack_counterexamples) / attack_total:.3f}%)")
    if attack_counterexamples:
        first_n, first_mv, first_d = attack_counterexamples[0]
        report.append(f"First counterexample overall: n={first_n}, max_value={first_mv}, "
                       f"digital_root={first_d}")
        report.append(f"Full counterexample list ({len(attack_counterexamples)} rows) "
                       f"saved to: {counterexamples_csv}")
    else:
        report.append("No counterexamples found.")
    report.append("")
    report.append("Digital root distribution:")
    report.append(format_distribution_table(attack_counts, attack_total))
    report.append("")
    report.append("Record-holder verification (A006877 stopping-time records "
                   "UNION A006884 max-value records):")
    report.append(f"  Record-holder n-values checked: {len(record_ns)} "
                   f"({len(st_breakers)} stopping-time records, {len(mv_breakers)} max-value records)")
    report.append(f"  Violations: {len(record_violations)}")
    if record_violations:
        report.append("  Violating record-holders:")
        for n, mv, d in record_violations:
            report.append(f"    n={n} max_value={mv} digital_root={d}")
    report.append("")

    absent = [d for d in range(1, 10) if attack_counts[d] == 0]
    dominant = max(attack_counts, key=attack_counts.get)
    report.append("Notes on distribution:")
    if absent:
        report.append(f"  Digital roots never observed: {absent}")
    else:
        report.append("  All nine digital roots (1-9) occur at least once -- the "
                       "conjecture's restriction to {4, 7, 8} does not hold in general.")
    report.append(f"  Most common digital root: {dominant} "
                   f"({attack_counts[dominant]} occurrences, "
                   f"{100.0 * attack_counts[dominant] / attack_total:.2f}% of all n tested).")
    report.append("")

    report.append("VERDICT")
    report.append("-" * 78)
    if attack_counterexamples:
        first_n, first_mv, first_d = attack_counterexamples[0]
        verdict = (
            f"COUNTEREXAMPLE FOUND at n={first_n} "
            f"(max orbit value={first_mv}, digital_root={first_d}, not in {{4,7,8}}). "
            f"The conjecture is FALSE, refuted well within n <= {attack_limit}: "
            f"{len(attack_counterexamples)} counterexamples found "
            f"({100.0 * len(attack_counterexamples) / attack_total:.3f}% of n tested)."
        )
    else:
        verdict = f"Conjecture confirmed to n = {attack_limit} (no counterexamples found)."
    report.append(verdict)
    print("\n" + "=" * 78)
    print("VERDICT:", verdict)
    print("=" * 78)

    with open(report_path, "w") as f:
        f.write("\n".join(report) + "\n")
    print(f"\nFull report written to {report_path}")

    return verdict


def query_oeis(terms, session):
    """
    Query the OEIS search API for the given list of integer terms.
    Returns a list of dicts: {"number": "A......", "name": ..., "overlap": N}.
    Returns an empty list on no match or on request failure.
    """
    query = ",".join(str(t) for t in terms)
    url = f"{OEIS_SEARCH_URL}?q={quote(query)}&fmt=json"

    try:
        resp = session.get(url, timeout=30)
        resp.raise_for_status()
        payload = resp.json()
    except (requests.RequestException, ValueError) as exc:
        print(f"  [warning] OEIS query failed: {exc}", file=sys.stderr)
        return []

    if not payload:
        return []

    matches = []
    for result in payload:
        a_number = f"A{result.get('number'):06d}" if isinstance(result.get("number"), int) else str(result.get("number"))
        name = result.get("name", "")
        data_str = result.get("data", "")
        data_terms = [int(x) for x in data_str.split(",") if x.strip()]
        overlap = overlap_length(terms, data_terms)
        matches.append({"number": a_number, "name": name, "overlap": overlap})

    return matches


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=int, default=DEFAULT_LIMIT,
                         help=f"Largest n to compute (default {DEFAULT_LIMIT})")
    parser.add_argument("--csv", default=DEFAULT_CSV,
                         help=f"Output CSV path (default {DEFAULT_CSV})")
    parser.add_argument("--no-oeis", action="store_true",
                         help="Skip OEIS lookups (CSV only)")
    parser.add_argument("--skip-digital-root", action="store_true",
                         help="Skip the digital-root conjecture experiment")
    parser.add_argument("--dr-base-limit", type=int, default=DEFAULT_DR_BASE_LIMIT,
                         help=f"Digital-root base-run limit (default {DEFAULT_DR_BASE_LIMIT})")
    parser.add_argument("--dr-attack-limit", type=int, default=DEFAULT_DR_ATTACK_LIMIT,
                         help=f"Digital-root attack-phase limit (default {DEFAULT_DR_ATTACK_LIMIT})")
    parser.add_argument("--dr-report", default=DEFAULT_DR_REPORT,
                         help=f"Digital-root report output path (default {DEFAULT_DR_REPORT})")
    parser.add_argument("--dr-counterexamples-csv", default=DEFAULT_DR_COUNTEREXAMPLES_CSV,
                         help=f"Digital-root counterexamples CSV path (default {DEFAULT_DR_COUNTEREXAMPLES_CSV})")
    args = parser.parse_args()

    print(f"Computing Collatz stopping times and max values for n = 1..{args.limit} ...")
    t0 = time.time()
    stopping_time, max_value = compute_collatz_stats(args.limit)
    print(f"  done in {time.time() - t0:.1f}s")

    print(f"Writing CSV to {args.csv} ...")
    write_csv(args.csv, args.limit, stopping_time, max_value)

    print("Computing record-breaker sequences ...")
    stopping_time_breakers = record_breakers(args.limit, stopping_time)
    max_value_breakers = record_breakers(args.limit, max_value)

    sequences = {
        "Total stopping time (n=1..)": [stopping_time[n] for n in range(1, QUERY_TERMS + 1)],
        "Max trajectory value (n=1..)": [max_value[n] for n in range(1, QUERY_TERMS + 1)],
        "Record-breaking n for stopping time": stopping_time_breakers[:QUERY_TERMS],
        "Record-breaking n for max value": max_value_breakers[:QUERY_TERMS],
    }

    if args.no_oeis:
        print("Skipping OEIS lookups (--no-oeis).")
    else:
        all_matches = {}
        with requests.Session() as session:
            session.headers.update({"User-Agent": USER_AGENT})
            seq_names = list(sequences.keys())
            for i, name in enumerate(seq_names):
                terms = sequences[name]
                print(f"Querying OEIS for: {name} -> {terms[:10]}...")
                matches = query_oeis(terms, session)
                all_matches[name] = matches
                if i < len(seq_names) - 1:
                    time.sleep(POLITE_DELAY_SECONDS)

        print("\n=== OEIS Match Summary ===")
        header = f"{'Sequence':<38} {'A-number':<10} {'Overlap':<8} Name"
        print(header)
        print("-" * len(header))
        any_matches = False
        for name, matches in all_matches.items():
            if not matches:
                print(f"{name:<38} {'--':<10} {'--':<8} (no matches)")
                continue
            matches_sorted = sorted(matches, key=lambda m: m["overlap"], reverse=True)
            for m in matches_sorted:
                any_matches = True
                print(f"{name:<38} {m['number']:<10} {m['overlap']:<8} {m['name']}")

        if not any_matches:
            print("\nNo OEIS matches found for any sequence.")

    if args.skip_digital_root:
        print("Skipping digital-root experiment (--skip-digital-root).")
        return

    run_digital_root_experiment(
        base_limit=args.dr_base_limit,
        attack_limit=args.dr_attack_limit,
        report_path=args.dr_report,
        counterexamples_csv=args.dr_counterexamples_csv,
    )


if __name__ == "__main__":
    main()
