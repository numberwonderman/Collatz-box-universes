// js/src/generalizedPrimeCollatz.js
// BigInt throughout

// Simple primes < p (enough for small p: 3,5,7,11, ...)
export function primesBelow(p) {
  p = BigInt(p);
  const out = [];
  const isPrime = (n) => {
    if (n < 2n) return false;
    for (let d = 2n; d * d <= n; d++) if (n % d === 0n) return false;
    return true;
  };
  for (let q = 2n; q < p; q++) if (isPrime(q)) out.push(q);
  return out;
}

// After pn+1 on odd n, divide out ALL primes < p to exhaustion (any order)
export function simplifyByPrimesLessThanP(n, p) {
  n = BigInt(n);
  for (const q of primesBelow(p)) {
    while (n % q === 0n) n /= q;
  }
  return n;
}

// One generalized step:
// - even n: classical halve (this matches Ramon’s examples for p=3)
// - odd n: x = p*n + 1; then divide out all primes < p
export function stepP(n, p) {
  n = BigInt(n); p = BigInt(p);
  if (n % 2n === 0n) return n / 2n;
  const x = p * n + 1n;
  return simplifyByPrimesLessThanP(x, p);
}

// Optional accelerated iteration with a guard
export function iterateP(n, p, maxSteps = 10000) {
  n = BigInt(n);
  const seq = [n];
  for (let i = 0; i < maxSteps; i++) {
    n = stepP(n, p);
    seq.push(n);
    if (n === 1n) break; // stop at 1 like classical convention
  }
  return seq;
}
