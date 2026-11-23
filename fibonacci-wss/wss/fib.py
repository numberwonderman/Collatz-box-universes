"""Core arithmetic: Fibonacci numbers mod m by fast doubling, primes, (5/p)."""


def fib_pair_mod(n: int, m: int) -> tuple[int, int]:
    """Return (F_n mod m, F_{n+1} mod m) using fast doubling, F_0 = 0, F_1 = 1.

    Identities: F_{2k} = F_k (2 F_{k+1} - F_k),  F_{2k+1} = F_k^2 + F_{k+1}^2.
    All arithmetic is exact Python integers reduced mod m.
    """
    if n < 0:
        raise ValueError("n must be non-negative")
    if m < 1:
        raise ValueError("m must be positive")
    a, b = 0, 1 % m  # (F_0, F_1)
    for bit in bin(n)[2:]:
        c = (a * ((2 * b - a) % m)) % m  # F_{2k}
        d = (a * a + b * b) % m          # F_{2k+1}
        if bit == "1":
            a, b = d, (c + d) % m
        else:
            a, b = c, d
    return a, b


def fib_mod(n: int, m: int) -> int:
    """F_n mod m (F_0 = 0, F_1 = F_2 = 1)."""
    return fib_pair_mod(n, m)[0]


def naive_fib(n: int) -> int:
    """Exact F_n by straightforward iteration (reference implementation)."""
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a


def legendre5(p: int) -> int:
    """(5/p) as specified: +1 if p ≡ ±1 (mod 5), -1 if p ≡ ±2 (mod 5)."""
    r = p % 5
    if r in (1, 4):
        return 1
    if r in (2, 3):
        return -1
    raise ValueError("(5/p) undefined for p ≡ 0 (mod 5)")


def primes_below(n: int) -> list[int]:
    """All primes < n by the sieve of Eratosthenes."""
    if n < 3:
        return []
    sieve = bytearray([1]) * n
    sieve[0] = sieve[1] = 0
    for i in range(2, int(n ** 0.5) + 1):
        if sieve[i]:
            sieve[i * i::i] = bytearray(len(range(i * i, n, i)))
    return [i for i in range(n) if sieve[i]]


def wss_residue(p: int) -> int:
    """R(p) = F_{p - (5/p)} mod p^2."""
    return fib_mod(p - legendre5(p), p * p)


# Anchors that must hold exactly: (p, n, m, expected F_n mod m)
ANCHORS = [
    (7, 8, 49, 21),
    (11, 10, 121, 55),
    (13, 14, 169, 39),
]
