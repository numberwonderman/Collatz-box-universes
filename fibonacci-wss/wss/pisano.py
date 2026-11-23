"""Pisano periods: pi(m) is the period of F_n mod m (F_0 = 0, F_1 = F_2 = 1)."""


def pisano(m: int) -> int:
    """Smallest k > 0 with (F_k, F_{k+1}) == (0, 1) mod m, found by iterating the pair."""
    if m < 1:
        raise ValueError("m must be positive")
    if m == 1:
        return 1
    a, b = 0, 1
    k = 0
    while True:
        a, b = b, (a + b) % m
        k += 1
        if a == 0 and b == 1:
            return k


# Anchors that must hold exactly: (m, pi(m))
PISANO_ANCHORS = [
    (2, 3), (3, 8), (5, 20), (7, 16), (10, 60), (11, 10), (100, 300), (1000, 1500),
]
