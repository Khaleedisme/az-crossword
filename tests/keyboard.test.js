import test from 'node:test';
import assert from 'node:assert/strict';
import { ALPHABET } from '../js/alphabet.js';
import { layout, KEYBOARD_LAYOUT } from '../js/keyboard.js';

test('Keyboard: flattened layout contains exactly the 32 ALPHABET letters, no duplicates, none missing', () => {
  assert.equal(layout, KEYBOARD_LAYOUT);
  const flattened = layout.flat();

  // Exactly 32 letters
  assert.equal(flattened.length, 32);

  // No duplicates
  const unique = new Set(flattened);
  assert.equal(unique.size, 32);

  // None missing: every letter in ALPHABET is present
  for (const letter of ALPHABET) {
    assert.ok(unique.has(letter), `Letter ${letter} must be present in keyboard layout`);
  }

  // Sorted flattened layout must match sorted ALPHABET
  assert.deepEqual([...flattened].sort(), [...ALPHABET].sort());
});
