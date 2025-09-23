// Exported for testing
export function initializeCanvas() {
    const canvas = document.getElementById('collatz-canvas');
    if (!canvas) {
        return null;
    }
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    return ctx;
}

// Exported for testing
export function getParameters() {
    const inputN = document.getElementById('inputN');
    const inputX = document.getElementById('inputX');
    const inputY = document.getElementById('inputY');
    const inputZ = document.getElementById('inputZ');

    const N = parseInt(inputN.value, 10);
    const X = parseInt(inputX.value, 10);
    const Y = parseInt(inputY.value, 10);
    const Z = parseInt(inputZ.value, 10);

    if (isNaN(N) || N <= 0 || isNaN(X) || X <= 0 || isNaN(Y) || isNaN(Z)) {
        return null;
    }

    return { N, X, Y, Z };
}

// Exported for testing
export function generateLinkURL(params, pageName) {
    if (pageName !== 'slicer' && pageName !== 'scatter') {
        return '#';
    }
    const query = `?n=${params.N}&x=${params.X}&y=${params.Y}&z=${params.Z}`;
    return `${pageName}.html${query}`;
}

// Exported for testing
export function generalizedCollatzStep(n, x, y, z) {
    if (n % x === 0) {
        return { next: n / x, parity: 0 }; // Even rule
    } else {
        return { next: n * y + z, parity: 1 }; // Odd rule
    }
}

// Exported for testing
export function generateCollatzSequence(n, x, y, z) {
    const sequence = [n];
    const binaryPath = [];
    const visited = new Set();
    const cycleLimit = 10000;
    let i = 0;

    while (n !== 1) {
        if (i > cycleLimit) {
            return { sequence: [], binaryPath: [], status: 'Divergent (Cycle or Limit Reached)' };
        }
        if (n > Number.MAX_SAFE_INTEGER) {
            return { sequence: [], binaryPath: [], status: 'Divergent (Overflow)' };
        }
        if (visited.has(n)) {
            return { sequence: [], binaryPath: [], status: 'Divergent (Cycle)' };
        }

        visited.add(n);
        const step = generalizedCollatzStep(n, x, y, z);
        n = step.next;
        sequence.push(n);
        binaryPath.push(step.parity);
        i++;
    }

    return { sequence, binaryPath, status: 'Convergent' };
}


function drawCollatzDragon(ctx, binaryPath) {
    if (!ctx) return;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    const scale = 5;
    let x = ctx.canvas.width / 2;
    let y = ctx.canvas.height / 2;
    let angle = 0;

    ctx.beginPath();
    ctx.moveTo(x, y);

    binaryPath.forEach(turn => {
        if (turn === 0) { // Even number, turn left
            angle -= Math.PI / 2;
        } else { // Odd number, turn right
            angle += Math.PI / 2;
        }

        x += Math.cos(angle) * scale;
        y += Math.sin(angle) * scale;

        ctx.lineTo(x, y);
    });

    ctx.strokeStyle = '#60A5FA';
    ctx.lineWidth = 1.5;
    ctx.stroke();
}

document.addEventListener('DOMContentLoaded', () => {
    const ctx = initializeCanvas();
    const drawButton = document.getElementById('drawButton');
    const clearButton = document.getElementById('clearButton');

    drawButton.addEventListener('click', () => {
        const params = getParameters();
        if (params) {
            const { sequence, binaryPath, status } = generateCollatzSequence(params.N, params.X, params.Y, params.Z);
            if (status === 'Convergent') {
                drawCollatzDragon(ctx, binaryPath);
            } else {
                alert(`Sequence did not converge. Status: ${status}`);
            }
        } else {
            alert('Please enter valid positive numbers for N, X, Y, and Z.');
        }
    });

    clearButton.addEventListener('click', () => {
        if (ctx) {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        }
    });
});
