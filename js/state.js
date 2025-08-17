// state.js

// --- Last Binary Path State (Existing) ---
let lastBinaryPath = [];

export function setLastBinaryPath(path) {
    lastBinaryPath = path;
}

export function getLastBinaryPath() {
    return lastBinaryPath;
}

// --- Negative Number Exploration Setting (New) ---
// Key for local storage
const EXPLORATION_KEY = 'exploreNegativeNumbers';

// Get the setting from local storage or default to 'false' if not found
export function getExplorationSetting() {
    const savedSetting = localStorage.getItem(EXPLORATION_KEY);
    // Return true if saved value is 'true', otherwise return false
    return savedSetting === 'true';
}

// Save the setting to local storage
export function setExplorationSetting(value) {
    // localStorage saves as a string, so we convert the boolean
    localStorage.setItem(EXPLORATION_KEY, value);
}