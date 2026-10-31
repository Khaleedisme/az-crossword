/**
 * Shared Azerbaijani Alphabet Module
 * The standard Azerbaijani Latin alphabet consists of exactly 32 letters:
 * A, B, C, Ç, D, E, Ə, F, G, Ğ, H, X, I, İ, J, K, Q, L, M, N, O, Ö, P, R, S, Ş, T, U, Ü, V, Y, Z
 */

export const ALPHABET = Object.freeze([
  'A', 'B', 'C', 'Ç', 'D', 'E', 'Ə', 'F',
  'G', 'Ğ', 'H', 'X', 'I', 'İ', 'J', 'K',
  'Q', 'L', 'M', 'N', 'O', 'Ö', 'P', 'R',
  'S', 'Ş', 'T', 'U', 'Ü', 'V', 'Y', 'Z'
]);

const ALPHABET_SET = new Set(ALPHABET);

/**
 * Checks if a character is a single valid uppercase Azerbaijani letter.
 * If caseSensitive is false, checks if it is any valid Azerbaijani letter.
 *
 * @param {string} char
 * @param {boolean} [caseSensitive=true]
 * @returns {boolean}
 */
export function isValidLetter(char, caseSensitive = true) {
  if (typeof char !== 'string' || char.length !== 1) {
    return false;
  }
  if (caseSensitive) {
    return ALPHABET_SET.has(char);
  }
  return ALPHABET_SET.has(toAzUpper(char));
}

/**
 * Converts a string to uppercase following Azerbaijani locale rules.
 * Handles dotted 'i' -> 'İ', dotless 'ı' -> 'I', 'ə' -> 'Ə', etc.
 *
 * @param {string} str
 * @returns {string}
 */
export function toAzUpper(str) {
  if (typeof str !== 'string') return '';
  return str.toLocaleUpperCase('az');
}

/**
 * Converts a string to lowercase following Azerbaijani locale rules.
 * Handles 'I' -> 'ı', 'İ' -> 'i', 'Ə' -> 'ə', etc.
 *
 * @param {string} str
 * @returns {string}
 */
export function toAzLower(str) {
  if (typeof str !== 'string') return '';
  return str.toLocaleLowerCase('az');
}

/**
 * Normalizes an answer string by trimming whitespace and converting to Azerbaijani uppercase.
 *
 * @param {string} str
 * @returns {string}
 */
export function normalizeAnswer(str) {
  if (typeof str !== 'string') return '';
  return toAzUpper(str.trim());
}
