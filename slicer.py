#!/usr/bin/env python3
# SPDX-License-Identifier: BSD-2-Clause
# Copyright (c) 2018 Jakub Červený
# This script combines the provided gilbert3d function with a generalized
# Collatz sequence generator to demonstrate the "slicing" approach.

# =========================================================================
# === Part 1: Generalized Collatz Sequence and XYZ Coordinate Generation
# =========================================================================

def generalized_collatz(n, divisor, multiplier, adder):
    """
    Generates a sequence based on generalized Collatz rules.

    Args:
        n (int): The starting number.
        divisor (int): The divisor for even numbers.
        multiplier (int): The multiplier for odd numbers.
        adder (int): The value to add to odd numbers.

    Returns:
        list: A list of numbers in the sequence.
    """
    sequence = [n]
    # The sequence stops when it reaches 1 or a repeating cycle
    # For simplicity, we stop at 1 as a common case.
    while n != 1:
        if n % 2 == 0:
            n = n // divisor
        else:
            n = (n * multiplier) + adder
        sequence.append(n)
        # Prevents infinite loops for non-converging sequences
        if len(sequence) > 1000:
            break
    return sequence

def generate_xyz_coords(sequence):
    """
    Converts a 1D Collatz sequence into 3D (x, y, z) coordinates.
    
    This is an illustrative, placeholder function. The specific rules for
    mapping the sequence to XYZ coordinates would be based on your "bugs universe"
    project. This example uses a simple mapping based on the step number and
    the value of the number in the sequence.

    Args:
        sequence (list): The list of numbers from a Collatz sequence.

    Returns:
        list: A list of tuples, where each tuple is an (x, y, z) coordinate.
    """
    coords = []
    for step, value in enumerate(sequence):
        # x-coordinate: based on the step number
        x = step
        # y-coordinate: based on the number's value, scaled to prevent huge numbers
        y = value % 100  
        # z-coordinate: based on the number's parity (odd/even)
        z = 0
        if value % 2 == 0:
            z = 1
        else:
            z = 2
        coords.append((x, y, z))
    return coords


# =========================================================================
# === Part 2: Gilbert 3D Curve Algorithm (from your provided code)
# =========================================================================

def sgn(x):
    return -1 if x < 0 else (1 if x > 0 else 0)

