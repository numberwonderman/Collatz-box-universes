#!/usr/bin/env python3
"""
Polynomial continued-fraction hunter (in the style of the Ramanujan Machine).

Searches for continued fractions

    x = a(0) + b(1) / (a(1) + b(2) / (a(2) + b(3) / (a(3) + ...)))

where a(n) and b(n) are integer polynomials in n, and checks whether the
limit x equals one of the target constants (pi, e, zeta(3), Catalan's G,
sqrt(2)) -- either directly or, by default, up to a small Moebius transform
x = (A + B*c) / (C + D*c) with small integers A, B, C, D (this is how the
Ramanujan Machine phrases its hits, e.g. 4/pi or 1 + sqrt(2)).

Evaluation is exact: the convergents p_n/q_n are built with Python integers
via the standard three-term recurrence, and only the final ratio is converted
to a 120-digit mpmath number.

The search is bounded and resumable:
  * candidates are enumerated in a fixed order and identified by an index;
  * every hit is appended (and fsync'd) to hits.jsonl the moment it is found;
  * a checkpoint (next index, counters, runtime) is written periodically and
    on Ctrl-C, so re-running the same command continues where it stopped.

Usage:
    python3 cf_hunter.py                        # degree <= 2, coeffs in [-3, 3]
    python3 cf_hunter.py --max-degree 3 --coeff-range 5 --limit 1000000
    python3 cf_hunter.py --preset zeta3         # cubic a(n), factored b(n) of degree <= 6
    python3 cf_hunter.py --b-degree 6 --b-form factored --a-degree 3 --targets 'zeta(3)'
    python3 cf_hunter.py --count-only           # just report the search size
    python3 cf_hunter.py --fresh                # discard previous progress
"""

import argparse
import itertools
import json
import math
import os
import sys
import time

try:
    from mpmath import mp, mpf, log10, fabs, nint
except ImportError:  # pragma: no cover
    sys.exit("mpmath is required: pip install mpmath")

mp.dps = 120

A_MAX_DEGREE = 3
B_MAX_DEGREE = 6
MAX_COEFF_LIMIT = 10

# Named search configurations; explicit command-line flags override them.
PRESETS = {
    # Apery-like CFs: cubic a(n), b(n) = s * prod (n + r_i) of degree <= 6
    # (covers b(n) = -n^6, -n^3 (n+1)^3, ...), matched against zeta(3) only.
    "zeta3": {
        "targets": "zeta(3)",
        "a_degree": 3, "a_coeff_range": 5,
        "b_degree": 6, "b_form": "factored", "b_shift_range": 1, "b_scale_range": 2,
        "mobius_range": 8,  # known zeta(3) CFs give e.g. 6/zeta(3), 8/(7 zeta(3))
        "out_dir": "cf_hunter_output/zeta3",
    },
}


def target_constants():
    return {
        "pi": +mp.pi,
        "e": +mp.e,
        "zeta(3)": mp.zeta(3),
        "G": +mp.catalan,
        "sqrt(2)": mp.sqrt(2),
    }


# --------------------------------------------------------------------------
# Polynomials
# --------------------------------------------------------------------------

def all_polys(max_degree, coeff_range):
    """All coefficient tuples (c0, c1, ..., c_d) with c_k in [-R, R]."""
    rng = range(-coeff_range, coeff_range + 1)
    return list(itertools.product(rng, repeat=max_degree + 1))


def factored_polys(max_degree, shift_range, scale_range):
    """b(n) = s * (n + r_1) ... (n + r_k), k <= max_degree, 0 <= r_i <= shift_range,
    0 < |s| <= scale_range.  Returns (coefficient tuples, descriptions).

    Negative shifts are left out: they make b vanish at a positive n, which
    terminates the CF at a rational value.
    """
    polys, descs, seen = [], [], set()
    for k in range(max_degree + 1):
        for roots in itertools.combinations_with_replacement(range(shift_range + 1), k):
            for sc in range(-scale_range, scale_range + 1):
                if sc == 0:
                    continue
                coeffs = expand_product(sc, roots, max_degree)
                if coeffs in seen:
                    continue
                seen.add(coeffs)
                polys.append(coeffs)
                descs.append(factored_str(sc, roots))
    return polys, descs


def expand_product(sc, roots, max_degree):
    """Coefficients (constant first) of sc * prod (n + r), padded to max_degree."""
    coeffs = [sc]
    for r in roots:  # new[i] = r * old[i] + old[i - 1]
        old = coeffs + [0]
        coeffs = [r * old[i] + (old[i - 1] if i else 0) for i in range(len(old))]
    return tuple(coeffs + [0] * (max_degree + 1 - len(coeffs)))


