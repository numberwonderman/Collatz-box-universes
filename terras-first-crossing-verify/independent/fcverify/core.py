"""First-crossing data, written from the definitions in De Jesús, "Realizer Bounds and
Repetition Constraints at the First Coefficient Crossing in the 3x+1 Problem" (v2, 9 pp).

Nothing here imports, copies or paraphrases the companion repository's scripts.
All arithmetic is exact (Python integers); no floating point is used in any decision.

Definitions used (paper §1-§2):
  T(n) = (3n+1)/2 for odd n, n/2 for even n            (shortcut map)
  parity word w of the first k inputs n, T(n), ..., T^{k-1}(n); d = number of odd inputs
  rho_j = 3^{d_j} / 2^j, d_j = odd inputs among the first j    (rho_0 = 1)
  tau(n) = first k with rho_k < 1                       (first coefficient crossing)
  first-crossing word: rho_j >= 1 for all j < k and rho_k < 1
  odd run: maximal block of consecutive odd input states
  2^k T^k(n) = 3^d n + C_w   (eq. 1);  M_w = C_w / 3^d
  "descends at the crossing": T^k(n) < n
  eligible realizer of w: an integer n >= 2 whose first k parities are w
  r(w): least integer >= 2 in the residue class of w (mod 2^k)
"""
from __future__ import annotations

from dataclasses import dataclass


def T(n: int) -> int:
    return (3 * n + 1) // 2 if n & 1 else n // 2


@dataclass(frozen=True)
class Crossing:
    n: int
    k: int          # crossing time tau(n)
    d: int          # odd inputs among the first k
    word: str       # parity word of length k, '1' = odd input
    end: int        # T^k(n)

    @property
    def descends(self) -> bool:
        return self.end < self.n


def first_crossing(n: int, kmax: int = 10_000) -> Crossing:
    """Follow the orbit of n until 3^d < 2^j first holds (rho_j < 1)."""
    if n < 1:
        raise ValueError("n must be positive")
    x, j, d = n, 0, 0
    p3, p2 = 1, 1                      # 3^d, 2^j
    bits = []
    while True:
        if p3 < p2:                    # rho_j < 1 ; j = 0 impossible since 1 < 1 is false
            return Crossing(n, j, d, "".join(bits), x)
        if j >= kmax:
            raise RuntimeError(f"no crossing for n={n} within {kmax} steps")
        if x & 1:
            bits.append("1"); d += 1; p3 *= 3
        else:
            bits.append("0")
        x = T(x)
        j += 1
        p2 <<= 1


def is_first_crossing_word(word: str) -> bool:
    """rho_j >= 1 for all j < k and rho_k < 1, from the word alone."""
    p3, p2 = 1, 1
    for j, b in enumerate(word):
        if p3 < p2:
            return False               # crossed before the end
        if b == "1":
            p3 *= 3
        p2 <<= 1
    return p3 < p2


def runs(word: str) -> list[tuple[int, int]]:
    """Maximal blocks of '1': list of (start time t_i, length l_i)."""
    out, i, k = [], 0, len(word)
    while i < k:
        if word[i] == "1":
            j = i
            while j < k and word[j] == "1":
                j += 1
            out.append((i, j - i))
            i = j
        else:
            i += 1
    return out


def num_runs(word: str) -> int:
    return len(runs(word))


def correction(word: str) -> tuple[int, int, int]:
    """(k, d, C_w) from the word alone, by composing the affine maps
    x -> (3x+1)/2 and x -> x/2 written as 2^j x_j = 3^{d_j} n + C_j:
      odd step : C_{j+1} = 3 C_j + 2^j ;  even step: C_{j+1} = C_j."""
    C, d = 0, 0
    for j, b in enumerate(word):
        if b == "1":
            C = 3 * C + (1 << j)
            d += 1
    return len(word), d, C


def correction_by_runs_times_3d(word: str) -> int:
    """3^d * M_w computed from the run formula (2):
       M_w = sum_i (1 - (2/3)^{l_i}) / rho_{t_i}
    Multiplying by 3^d makes every term an integer:
       3^d * (1-(2/3)^l) * 2^t / 3^{d_t} = (3^l - 2^l) * 2^t * 3^{d - d_t - l}."""
    d = word.count("1")
    total = 0
    for t, l in runs(word):
        d_t = word[:t].count("1")
        total += (3 ** l - 2 ** l) * (1 << t) * 3 ** (d - d_t - l)
    return total


def word_class(word: str) -> int:
    """Residue r in [0, 2^k) of the class of integers whose first k parities are `word`,
    built bit by bit from the word alone (paper, Remark 2: exactly one of the two lifts has
    the prescribed next parity).  We track y = (3^{d_j} r + C_j)/2^j = T^j(r)."""
    r, y, d, C = 0, 0, 0, 0
    for j, b in enumerate(word):
        want = 1 if b == "1" else 0
        if (y & 1) != want:            # switch to the other lift r + 2^j
            r += 1 << j
            y += 3 ** d                # T^j(r + 2^j) = T^j(r) + 3^{d_j}
        if want:
            C = 3 * C + (1 << j); d += 1
            y = (3 * y + 1) // 2
        else:
            y //= 2
    return r


def least_eligible_realizer(word: str) -> int:
    """r(w): the least integer >= 2 in the class of w."""
    r = word_class(word)
    k = len(word)
    while r < 2:
        r += 1 << k
    return r


def class_descends(word: str) -> bool:
    """Do ALL eligible realizers of the first-crossing word w descend at step k?
    T^k(n) < n  <=>  (3^d n + C)/2^k < n  <=>  n (2^k - 3^d) > C.
    2^k > 3^d for a first-crossing word, so the left side increases with n and the
    least eligible realizer r(w) decides the whole class."""
    k, d, C = correction(word)
    gap = (1 << k) - 3 ** d
    assert gap > 0, "not a crossing"
    return least_eligible_realizer(word) * gap > C


def lemma5_run_bounds_hold(n: int, word: str) -> bool:
    """Lemma 5, per run, in exact integer form:
       (i)  2^{l_i} | x_i + 1, where x_i = T^{t_i}(n) starts run i;
       (ii) 2^{l_i} <= (n+1) (3/2)^{D_i}, D_i = odd steps before run i,
            i.e. 2^{l_i + D_i} <= (n+1) 3^{D_i}."""
    x, xs = n, []
    for _ in range(len(word)):
        xs.append(x)
        x = T(x)
    D = 0
    for t, l in runs(word):
        if (xs[t] + 1) % (1 << l):
            return False
        # x_i + 1 <= (n+1)(3/2)^{D_i}: odd steps multiply x+1 by 3/2, even steps shrink it
        if (xs[t] + 1) * (1 << D) > (n + 1) * 3 ** D:
            return False
        if (1 << (l + D)) > (n + 1) * 3 ** D:
            return False
        D += l
    return True


def initial_square_lengths(word: str) -> list[int]:
    """All l >= 1 with word = U U ... (|U| = l, 2l <= k)."""
    k = len(word)
    return [l for l in range(1, k // 2 + 1) if word[:l] == word[l:2 * l]]
