/* Prompt 4 (Grechuk 9.2): maximal prime gaps up to LIMIT.
 *
 * Segmented sieve of Eratosthenes over odd numbers.  Prints one line per
 * maximal gap (a gap strictly larger than every earlier gap):
 *     gap  p  next_prime
 * plus a final "# total primes" line as a sanity check (pi(10^10) = 455052511).
 *
 * usage: prime_gaps LIMIT
 */
#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <string.h>
#include <math.h>

typedef uint64_t u64;
#define SEG (1u << 20)                 /* odd numbers per segment */

int main(int argc, char **argv) {
    u64 limit = argc > 1 ? strtoull(argv[1], 0, 10) : 10000000000ULL;
    u64 r = (u64)sqrtl((long double)limit) + 1;

    /* base primes up to sqrt(limit) */
    char *small = calloc(r + 1, 1);
    u64 *bp = malloc((r / 2 + 2) * sizeof(u64)), nbp = 0;
    for (u64 i = 3; i <= r; i += 2) {
        if (small[i]) continue;
        bp[nbp++] = i;
        for (u64 j = i * i; j <= r; j += 2 * i) small[j] = 1;
    }
    u64 *next = malloc(nbp * sizeof(u64));     /* next odd multiple to cross off */
    for (u64 k = 0; k < nbp; k++) next[k] = bp[k] * bp[k];

    unsigned char *seg = malloc(SEG);
    u64 last = 2, maxgap = 0, count = 1;       /* the prime 2 is counted here */
    for (u64 lo = 3; lo <= limit; lo += 2 * (u64)SEG) {
        u64 hi = lo + 2 * (u64)SEG;            /* segment covers odd n in [lo, hi) */
        if (hi > limit + 1) hi = limit + 1;
        memset(seg, 0, SEG);
        for (u64 k = 0; k < nbp; k++) {
            u64 p = bp[k], m = next[k];
            if (m >= hi) continue;
            for (; m < hi; m += 2 * p) seg[(m - lo) >> 1] = 1;
            next[k] = m;
        }
        for (u64 n = lo; n < hi; n += 2) {
            if (seg[(n - lo) >> 1]) continue;
            count++;
            u64 g = n - last;
            if (g > maxgap) { maxgap = g; printf("%llu %llu %llu\n", (unsigned long long)g, (unsigned long long)last, (unsigned long long)n); }
            last = n;
        }
    }
    printf("# total primes up to %llu: %llu\n", (unsigned long long)limit, (unsigned long long)count);
    return 0;
}
