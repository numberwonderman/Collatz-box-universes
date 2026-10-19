/* Prompt 2 (Grechuk 9.7): exhaustive search for D(n)-sets of size 4 and 5
 * with all elements in [1, N].
 *
 * A D(n)-set is a set of distinct positive integers in which a*b + n is a
 * perfect square for every pair.  Build the graph whose edges are such pairs
 * (a < b <= N), then list its 4- and 5-cliques.
 *
 * Edges are found by sieving k^2 - n for k = 1..K (K^2 - n <= N^2): factor
 * every value, then every divisor a with a < b = v/a <= N gives an edge.
 * Within the box [1, N] the search is complete, so "none found" means
 * "none with all elements <= N", nothing more.
 *
 * usage: dn_sets n N   -> prints quadruples/quintuples, one per line
 */
#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <string.h>
#include <math.h>

typedef uint64_t u64;
typedef unsigned __int128 u128;

static u64 mulmod(u64 a, u64 b, u64 m) { return (u64)((u128)a * b % m); }
static u64 powmod(u64 a, u64 e, u64 m) {
    u64 r = 1 % m; a %= m;
    while (e) { if (e & 1) r = mulmod(r, a, m); a = mulmod(a, a, m); e >>= 1; }
    return r;
}
/* square root of n mod odd prime p (Tonelli-Shanks); returns -1 if none */
static long sqrtmod(u64 n, u64 p) {
    n %= p;
    if (n == 0) return 0;
    if (powmod(n, (p - 1) / 2, p) != 1) return -1;
    u64 q = p - 1, s = 0;
    while (!(q & 1)) { q >>= 1; s++; }
    u64 z = 2;
    while (powmod(z, (p - 1) / 2, p) != p - 1) z++;
    u64 m = s, c = powmod(z, q, p), t = powmod(n, q, p), r = powmod(n, (q + 1) / 2, p);
    while (t != 1) {
        u64 i = 0, tt = t;
        while (tt != 1) { tt = mulmod(tt, tt, p); i++; }
        u64 b = c;
        for (u64 j = 0; j < m - i - 1; j++) b = mulmod(b, b, p);
        m = i; c = mulmod(b, b, p); t = mulmod(t, c, p); r = mulmod(r, b, p);
    }
    return (long)r;
}

#define MAXF 16
typedef struct { u64 p[MAXF]; int e[MAXF]; int nf; } fact_t;

static long N, n;
/* adjacency: for each a, sorted list of larger neighbours */
static long *deg, *cap; static long **adj;
static void add_edge(long a, long b) {
    if (deg[a] == cap[a]) { cap[a] = cap[a] ? 2 * cap[a] : 4; adj[a] = realloc(adj[a], cap[a] * sizeof(long)); }
    adj[a][deg[a]++] = b;
}
static int cmpl(const void *x, const void *y) { long a = *(long *)x, b = *(long *)y; return (a > b) - (a < b); }
static int has_edge(long a, long b) {           /* a < b */
    long lo = 0, hi = deg[a] - 1;
    while (lo <= hi) { long mid = (lo + hi) / 2; if (adj[a][mid] == b) return 1; if (adj[a][mid] < b) lo = mid + 1; else hi = mid - 1; }
    return 0;
}

static u64 cur_v;
static void divisors(fact_t *f, int i, u64 d) {
    if (i == f->nf) {
        u64 b = cur_v / d;
        if (d < b && b <= (u64)N) add_edge((long)d, (long)b);
        return;
    }
    u64 pe = 1;
    for (int e = 0; e <= f->e[i]; e++) {
        if (d * pe > cur_v / (d * pe)) break;          /* only divisors below sqrt(v) */
        divisors(f, i + 1, d * pe);
        pe *= f->p[i];
    }
}

int main(int argc, char **argv) {
    n = atol(argv[1]); N = atol(argv[2]);
    long K = (long)sqrtl((long double)N * N + n) + 1;
    while ((u64)K * K > (u64)N * N + n) K--;
    u64 *rem = malloc((K + 1) * sizeof(u64));
    fact_t *F = calloc(K + 1, sizeof(fact_t));
    for (long k = 0; k <= K; k++) rem[k] = (u64)k * k > (u64)n ? (u64)k * k - n : 0;

    long P = K + 1;                                 /* primes up to sqrt(max v) */
    char *comp = calloc(P + 1, 1);
    for (long p = 2; p <= P; p++) {
        if (comp[p]) continue;
        for (long q = p * p; q <= P; q += p) comp[q] = 1;
        long roots[2]; int nr = 0;
        if (p == 2) roots[nr++] = n & 1;
        else { long r = sqrtmod(n, p); if (r >= 0) { roots[nr++] = r; if (r != 0) roots[nr++] = p - r; } }
        for (int j = 0; j < nr; j++)
            for (long k = roots[j]; k <= K; k += p) {
                if (rem[k] == 0 || rem[k] % p) continue;
                int e = 0; while (rem[k] % p == 0) { rem[k] /= p; e++; }
                fact_t *f = &F[k]; f->p[f->nf] = p; f->e[f->nf] = e; f->nf++;
            }
    }
    deg = calloc(N + 1, sizeof(long)); cap = calloc(N + 1, sizeof(long)); adj = calloc(N + 1, sizeof(long *));
    long edges = 0;
    for (long k = 1; k <= K; k++) {
        if ((u64)k * k <= (u64)n) continue;
        fact_t *f = &F[k];
        if (rem[k] > 1) { f->p[f->nf] = rem[k]; f->e[f->nf] = 1; f->nf++; }  /* leftover prime */
        cur_v = (u64)k * k - n;
        divisors(f, 0, 1);
    }
    for (long a = 1; a <= N; a++) { qsort(adj[a], deg[a], sizeof(long), cmpl); edges += deg[a]; }

    long n4 = 0, n5 = 0;
    long *c3 = malloc(N * sizeof(long));
    for (long a = 1; a <= N; a++)
        for (long i = 0; i < deg[a]; i++) {
            long b = adj[a][i], m = 0;
            for (long j = i + 1; j < deg[a]; j++) if (has_edge(b, adj[a][j])) c3[m++] = adj[a][j];
            for (long x = 0; x < m; x++) for (long y = x + 1; y < m; y++) {
                long c = c3[x], d = c3[y];
                if (!has_edge(c, d)) continue;
                printf("4 %ld %ld %ld %ld\n", a, b, c, d); n4++;
                for (long z = y + 1; z < m; z++) {
                    long e = c3[z];
                    if (has_edge(c, e) && has_edge(d, e)) { printf("5 %ld %ld %ld %ld %ld\n", a, b, c, d, e); n5++; }
                }
            }
        }
    fprintf(stderr, "n=%ld N=%ld edges=%ld quadruples=%ld quintuples=%ld\n", n, N, edges, n4, n5);
    return 0;
}
