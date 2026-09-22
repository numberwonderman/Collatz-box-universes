"""
collatz_oeis_matching.py

Computes, for every n from 1 to 200,000, the Collatz (3n+1) total stopping
time (number of steps to reach 1) and the maximum value reached along the
trajectory. Both sequences are written to a CSV file. The first 30 terms of
each sequence -- plus the first 30 terms of two derived "record-breaker"
sequences -- are then queried against the OEIS search API to look for known
matches.

Usage:
    python collatz_oeis_matching.py [--limit N] [--csv PATH] [--no-oeis]

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
        return

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


if __name__ == "__main__":
    main()
