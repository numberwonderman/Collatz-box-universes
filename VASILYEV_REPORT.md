Vasilyev maps in Collatz Box Universes: review, extension, tests
Branch: vasilyev-ts-maps (local, not pushed). Base commit: bb92f9a. Date: 2026-11-14.
Nothing was deleted. No proof of anything is claimed; every number below is from a run described here.

IMPORTANT LIMIT
I could not open the paper (arxiv.org/html/2611.10311v1 returned a rate-limit error on six attempts,
and a web search did not find it). So I used the definition and the example orbit exactly as written
in the task, and I could NOT compare against Table 5.1. The cycles I found are listed in section 3 so
they can be checked against the table by hand.

1. REVIEW OF EXISTING CODE

Fixed (each one reproduced before the fix and re-run after; all 167 original tests still pass)
 a. js/radial-animator.js line 337 and js/radial-viewer.js line 341, initialize():
    "DOMEElements" typo. In a simulated browser, initialize() threw
    "ReferenceError: DOMEElements is not defined", so the Calculate button was never wired up and
    nothing rendered on load. After the fix initialize() completes and the inputs fill in.
 b. js/generalizedPrimeCollatz.js, generalizedCollatz(n, alpha, beta): no cycle check and no step
    limit, so it never returned for any orbit that misses 1. (5n, 3n, -1n) and (13n, 5n, 1n) both hung.
    Now takes an optional maxSteps (default 10000) and stops at the first repeated value:
    5,14,7,20,10,5 and 13,66,33,166,83,416,208,104,52,26,13. Orbits that reach 1 are unchanged.
 c. js/generalizedPrimeCollatz.js, simplifyByPrimesLessThanP(0n, p): infinite loop (0 is divisible by
    every prime). Now returns 0n.
 d. js/generalizedPrimeCollatz.js, iterateP(): "steps" was one too small when type is 'cycle'
    (n=5, p=9: steps 21 for 22 transitions; 'hit_1' results were already right). Now 22.
 e. js/utils.js, drawNecklaceCanvas(): the search for the cycle start never matches, because
    calculateCollatzSequence does not append the repeated value. Every node was coloured as cycle.
    For 3n-1 from 9 (tail of 7, cycle of 5) colours were GGGGGGGGGGGG, now oooooooGGGGG.
 f. generalized_collatz.py, generalized_collatz(): infinite loop when current*b + c == 0
    (a1=1, b=1, c=-1). Now records the 0 and stops: ([1, 0], None).
 g. slicer.py, generalized_collatz(): tested "n % 2" but divided by "divisor". With divisor 3,
    start 4 gave [4, 1] (4 // 3). Now tests "n % divisor". Results for divisor 2 are unchanged.

Found and reproduced, NOT fixed (each needs a decision from you)
 h. js/slicer.js lines 3-14: imports FACE_SIZE, PADDING, STEP_SIZE, NINE_NET_DRAW_WIDTH,
    NINE_NET_DRAW_HEIGHT from utils.js, which does not export them. Under native ES modules this is
    "SyntaxError: The requested module './utils.js' does not provide an export named 'FACE_SIZE'",
    so the file cannot load in a browser. The tests do not catch it. I do not know the intended values.
 i. js/slicer.js lines 156, 397, 451: calls calculateCollatzSequence(n, MAX_ITERATIONS, x, y, z), but
    the function imported from collatzLogic.js has signature (n, p, q, r). So it divides by 1000,
    multiplies by x, adds y, ignores z, and the result has no type/steps/minVal fields
    (27 with x=2,y=3,z=1 gives 27, 57, 117, 237, ...). The slicer test mocks that function with the
    wrong signature, so it passes. The function it seems to want is the one in utils.js.
 j. js/collatzLogic.js, calculateCollatzSequence(): plain Numbers with no safe-integer guard.
    5n+1 from 7 is silently wrong from index 520; 3n+2 from 5 from index 32. The existing test
    "detects non-convergence after a certain number of steps" passes on those wrong values, so adding
    a guard would change a tested behaviour.
 k. js/radial-animator.js and js/radial-viewer.js, generalizedCollatz(): no cycle detection. 3n-1 from
    5 has 5 distinct values but runs all 100,000 steps and is labelled "Paradoxical". The sequence is
    stored with Number(current), which loses precision for large values. A comment says the tests
    expect it to run to maxIterations, so I left it.
 l. js/worker.js, generalizedCollatz(): the odd step is (a*n + b) / c in floating point, so most
    (a, b, c) give non-integers (a=1,b=1,c=3 from 7: 7, 2.667, 1.222, ...); reaching 1 is reported as
    'cycle'; no safe-integer guard (a=5,b=1,c=1 from 7 passes 2^53).
 m. js/utils.js, calculateCollatzSequence(): cycle check is sequence.includes() (quadratic, fine at the
    1000-step cap); stoppingTime_t is the total step count, not the first drop below the start.
    Read from the code, not separately run.
 n. js/CycleCataloge.js: one entry per start rather than per cycle, and the 'binary' signature is taken
    from the whole sequence including the tail. Read from the code, not separately run.

2. WHAT I ADDED (new files only)
 vasilyev_maps.py            T_S and T^-_S, S any set of positive integers; orbit(), find_cycles(),
                             a brute-force checker, and a heuristic drift estimate. Exact integers.
 js/vasilyevMaps.js          The same maps for the JS suite, in BigInt: normalizeS, stepTS, stepKind,
                             orbitTS, findCyclesTS. No existing function was changed to add it.
 js/tests/vasilyevMaps.test.js   9 tests. Suite is now 176 passed, 1 skipped (was 167 passed, 1 skipped).
 vasilyev_scan.py, vasilyev_plots.py, vasilyev_results/   scan script, plot script, raw outputs.
Not done: the maps are not wired into any HTML page yet.

3. TESTS AND EXACT NUMBERS
Orbit of 7 for S={1}, Python and JS identical:
 7, 11, 17, 26, 39, 59, 89, 134, 201, 302, 453, 680, 85, 128, 1, 2, 3, 5, 8, then back to 1.
 Cycle (1, 2, 3, 5, 8). This matches the orbit quoted in the task exactly.
T_{} against ordinary Collatz with halvings merged: identical for every start 2..3000.

Cycle scan, T_S, every start 1 <= n < 1,000,000 (this range and no larger). 0 unresolved starts.
 S={}     1 cycle:  (1, 2), all 999,999 starts.
          Longest walk 152 steps, largest value 35 bits.
 S={1}    1 cycle:  (1, 2, 3, 5, 8), all 999,999 starts.
          Longest walk 86,626 steps, largest value 602 bits (start 907,482).
 S={2,3}  4 cycles: (1, 2), 472,660 starts
                    min 5, length 18, 177,032 starts:
                      5, 8, 12, 18, 9, 14, 7, 11, 17, 26, 13, 20, 30, 15, 23, 35, 53, 80
                    min 19, length 8, 66,450 starts: 19, 29, 44, 66, 33, 50, 25, 38
                    min 47, length 24, 283,857 starts:
                      47, 71, 107, 161, 242, 121, 182, 91, 137, 206, 103, 155, 233, 350, 175, 263,
                      395, 593, 890, 445, 668, 1002, 501, 752
          Longest walk 65,754 steps, largest value 492 bits (start 523,560).
 S={3}    3 cycles: (1, 2), 305,109 starts
                    (3, 5, 8, 12), 269,799 starts
                    min 103, length 39, 425,091 starts:
                      103, 155, 233, 350, 175, 263, 395, 593, 890, 445, 668, 167, 251, 377, 566, 283,
                      425, 638, 319, 479, 719, 1079, 1619, 2429, 3644, 911, 1367, 2051, 3077, 4616,
                      6924, 1731, 2597, 3896, 5844, 1461, 2192, 137, 206
          Longest walk 268 steps, largest value 38 bits.
"Longest walk" = steps before an orbit first drops below its start or closes a cycle.
Counts are "starts below 1,000,000 that end in this cycle", not densities.

Extra, not asked for: T^-_S on the same range. S={}, {2,3}, {3}: only the fixed point (1).
S={1}: fixed point (1) with 372,615 starts and cycle (2, 3) with 627,384 starts.

How the scan was checked
 - Every cycle is re-verified element by element by the scan script.
 - Fast scan equals a brute-force scan (full orbit, full cycle detection per start) for n < 20,000,
   for all four sets, T and T^-. This check caught a real bug in my first version (a cycle could be
   counted twice), which is fixed.
 - JS BigInt scan equals the Python scan, same cycles and same counts, for n < 100,000.

4. PLOTS (vasilyev_results/)
 vasilyev_S1_orbits_and_cycle.png   S={1}: orbit of 7 with every value labelled; steps to reach the
                                    cycle for every start below 3000; the longest of those orbits.
 vasilyev_collatz_vs_S1.png         S={} against S={1}: orbit of 27 under both, and steps to reach the
                                    cycle for every start below 3000 on one shared scale.
 Numbers in them: n=27 reaches (1,2) after 58 steps with peak 4,616 under S={}, and (1,2,3,5,8) after
 8 steps with peak 140 under S={1}. For starts below 3000: median 28 steps and longest 112 (n=2919)
 under S={}; median 54 and longest 12,988 (n=2970, peak a 174-bit number) under S={1}; 181 of the
 2,999 starts need more than 1,000 steps under S={1}.

5. WHAT MATCHED, WHAT DID NOT, WHAT I COULD NOT VERIFY
 Matched: the S={1} orbit of 7 and its cycle, as quoted in the task.
 Could not verify: Table 5.1 (paper not readable from here), the paper's definition of "contracting",
 and whether the paper's table uses the same range.
 Observation of mine, not from the paper: S={1} and S={2,3} have enormous excursions (602-bit and
 492-bit values from starts below a million). A heuristic average of log2 growth per odd-to-odd block
 gives -0.019 for both, against -0.415 for S={} and -0.316 for S={3}; sampling 200,000 random 300-bit
 odd numbers gave -0.017, -0.017, -0.412, -0.323. That is a heuristic about typical behaviour only.
 All four maps sent every start below 1,000,000 into one of the cycles listed. That says nothing about
 larger starts.
