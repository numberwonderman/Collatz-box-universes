import { describe, it, expect, beforeEach } from 'vitest';
import { getExplorationSetting, setExplorationSetting } from '../state.js';

// Minimal localStorage mock to use in test environment
class LocalStorageMock {
  constructor() {
    this.store = {};
  }
  clear() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, value) {
    this.store[key] = value.toString();
  }
}

// Provide global.localStorage mock if not defined
if (typeof localStorage === 'undefined' || localStorage === null) {
  global.localStorage = new LocalStorageMock();
}

describe('Exploration Setting', () => {
  beforeEach(() => {
    // Clear mock localStorage before each test
    localStorage.clear();
  });

  it('should default to false if no stored value', () => {
    expect(getExplorationSetting()).toBe(false);
  });

  it('should return true if set to true', () => {
    setExplorationSetting(true);
    expect(getExplorationSetting()).toBe(true);
  });

  it('should return false if set to false', () => {
    setExplorationSetting(false);
    expect(getExplorationSetting()).toBe(false);
  });
});
