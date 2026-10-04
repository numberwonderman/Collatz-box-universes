/**
 * EOC three-class realizer toolkit for the accelerated 3x+1 map
 *     T(m) = (3m + 1) / 2^a(m),   a(m) = v2(3m + 1),   m odd.
 *
 * Notation follows De Jesus, "A Global Occupation Conjecture for the
 * Accelerated 3x+1 Map", Rev. 7 (DOI 10.5281/zenodo.22906673):
 *   word D = (d_0, ..., d_{N-1}),  S_n = d_0 + ... + d_{n-1},  alpha = log2 3
 *   drift            R_n = S_n - n*alpha
 *   occupation       O_c = #{n : R_n <= c}
 *   lifetime         L_c = max{N : R_j <= c for all j <= N}
 *   carry sum        C_N = sum_j 3^(N-1-j) 2^(S_j)
 *   least realizer   r(D), the least positive member of the single realizing
 *                    class mod 2^(S_N + 1)                         (Prop. 5.2)
 *   endpoint depth   E(D) = S_N - log2 r(D)                        (Sec. 5.4)
 *   height amort.    rho_N = log2 H / S_N                          (Obs. 5.9)
 *
 * Classes generated:
 *   periodic  - mechanical words w_{p,q} at the convergents of beta = log3 2
 *   sturmian  - Beatty/Sturmian words; the critical one at intercept 0 is the
 *               word 1c_beta of De Jesus, "The 3x+1 conjugacy map sends every
 *               Sturmian word to an irrational 2-adic integer"
 *               (DOI 10.5281/zenodo.23108370)
 *   actual    - real orbits: delay/glide record holders (whole orbit), or
 *               L_1 lifetime record holders (their confined episode)
 *   ordinary  - control: non-record orbits matched to the actual ones on word
 *               length N (or valuation depth S_N); for L_1 episodes, the next
 *               non-record seed with the same lifetime
 *   generic   - control: random words with P(d = k) = 2^-k
 */

export const LOG2_3 = Math.log2(3);
/** beta = log3 2: the critical ones-density of a parity word. */
export const BETA = 1 / LOG2_3;

/** 2-adic valuation of a positive BigInt. */
export function v2(x) {
    let a = 0;
    while ((x & 1n) === 0n) {
        x >>= 1n;
        a++;
    }
    return a;
}

/** One step of the accelerated map on an odd BigInt; returns { next, a }. */
export function accelStep(m) {
    const u = 3n * m + 1n;
    const a = v2(u);
    return { next: u >> BigInt(a), a };
}

/** log2 of a positive BigInt, accurate to double precision. */
export function log2Big(x) {
    const bits = x.toString(2).length;
    if (bits <= 53) return Math.log2(Number(x));
    const shift = BigInt(bits - 53);
    return Math.log2(Number(x >> shift)) + Number(shift);
}

/** Inverse of an odd BigInt modulo 2^k (Newton iteration). */
function invMod2k(x, k) {
    const mod = 1n << BigInt(k);
    let y = 1n;
    for (let bits = 1; bits < k; bits *= 2) {
        y = (y * (2n - x * y)) % mod;
    }
    return ((y % mod) + mod) % mod;
}

function gcdBig(a, b) {
    a = a < 0n ? -a : a;
    b = b < 0n ? -b : b;
    while (b) [a, b] = [b, a % b];
    return a;
}

/** Carry sum C_N(D) = sum_{j<N} 3^(N-1-j) 2^(S_j), via C_{n+1} = 3 C_n + 2^(S_n). */
export function carrySum(word) {
    let C = 0n, S = 0n;
    for (const d of word) {
        C = 3n * C + (1n << S);
        S += BigInt(d);
    }
    return C;
}

/**
 * Least positive realizer of a valuation word.
 * Lifts the residue class one valuation at a time: after step i the class
 * is r mod 2^(S_i + 1) and `cur` = T^i(r) is odd.
 * @param {number[]} word valuations d_i >= 1
 * @returns {{ realizer: bigint, modulusBits: number, image: bigint }}
 */
export function leastRealizer(word) {
    let r = 1n;        // m odd
    let k = 1;         // r is a class mod 2^k, k = S_{i-1} + 1
    let cur = 1n;      // T^{i-1}(r)
    let pow3 = 1n;     // 3^{i-1}
    for (const a of word) {
        if (!Number.isInteger(a) || a < 1) throw new Error(`invalid valuation ${a}`);
        // Candidates m = r + t*2^k give T^{i-1}(m) = cur + 2*3^{i-1}*t.
        // Need v2(3*cur + 1 + 2*3^i*t) = a, i.e. (u/2) + 3^i t == 2^(a-1) mod 2^a.
        const half = (3n * cur + 1n) >> 1n;
        const modA = 1n << BigInt(a);
        const pow3i = pow3 * 3n;
        let t = ((1n << BigInt(a - 1)) - half) % modA;
        t = (((t + modA) % modA) * invMod2k(pow3i % modA, a)) % modA;
        r += t << BigInt(k);
        const m = cur + 2n * pow3 * t;
        cur = (3n * m + 1n) >> BigInt(a);
        k += a;
        pow3 = pow3i;
    }
    return { realizer: r, modulusBits: k, image: cur };
}

