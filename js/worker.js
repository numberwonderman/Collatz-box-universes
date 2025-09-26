// === Utility Functions ===
function isPrime(n) {
    if (n <= 1) return false;
    if (n <= 3) return true;
    if (n % 2 === 0 || n % 3 === 0) return false;
    for (let i = 5; i * i <= n; i = i + 6) {
        if (n % i === 0 || n % (i + 2) === 0) return false;
    }
    return true;
}

// === Complex Number Class ===
class Complex {
    constructor(re, im) {
        this.re = re || 0;
        this.im = im || 0;
    }
    add(other) {
        return new Complex(this.re + other.re, this.im + other.im);
    }
    mult(other) {
        if (typeof other === 'number') {
            return new Complex(this.re * other, this.im * other);
        }
        return new Complex(this.re * other.re - this.im * other.im, this.re * other.im + this.im * other.re);
    }
    div(other) {
        if (typeof other === 'number') {
            return new Complex(this.re / other, this.im / other);
        }
        const denominator = other.re * other.re + other.im * other.im;
        return new Complex(
            (this.re * other.re + this.im * other.im) / denominator,
            (this.im * other.re - this.re * other.im) / denominator
        );
    }
    mod() {
        return Math.sqrt(this.re * this.re + this.im * this.im);
    }
}

// === Keçeci Number System Logic ===
function nextKececiNumber(n, rule) {
    let temp;
    if (rule === 'ruleA') {
        temp = n + 7;
        const conditionalResult = (temp % 2 === 0) ? temp / 2 : temp;
        return isPrime(conditionalResult) ? conditionalResult * 3 : conditionalResult + 1;
    } else if (rule === 'ruleB') {
        temp = n + 5;
        const conditionalResult = (temp % 3 === 0) ? temp / 3 : temp;
        return isPrime(conditionalResult) ? conditionalResult * 2 + 1 : conditionalResult * 1.5;
    }
}

function runKececiSequence(start, rule, maxSteps = 1000) {
    let n = start;
    const sequence = [n];
    const seen = new Set();
    
    for (let i = 0; i < maxSteps; i++) {
        if (seen.has(n)) {
            return { sequence, type: 'cycle' };
        }
        seen.add(n);
        if (n === 1) {
            return { sequence, type: 'converges' };
        }
        
        n = nextKececiNumber(n, rule);
        sequence.push(n);
    }
    return { sequence, type: 'diverges' };
}

function runComplexKececiSequence(start, rule, maxSteps = 1000) {
    let n = start;
    const sequence = [n];
    const seen = new Set();
    
    for (let i = 0; i < maxSteps; i++) {
        const key = n.re + ',' + n.im;
        if (seen.has(key)) {
            return { sequence, type: 'cycle' };
        }
        seen.add(key);
        
        if (n.re === 1 && n.im === 0) {
            return { sequence, type: 'converges' };
        }
        
        if (rule === 'ruleA') {
            let temp = n.add(new Complex(7, 0));
            const isTempPrime = isPrime(Math.floor(temp.mod()));
            const conditionalResult = (Math.floor(temp.mod()) % 2 === 0) ? temp.div(2) : temp;
            n = isTempPrime ? conditionalResult.mult(3) : conditionalResult.add(new Complex(1, 0));
        } else if (rule === 'ruleB') {
            let temp = n.add(new Complex(5, 0));
            const isTempPrime = isPrime(Math.floor(temp.mod()));
            const conditionalResult = (Math.floor(temp.mod()) % 3 === 0) ? temp.div(3) : temp;
            n = isTempPrime ? conditionalResult.mult(2).add(new Complex(1, 0)) : conditionalResult.mult(1.5);
        }

        sequence.push(n);
    }
    return { sequence, type: 'diverges' };
}

