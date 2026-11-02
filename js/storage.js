import { isValidLetter, toAzUpper } from './alphabet.js';

const STORAGE_KEY = 'az-crossword:v1';

/**
 * Loads crossword progress from localStorage.
 * Always returns a valid progress object and never throws.
 *
 * @returns {{ lastLevelId: number|null, levels: Object.<string, { letters: Object.<string, string>, completed: boolean }> }}
 */
export function loadProgress() {
  const defaultProgress = {
    lastLevelId: null,
    levels: {}
  };

  try {
    if (typeof localStorage === 'undefined') {
      return defaultProgress;
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultProgress;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return defaultProgress;
    }

    return {
      lastLevelId: parsed.lastLevelId ?? null,
      levels: (parsed.levels && typeof parsed.levels === 'object' && !Array.isArray(parsed.levels))
        ? parsed.levels
        : {}
    };
  } catch (_e) {
    return defaultProgress;
  }
}

/**
 * Saves crossword progress to localStorage.
 * Fails silently if localStorage is unavailable or throws (e.g. private mode, quota exceeded).
 *
 * @param {object} progress
 */
export function saveProgress(progress) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    }
  } catch (_e) {
    // Fail silently
  }
}

/**
 * Pure function that sanitizes saved letters against a built level.
 * Returns only entries where:
 * 1. "row,col" key corresponds to an existing, non-blocked cell in the level.
 * 2. Value is a single valid Azerbaijani letter (converted to uppercase).
 *
 * @param {object} level - Built level object from buildLevel
 * @param {object} savedLetters - Map of "row,col" -> letter
 * @returns {Object.<string, string>}
 */
export function sanitizeLetters(level, savedLetters) {
  const result = {};
  if (
    !level ||
    !Array.isArray(level.cells) ||
    typeof level.rows !== 'number' ||
    typeof level.cols !== 'number' ||
    !savedLetters ||
    typeof savedLetters !== 'object' ||
    Array.isArray(savedLetters)
  ) {
    return result;
  }

  for (const [key, val] of Object.entries(savedLetters)) {
    if (typeof key !== 'string' || typeof val !== 'string') continue;

    const parts = key.split(',');
    if (parts.length !== 2) continue;
    if (!/^\d+$/.test(parts[0]) || !/^\d+$/.test(parts[1])) continue;

    const r = parseInt(parts[0], 10);
    const c = parseInt(parts[1], 10);

    if (r < 0 || r >= level.rows || c < 0 || c >= level.cols) continue;

    const cell = level.cells[r]?.[c];
    if (!cell) continue; // Blocked or missing cell

    const upper = toAzUpper(val);
    if (isValidLetter(upper)) {
      result[`${r},${c}`] = upper;
    }
  }

  return result;
}
