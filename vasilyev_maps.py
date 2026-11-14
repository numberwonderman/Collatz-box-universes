"""
vasilyev_maps.py

The "up or down by half" family of Collatz-type maps from

    Oleg Vasilyev, "Up or down by half: a family of Collatz-type maps",
    arXiv:2611.10311.

Definition (S is a set of positive integers).  Write x = 2^m * k with k odd.

    T_S(x)   = (3x + 1) / 2   if m == 0        (x odd)
             = 3x / 2         if m is in S
             = k              otherwise        (strip every factor of 2)

    T^-_S(x) = (x + 1) / 2    if m == 0        (the only difference)
             = 3x / 2         if m is in S
             = k              otherwise

T_empty is the ordinary Collatz map with each run of halvings merged into a
single step.

Everything here uses Python integers, so there is no overflow and no loss of
precision at any size.  Nothing in this file proves anything about any of
these maps: the cycle scan is a finite computation over the range you give it.
"""

from __future__ import annotations

from typing import Iterable, NamedTuple


def normalize_S(S: Iterable[int]) -> frozenset:
    """Validate S and return it as a frozenset of positive ints."""
    out = frozenset(S)
    for m in out:
        if not isinstance(m, int) or isinstance(m, bool) or m < 1:
            raise ValueError(f"S must contain positive integers only; got {m!r}")
    return out


def two_adic_split(x: int):
    """Return (m, k) with x = 2^m * k and k odd.  Requires x >= 1."""
    if x < 1:
        raise ValueError(f"x must be a positive integer; got {x!r}")
    m = (x & -x).bit_length() - 1
    return m, x >> m


def T(x: int, S=frozenset(), minus: bool = False) -> int:
    """One step of T_S (minus=False) or T^-_S (minus=True)."""
    if x < 1:
        raise ValueError(f"x must be a positive integer; got {x!r}")
    if x & 1:
        return (x + 1) >> 1 if minus else (3 * x + 1) >> 1
    m = (x & -x).bit_length() - 1
    if m in S:
        return 3 * (x >> 1)
    return x >> m


def step_kind(x: int, S=frozenset()) -> str:
    """Which branch applies at x: 'odd', 'up' (m in S) or 'down' (strip 2s)."""
    if x & 1:
        return "odd"
    return "up" if ((x & -x).bit_length() - 1) in S else "down"


class Orbit(NamedTuple):
    sequence: list      # start, T(start), ... up to but excluding the first repeat
    cycle_start: object  # index in `sequence` where the cycle begins, or None
    cycle: tuple        # the cycle rotated to start at its minimum, or ()

    @property
    def tail(self):
        return self.sequence if self.cycle_start is None else self.sequence[: self.cycle_start]


def canonical_cycle(cyc) -> tuple:
    """Rotate a cycle so that it starts at its smallest element."""
    cyc = list(cyc)
    i = cyc.index(min(cyc))
    return tuple(cyc[i:] + cyc[:i])


def orbit(start: int, S=frozenset(), minus: bool = False, max_steps: int = 100_000) -> Orbit:
    """
    Iterate from `start` until a value repeats (true cycle detection: every
    value is remembered) or max_steps is reached (cycle_start is then None).
    """
    S = normalize_S(S)
    seq, index = [], {}
    x = start
    for _ in range(max_steps + 1):
        if x in index:
            i = index[x]
            return Orbit(seq, i, canonical_cycle(seq[i:]))
        index[x] = len(seq)
        seq.append(x)
        x = T(x, S, minus)
    return Orbit(seq, None, ())


class ScanResult(NamedTuple):
    S: tuple
    minus: bool
    limit: int            # starts scanned: 1 <= n < limit
    cycles: dict          # canonical cycle -> number of starts n < limit ending in it
    unresolved: list      # starts that hit max_steps without a decision
    max_steps_seen: int   # longest walk (in steps) before reaching a smaller start / a cycle
    max_value: int        # largest value met anywhere in the scan
    max_value_start: int  # a start that reaches it