// === Generalized Collatz Logic ===
function generalizedCollatz(n, a, b, c) {
    const sequence = [n];
    const seen = new Set();
    for (let i = 0; i < 1000; i++) {
        if (n === 1 || seen.has(n)) {
            return { sequence, type: 'cycle' };
        }
        seen.add(n);
        if (n % 2 === 0) {
            n = n / 2;
        } else {
            n = (a * n + b) / c;
        }
        sequence.push(n);
    }
    return { sequence, type: 'diverges' };
}

// === Chaos Metric Function ===
function calculateChaosMetrics(system, params, type) {
    let n1, n2;
    const start1 = 6;
    const start2 = 7;

    if (type === 'real') {
        n1 = 6.0;
        n2 = 7.0;
    } else if (type === 'complex') {
        n1 = new Complex(6, 0);
        n2 = new Complex(7, 0);
    } else {
        n1 = start1;
        n2 = start2;
    }
    
    let seq1, seq2;
    if (system === 'kececi') {
        seq1 = (type === 'complex' ? runComplexKececiSequence(n1, params.rule) : runKececiSequence(n1, params.rule)).sequence;
        seq2 = (type === 'complex' ? runComplexKececiSequence(n2, params.rule) : runKececiSequence(n2, params.rule)).sequence;
    } else {
        seq1 = generalizedCollatz(n1, params.a, params.b, params.c).sequence;
        seq2 = generalizedCollatz(n2, params.a, params.b, params.c).sequence;
    }
    
    const maxLength = Math.max(seq1.length, seq2.length);

    let maxDistance = 0;
    let currentDistance = 0;
    let finalDistance = 0;

    for (let i = 0; i < maxLength; i++) {
        let diff;
        if (type === 'complex') {
            const val1 = seq1[i] || seq1[seq1.length - 1];
            const val2 = seq2[i] || seq2[seq2.length - 1];
            diff = new Complex(val1.re - val2.re, val1.im - val2.im);
            currentDistance = diff.mod();
        } else {
            const val1 = seq1[i] || seq1[seq1.length - 1];
            const val2 = seq2[i] || seq2[seq2.length - 1];
            diff = val1 - val2;
            currentDistance = Math.abs(diff);
        }
        
        if (currentDistance > maxDistance) {
            maxDistance = currentDistance;
        }
        finalDistance = currentDistance;
    }
    const divergenceRate = finalDistance / maxLength;
    
    return {
        finalDistance,
        maxDistance,
        divergenceRate
    };
}

// === Main Worker Logic ===
self.onmessage = function(e) {
    const { system, numberType, params } = e.data;
    const cubesData = [];
    const maxDivergence = 10000;

    function getColor(value, max) {
        const ratio = Math.min(value / max, 1);
        const r = Math.floor(255 * ratio);
        const g = Math.floor(255 * (1 - ratio));
        return `rgb(${r},${g},0)`;
    }

    let aStart, aEnd, bStart, bEnd, cStart, cEnd;

    if (system === 'kececi') {
        aStart = 3; aEnd = 4;
        bStart = 1; bEnd = 2;
        cStart = 2; cEnd = 3;
    } else { // Generalized Collatz
        aStart = 1; aEnd = 5;
        bStart = 1; bEnd = 5;
        cStart = 1; cEnd = 5;
    }

    // This is the heavy calculation loop that will run in the background
    for (let a = aStart; a <= aEnd; a++) {
        for (let b = bStart; b <= bEnd; b++) {
            for (let c = cStart; c <= cEnd; c++) {
                if (c === 0) continue;
                
                let metrics;
                if (system === 'kececi') {
                    metrics = calculateChaosMetrics(system, { rule: params.rule }, numberType);
                } else {
                    metrics = calculateChaosMetrics(system, { a: a, b: b, c: c }, numberType);
                }
                
                const chaosScore = metrics.finalDistance;
                const colorHex = getColor(chaosScore, maxDivergence);
                
                cubesData.push({
                    x: a - aStart,
                    y: b - bStart,
                    z: c - cStart,
                    color: colorHex
                });
            }
        }
    }
    
    // Send the results back to the main thread
    self.postMessage({ cubes: cubesData });
};