def factored_str(sc, roots):
    factors = []
    for r in sorted(set(roots)):
        k = roots.count(r)
        base = "n" if r == 0 else f"(n + {r})"
        factors.append(base if k == 1 else f"{base}^{k}")
    body = " ".join(factors)
    if not body:
        return str(sc)
    if sc == 1:
        return body
    if sc == -1:
        return "-" + body
    return f"{sc} {body}"


def poly_str(coeffs):
    terms = []
    for k in range(len(coeffs) - 1, -1, -1):
        c = coeffs[k]
        if c == 0:
            continue
        mag = abs(c)
        if k == 0:
            body = str(mag)
        else:
            var = "n" if k == 1 else f"n^{k}"
            body = var if mag == 1 else f"{mag}*{var}"
        if not terms:
            terms.append(("-" if c < 0 else "") + body)
        else:
            terms.append(("- " if c < 0 else "+ ") + body)
    return " ".join(terms) if terms else "0"


def poly_values(coeffs, depth):
    return [sum(c * n ** k for k, c in enumerate(coeffs)) for n in range(depth + 1)]


# --------------------------------------------------------------------------
# Target lookup table (Moebius transforms of the constants)
# --------------------------------------------------------------------------

KEY_DIGITS = 30  # digits used for the hash key; hits are then verified fully


def linear_str(A, B, name):
    """Readable form of A + B*name, e.g. 'pi - 3', '-2*e', '4'."""
    if B == 0:
        return str(A)
    head = name if B == 1 else ("-" + name if B == -1 else f"{B}*{name}")
    if A == 0:
        return head
    return f"{head} {'+' if A > 0 else '-'} {abs(A)}"


def mobius_str(A, B, C, D, name):
    num, den = linear_str(A, B, name), linear_str(C, D, name)
    if den == "1":
        return num
    if " " in num:
        num = f"({num})"
    if " " in den or "*" in den:
        den = f"({den})"
    return f"{num} / {den}"


