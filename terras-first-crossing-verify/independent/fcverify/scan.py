"""Step 3(a): scan every odd n with 3 <= n <= N (default 10^6) and, independently,
every first-crossing word up to length K.

For each odd n (pointwise):
  P1  a first crossing exists; rho_k in [1/2, 1) i.e. 2^{k-1} <= 3^d < 2^k; last step even
  P2  2^k T^k(n) = 3^d n + C_w with C_w computed from the word alone           (eq. 1)
  P3  the run formula (2) for M_w reproduces C_w exactly
  P4  M_w < s and M_w <= d/3                                                   (eq. 3)
  P5  word class mod 2^k (built from the word alone) equals n mod 2^k        (Remark 2)
  P6  Lemma 5 per run: 2^l | x+1,  x+1 <= (n+1)(3/2)^D,  2^l <= (n+1)(3/2)^D
  P7  initial squares UU: (4/3)^{|U|} < n+1                                  (Prop. 10)
  MAIN  T^k(n) < n  (descent at the first crossing), recorded against s = #runs.
For each DISTINCT first-crossing word met (class level):
  W1  r(w)(2^k - 3^d) > C_w, i.e. every eligible realizer of w descends.
Exhaustive (all first-crossing words of length <= K, not only those met by small seeds):
  W1 again for every such word.
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from collections import Counter
from multiprocessing import Pool

from . import core


def check_seed(n: int):
    c = core.first_crossing(n)
    w, k, d = c.word, c.k, c.d
    s = core.num_runs(w)
    p3 = 3 ** d
    bad = []
    if not ((1 << (k - 1)) <= p3 < (1 << k)) or w[-1] != "0":
        bad.append("P1")
    kk, dd, C = core.correction(w)
    if (kk, dd) != (k, d) or (1 << k) * c.end != p3 * n + C:
        bad.append("P2")
    if core.correction_by_runs_times_3d(w) != C:
        bad.append("P3")
    if not (C < s * p3 and 3 * C <= d * p3):
        bad.append("P4")
    if core.word_class(w) != n % (1 << k):
        bad.append("P5")
    if not core.lemma5_run_bounds_hold(n, w):
        bad.append("P6")
    sq = core.initial_square_lengths(w)
    if any(4 ** l >= 3 ** l * (n + 1) for l in sq):
        bad.append("P7")
    return n, k, d, s, c.descends, c.end, w, bad, len(sq)


def _chunk(args):
    lo, hi = args
    out = []
    for n in range(lo | 1, hi, 2):
        if n < 3:
            continue
        out.append(check_seed(n))
    return out


def enumerate_words(K: int, start=("", 0, 0, 0, 0), stop_at=None):
    """Depth-first enumeration of every first-crossing word of length <= K, carrying
    (j, d, class residue r mod 2^j, y = T^j(r), C_j).  Yields (word, r, d, C).
    With stop_at=P, uncrossed prefixes of length P are yielded as ("PREFIX", state)
    instead of being expanded (used to split the work across processes)."""
    stack = [start]                  # word, r, y, d, C   (j = len(word))
    while stack:
        w, r, y, d, C = stack.pop()
        j = len(w)
        if j > 0 and 3 ** d < (1 << j):
            yield w, r, d, C
            continue
        if j == K:
            continue
        if stop_at is not None and j == stop_at:
            yield "PREFIX", (w, r, y, d, C)
            continue
        for b in (0, 1):
            rr, yy = r, y
            if (yy & 1) != b:
                rr += 1 << j
                yy += 3 ** d
            if b:
                stack.append((w + "1", rr, (3 * yy + 1) // 2, d + 1, 3 * C + (1 << j)))
            else:
                stack.append((w + "0", rr, yy // 2, d, C))


def _exhaust(args):
    K, start = args
    cnt, fail, runs_h, by_len = 0, [], Counter(), Counter()
    for w, r, d, C in enumerate_words(K, start):
        cnt += 1
        k = len(w)
        by_len[k] += 1
        runs_h[core.num_runs(w)] += 1
        rr = r if r >= 2 else r + (1 << k)
        if not rr * ((1 << k) - 3 ** d) > C:
            fail.append(w)
    return cnt, fail, runs_h, by_len


def exhaustive(K: int, jobs: int, split: int = 14):
    tasks, leaves = [], []
    for item in enumerate_words(K, stop_at=min(split, K)):
        if item[0] == "PREFIX":
            tasks.append((K, item[1]))
        else:
            leaves.append(item)
    cnt, fail, runs_h, by_len = 0, [], Counter(), Counter()
    for w, r, d, C in leaves:          # words that crossed before the split depth
        cnt += 1; by_len[len(w)] += 1; runs_h[core.num_runs(w)] += 1
        rr = r if r >= 2 else r + (1 << len(w))
        if not rr * ((1 << len(w)) - 3 ** d) > C:
            fail.append(w)
    with Pool(jobs) as pool:
        for c, f, rh, bl in pool.imap_unordered(_exhaust, tasks):
            cnt += c; fail += f; runs_h.update(rh); by_len.update(bl)
    return cnt, fail, runs_h, by_len


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--N", type=int, default=1_000_000)
    ap.add_argument("--K", type=int, default=30, help="exhaustive word length bound")
    ap.add_argument("--jobs", type=int, default=4)
    ap.add_argument("--json", default=None)
    a = ap.parse_args(argv)

    t0 = time.time()
    step = 20_000
    chunks = [(lo, min(lo + step, a.N + 1)) for lo in range(0, a.N + 1, step)]
    n_seeds = 0
    fails_by_check = Counter()
    first_fail = {}
    non_descenders = []
    runs_hist = Counter()
    max_k = (0, None)
    words = {}                      # (k, residue) -> word ; word <-> class is a bijection
    squares = 0
    max_ratio = (0.0, None)         # d / (G_s log2(n+1)), display only
    import math
    alpha = math.log2(3)
    with Pool(a.jobs) as pool:
        for res in pool.imap(_chunk, chunks):
            for n, k, d, s, desc, end, w, bad, nsq in res:
                n_seeds += 1
                runs_hist[s] += 1
                squares += nsq
                if k > max_k[0]:
                    max_k = (k, n)
                for b in bad:
                    fails_by_check[b] += 1
                    first_fail.setdefault(b, n)
                if not desc:
                    non_descenders.append((n, k, d, s, end))
                key = (k, n % (1 << k))
                words.setdefault(key, w)
                G = sum(alpha ** i for i in range(s))
                r = d / (G * math.log2(n + 1))
                if r > max_ratio[0]:
                    max_ratio = (r, n)
    t1 = time.time()

    # class-level check on every distinct word met
    class_fail = [w for w in words.values() if not core.class_descends(w)]
    t2 = time.time()

    # exhaustive enumeration
    ex_count, ex_fail, ex_runs, by_len = exhaustive(a.K, a.jobs)
    t3 = time.time()

    summary = dict(
        N=a.N, odd_seeds_checked=n_seeds, seed_range=f"odd n, 3 <= n <= {a.N}",
        non_descenders=non_descenders,
        pointwise_check_failures=dict(fails_by_check), first_failure=first_fail,
        runs_histogram=dict(sorted(runs_hist.items())), max_runs=max(runs_hist),
        seeds_with_at_most_75_runs=sum(v for s, v in runs_hist.items() if s <= 75),
        max_crossing_time=dict(k=max_k[0], n=max_k[1]),
        initial_squares_examined=squares,
        max_d_over_Gs_L=dict(ratio=max_ratio[0], n=max_ratio[1]),
        distinct_words_met=len(words), distinct_words_failing_class_check=len(class_fail),
        exhaustive_K=a.K, exhaustive_words=ex_count,
        exhaustive_words_by_length=dict(sorted(by_len.items())),
        exhaustive_runs_histogram=dict(sorted(ex_runs.items())),
        exhaustive_failures=ex_fail[:20], exhaustive_failure_count=len(ex_fail),
        seconds=dict(seeds=round(t1 - t0, 1), classes=round(t2 - t1, 1),
                     exhaustive=round(t3 - t2, 1)),
    )
    # n = 1 is excluded by the paper (n >= 2); record its behaviour for transparency.
    c1 = core.first_crossing(1)
    summary["n_equals_1_note"] = dict(word=c1.word, k=c1.k, end=c1.end,
                                      excluded="paper requires n >= 2; r(w) for its class is "
                                      + str(core.least_eligible_realizer(c1.word)))
    js = json.dumps(summary, indent=1)
    print(js)
    if a.json:
        with open(a.json, "w") as f:
            f.write(js + "\n")
    ok = not non_descenders and not fails_by_check and not class_fail and not ex_fail
    print("RESULT:", "ALL CHECKS PASSED" if ok else "EXCEPTIONS FOUND -- SEE ABOVE")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