def find_cycles(limit: int, S=frozenset(), minus: bool = False, max_steps: int = 1_000_000) -> ScanResult:
    """
    Classify every start 1 <= n < limit by the cycle its orbit ends in.

    Starts are processed in increasing order.  The walk from n stops as soon
    as it reaches a value below n (that value was already classified) or
    repeats a value of its own walk (a cycle whose minimum is >= n, i.e. a new
    one).  Values are exact Python ints however far above `limit` they climb.
    """
    S = normalize_S(S)
    label = [0] * max(limit, 2)   # label[n] = 1 + index into cycle_list, 0 = undecided
    cycle_list, counts, unresolved, cycle_index = [], [], [], {}
    max_steps_seen, max_value, max_value_start = 0, 0, 0

    for n in range(1, limit):
        x, steps, seen, path = n, 0, {n}, [n]
        lab = 0
        while True:
            x = T(x, S, minus)
            steps += 1
            if x > max_value:
                max_value, max_value_start = x, n
            if x < n:
                lab = label[x]          # 0 only if x itself was unresolved
                break
            if x in seen:
                # A cycle with minimum >= n.  It can be met more than once (first
                # from a start below its minimum that never dips lower, later from
                # the minimum itself), so look it up before adding it.
                cyc = canonical_cycle(path[path.index(x):])
                if cyc not in cycle_index:
                    cycle_list.append(cyc)
                    counts.append(0)
                    cycle_index[cyc] = len(cycle_list)
                lab = cycle_index[cyc]
                break
            if steps >= max_steps:
                break
            seen.add(x)
            path.append(x)
        if steps > max_steps_seen:
            max_steps_seen = steps
        label[n] = lab
        if lab:
            counts[lab - 1] += 1
        else:
            unresolved.append(n)

    return ScanResult(tuple(sorted(S)), minus, limit, dict(zip(cycle_list, counts)),
                      unresolved, max_steps_seen, max_value, max_value_start)


def find_cycles_bruteforce(limit: int, S=frozenset(), minus: bool = False, max_steps: int = 100_000) -> dict:
    """Independent check: full orbit with full cycle detection for every start, no shortcuts."""
    out = {}
    for n in range(1, limit):
        o = orbit(n, S, minus, max_steps)
        key = o.cycle if o.cycle_start is not None else None
        out[key] = out.get(key, 0) + 1
    return out


def odd_block_drift(S=frozenset(), minus: bool = False, j_max: int = 200) -> float:
    """
    Heuristic mean of log2(x'/x) over one "odd to odd" block: x odd, x' the next
    odd value on its orbit.  Assumes v2 of the value after the odd step is j with
    probability 2^-(j+1) and ignores the +1.  The steps inside a block are NOT
    independent (3y/2 has 2-adic valuation exactly one less than y), so the block
    is the right unit; averaging single steps as if independent gives a number
    that is far too negative.

    Negative suggests orbits shrink on average.  Values close to 0 go with the
    very long excursions seen for S={1} and S={2,3}.  This is a heuristic about
    typical behaviour, checked only by sampling; it is not a statement about
    every orbit and is not taken from the paper.
    """
    from math import log2
    S = normalize_S(S)
    up = log2(1.5)
    first = -1.0 if minus else up
    total = 0.0
    for j in range(0, j_max + 1):
        gain, v = first, j
        while v > 0 and v in S:      # 3y/2 while the valuation is in S
            gain += up
            v -= 1
        gain -= v                    # then strip the remaining 2s (v may be 0)
        total += 2.0 ** -(j + 1) * gain
    return total


def format_S(S) -> str:
    return "{" + ",".join(str(m) for m in sorted(S)) + "}"


if __name__ == "__main__":
    o = orbit(7, {1})
    print("T_{1} orbit of 7:", o.sequence, "-> cycle", o.cycle)
    o = orbit(7, set())
    print("T_{} orbit of 7: ", o.sequence, "-> cycle", o.cycle)
