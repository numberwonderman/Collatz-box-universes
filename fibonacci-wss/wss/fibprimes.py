"""Fibonacci primes: exact F_n, primality proofs and smallest prime factors.

Primality method (see FIBPRIMES_REPORT.md):
  * n < 3,317,044,064,679,887,385,961,981: Miller-Rabin with the 13 prime bases 2..41,
    which is proven deterministic in that range.
  * larger n: Miller-Rabin with the first 20 prime bases is used only as a compositeness
    filter (a witness is a proof that n is composite). Every survivor is then proven prime
    by PARI/GP's isprime (APRCL), and an ECPP primality certificate from primecert is
    checked by primecertisvalid.

Smallest prime factors: trial division by every prime < 10^6; otherwise a complete
factorisation into proven primes (GMP-ECM splitting, with PARI's factor as fallback).
"""
from functools import lru_cache

from .fib import primes_below

MR_DETERMINISTIC_LIMIT = 3_317_044_064_679_887_385_961_981
SMALL_PRIMES = primes_below(72)  # first 20 primes: 2 .. 71
TRIAL_BOUND = 1_000_000
_TRIAL_PRIMES = primes_below(TRIAL_BOUND)


def fib(n: int) -> int:
    """Exact F_n (F_0 = 0, F_1 = F_2 = 1) by fast doubling on big integers."""
    a, b = 0, 1
    for bit in bin(n)[2:]:
        c = a * (2 * b - a)
        d = a * a + b * b
        a, b = (d, c + d) if bit == "1" else (c, d)
    return a


def mr_witness(n: int, bases) -> int | None:
    """Return a base proving n (odd, > 3) composite, or None if n is a strong probable prime to all bases."""
    d, s = n - 1, 0
    while d % 2 == 0:
        d //= 2
        s += 1
    for a in bases:
        a %= n
        if a in (0, 1, n - 1):
            continue
        x = pow(a, d, n)
        if x in (1, n - 1):
            continue
        for _ in range(s - 1):
            x = x * x % n
            if x == n - 1:
                break
        else:
            return a
    return None


@lru_cache(maxsize=1)
def _pari():
    import cypari2
    pari = cypari2.Pari()
    pari.allocatemem(1_000_000_000)
    pari.default("factor_proven", 1)
    return pari


def prove_prime(n: int) -> tuple[bool, str]:
    """Deterministically decide primality of n. Returns (is_prime, method)."""
    if n < 2:
        return False, "n < 2"
    for q in SMALL_PRIMES:
        if n % q == 0:
            return n == q, "trial division"
    if n < MR_DETERMINISTIC_LIMIT:
        w = mr_witness(n, SMALL_PRIMES[:13])
        return w is None, "deterministic Miller-Rabin (bases 2..41)"
    w = mr_witness(n, SMALL_PRIMES)
    if w is not None:
        return False, f"Miller-Rabin witness {w}"
    pari = _pari()
    if not pari.isprime(n):
        return False, "PARI isprime"
    cert = pari.primecert(n)
    if not pari.primecertisvalid(cert):
        raise RuntimeError(f"ECPP certificate failed to verify for n with {len(str(n))} digits")
    return True, "PARI isprime (APRCL) + verified ECPP certificate"


# GMP-ECM schedule (B1, curves): standard steps for factors of ~15 to ~45 digits.
ECM_SCHEDULE = [(2_000, 25), (11_000, 90), (50_000, 300), (250_000, 700),
                (1_000_000, 1_800), (3_000_000, 5_100), (11_000_000, 10_600)]


def _ecm_split(n: int) -> int | None:
    """Try to find a nontrivial factor of composite n with the GMP-ECM binary; None if none found."""
    import shutil
    import subprocess
    if shutil.which("ecm") is None:
        return None
    for b1, curves in ECM_SCHEDULE:
        out = subprocess.run(["ecm", "-q", "-one", "-c", str(curves), str(b1)],
                             input=f"{n}\n", capture_output=True, text=True).stdout
        for tok in out.split():
            if tok.isdigit():
                f = int(tok)
                if 1 < f < n and n % f == 0:
                    return f
    return None


def full_factor(n: int) -> tuple[list[int], list[str]]:
    """Complete factorisation of n > 1 into PROVEN primes (sorted, with multiplicity).

    Pieces are split by trial division, then GMP-ECM, then (fallback) PARI's factor with
    factor_proven = 1. Every prime returned is proven by prove_prime, and the product is
    checked against n. Returns (primes, tools used).
    """
    primes, tools, stack = [], [], [n]
    while stack:
        m = stack.pop()
        if m == 1:
            continue
        if prove_prime(m)[0]:
            primes.append(m)
            continue
        f = next((q for q in _TRIAL_PRIMES if m % q == 0), None)
        if f is not None:
            tools.append("trial division")
        else:
            f = _ecm_split(m)
            if f is not None:
                tools.append("GMP-ECM")
            else:
                tools.append("PARI factor")
                fac = _pari().factor(m)
                stack.extend(int(p) for p, e in zip(fac[0], fac[1]) for _ in range(int(e)))
                continue
        stack.extend([f, m // f])
    primes.sort()
    prod = 1
    for q in primes:
        prod *= q
    if prod != n or not all(prove_prime(q)[0] for q in primes):
        raise RuntimeError("factorisation check failed")
    return primes, sorted(set(tools))


def smallest_prime_factor(n: int) -> tuple[int, str]:
    """Smallest prime factor of composite n. Trial division by ALL primes < 10^6 in increasing
    order (the first hit is the smallest factor); otherwise the minimum of a complete
    factorisation into proven primes."""
    for q in _TRIAL_PRIMES:
        if q * q > n:
            break
        if n % q == 0:
            return q, "trial division"
    primes, tools = full_factor(n)
    return primes[0], "complete factorisation into proven primes (" + ", ".join(tools) + ")"


# Anchors
PRIME_ANCHORS = [(17, 1597), (23, 28657), (29, 514229)]
COMPOSITE_ANCHOR = (19, 4181, (37, 113))
DIVISIBILITY_ANCHOR = (5, 20, 6765, 1353)  # F_5 | F_20: 6765 = 5 * 1353
EXPECTED_PREFIX = [3, 4, 5, 7, 11, 13, 17, 23, 29]