/** First n accelerated valuations of odd m, plus the orbit m_0..m_n. */
export function accelOrbit(m, n) {
    const orbit = [m];
    const word = [];
    for (let i = 0; i < n; i++) {
        const { next, a } = accelStep(m);
        word.push(a);
        orbit.push(next);
        m = next;
    }
    return { orbit, word };
}

/** Accelerated orbit of odd m until it reaches 1. */
export function accelOrbitToOne(m, maxSteps = 100000) {
    const orbit = [m];
    const word = [];
    while (m !== 1n && word.length < maxSteps) {
        const { next, a } = accelStep(m);
        word.push(a);
        orbit.push(next);
        m = next;
    }
    return { orbit, word };
}

// ---------- Words ----------

/**
 * Beatty / mechanical valuation word of slope lambda in (1, 2) and intercept rho:
 * d_j = floor((j+1) lambda + rho) - floor(j lambda + rho).
 * With lambda = log2 3 and rho = 0 this is the accelerated form of 1c_beta
 * (its parity ones sit at floor(j alpha)).
 */
export function beattyWord(lambda, rho, N) {
    const w = [];
    for (let j = 0; j < N; j++) {
        w.push(Math.floor((j + 1) * lambda + rho) - Math.floor(j * lambda + rho));
    }
    return w;
}

/**
 * Valuation form of the periodic mechanical parity word w_{p,q} (p ones in q
 * letters, ones at floor(j q / p)): d_j = floor((j+1)q/p) - floor(jq/p),
 * period p, block sum q. Repeated to length N.
 */
export function periodicWord(p, q, N) {
    const w = [];
    for (let n = 0; n < N; n++) {
        const j = n % p;
        w.push(Math.floor((j + 1) * q / p) - Math.floor(j * q / p));
    }
    return w;
}

/** Parity vector of a valuation word: each d becomes 1 0^(d-1). */
export function toParity(word) {
    const v = [];
    for (const d of word) {
        v.push(1);
        for (let i = 1; i < d; i++) v.push(0);
    }
    return v;
}

/** Longest common prefix length of two arrays. */
export function lcp(a, b) {
    let i = 0;
    while (i < a.length && i < b.length && a[i] === b[i]) i++;
    return i;
}

/** Exact continued-fraction convergents of beta = log3 2, decided by 3^p vs 2^q. */
export function betaConvergents(count) {
    // Partial quotients of log3 2 = [0; 1, 1, 1, 2, 2, 3, 1, 5, 2, 23, 2, 2, 1, 1, ...].
    const pq = [0, 1, 1, 1, 2, 2, 3, 1, 5, 2, 23, 2, 2, 1, 1];
    const out = [];
    let h0 = 1, h1 = 0, k0 = 0, k1 = 1;
    for (let i = 0; i < Math.min(count, pq.length); i++) {
        [h0, h1] = [pq[i] * h0 + h1, h0];
        [k0, k1] = [pq[i] * k0 + k1, k0];
        // p/q < beta  <=>  p < q log3 2  <=>  3^p < 2^q
        const below = 3n ** BigInt(h0) < 2n ** BigInt(k0);
        out.push({ n: i, p: h0, q: k0, side: below ? 'below' : 'above' });
    }
    return out;
}

