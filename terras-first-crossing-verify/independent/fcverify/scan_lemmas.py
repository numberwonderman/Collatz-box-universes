"""Round 2 driver: Lemma 6 / Lemma 7 stress tests on
  (A) every odd seed 3 <= n <= N with its first-crossing word (round-1 data set), and
  (B) every first-crossing word of length <= K, at its least eligible realizer r(w) and at
      r(w) + 2^k,
  (C) the composition inequality used in Lemma 7's proof, for s <= SMAX.
Stops at the first violation (prints it) and exits nonzero."""
from __future__ import annotations

import argparse
import json
import sys
import time
from collections import Counter
from multiprocessing import Pool

from . import core
from . import lemmas as L
from .scan import enumerate_words


def _merge(tot, res):
    for k, (a, v) in res.items():
        x = tot.setdefault(k, [0, 0]); x[0] += a; x[1] += v


def _seeds(args):
    lo, hi = args
    tot, bad, srun = {}, [], Counter()
    for n in range(max(3, lo | 1), hi, 2):
        c = core.first_crossing(n)
        R = L.check_realizer(n, c.word, subsets=True)
        _merge(tot, R["res"]); srun[R["s"]] += 1
        if R["bad"]:
            bad += R["bad"]; break
    return tot, bad, srun


def _words(args):
    K, start, max_sub = args
    tot, bad, srun = {}, [], Counter()
    for w, r, d, C in enumerate_words(K, start):
        k = len(w)
        r0 = r if r >= 2 else r + (1 << k)
        s = core.num_runs(w)
        for n in (r0, r0 + (1 << k)):
            if n % 2 == 0:          # the word "0": even realizers, no runs, nothing to test
                continue
            R = L.check_realizer(n, w, subsets=s <= max_sub)
            _merge(tot, R["res"]); srun[s] += 1
            if R["bad"]:
                return tot, R["bad"], srun
    return tot, bad, srun


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--N", type=int, default=1_000_000)
    ap.add_argument("--K", type=int, default=29)
    ap.add_argument("--smax", type=int, default=18)
    ap.add_argument("--max-subset-runs", type=int, default=8)
    ap.add_argument("--jobs", type=int, default=4)
    ap.add_argument("--json", default=None)
    a = ap.parse_args(argv)
    out, ok = {}, True
    t0 = time.time()
    with Pool(a.jobs) as pool:
        tot, bad, srun = {}, [], Counter()
        for tt, bb, sr in pool.imap(_seeds, [(lo, min(lo + 20000, a.N + 1))
                                             for lo in range(0, a.N + 1, 20000)]):
            _merge(tot, tt); srun.update(sr); bad += bb
        out["A_seeds"] = dict(range=f"odd 3..{a.N}", checks=tot, violations=bad[:5],
                              runs_hist=dict(sorted(srun.items())))
        ok &= not bad
        t1 = time.time()
        tasks, leaves = [], []
        for item in enumerate_words(a.K, stop_at=12):
            if item[0] == "PREFIX":
                tasks.append((a.K, item[1], a.max_subset_runs))
            else:
                leaves.append(item[0])
        tot, bad, srun, nwords = {}, [], Counter(), 0
        for w in leaves:                 # short words that crossed before depth 12
            k = len(w); r0 = core.least_eligible_realizer(w)
            for n in (r0, r0 + (1 << k)):
                if n % 2:
                    R = L.check_realizer(n, w); _merge(tot, R["res"]); bad += R["bad"]
        for tt, bb, sr in pool.imap_unordered(_words, tasks):
            _merge(tot, tt); srun.update(sr); bad += bb
        out["B_words"] = dict(K=a.K, realizers="r(w) and r(w)+2^k", checks=tot,
                              violations=bad[:5], realizers_by_runs=dict(sorted(srun.items())),
                              subsets_checked_when_runs_le=a.max_subset_runs)
        ok &= not bad
    t2 = time.time()
    tested, viol = L.check_compositions(a.smax)
    out["C_compositions"] = dict(smax=a.smax, tested=tested, violations=viol)
    ok &= viol == 0
    out["seconds"] = dict(A=round(t1 - t0, 1), B=round(t2 - t1, 1), C=round(time.time() - t2, 1))
    js = json.dumps(out, indent=1, default=str)
    print(js)
    if a.json:
        open(a.json, "w").write(js + "\n")
    print("RESULT:", "NO VIOLATIONS" if ok else "VIOLATION FOUND -- SEE ABOVE")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
