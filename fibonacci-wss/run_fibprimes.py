"""Fibonacci-prime study. Writes fibprimes_results.json.

Exit codes: 2 anchor failure; 5 Part 1 list does not begin 3, 4, 5, 7, 11, 13, 17, 23, 29;
6 a composite F_p (p <= 500) whose smallest prime factor is not ≡ ±1 (mod p).
"""
import json
import sys
import time
from multiprocessing import Pool

from wss.fib import primes_below
from wss.fibprimes import (COMPOSITE_ANCHOR, DIVISIBILITY_ANCHOR, EXPECTED_PREFIX,
                           PRIME_ANCHORS, fib, prove_prime, smallest_prime_factor)

N_MAX = 2000
WORKERS = 4


def factor_case(p):
    F = fib(p)
    t = time.time()
    q, how = smallest_prime_factor(F)
    r = q % p
    cls = "+1" if r == 1 else "-1" if r == p - 1 else None
    return {"p": p, "digits": len(str(F)), "smallest_prime_factor": str(q),
            "spf_digits": len(str(q)), "q_mod_p": r, "class": cls, "method": how,
            "seconds": round(time.time() - t, 2)}

FACTOR_MAX = 500


def stop(code, msg):
    print(msg + " STOPPING.")
    sys.exit(code)


def check_anchors():
    out = []
    for n, v in PRIME_ANCHORS:
        ok = fib(n) == v and prove_prime(v)[0]
        out.append({"anchor": f"F_{n} = {v} is prime", "holds": ok})
        if not ok:
            stop(2, f"ANCHOR FAILURE: F_{n} = {fib(n)} (expected prime {v}).")
    n, v, (a, b) = COMPOSITE_ANCHOR
    ok = fib(n) == v == a * b and prove_prime(a)[0] and prove_prime(b)[0] and not prove_prime(v)[0]
    out.append({"anchor": f"F_{n} = {v} = {a} x {b} is composite", "holds": ok})
    if not ok:
        stop(2, f"ANCHOR FAILURE: F_{n} = {fib(n)}, expected {a} x {b}.")
    d, n, fn, cof = DIVISIBILITY_ANCHOR
    ok = fib(n) == fn == fib(d) * cof
    out.append({"anchor": f"F_{d} = {fib(d)} divides F_{n} = {fn} = {fib(d)} x {cof}", "holds": ok})
    if not ok:
        stop(2, f"ANCHOR FAILURE: F_{d} does not divide F_{n} as expected.")
    print("All anchors hold.")
    return out


def main():
    anchors = check_anchors()

    # Part 1: every prime index p <= N_MAX, plus n = 4.
    indices = sorted(primes_below(N_MAX + 1) + [4])
    tested, prime_indices, methods = [], [], {}
    t0 = time.time()
    for n in indices:
        F = fib(n)
        is_p, how = prove_prime(F)
        key = "Miller-Rabin witness" if how.startswith("Miller-Rabin witness") else how
        methods[key] = methods.get(key, 0) + 1
        tested.append({"n": n, "digits": len(str(F)), "prime": is_p, "method": how})
        if is_p:
            prime_indices.append(n)
    t1 = time.time()
    if prime_indices[:len(EXPECTED_PREFIX)] != EXPECTED_PREFIX:
        stop(5, f"PART 1 LIST MISMATCH: begins {prime_indices[:len(EXPECTED_PREFIX)]}, expected {EXPECTED_PREFIX}.")
    print(f"Part 1: {len(indices)} indices tested in {t1 - t0:.1f}s; prime indices: {prime_indices}")

    # Part 2: smallest prime factor of composite F_p, p prime <= FACTOR_MAX.
    todo = [r["n"] for r in tested
            if r["n"] <= FACTOR_MAX and r["n"] != 4 and not r["prime"] and fib(r["n"]) > 1]
    factor_rows, violations = [], []
    with Pool(WORKERS) as pool:
        for rec in pool.imap(factor_case, todo):
            print(f"  p={rec['p']}: q has {rec['spf_digits']} digits, class {rec['class']}, "
                  f"{rec['method']}, {rec['seconds']}s", flush=True)
            factor_rows.append(rec)
            if rec["class"] is None:
                violations.append(rec)
                with open("FIBPRIMES_VIOLATION.json", "w") as f:
                    json.dump(rec, f, indent=1)
                pool.terminate()
                stop(6, f"VIOLATION: p = {rec['p']}: smallest prime factor {rec['smallest_prime_factor']} "
                        f"of F_{rec['p']} is {rec['q_mod_p']} mod {rec['p']}, not ±1.")
    print(f"Part 2: {len(factor_rows)} composite F_p factored, 0 violations.")

    # Part 3: gaps.
    gaps = [{"from": a, "to": b, "gap": b - a} for a, b in zip(prime_indices, prime_indices[1:])]
    gmax = max(g["gap"] for g in gaps)

    results = {
        "convention": "F_1 = F_2 = 1",
        "anchors": anchors,
        "primality_method": {
            "small": "n < 3.317e24: Miller-Rabin with prime bases 2..41 (proven deterministic in this range); "
                     "after trial division by the first 20 primes",
            "large": "Miller-Rabin with the first 20 prime bases as a compositeness filter (a witness proves "
                     "compositeness); every survivor proven prime by PARI/GP isprime (APRCL) and an ECPP "
                     "certificate from primecert verified by primecertisvalid",
            "pari_version": ".".join(str(x) for x in __import__("wss.fibprimes", fromlist=["_pari"])._pari()("version()")),
            "method_counts": methods,
        },
        "part1": {"n_max": N_MAX, "indices_tested": len(indices),
                  "note": "every prime p <= 2000 plus n = 4; F_2 = 1 is not prime",
                  "prime_indices": prime_indices,
                  "prime_index_digits": {str(r["n"]): r["digits"] for r in tested if r["prime"]},
                  "seconds": round(t1 - t0, 1),
                  "rows": tested},
        "part2": {"p_max": FACTOR_MAX,
                  "composite_count": len(factor_rows),
                  "violation_count": len(violations),
                  "violations": violations,
                  "class_counts": {"+1": sum(r["class"] == "+1" for r in factor_rows),
                                   "-1": sum(r["class"] == "-1" for r in factor_rows)},
                  "trial_division_bound": 1_000_000,
                  "factoring_tools": "trial division; GMP-ECM (ecm binary); PARI factor (factor_proven=1) as fallback",
                  "rows": factor_rows},
        "part3": {"gaps": gaps, "largest_gap": gmax,
                  "largest_gap_at": [g for g in gaps if g["gap"] == gmax],
                  "count_le_2000": sum(1 for n in prime_indices if n <= 2000),
                  "count_le_500": sum(1 for n in prime_indices if n <= 500)},
    }
    with open("fibprimes_results.json", "w") as f:
        json.dump(results, f, indent=1)
    print("Wrote fibprimes_results.json")


if __name__ == "__main__":
    main()
