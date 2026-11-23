"""Round 2, Step 3: stress tests of Lemma 6 (splitting) and Lemma 7 (restart) of
Hexagon 2611.00459v2 against concrete words and realizers.

Both lemmas' main conclusions are stated for a realizer that FAILS to descend with n > B.
No such realizer exists in any finite range one can search, so those hypotheses are
never met and the conclusions as stated are vacuous on data.  What CAN be tested on
every word/realizer is every step of the proofs that does not use the failure hypothesis:

Lemma 6 (checked for every realizer, every r):
  L6a  each contribution m_i = (1-(2/3)^{l_i})/rho_{t_i} satisfies 0 < m_i < 1, and
       sum m_i = M_w                                               [(2) and "each m_i < 1"]
  L6b  x_i = rho_{t_i} (n + M_i), with M_i (prefix correction) <= M_w
  L6c  rho_{t_i} < 1/m_i
  L6d  for 1 <= r <= s-1:  M_w < r + (s-r) m*, m* = r-th largest noninitial contribution
  L6e  failure-free form of the height bound: if M_w > r >= 1, every one of the r selected
       starts satisfies  x_i < (n + M_w)(s - r)/(M_w - r).  (A failure has n*Lambda < M_w,
       so Lemma 6's (5) is a weakening of exactly this.)
Lemma 7 (its hypothesis is only about heights, so it is tested in full):
  L7   with the initial start plus the top-r noninitial starts (any r, 0 <= r <= s-1),
       H = least integer with x + 1 < 2^H at all r+1 starts:   d < H (G_{s-r} + r)
  L7s  sharper, segment-local form of the proof: each segment j, with its own start x_j
       and t_j runs, has fewer than H_j G_{t_j} odd steps, H_j = bitlen(x_j + 1)
  L7x  L7 for EVERY subset of noninitial starts (not only the top-r), when s <= 10
  COMP sum_j G_{t_j} <= G_{s-r} + r over all compositions of s into r+1 parts (s <= 18)
"""
from __future__ import annotations

import itertools
from fractions import Fraction as F
from functools import lru_cache

from . import bounds as b
from . import core


@lru_cache(maxsize=None)
def G_enc(t: int) -> tuple[F, F]:
    """Rigorous (lower, upper) enclosure of G_t = sum_{j<t} alpha^j."""
    lo_a, hi_a = b.alpha_enclosure()
    lo_a, hi_a = b._round_down(lo_a), b._round_up(hi_a)
    lo = hi = F(0)
    pl = ph = F(1)
    for _ in range(t):
        lo += pl; hi += ph
        pl = b._round_down(pl * lo_a); ph = b._round_up(ph * hi_a)
    return lo, hi


def run_data(n: int, word: str):
    """Per run i: (t_i, l_i, x_i, m_i, rho_{t_i}, M_i) for the realizer n of `word`."""
    xs, x = [], n
    for _ in range(len(word)):
        xs.append(x); x = core.T(x)
    out = []
    for t, l in core.runs(word):
        pre = word[:t]
        _, d_t, C_t = core.correction(pre)
        rho = F(3 ** d_t, 2 ** t)
        m = (1 - F(2, 3) ** l) / rho
        M_i = F(C_t, 3 ** d_t)
        out.append((t, l, xs[t], m, rho, M_i))
    return out


def check_realizer(n: int, word: str, subsets: bool = True) -> dict:
    """Run every check on one realizer; returns {check: (tested, violations)} plus
    a list of violating details."""
    k, d, C = core.correction(word)
    Mw = F(C, 3 ** d)
    R = run_data(n, word)
    s = len(R)
    res = {key: [0, 0] for key in ("L6a", "L6b", "L6c", "L6d", "L6e", "L7", "L7s", "L7x")}
    bad = []

    def rec(key, ok, info=None):
        res[key][0] += 1
        if not ok:
            res[key][1] += 1
            bad.append((key, n, word, info))

    if s == 0:
        return dict(res=res, bad=bad, s=0)
    rec("L6a", all(0 < m < 1 for *_, m, _, _ in [(r[0], r[1], r[2], r[3], r[4], r[5]) for r in R])
        and sum(r[3] for r in R) == Mw)
    for t, l, x, m, rho, M_i in R:
        rec("L6b", x == rho * (n + M_i) and M_i <= Mw, (t, x))
        rec("L6c", rho < 1 / m, (t,))
    # noninitial runs ordered by contribution, ties broken by time (any choice is allowed)
    noninit = sorted(range(1, s), key=lambda i: (-R[i][3], R[i][0]))
    for r in range(1, s):
        m_star = R[noninit[r - 1]][3]
        rec("L6d", Mw < r + (s - r) * m_star, r)
        if Mw > r:
            bound = (n + Mw) * (s - r) / (Mw - r)
            rec("L6e", all(R[i][2] < bound for i in noninit[:r]), r)

    def lemma7(starts_idx, r):
        starts = sorted(starts_idx)
        H = max((R[i][2] + 1).bit_length() for i in starts)     # least H with x+1 < 2^H
        G_lo, _ = G_enc(s - r)
        return d < H * (G_lo + r), starts, H

    for r in range(0, s):
        ok, starts, H = lemma7([0] + noninit[:r], r)
        rec("L7", ok, (r, H))
        # segment-local form
        cuts = starts + [s]
        seg_ok = True
        for a, c in zip(cuts, cuts[1:]):
            odd = sum(R[i][1] for i in range(a, c))
            Hj = (R[a][2] + 1).bit_length()
            if not odd < Hj * G_enc(c - a)[0]:
                seg_ok = False
        rec("L7s", seg_ok, (r, starts))
    if subsets and s <= 10:
        for r in range(1, s):
            for sub in itertools.combinations(range(1, s), r):
                ok, starts, H = lemma7([0] + list(sub), r)
                rec("L7x", ok, (sub, H))
    return dict(res=res, bad=bad, s=s)


def compositions(n: int, parts: int):
    for cuts in itertools.combinations(range(1, n), parts - 1):
        c = (0,) + cuts + (n,)
        yield [c[i + 1] - c[i] for i in range(parts)]


def check_compositions(smax: int = 18):
    """sum G_{t_j} <= G_{s-r} + r, rigorously: upper(LHS) <= lower(RHS) unless the
    composition is the extremal one (then equality holds identically)."""
    tested = viol = 0
    for s in range(1, smax + 1):
        for r in range(0, s):
            rhs_lo = G_enc(s - r)[0] + r
            for comp in compositions(s, r + 1):
                tested += 1
                if sorted(comp) == sorted([s - r] + [1] * r):
                    continue
                lhs_hi = sum(G_enc(t)[1] for t in comp)
                if not lhs_hi <= rhs_lo:
                    viol += 1
    return tested, viol