def generate3d(x, y, z,
               ax, ay, az,
               bx, by, bz,
               cx, cy, cz):
    # This is the recursive logic for the Gilbert curve.
    w = abs(ax + ay + az)
    h = abs(bx + by + bz)
    d = abs(cx + cy + cz)

    (dax, day, daz) = (sgn(ax), sgn(ay), sgn(az))
    (dbx, dby, dbz) = (sgn(bx), sgn(by), sgn(bz))
    (dcx, dcy, dcz) = (sgn(cx), sgn(cy), sgn(cz))

    if h == 1 and d == 1:
        for i in range(0, w):
            yield(x, y, z)
            (x, y, z) = (x + dax, y + day, z + daz)
        return

    if w == 1 and d == 1:
        for i in range(0, h):
            yield(x, y, z)
            (x, y, z) = (x + dbx, y + dby, z + dbz)
        return

    if w == 1 and h == 1:
        for i in range(0, d):
            yield(x, y, z)
            (x, y, z) = (x + dcx, y + dcy, z + dcz)
        return

    (ax2, ay2, az2) = (ax//2, ay//2, az//2)
    (bx2, by2, bz2) = (bx//2, by//2, bz//2)
    (cx2, cy2, cz2) = (cx//2, cy//2, cz//2)

    w2 = abs(ax2 + ay2 + az2)
    h2 = abs(bx2 + by2, bz2)
    d2 = abs(cx2 + cy2, cz2)

    if (w2 % 2) and (w > 2):
       (ax2, ay2, az2) = (ax2 + dax, ay2 + day, az2 + daz)

    if (h2 % 2) and (h > 2):
       (bx2, by2, bz2) = (bx2 + dbx, by2 + dby, bz2 + dbz)

    if (d2 % 2) and (d > 2):
       (cx2, cy2, cz2) = (cx2 + dcx, cy2 + dcy, cz2 + dcz)

    if (2*w > 3*h) and (2*w > 3*d):
       yield from generate3d(x, y, z,
                             ax2, ay2, az2,
                             bx, by, bz,
                             cx, cy, cz)

       yield from generate3d(x+ax2, y+ay2, z+az2,
                             ax-ax2, ay-ay2, az-az2,
                             bx, by, bz,
                             cx, cy, cz)

    elif 3*h > 4*d:
       yield from generate3d(x, y, z,
                             bx2, by2, bz2,
                             cx, cy, cz,
                             ax2, ay2, az2)

       yield from generate3d(x+bx2, y+by2, z+bz2,
                             ax, ay, az,
                             bx-bx2, by-by2, bz-bz2,
                             cx, cy, cz)

       yield from generate3d(x+(ax-dax)+(bx2-dbx),
                             y+(ay-day)+(by2-dby),
                             z+(az-daz)+(bz2-dbz),
                             -bx2, -by2, -bz2,
                             cx, cy, cz,
                             -(ax-ax2), -(ay-ay2), -(az-az2))

    elif 3*d > 4*h:
       yield from generate3d(x, y, z,
                             cx2, cy2, cz2,
                             ax2, ay2, az2,
                             bx, by, bz)

       yield from generate3d(x+cx2, y+cy2, z+cz2,
                             ax, ay, az,
                             bx, by, bz,
                             cx-cx2, cy-cy2, cz-cz2)

       yield from generate3d(x+(ax-dax)+(cx2-dcx),
                             y+(ay-day)+(cy2-dcy),
                             z+(az-daz)+(cz2-dcz),
                             -cx2, -cy2, -cz2,
                             -(ax-ax2), -(ay-ay2), -(az-az2),
                             bx, by, bz)
    else:
       yield from generate3d(x, y, z,
                             bx2, by2, bz2,
                             cx2, cy2, cz2,
                             ax2, ay2, az2)

       yield from generate3d(x+bx2, y+by2, z+bz2,
                             cx, cy, cz,
                             ax2, ay2, az2,
                             bx-bx2, by-by2, bz-bz2)

       yield from generate3d(x+(bx2-dbx)+(cx-dcx),
                             y+(by2-dby)+(cy-dcy),
                             z+(bz2-dbz)+(cz-dcz),
                             ax, ay, az,
                             -bx2, -by2, -bz2,
                             -(cx-cx2), -(cy-cy2), -(cz-cz2))

       yield from generate3d(x+(ax-dax)+bx2+(cx-dcx),
                             y+(ay-day)+by2+(cy-dcy),
                             z+(az-daz)+bz2+(cz-dcz),
                             -cx, -cy, -cz,
                             -(ax-ax2), -(ay-ay2), -(az-az2),
                             bx-bx2, by-by2, bz-bz2)

       yield from generate3d(x+(ax-dax)+(bx2-dbx),
                             y+(ay-day)+(by2-dby),
                             z+(az-daz)+(bz2-dbz),
                             -bx2, -by2, -bz2,
                             cx2, cy2, cz2,
                             -(ax-ax2), -(ay-ay2), -(az-az2))

def gilbert3d(width, height, depth):
    """
    Generalized Hilbert ('Gilbert') space-filling curve for arbitrary-sized
    3D rectangular grids.
    """

    if width >= height and width >= depth:
       yield from generate3d(0, 0, 0,
                             width, 0, 0,
                             0, height, 0,
                             0, 0, depth)

    elif height >= width and height >= depth:
       yield from generate3d(0, 0, 0,
                             0, height, 0,
                             width, 0, 0,
                             0, 0, depth)

    else: # depth >= width and depth >= height
       yield from generate3d(0, 0, 0,
                             0, 0, depth,
                             width, 0, 0,
                             0, height, 0)


# =========================================================================
# === Part 3: Slicer Script and Demonstration
# =========================================================================

def collatz_slicer(start_n, divisor, multiplier, adder, bounds):
    """
    Main slicer function that processes a single Collatz sequence and
    maps its 3D coordinates to a 1D sequence using the Gilbert curve.

    Args:
        start_n (int): The starting number for the sequence.
        divisor (int): The divisor for the generalized rule.
        multiplier (int): The multiplier for the generalized rule.
        adder (int): The adder for the generalized rule.
        bounds (tuple): A tuple (width, height, depth) defining the
                        bounds of the 3D space.

    Returns:
        list: A list of 1D indices representing the sequence.
    """
    print(f"--- Processing starting number: {start_n} ---")
    
    # 1. Generate the Collatz sequence
    sequence = generalized_collatz(start_n, divisor, multiplier, adder)
    print(f"Collatz sequence: {sequence}")
    
    # 2. Convert the sequence to XYZ coordinates
    xyz_coords = generate_xyz_coords(sequence)
    print(f"Generated XYZ coordinates: {xyz_coords}")

    # 3. Create a mapping from (x,y,z) to 1D index
    # We create a dictionary for a fast lookup
    width, height, depth = bounds
    space_to_index = {}
    for i, (x, y, z) in enumerate(gilbert3d(width, height, depth)):
        space_to_index[(x, y, z)] = i

    # 4. Use the mapping to get the 1D sequence
    one_d_sequence = []
    for x, y, z in xyz_coords:
        if (x, y, z) in space_to_index:
            one_d_sequence.append(space_to_index[(x, y, z)])
        else:
            # Handle coordinates that are out of the defined bounds
            print(f"Warning: Coordinate ({x}, {y}, {z}) is out of bounds.")
            one_d_sequence.append(None)
    
    print(f"Final 1D sequence (mapped by Gilbert curve): {one_d_sequence}\n")
    return one_d_sequence

if __name__ == "__main__":
    # Define the bounds of our 3D space
    # The bounds should be large enough to contain the generated coordinates.
    # We will use even numbers as recommended by the Gilbert algorithm.
    space_bounds = (32, 32, 4)  # Example bounds: width=32, height=32, depth=4

    # === Example 1: Standard Collatz rules (3n+1)
    # The number 6 has a short, well-known sequence.
    collatz_slicer(6, divisor=2, multiplier=3, adder=1, bounds=space_bounds)

    # === Example 2: Another starting number with standard rules
    # The number 27 has a long, interesting sequence.
    collatz_slicer(27, divisor=2, multiplier=3, adder=1, bounds=space_bounds)
    
    # === Example 3: A generalized rule set (e.g., 5n-1)
    # Note: These generalized rules may not converge to 1.
    collatz_slicer(10, divisor=2, multiplier=5, adder=-1, bounds=space_bounds)
