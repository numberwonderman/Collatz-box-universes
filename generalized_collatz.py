"""
generalized_collatz.py

Implementation of the Generalized Collatz (3x + 1) Conjecture algorithm as described by
T. S. Rathore, "Generalization of Collatz’s Conjecture," IETE Journal of Education, vol. 64, no. 2, 
pp. 98–102, 2023. DOI: 10.1080/09747338.2023.2178531

This program respects the spirit of the original Collatz problem while allowing
custom parameters (b, c) for multiplication and addition, exploring broader generalized
iterations.

Usage:
    - Import the generalized_collatz function and call with parameters:
        a1: initial odd number
        b, c: odd integers defining generalization
        max_iterations: optional limit to iterations to avoid infinite loops

Returns:
    - tuple of (full sequence list, cycle start index)
"""

def generalized_collatz(a1, b, c, max_iterations=10000):
    """
    Perform the generalized Collatz iteration:
    1. Start with odd number a1
    2. Multiply by odd b and add odd c
    3. Divide by 2 until odd number obtained a2
    4. Repeat with a2 and so on
    Stops if cycle detected or max_iterations reached.

    Args:
        a1 (int): initial odd number
        b (int): odd multiplier
        c (int): odd addend
        max_iterations (int): maximum iterations allowed

    Returns:
        sequence (list): full list of numbers generated
        cycle_start (int or None): index where cycle starts if found, else None
    """
    if a1 % 2 == 0:
        raise ValueError("Starting number must be odd per generalized Collatz.")

    sequence = []
    seen = {}

    current = a1
    for i in range(max_iterations):
        if current in seen:
            cycle_start = seen[current]
            return sequence, cycle_start

        seen[current] = i
        sequence.append(current)

        d = current * b + c
        while d % 2 == 0:
            d //= 2

        current = d

    # No cycle detected within max_iterations
    return sequence, None


if __name__ == "__main__":
    # Example usage
    a1 = 7
    b = 3
    c = 1

    seq, cycle_start = generalized_collatz(a1, b, c)
    print("Generated sequence:")
    print(seq)
    if cycle_start is not None:
        print(f"Cycle detected starting at index {cycle_start}: {seq[cycle_start:]}")
    else:
        print("No cycle detected within the iteration limit.")
