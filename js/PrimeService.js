// Lightweight prime service with lazy sieve + caches.
// Handles Number and BigInt inputs safely.

// ---------- tiny utils ----------
const asBigInt = (x) => (typeof x === "bigint" ? x : BigInt(x));
const isNonNegInt = (x) => {
  try {
    const b = asBigInt(x);
    return b >= 0n;
  } catch {
    return false;
  }
};

// ---------- LRU-ish Map (size-capped, FIFO eviction) ----------
function makeCappedCache(limit = 128) {
  const m = new Map();
  return {
    get(k) { return m.get(k); },
    has(k) { return m.has(k); },
    set(k, v) {
      if (m.size >= limit && !m.has(k)) {
        // evict oldest key
        const first = m.keys().next().value;
        m.delete(first);
      }
      m.set(k, v);
    },
    clear(){ m.clear(); }
  };
}

// ---------- “database” of small primes (seed) ----------
const SEED_PRIMES = Object.freeze([
  2,3,5,7,11,13,17,19,23,29,
  31,37,41,43,47,53,59,61,67,71,
  73,79,83,89,97,101,103,107,109,113,
  127,131,137,139,149,151,157,163,167,173,
  179,181,191,193,197,199,211,223,227,229,
]); // keep modest; we’ll extend by sieve on demand

// ---------- sieve state (lazy, extendable) ----------
let sieveMax = SEED_PRIMES[SEED_PRIMES.length - 1];
let sieve = new Uint8Array(sieveMax + 1);
(function seedInit() {
  sieve.fill(1);
  sieve[0] = sieve[1] = 0;
  for (const p of SEED_PRIMES) {
    if (p * p > sieveMax) break;
    if (sieve[p]) {
      for (let m = p * p; m <= sieveMax; m += p) sieve[m] = 0;
    }
  }
  for (const p of SEED_PRIMES) sieve[p] = 1;
})();

function extendSieve(upto) {
  if (upto <= sieveMax) return;
  // Hard guard to keep phones responsive
  const HARD_LIMIT = 1_000_000; // 1e6 is still ok-ish in JS
  if (upto > HARD_LIMIT) upto = HARD_LIMIT;

  const oldMax = sieveMax;
  sieveMax = upto;
  const newSieve = new Uint8Array(sieveMax + 1);
  newSieve.fill(1);
  newSieve[0] = newSieve[1] = 0;

  // copy old flags
  newSieve.set(sieve);

  // sieve from 2 to sqrt(upto)
  const root = Math.floor(Math.sqrt(sieveMax));
  for (let p = 2; p <= root; p++) {
    if (newSieve[p]) {
      let start = Math.max(p * p, Math.ceil((oldMax + 1) / p) * p);
      for (let m = start; m <= sieveMax; m += p) newSieve[m] = 0;
    }
  }
  sieve = newSieve;
}

// ---------- caches ----------
const primesBelowCache = makeCappedCache(128);
const factorCache = makeCappedCache(512);

// ---------- API ----------

/**
 * Return an array of all primes < limit (Number), cached.
 * If limit is small, comes straight from the seed/sieve; otherwise we extend lazily.
 */
export function primesBelow(limit) {
  if (!isNonNegInt(limit)) throw new Error(`primesBelow: limit must be a non-negative integer; got ${limit}`);
  const L = Number(asBigInt(limit)); // we use Number for sieve indices
  if (L <= 2) return [];

  // cache hit?
  if (primesBelowCache.has(L)) return primesBelowCache.get(L).slice();

  // ensure sieve covers [0..L]
  extendSieve(L);

  const out = [];
  for (let i = 2; i < L; i++) if (sieve[i]) out.push(i);
  primesBelowCache.set(L, out);
  return out.slice();
}

/** Simple isPrime for Number n using the sieve when possible; falls back to trial division. */
export function isPrime(n) {
  if (!isNonNegInt(n)) return false;
  const x = Number(asBigInt(n));
  if (!Number.isSafeInteger(x)) {
    // fallback: trial division up to 1e6-ish guard
    const MAX_TRIAL = 1_000_000;
    const bound = Math.min(MAX_TRIAL, Math.floor(Math.sqrt(Number.MAX_SAFE_INTEGER)));
    for (const p of primesBelow(Math.min(bound, x))) {
      if (x % p === 0) return x === p;
    }
    return true; // best effort
  }
  if (x <= sieveMax) return !!sieve[x];
  // trial division by primes we know; extend if needed a bit beyond sqrt(x)
  const root = Math.floor(Math.sqrt(x));
  extendSieve(root + 1);
  for (let p = 2; p <= root; p++) {
    if (sieve[p] && x % p === 0) return x === p;
  }
  return true;
}

/**
 * Divide out all prime factors < p from n (to exhaustion).
 * n, p may be Number or BigInt; returns BigInt.
 * Cached by (n,p) string key.
 */
export function removePrimesBelow(n, p) {
  const N = asBigInt(n);
  const P = asBigInt(p);
  if (P < 2n) return N;

  const key = `${N}#${P}`;
  if (factorCache.has(key)) return factorCache.get(key);

  const limit = Number(P); // we only need primes less than p
  const plist = primesBelow(limit);
  let cur = N;

  for (const q of plist) {
    const qb = BigInt(q);
    while (cur % qb === 0n) cur /= qb;
    if (cur === 1n) break;
  }
  factorCache.set(key, cur);
  return cur;
}

/** Clear caches if you need to free memory. */
export function clearPrimeCaches() {
  primesBelowCache.clear();
  factorCache.clear();
}

export const _internal = {
  extendSieve: (n) => extendSieve(Number(n)),
  sieveMax: () => sieveMax
};
