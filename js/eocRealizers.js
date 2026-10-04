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
    return { ...meta, word, orbit, realizer, modulusBits, stats: trajectoryStats(word, orbit) };
}

/**
 * Generate the three classes plus the generic control.
 * @param {object} o
 * @param {number} o.N            synthetic word length
 * @param {number} o.recordLimit  search limit for actual record holders
 * @param {'delay'|'lifetime'} o.actualKind  which extremal orbits to use
 */
export function buildThreeClasses({ N = 120, recordLimit = 1000000, actualKind = 'delay', seed = 2026 } = {}) {
    const periodic = [];
    // Convergents p_n/q_n of beta with n >= 3 (Theorem 5.3 range), period p_n <= N.
    for (const cv of betaConvergents(12)) {
        if (cv.n < 3 || cv.p > N) continue;
        periodic.push(realizerTrajectory(periodicWord(cv.p, cv.q, N), {
            cls: 'periodic', label: `w(${cv.p}/${cv.q}) convergent n=${cv.n}`,
            tag: `critical, ${cv.side} beta`, period: cv.p, convergent: cv,
        }));
    }
    for (const [p, q] of [[2, 3], [3, 7]]) {
        periodic.push(realizerTrajectory(periodicWord(p, q, N), {
            cls: 'periodic', label: `w(${p}/${q})`, tag: 'off-critical', period: p,
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
                cls: 'sturmian',
                label: rho === 0 && tag === 'critical' ? '1c_beta (slope log2 3, rho=0)' : `slope ${name}, rho=${rho}`,
                tag,
            }));
        }
    }

    const actual = [];
    if (actualKind === 'lifetime') {
        for (const r of lifetimeRecords(recordLimit, 1)) {
            if (r.L < 4) continue;
            actual.push(actualTrajectory(r.n, {
                cls: 'actual', label: `n=${r.n} (L1=${r.L})`, tag: 'L1 lifetime record, confined episode',
            }, r.L));
        }
    } else {
        const { delay, glide } = recordHolders(recordLimit);
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
    return { periodic, sturmian, actual, generic };
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
