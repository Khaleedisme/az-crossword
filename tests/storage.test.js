import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLevel } from '../js/level.js';
import { sanitizeLetters } from '../js/storage.js';

test('Storage: sanitizeLetters drops invalid keys and values, transforms lowercase to uppercase', () => {
  const level = buildLevel({
    id: 1,
    title: 'Test Level',
    rows: 3,
    cols: 5,
    entries: [
      { n: 1, row: 1, col: 0, dir: 'across', answer: 'QƏLƏM', clue: 'Test clue' }
    ]
  });

  const savedLetters = {
    '1,0': 'Q',    // valid entry kept
    '1,1': 'ö',    // (d) lowercase 'ö' accepted and becomes 'Ö'
    '1,2': '1',    // (c) non-letter value '1' dropped
    '1,3': 'ab',   // (c) non-letter value 'ab' dropped
    '1,4': 'M',    // valid entry kept
    '5,5': 'A',    // (a) key outside the grid dropped
    '0,0': 'B'     // (b) key of a blocked cell dropped
  };

  const result = sanitizeLetters(level, savedLetters);

  assert.deepEqual(result, {
    '1,0': 'Q',
    '1,1': 'Ö',
    '1,4': 'M'
  });
});

