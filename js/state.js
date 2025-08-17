// state.js
let lastBinaryPath = [];

export function setLastBinaryPath(path) {
    lastBinaryPath = path;
}

export function getLastBinaryPath() {
    return lastBinaryPath;
}

// Inside state.js
export function getExplorationSetting() {
  return localStorage.getItem('exploreNegativeNumbers') === 'true';
}