/** Seeded PRNG (mulberry32) so the generic control class is reproducible. */
export function mulberry32(seed) {
    return function () {
        seed |= 0;
        seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** Random valuation word with P(d = k) = 2^-k (law of a uniformly random odd m). */
export function geometricWord(N, rand) {
    const w = [];
    for (let i = 0; i < N; i++) {
        let a = 1;
        while (rand() < 0.5 && a < 40) a++;
        w.push(a);
    }
    return w;
}

// ---------- Orbit functionals ----------

/** Standard (non-accelerated) delay and glide of n. */
export function delayAndGlide(n) {
    let x = n, delay = 0, glide = 0;
    while (x !== 1) {
        x = x % 2 === 0 ? x / 2 : 3 * x + 1;
        delay++;
        if (glide === 0 && x < n) glide = delay;
    }
    return { delay, glide };
}

/** Delay-record and glide-record holders up to limit (odd ones only, > 1). */
export function recordHolders(limit) {
    const delay = [], glide = [];
    let bestD = -1, bestG = -1;
    for (let n = 2; n <= limit; n++) {
        const { delay: d, glide: g } = delayAndGlide(n);
        if (d > bestD) { bestD = d; if (n % 2 === 1) delay.push({ n, delay: d, glide: g }); }
        if (g > bestG) { bestG = g; if (n % 2 === 1) glide.push({ n, delay: d, glide: g }); }
    }
    return { delay, glide };
}

/**
 * Single-window lifetime L_c(m) = max{N : R_j <= c for all j <= N}, using the
 * exact integral test R_j <= c  <=>  2^(S_j) <= 2^c 3^j (c an integer).
 */
export function lifetime(m, c = 1) {
    let x = BigInt(m), S = 0n, pow3 = 1n, L = 0;
    const cB = BigInt(c);
    for (;;) {
        const { next, a } = accelStep(x);
        S += BigInt(a);
        pow3 *= 3n;
        if ((1n << S) > (pow3 << cB)) return L;
        L++;
        x = next;
    }
}

/** Odd m in [3, limit] that set a new record for L_c (record chronology, Prop. 6.4). */
export function lifetimeRecords(limit, c = 1) {
    const out = [];
    let best = -1;
    for (let m = 3; m <= limit; m += 2) {
        const L = lifetime(m, c);
        if (L > best) { best = L; out.push({ n: m, L }); }
    }
    return out;
}

/**
 * Occupation O_c(m) = #{n >= 0 : R_n <= c} of the full orbit of odd m, counted
 * with the exact test 2^(S_n) <= 2^c 3^n and continued past 1 (where each step
 * adds 2 - alpha > 0 to R, so only finitely many more indices can count).
 */
export function occupation(m, c = 1) {
    let x = BigInt(m), S = 0n, pow3 = 1n, O = 1; // n = 0: R_0 = 0 <= c
    const cB = BigInt(c);
    for (;;) {
        const { next, a } = accelStep(x);
        S += BigInt(a);
        pow3 *= 3n;
        const inside = (1n << S) <= (pow3 << cB);
        if (inside) O++;
        else if (x === 1n) return O;
        x = next;
    }
}

/**
 * Height amortization rho_N = log2 H / S_N (Obs. 5.9). For a periodic word with
 * block X (length p, sum sigma) the realizer condition collapses to the fixed pair
 * (C(X), 3^p - 2^sigma); for any other word only (C_N, 3^N) is available.
 */
export function heightAmortization(word, period) {
    const SN = word.reduce((s, d) => s + d, 0);
    let A, L;
    if (period) {
        const X = word.slice(0, period);
        A = carrySum(X);
        L = 3n ** BigInt(period) - (1n << BigInt(X.reduce((s, d) => s + d, 0)));
        const g = gcdBig(A, L);
        A /= g; L /= g;
    } else {
        A = carrySum(word);
        L = 3n ** BigInt(word.length);
    }
    const absA = A < 0n ? -A : A, absL = L < 0n ? -L : L;
    return log2Big(absA > absL ? absA : absL) / SN;
}

/** Statistics of one trajectory (word + orbit of its realizer). */
export function trajectoryStats(word, orbit, { period = 0, c = 1 } = {}) {
    const N = word.length;
    const S = [0];
    for (const a of word) S.push(S[S.length - 1] + a);
    const SN = S[N];
    const mu = SN / N;

    let balance = 0;          // max |S_i - i*mu|: Sturmian/mechanical words keep this < 1
    let Rmin = 0, Rmax = 0, occ = 0, life = -1;
    for (let i = 0; i <= N; i++) {
        balance = Math.max(balance, Math.abs(S[i] - i * mu));
        const R = S[i] - i * LOG2_3;
        Rmin = Math.min(Rmin, R);
        Rmax = Math.max(Rmax, R);
        if (R <= c + 1e-12) { occ++; if (life === i - 1) life = i; }
    }

    // Factor complexity at length L (Sturmian: L + 1).
    const factors = (L) => {
        const seen = new Set();
        for (let i = 0; i + L <= N; i++) seen.add(word.slice(i, i + L).join(','));
        return seen.size;
    };

    // Residue occupation of orbit values mod 8 (classes 1, 3, 5, 7).
    // m == 3,7 (mod 8) <=> d = 1;  m == 1 <=> d = 2;  m == 5 <=> d >= 3.
    const occ8 = { 1: 0, 3: 0, 5: 0, 7: 0 };
    for (let i = 0; i < N; i++) occ8[Number(orbit[i] % 8n)]++;
    for (const k in occ8) occ8[k] /= N;

    const heights = orbit.map(log2Big);
    const h0 = heights[0];
    const hMax = Math.max(...heights);

    return {
        N, SN, mu, balance,
        balanceRootN: balance / Math.sqrt(N),
        RN: S[N] - N * LOG2_3, Rmin, Rmax,
        occupationFrac: occ / (N + 1),
        lifetime: life,
        complexity: { 4: factors(4), 8: factors(8), 12: factors(12) },
        occupancy: occ8,
        startBits: h0,
        peakRatio: hMax / Math.max(h0, 1e-9),
        maxA: Math.max(...word),
        endpointDepth: SN - h0,            // E(D) = S - log2 r(D)
        rho: heightAmortization(word, period),
    };
}

/** Build a trajectory record (word, orbit, realizer, stats) for a given word. */
export function realizerTrajectory(word, meta) {
    const { realizer, modulusBits } = leastRealizer(word);
    const { orbit, word: check } = accelOrbit(realizer, word.length);
    for (let i = 0; i < word.length; i++) {
        if (check[i] !== word[i]) throw new Error('realizer does not reproduce word');
    }
    return {
        ...meta, word, orbit, realizer, modulusBits,
        stats: trajectoryStats(word, orbit, { period: meta.period }),
    };
}

/** Build a trajectory record for the first `len` steps (default: to 1) of the actual orbit of odd n. */
export function actualTrajectory(n, meta, len) {
    const { orbit, word } = len === undefined ? accelOrbitToOne(BigInt(n)) : accelOrbit(BigInt(n), len);
    const { realizer, modulusBits } = leastRealizer(word);
    const t = { ...meta, word, orbit, realizer, modulusBits, stats: trajectoryStats(word, orbit) };
    t.selection = selectionStats(t);
    return t;
}

/**
 * Selection-effect bookkeeping for a word D read off the orbit of its own seed m0.
 * m0 realizes D, so r(D) == m0 (mod 2^(S_N+1)) and r(D) <= m0; whenever
 * m0 < 2^(S_N+1) this forces r(D) = m0, i.e. residual log2(m0 / r(D)) = 0.
 * Then E(D) = S_N - log2 m0 = N log2 3 + E_N - log2 m_N exactly (Lem. 2.2), where
 * E_N = sum_{i<N} log2(1 + 1/(3 m_i)) is the carry excess.
 */
export function selectionStats(t) {
    const N = t.word.length, SN = t.stats.SN;
    const log2m0 = log2Big(t.orbit[0]);
    const log2r = log2Big(t.realizer);
    let carryExcess = 0;
    for (let i = 0; i < N; i++) carryExcess += Math.log2(1 + 1 / (3 * Number(t.orbit[i])));
    const E = t.stats.endpointDepth;
    return {
        log2m0, log2r,
        residual: log2m0 - log2r,
        seedBelowModulus: log2m0 < SN + 1,
        EperS: E / SN,
        EperN: E / N,
        trivialFloor: 1 - log2m0 / SN,            // E(D)/S_N >= this, automatically
        carryExcess,
        identityGap: E - (N * LOG2_3 + carryExcess - log2Big(t.orbit[N])),
    };
}

/** Uniform random odd BigInt with exactly `bits` bits. */
export function randomOddBig(bits, rand) {
    let x = 1n;
    for (let i = 1; i < bits; i++) x = (x << 1n) | (rand() < 0.5 ? 1n : 0n);
    return x | 1n;
}

function shortBig(m) {
    const s = m.toString();
    return s.length > 12 ? `${s.slice(0, 5)}…${s.slice(-3)} (${s.length} digits)` : s;
}

/**
 * Ordinary (non-record) orbits matched to record holders.
 * Full orbits: random odd seeds whose orbit to 1 has the same word length N
 * (matchOn 'N') or the same valuation depth S_N (matchOn 'S'); seeds in the
 * record set are rejected. L_1 episodes: the next odd seed above the record with
 * the same lifetime L_1 (it cannot be a record, since L_1 = L was already reached).
 */
export function ordinaryMatched(actual, { actualKind = 'delay', matchOn = 'N', seed = 7, exclude = new Set(),
    maxTries = 20000, scanBudget = 300000 } = {}) {
    const rand = mulberry32(seed);
    const list = [];
    let unmatched = 0;
    for (const t of actual) {
        const n = t.orbit[0];
        let found = null;
        if (actualKind === 'lifetime') {
            const L = t.word.length;
            for (let m = n + 2n, k = 0; k < scanBudget; m += 2n, k++) {
                if (lifetime(m, 1) === L) { found = actualTrajectory(m, { tag: `next seed above n=${n} with L1=${L}` }, L); break; }
            }
        } else {
            const target = matchOn === 'S' ? t.stats.SN : t.word.length;
            const b0 = Math.round(target / (matchOn === 'S' ? 4.82 : 2.41)); // E[N] ~ 2.41 log2 m0, E[S_N] ~ 4.82 log2 m0
            for (let k = 0; k < maxTries && !found; k++) {
                const m = randomOddBig(Math.max(3, b0 + Math.floor(rand() * 7) - 3), rand);
                if (m === 1n || exclude.has(m)) continue;
                let x = m, N = 0, S = 0;
                while (x !== 1n && (matchOn === 'S' ? S : N) < target) {
                    const { next, a } = accelStep(x);
                    x = next; N++; S += a;
                }
                if (x === 1n && (matchOn === 'S' ? S : N) === target) {
                    found = actualTrajectory(m, { tag: `random seed matched to n=${n} on ${matchOn === 'S' ? 'S_N' : 'N'}` });
                }
            }
        }
        if (found) {
            found.cls = 'ordinary';
            found.matchedTo = n;
            found.label = `m=${shortBig(found.orbit[0])} (N=${found.word.length}, matches n=${n})`;
            list.push(found);
        } else {
            unmatched++;
        }
    }
    return { list, unmatched };
}

/**
 * Generate the three classes plus the generic control.
 * @param {object} o
 * @param {number} o.N            synthetic word length
 * @param {number} o.recordLimit  search limit for actual record holders
 * @param {'delay'|'lifetime'} o.actualKind  which extremal orbits to use
 */
export function buildThreeClasses({ N = 120, recordLimit = 1000000, actualKind = 'delay', matchOn = 'N', seed = 2026 } = {}) {
    const periodic = [];
    // Convergents p_n/q_n of beta with n >= 3 (Theorem 5.3 range), period p_n <= N.
    for (const cv of betaConvergents(12)) {
        if (cv.n < 3 || cv.p > N) continue;
        periodic.push(realizerTrajectory(periodicWord(cv.p, cv.q, N), {
            cls: 'periodic', label: `w(${cv.p}/${cv.q}) convergent n=${cv.n}`, gen: { type: 'periodic', p: cv.p, q: cv.q },
            tag: `critical, ${cv.side} beta`, period: cv.p, convergent: cv,
        }));
    }
    for (const [p, q] of [[2, 3], [3, 7]]) {
        periodic.push(realizerTrajectory(periodicWord(p, q, N), {
            cls: 'periodic', label: `w(${p}/${q})`, tag: 'off-critical', period: p, gen: { type: 'periodic', p, q },
        }));
    }

    const sturmian = [];
    const slopes = [
        { lambda: LOG2_3, name: 'log2 3', tag: 'critical' },
        { lambda: (1 + Math.sqrt(5)) / 2, name: 'phi', tag: 'off-critical' },
        { lambda: Math.SQRT2, name: 'sqrt 2', tag: 'off-critical' },
    ];
    for (const { lambda, name, tag } of slopes) {
        const rhos = tag === 'critical' ? [0, 0.2071, 0.4142, 0.6213, 0.8284] : [0, 0.4142];
        for (const rho of rhos) {
            sturmian.push(realizerTrajectory(beattyWord(lambda, rho, N), {
                cls: 'sturmian', gen: { type: 'beatty', lambda, rho },
                label: rho === 0 && tag === 'critical' ? '1c_beta (slope log2 3, rho=0)' : `slope ${name}, rho=${rho}`,
                tag,
            }));
        }
    }

    const actual = [];
    const recordSeeds = new Set();
    if (actualKind === 'lifetime') {
        for (const r of lifetimeRecords(recordLimit, 1)) {
            if (r.L < 4) continue;
            actual.push(actualTrajectory(r.n, {
                cls: 'actual', label: `n=${r.n} (L1=${r.L})`, tag: 'L1 lifetime record, confined episode',
            }, r.L));
        }
    } else {
        const { delay, glide } = recordHolders(recordLimit);
        for (const r of [...delay, ...glide]) recordSeeds.add(BigInt(r.n));
        const seen = new Set();
        for (const r of [...delay, ...glide]) {
            if (r.n < 27 || seen.has(r.n)) continue;
            seen.add(r.n);
            const isDelay = delay.some(d => d.n === r.n);
            const isGlide = glide.some(g => g.n === r.n);
            const t = actualTrajectory(r.n, {
                cls: 'actual', label: `n=${r.n} (delay ${r.delay}, glide ${r.glide})`,
                tag: isDelay && isGlide ? 'delay+glide record' : isDelay ? 'delay record' : 'glide record',
            });
            t.occupationTotal = occupation(r.n, 1);
            actual.push(t);
        }
        actual.sort((x, y) => Number(x.orbit[0] - y.orbit[0]));
    }

    // Control: generic words with the same lengths as the actual trajectories.
    const rand = mulberry32(seed);
    const generic = actual.map((t, i) => realizerTrajectory(geometricWord(t.word.length, rand), {
        cls: 'generic', label: `random word #${i + 1} (N=${t.word.length})`, tag: 'control',
    }));

    // Control: ordinary orbits matched to the actual ones.
    const { list: ordinary, unmatched } = ordinaryMatched(actual, { actualKind, matchOn, exclude: recordSeeds });
    const out = { periodic, sturmian, actual, ordinary, generic };
    Object.defineProperty(out, 'meta', { value: { actualKind, matchOn, unmatchedOrdinary: unmatched, recordLimit } });
    return out;
}

// ---------- Near-record control ----------
//
// Records are essentially unique at their exact (N, S_N): since
// S_N = N log2 3 + log2 m0 + E_N, fixing both pins the seed size to within the
// carry excess. So the control matches on N (within +-dN) and on
// kappa = log2 m0 / N, which fixes the mean valuation via
// mu = log2 3 + kappa + E_N / N, and then removes the remaining kappa / N
// trend by a local linear fit over the K nearest non-record neighbours.

/**
 * Accelerated length N(m) and valuation sum S_N(m) of the orbit to 1 for every
 * odd m <= M (index (m - 1) / 2). Number arithmetic: orbit values stay far
 * below 2^53 for M up to ~1e8.
 */
export function seedTables(M) {
    const size = (M + 1) >> 1;
    const len = new Uint16Array(size), sum = new Uint16Array(size);
    for (let m = 3; m <= M; m += 2) {
        let x = m, n = 0, S = 0;
        while (x >= m) {
            let u = 3 * x + 1;
            while ((u & 1) === 0) { u /= 2; S++; }
            x = u; n++;
        }
        const j = (x - 1) >> 1;
        len[(m - 1) >> 1] = n + len[j];
        sum[(m - 1) >> 1] = S + sum[j];
    }
    return { M, len, sum, N: m => len[(m - 1) >> 1], S: m => sum[(m - 1) >> 1] };
}

/**
 * Odd seeds <= M to exclude as (possible) records: every odd m that sets a new
 * maximum of the standard delay N + S_N among odd seeds, or of the standard
 * glide. Ignoring even seeds can only add non-records, so the set contains
 * every odd delay or glide record holder <= M.
 */
export function recordExclusion(tables) {
    const out = new Set();
    let bestD = 0, bestG = 0;
    for (let m = 3; m <= tables.M; m += 2) {
        const d = tables.N(m) + tables.S(m);
        if (d > bestD) { bestD = d; out.add(m); }
        let x = m, g = 0;
        do { x = x % 2 ? 3 * x + 1 : x / 2; g++; } while (x >= m);
        if (g > bestG) { bestG = g; out.add(m); }
    }
    return out;
}

/** Exact two-sided sign test p-value for k successes out of n. */
export function signTestP(k, n) {
    if (n === 0) return 1;
    const lo = Math.min(k, n - k);
    let p = 0, c = 1;
    for (let i = 0; i <= lo; i++) {
        if (i > 0) c = c * (n - i + 1) / i;
        p += c / 2 ** n;
    }
    return Math.min(1, 2 * p);
}

function olsFit(X, y) {
    const p = X[0].length;
    const A = Array.from({ length: p }, () => new Array(p).fill(0)), b = new Array(p).fill(0);
    for (let i = 0; i < X.length; i++) {
        for (let j = 0; j < p; j++) {
            b[j] += X[i][j] * y[i];
            for (let k = 0; k < p; k++) A[j][k] += X[i][j] * X[i][k];
        }
    }
    for (let j = 0; j < p; j++) A[j][j] += 1e-12;
    for (let c = 0; c < p; c++) {
        let piv = c;
        for (let r = c + 1; r < p; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
        [A[c], A[piv]] = [A[piv], A[c]];
        [b[c], b[piv]] = [b[piv], b[c]];
        for (let r = 0; r < p; r++) {
            if (r === c) continue;
            const f = A[r][c] / A[c][c];
            for (let k = c; k < p; k++) A[r][k] -= f * A[c][k];
            b[r] -= f * b[c];
        }
    }
    return b.map((v, j) => v / A[j][j]);
}

/** Statistics compared by the near-record control. `pinned` ones are fixed by (N, kappa) up to E_N / N. */
export const NEAR_STATS = [
    { key: 'occ', name: 'Fraction of steps with R ≤ 1', f: s => s.occupationFrac },
    { key: 'L1', name: 'Lifetime L₁ from the seed', f: s => s.lifetime },
    { key: 'big', name: 'Frequency of d ≥ 3 (= occupation of 5 mod 8)', f: s => s.occupancy[5] },
    { key: 'maxA', name: 'Max valuation', f: s => s.maxA },
    { key: 'disc', name: 'Discrepancy max|Sᵢ − iμ| / √N', f: s => s.balanceRootN },
    { key: 'rise', name: 'Max rise max log₂(mᵢ/m₀) (bits)', f: s => s.startBits * (s.peakRatio - 1) },
    { key: 'mu', name: 'Mean valuation μ (pinned: log₂3 + κ + E_N/N)', f: s => s.mu, pinned: true },
];

/**
 * Near-record control for full-orbit record holders.
 * For each record (n, N): the K non-record odd seeds m <= M with |N(m) - N| <= dN
 * closest in kappa = log2 m / N(m); each statistic is fitted on the neighbours as
 * a + b (kappa - kappa_n) + c (N(m) - N), and the record's residual from a is
 * reported in units of the neighbours' residual standard deviation (z).
 */
export function nearRecordControl(actual, { M = 8000000, K = 50, dN = 3, tables, exclude } = {}) {
    tables = tables || seedTables(M);
    exclude = exclude || recordExclusion(tables);
    const byN = new Map();
    for (let m = 3; m <= tables.M; m += 2) {
        if (exclude.has(m)) continue;
        const L = tables.N(m);
        if (!byN.has(L)) byN.set(L, []);
        byN.get(L).push(m);
    }
    const perRecord = [];
    const z = Object.fromEntries(NEAR_STATS.map(st => [st.key, []]));
    for (const t of actual) {
        const n = Number(t.orbit[0]), N = t.word.length, SN = t.stats.SN;
        const kappa = Math.log2(n) / N;
        // Exact (N, S_N) peers among all non-record seeds <= M.
        let exactPeers = 0;
        for (const m of byN.get(N) || []) if (m !== n && tables.S(m) === SN) exactPeers++;
        const cand = [];
        for (let L = N - dN; L <= N + dN; L++) {
            for (const m of byN.get(L) || []) if (m !== n) cand.push({ d: Math.abs(Math.log2(m) / L - kappa), m, L });
        }
        cand.sort((a, b) => a.d - b.d);
        const nb = cand.slice(0, K).map(c => {
            const { orbit, word } = accelOrbitToOne(BigInt(c.m));
            return { m: c.m, L: c.L, kappa: Math.log2(c.m) / c.L, stats: trajectoryStats(word, orbit) };
        });
        const row = {
            n, N, SN, kappa, exactPeers, neighbours: nb.length, neighbourSeeds: nb.map(o => o.m),
            maxDeltaKappa: nb.length ? Math.max(...nb.map(o => Math.abs(o.kappa - kappa))) : NaN,
            deltaLog2: nb.length ? [Math.min(...nb.map(o => Math.log2(o.m / n))), Math.max(...nb.map(o => Math.log2(o.m / n)))] : null,
            z: {},
        };
        if (nb.length >= 5) {
            const X = nb.map(o => [1, o.kappa - kappa, o.L - N]);
            for (const st of NEAR_STATS) {
                const y = nb.map(o => st.f(o.stats));
                const beta = olsFit(X, y);
                const res = y.map((v, i) => v - (beta[0] + beta[1] * X[i][1] + beta[2] * X[i][2]));
                const sd = Math.sqrt(res.reduce((a, r) => a + r * r, 0) / Math.max(1, res.length - 3));
                const zz = sd > 0 ? (st.f(t.stats) - beta[0]) / sd : 0;
                row.z[st.key] = zz;
                z[st.key].push(zz);
            }
        }
        perRecord.push(row);
    }
    const summary = NEAR_STATS.map(st => {
        const zs = z[st.key], sorted = [...zs].sort((a, b) => a - b);
        const pos = zs.filter(v => v > 0).length, neg = zs.filter(v => v < 0).length;
        return {
            ...st, n: zs.length,
            medianZ: sorted.length ? sorted[sorted.length >> 1] : NaN,
            meanZ: zs.length ? zs.reduce((a, b) => a + b, 0) / zs.length : NaN,
            pos, neg, p: signTestP(pos, pos + neg),
        };
    });
    const free = summary.filter(s => !s.pinned).length;
    return { M: tables.M, K, dN, perRecord, summary, bonferroni: 0.05 / free };
}

/** Per-class summary of the selection-effect quantities (actual-orbit classes only). */
export function selectionSummary(classes) {
    const out = {};
    for (const c of ['actual', 'ordinary']) {
        const list = classes[c] || [];
        if (!list.length) continue;
        const pick = f => meanStd(list.map(t => f(t.selection)));
        out[c] = {
            count: list.length,
            maxAbsResidual: Math.max(...list.map(t => Math.abs(t.selection.residual))),
            allSeedsBelowModulus: list.every(t => t.selection.seedBelowModulus),
            EperS: pick(s => s.EperS),
            EperN: pick(s => s.EperN),
            log2m0PerS: pick(s => 1 - s.trivialFloor),
            carryExcess: pick(s => s.carryExcess),
            maxIdentityGap: Math.max(...list.map(t => Math.abs(t.selection.identityGap))),
        };
    }
    return out;
}

/** 2-adic agreement of 1c_beta with its convergent periodic words (Sturmian paper, Thm 5.3). */
export function depthLawTable(maxN = 9) {
    const conv = betaConvergents(maxN + 2);
    const rows = [];
    for (let n = 3; n <= maxN; n++) {
        const { p, q, side } = conv[n];
        const qNext = conv[n + 1].q;
        const predicted = n % 2 === 0 ? q - 1 : q + qNext - 1;
        const len = Math.ceil((predicted + 8) / LOG2_3) + 4; // valuation letters covering enough parity
        const sParity = toParity(beattyWord(LOG2_3, 0, len));
        const wParity = toParity(periodicWord(p, q, len));
        const observed = lcp(sParity, wParity);
        // Independent 2-adic check: v2 of the difference of the two least realizers.
        const rs = leastRealizer(beattyWord(LOG2_3, 0, len)).realizer;
        const rw = leastRealizer(periodicWord(p, q, len)).realizer;
        rows.push({ n, p, q, side, predicted, observed, twoAdic: v2(rs > rw ? rs - rw : rw - rs) });
    }
    return rows;
}

// ---------- Carry-walk residue tower ----------
//
// For q = p^e (p prime, p not dividing 6) the carry sum factors through the
// multiplicative walk u_0 = 1, u_{j+1} = u_j * 2^(d_j) * 3^-1 on K_e = <2,3> in
// (Z/qZ)^x, since u_j = 2^(S_j) 3^-j and C_N = 3^(N-1) * sum_{j<N} u_j (mod q).
// What follows is an empirical Fourier diagnostic informed by the theorem of
// De Jesus, "Exact Spectral Inheritance in Prime-Power Resolution Towers"
// (DOI 10.5281/zenodo.23088511), not a consequence of it: the orthogonal
// splitting H_{e+1} = J_e(H_e) (+) Z_{e+1} used there is applied to the
// occupation density of one walk. The theorem concerns the transfer operators,
// which are not built here.

const groupCache = new Map();

/** Elements of K = <2,3> in (Z/qZ)^x. */
export function residueGroup(q) {
    if (!groupCache.has(q)) {
        const seen = new Set([1 % q]);
        const stack = [1 % q];
        while (stack.length) {
            const x = stack.pop();
            for (const g of [2, 3]) {
                const y = (x * g) % q;
                if (!seen.has(y)) { seen.add(y); stack.push(y); }
            }
        }
        groupCache.set(q, [...seen].sort((a, b) => a - b));
    }
    return groupCache.get(q);
}

function invMod(a, q) {
    let [r0, r1, s0, s1] = [q, a % q, 0, 1];
    while (r1) {
        const t = Math.floor(r0 / r1);
        [r0, r1] = [r1, r0 - t * r1];
        [s0, s1] = [s1, s0 - t * s1];
    }
    return ((s0 % q) + q) % q;
}

function walkStep(x, d, q, inv3) {
    for (let k = 0; k < d; k++) x = (x * 2) % q;
    return (x * inv3) % q;
}

/** Carry walk u_0..u_{N-1} of a word mod q. */
export function carryWalk(word, q) {
    const inv3 = invMod(3, q);
    const u = new Array(word.length);
    let x = 1 % q;
    for (let j = 0; j < word.length; j++) {
        u[j] = x;
        x = walkStep(x, word[j], q, inv3);
    }
    return u;
}

/**
 * Split densities f_1..f_E (relative to uniform on K_e) along the tower:
 * energy_e = ||f_e - 1||^2 and fresh_e = ||f_e - J f_{e-1}||^2 in the normalized
 * inner product, so energy_e = energy_{e-1} + fresh_e exactly.
 */
function splitDensities(dens, p, maxE) {
    const levels = [];
    let prevSize = 1;
    for (let e = 1; e <= maxE; e++) {
        const q = p ** e, K = residueGroup(q), f = dens[e];
        let energy = 0, fresh = 0;
        for (const x of K) {
            const fe = f.get(x) || 0;
            const fp = e === 1 ? 1 : (dens[e - 1].get(x % (q / p)) || 0);
            energy += (fe - 1) ** 2;
            fresh += (fe - fp) ** 2;
        }
        levels.push({
            e, q, size: K.length,
            dimZ: K.length - prevSize,          // dimension of the new sector Z_e
            energy: energy / K.length,
            fresh: fresh / K.length,
        });
        prevSize = K.length;
    }
    return levels;
}

/**
 * Empirical residue tower of one word: per level e, the new-sector energy and its
 * ratio to the i.i.d.-uniform expectation dimZ/N ("excess"; 1 = sampling noise).
 * Levels with |K_e| > N/4 are flagged as undersampled.
 */
export function residueTower(word, p, maxE = 3) {
    const N = word.length;
    const dens = {};
    for (let e = 1; e <= maxE; e++) {
        const q = p ** e, size = residueGroup(q).length;
        const f = new Map();
        for (const x of carryWalk(word, q)) f.set(x, (f.get(x) || 0) + size / N);
        dens[e] = f;
    }
    return splitDensities(dens, p, maxE).map(l => ({
        ...l, N, excess: l.fresh * N / l.dimZ, sampled: l.size <= N / 4,
    }));
}

/**
 * Exact N -> infinity residue tower of the periodic word X^inf: the walk satisfies
 * u_{i+P} = u_i g with g = 2^Q 3^-P, so its limiting occupation is the average of
 * the uniform measures on the cosets u_i <g>, i < P.
 */
export function periodicLimitTower(block, p, maxE = 3) {
    const dens = {};
    for (let e = 1; e <= maxE; e++) {
        const q = p ** e, size = residueGroup(q).length, inv3 = invMod(3, q);
        const u = carryWalk(block, q);
        const g = walkStep(u[block.length - 1], block[block.length - 1], q, inv3);
        const H = [1 % q];
        for (let y = g; y !== 1 % q; y = (y * g) % q) H.push(y);
        const f = new Map();
        const w = size / (block.length * H.length);
        for (const ui of u) for (const h of H) {
            const x = (ui * h) % q;
            f.set(x, (f.get(x) || 0) + w);
        }
        dens[e] = f;
    }
    return splitDensities(dens, p, maxE).map(l => ({ ...l, fresh: l.fresh < 1e-12 ? 0 : l.fresh }));
}

/** p-adic valuation of a BigInt (nonzero). */
export function vp(x, p) {
    const P = BigInt(p);
    let k = 0;
    x = x < 0n ? -x : x;
    while (x % P === 0n) { x /= P; k++; }
    return k;
}

/** Valuation word used for the residue tower: synthetic words are regenerated at length `len`. */
export function towerWord(t, len) {
    if (t.gen?.type === 'periodic') return periodicWord(t.gen.p, t.gen.q, len);
    if (t.gen?.type === 'beatty') return beattyWord(t.gen.lambda, t.gen.rho, len);
    return t.word;
}

/** Mean / standard deviation helper over a list of numbers. */
export function meanStd(xs) {
    const m = xs.reduce((s, x) => s + x, 0) / xs.length;
    const v = xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length;
    return { mean: m, std: Math.sqrt(v) };
}

/** Per-class summary of the statistics that separate the classes. */
export function summarizeClasses(classes) {
    const out = {};
    for (const [name, list] of Object.entries(classes)) {
        if (!list.length) continue;
        const pick = f => meanStd(list.map(t => f(t.stats)));
        out[name] = {
            count: list.length,
            N: pick(s => s.N),
            mu: pick(s => s.mu),
            balance: pick(s => s.balance),
            balanceRootN: pick(s => s.balanceRootN),
            RN: pick(s => s.RN),
            occupationFrac: pick(s => s.occupationFrac),
            complexity8: pick(s => s.complexity[8]),
            occ5mod8: pick(s => s.occupancy[5]),
            maxA: pick(s => s.maxA),
            endpointDepth: pick(s => s.endpointDepth),
            depthPerN: pick(s => s.endpointDepth / s.N),
            depthPerS: pick(s => s.endpointDepth / s.SN),
            rho: pick(s => s.rho),
            peakRatio: pick(s => s.peakRatio),
        };
    }
    return out;
}
