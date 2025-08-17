// state.js
let lastBinaryPath = [];

export function setLastBinaryPath(path) {
    lastBinaryPath = path;
}

export function getLastBinaryPath() {
    return lastBinaryPath;
}