def build_lookup(targets, mobius_range):
    """Map rounded value -> list of (target, relation, transform, exact value).

    Transforms are tried simplest first; one that gives the same value as a
    simpler transform of the same constant (possible for algebraic constants
    such as sqrt(2)) is dropped, so each hit is reported once per constant.
    """
    table = {}
    scale = mpf(10) ** KEY_DIGITS
    if mobius_range == 0:
        transforms = [(0, 1, 1, 0)]
    else:
        rng = range(-mobius_range, mobius_range + 1)
        seen = set()
        transforms = []
        for A, B, C, D in itertools.product(rng, repeat=4):
            if A * D - B * C == 0:
                continue
            g = math.gcd(math.gcd(A, B), math.gcd(C, D))
            t = (A // g, B // g, C // g, D // g)
            # Canonical sign: first nonzero entry of the denominator positive.
            if t[3] < 0 or (t[3] == 0 and t[2] < 0):
                t = tuple(-v for v in t)
            if t not in seen:
                seen.add(t)
                transforms.append(t)
        transforms.sort(key=lambda t: (max(map(abs, t)), sum(map(abs, t)), t[3] != 0))
    for name, c in targets.items():
        for A, B, C, D in transforms:
            v = (A + B * c) / (C + D * c)
            key = int(nint(v * scale))
            bucket = table.setdefault(key, [])
            if any(n == name and match_digits(v, w) >= mp.dps - 10
                   for n, _, _, w in bucket):
                continue
            bucket.append((name, mobius_str(A, B, C, D, name), (A, B, C, D), v))
    return table, len(transforms)


def match_digits(x, v):
    err = fabs(x - v)
    if err == 0:
        return mp.dps
    scale = max(fabs(v), mpf(1))
    return int(min(mp.dps, -log10(err / scale)))


# --------------------------------------------------------------------------
# Continued-fraction evaluation
# --------------------------------------------------------------------------

def evaluate_cf(av, bv, depth, check_depth):
    """Return (p/q at depth, p/q at check_depth) as exact int pairs, or None."""
    p_prev, p = 1, av[0]
    q_prev, q = 0, 1
    check = None
    for n in range(1, depth + 1):
        an, bn = av[n], bv[n]
        p, p_prev = an * p + bn * p_prev, p
        q, q_prev = an * q + bn * q_prev, q
        if n == check_depth:
            check = (p, q)
    return (p, q), check


# --------------------------------------------------------------------------
# Persistence
# --------------------------------------------------------------------------

def atomic_write_json(path, obj):
    tmp = path + ".tmp"
    with open(tmp, "w") as f:
        json.dump(obj, f, indent=2)
        f.flush()
        os.fsync(f.fileno())
    os.replace(tmp, path)


def load_hits(path):
    hits = []
    if os.path.exists(path):
        with open(path) as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    hits.append(json.loads(line))
                except json.JSONDecodeError:
                    pass  # a line truncated by a hard kill; ignore it
    return hits


def hit_key(h):
    return (h["index"], h["target"], h["relation"])


# --------------------------------------------------------------------------
# Main search
# --------------------------------------------------------------------------

def parse_args():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--preset", choices=sorted(PRESETS),
                    help="named configuration (e.g. zeta3); explicit flags override it")
    ap.add_argument("--max-degree", type=int, default=2,
                    help="default max degree for both a(n) and b(n) (default 2)")
    ap.add_argument("--coeff-range", type=int, default=3,
                    help="default coefficient bound R, coefficients in [-R, R] (default 3)")
    ap.add_argument("--a-degree", type=int, help=f"max degree of a(n) (<= {A_MAX_DEGREE})")
    ap.add_argument("--a-coeff-range", type=int, help="coefficient bound for a(n)")
    ap.add_argument("--b-degree", type=int, help=f"max degree of b(n) (<= {B_MAX_DEGREE})")
    ap.add_argument("--b-form", choices=["dense", "factored"],
                    help="dense: every coefficient tuple in [-R, R]; factored: "
                         "b(n) = s * (n + r_1)...(n + r_k) (default dense)")
    ap.add_argument("--b-coeff-range", type=int, help="coefficient bound for dense b(n)")
    ap.add_argument("--b-shift-range", type=int,
                    help="factored b(n): shifts r_i in [0, this] (default 1)")
    ap.add_argument("--b-scale-range", type=int,
                    help="factored b(n): scale s in [-this, this], s != 0 (default 2)")
    ap.add_argument("--targets",
                    help=f"comma-separated subset of {', '.join(target_constants())} "
                         "(default all)")
    ap.add_argument("--depth", type=int, default=300, help="CF depth (default 300)")
    ap.add_argument("--min-digits", type=int, default=60,
                    help="digits of agreement required for a hit (default 60)")
    ap.add_argument("--mobius-range", type=int,
                    help="also match (A+B*c)/(C+D*c) with |A|,|B|,|C|,|D| <= this; "
                         "0 = match the constants exactly (default 4)")
    ap.add_argument("--limit", type=int, default=None,
                    help="stop after this many candidate indices in this run")
    ap.add_argument("--out-dir", help="output directory (default cf_hunter_output)")
    ap.add_argument("--progress-every", type=float, default=10.0,
                    help="seconds between progress lines (default 10)")
    ap.add_argument("--checkpoint-every", type=int, default=2000,
                    help="candidates between checkpoints (default 2000)")
    ap.add_argument("--fresh", action="store_true", help="ignore and overwrite previous progress")
    ap.add_argument("--count-only", action="store_true",
                    help="print the search size and exit")
    args = ap.parse_args()

    defaults = {
        "a_degree": args.max_degree, "a_coeff_range": args.coeff_range,
        "b_degree": args.max_degree, "b_coeff_range": args.coeff_range,
        "b_form": "dense", "b_shift_range": 1, "b_scale_range": 2,
        "targets": ",".join(target_constants()), "out_dir": "cf_hunter_output",
        "mobius_range": 4,
    }
    if args.preset:
        defaults.update(PRESETS[args.preset])
    for k, v in defaults.items():
        if getattr(args, k) is None:
            setattr(args, k, v)

    if not 0 <= args.a_degree <= A_MAX_DEGREE:
        ap.error(f"a(n) degree must be in [0, {A_MAX_DEGREE}]")
    if not 0 <= args.b_degree <= B_MAX_DEGREE:
        ap.error(f"b(n) degree must be in [0, {B_MAX_DEGREE}]")
    for name in ("a_coeff_range", "b_coeff_range", "b_shift_range", "b_scale_range"):
        if not 0 <= getattr(args, name) <= MAX_COEFF_LIMIT:
            ap.error(f"--{name.replace('_', '-')} must be in [0, {MAX_COEFF_LIMIT}]")
    args.targets = [t.strip() for t in args.targets.split(",") if t.strip()]
    unknown = set(args.targets) - set(target_constants())
    if unknown or not args.targets:
        ap.error(f"unknown targets {sorted(unknown)}; choose from "
                 f"{', '.join(target_constants())}")
    if args.depth < 2:
        ap.error("--depth must be >= 2")
    return args


def main():
    args = parse_args()
    a_polys = all_polys(args.a_degree, args.a_coeff_range)
    if args.b_form == "dense":
        b_polys = all_polys(args.b_degree, args.b_coeff_range)
        b_descs = [poly_str(c) for c in b_polys]
        b_space = f"dense, coefficients in [-{args.b_coeff_range}, {args.b_coeff_range}]"
    else:
        b_polys, b_descs = factored_polys(args.b_degree, args.b_shift_range,
                                          args.b_scale_range)
        b_space = (f"s * prod(n + r), r in [0, {args.b_shift_range}], "
                   f"0 < |s| <= {args.b_scale_range}")
    n_a, n_b = len(a_polys), len(b_polys)
    total = n_a * n_b

    print(f"Search space:")
    print(f"  a(n): degree <= {args.a_degree}, coefficients in "
          f"[-{args.a_coeff_range}, {args.a_coeff_range}] -> {n_a:,} polynomials")
    print(f"  b(n): degree <= {args.b_degree}, {b_space} -> {n_b:,} polynomials")
    print(f"  {total:,} candidate (a, b) pairs; targets: {', '.join(args.targets)}")
    print(f"  depth {args.depth}, precision {mp.dps} digits, hit threshold "
          f"{args.min_digits} digits")
    if args.count_only:
        return

    os.makedirs(args.out_dir, exist_ok=True)
    state_path = os.path.join(args.out_dir, "state.json")
    jsonl_path = os.path.join(args.out_dir, "hits.jsonl")
    json_path = os.path.join(args.out_dir, "hits.json")

    config = {
        "a_degree": args.a_degree,
        "a_coeff_range": args.a_coeff_range,
        "b_degree": args.b_degree,
        "b_form": args.b_form,
        "depth": args.depth,
        "min_digits": args.min_digits,
        "mobius_range": args.mobius_range,
        "targets": args.targets,
        "dps": mp.dps,
    }
    if args.b_form == "dense":
        config["b_coeff_range"] = args.b_coeff_range
    else:
        config["b_shift_range"] = args.b_shift_range
        config["b_scale_range"] = args.b_scale_range

    state = {"config": config, "next_index": 0, "tested": 0, "skipped": 0,
             "elapsed_seconds": 0.0, "done": False}
    if args.fresh:
        for p in (state_path, jsonl_path, json_path):
            if os.path.exists(p):
                os.remove(p)
    elif os.path.exists(state_path):
        with open(state_path) as f:
            prev = json.load(f)
        if prev.get("config") != config:
            sys.exit(f"{state_path} was written with a different configuration:\n"
                     f"  {prev.get('config')}\nUse --fresh or a different --out-dir.")
        state.update(prev)
        print(f"Resuming at index {state['next_index']:,} "
              f"({state['tested']:,} tested, {state['skipped']:,} skipped so far)")

    hits = load_hits(jsonl_path)
    known = {hit_key(h) for h in hits}

    def save_state():
        atomic_write_json(state_path, state)
        atomic_write_json(json_path, {"config": config,
                                      "convention": "x = a(0) + b(1)/(a(1) + b(2)/(a(2) + ...))",
                                      "hits": hits})

    if state["done"]:
        print("This search already finished; use --fresh to rerun it.")
        print_summary(state, hits, 0.0, 0)
        return

    targets = {k: v for k, v in target_constants().items() if k in args.targets}
    t0 = time.time()
    lookup, n_transforms = build_lookup(targets, args.mobius_range)
    print(f"  matching against {len(targets)} constants x {n_transforms:,} "
          f"Moebius forms ({len(lookup):,} lookup keys)")

    # Precompute polynomial values and which b(n) terminate the CF early.
    a_values = [poly_values(c, args.depth) for c in a_polys]
    b_values = [poly_values(c, args.depth) for c in b_polys]
    b_ok = [any(v[1:]) and all(v[1:]) for v in b_values]

    key_scale = mpf(10) ** KEY_DIGITS
    check_depth = args.depth - max(1, args.depth // 10)
    start = state["next_index"]
    stop = total if args.limit is None else min(total, start + args.limit)
    print(f"Running indices {start:,} .. {stop:,} of {total:,}\n")

    run_start = time.time()
    last_print = run_start
    base_elapsed = state["elapsed_seconds"]
    tested_this_run = 0
    new_hits = 0
    idx = start
    hits_file = open(jsonl_path, "a")
    try:
        while idx < stop:
            ia, ib = divmod(idx, n_b)
            # b identically zero or vanishing at some n >= 1 terminates the CF,
            # so its value is rational and can never be a target.
            evaluate = b_ok[ib]
            if evaluate:
                (p, q), check = evaluate_cf(a_values[ia], b_values[ib], args.depth, check_depth)
                if q != 0 and check is not None and check[1] != 0:
                    x = mpf(p) / mpf(q)
                    conv = match_digits(x, mpf(check[0]) / mpf(check[1]))
                    if conv >= args.min_digits:
                        key = int(nint(x * key_scale))
                        for k in (key - 1, key, key + 1):
                            for name, relation, mob, v in lookup.get(k, ()):
                                digits = match_digits(x, v)
                                if digits < args.min_digits:
                                    continue
                                a_c, b_c = a_polys[ia], b_polys[ib]
                                hit = {
                                    "index": idx,
                                    "a_n": poly_str(a_c),
                                    "b_n": b_descs[ib],
                                    "a_coeffs": list(a_c),
                                    "b_coeffs": list(b_c),
                                    "target": name,
                                    "relation": f"CF = {relation}",
                                    "mobius": list(mob),
                                    "direct": mob == (0, 1, 1, 0),
                                    "matching_digits": digits,
                                    "converged_digits": conv,
                                    "value": mp.nstr(x, 40),
                                }
                                if hit_key(hit) in known:
                                    continue
                                known.add(hit_key(hit))
                                hits.append(hit)
                                new_hits += 1
                                hits_file.write(json.dumps(hit) + "\n")
                                hits_file.flush()
                                os.fsync(hits_file.fileno())
                                print(f"  HIT #{len(hits)}: a(n) = {hit['a_n']:<16} "
                                      f"b(n) = {hit['b_n']:<18} {hit['relation']}  "
                                      f"[{digits} digits]")

            # Counters advance only once a candidate is fully processed, so an
            # interrupt mid-candidate simply re-runs it on resume.
            idx += 1
            state["next_index"] = idx
            state["tested" if evaluate else "skipped"] += 1
            tested_this_run += evaluate
            if (idx - start) % args.checkpoint_every == 0:
                state["elapsed_seconds"] = base_elapsed + time.time() - run_start
                save_state()
            now = time.time()
            if now - last_print >= args.progress_every:
                last_print = now
                done = idx - start
                rate = done / (now - run_start)
                eta = (stop - idx) / rate if rate else float("inf")
                print(f"[{idx:,}/{total:,} {100.0 * idx / total:5.1f}%] "
                      f"{rate:,.0f} cand/s, hits {len(hits)}, ETA {fmt_time(eta)}",
                      flush=True)
        if idx >= total:
            state["done"] = True
    except KeyboardInterrupt:
        print("\nInterrupted -- saving progress.")
    finally:
        hits_file.close()
        run_time = time.time() - run_start
        state["elapsed_seconds"] = base_elapsed + run_time
        save_state()

    print_summary(state, hits, time.time() - t0, new_hits, tested_this_run)
    print(f"\nHits: {json_path} (incremental log: {jsonl_path})")
    if not state["done"]:
        print("Search incomplete; rerun the same command to resume.")


def fmt_time(s):
    if s == float("inf"):
        return "?"
    s = int(s)
    return f"{s // 3600}h{s % 3600 // 60:02d}m{s % 60:02d}s"


def print_summary(state, hits, run_time, new_hits, tested_this_run=0):
    print("\n=== Summary ===")
    print(f"Candidates tested:   {state['tested']:,} "
          f"(+{state['skipped']:,} skipped as terminating/rational)")
    print(f"  tested this run:   {tested_this_run:,}")
    print(f"Hits found:          {len(hits)} ({new_hits} new this run)")
    by_target = {}
    for h in hits:
        by_target[h["target"]] = by_target.get(h["target"], 0) + 1
    for name, n in sorted(by_target.items()):
        print(f"  {name:<8} {n}")
    print(f"Runtime this run:    {fmt_time(run_time)}")
    print(f"Cumulative runtime:  {fmt_time(state['elapsed_seconds'])}")


if __name__ == "__main__":
    main()
