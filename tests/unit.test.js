import test from 'node:test';
import assert from 'node:assert/strict';
import { ALPHABET, isValidLetter, toAzUpper, toAzLower, normalizeAnswer } from '../js/alphabet.js';
import { validateLevelData, extractWords, validateLevelFile, validateIndexFile } from '../tools/validate.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// ==========================================
// 1. Alphabet Module Tests
// ==========================================

test('Alphabet: exactly 32 uppercase Azerbaijani letters', () => {
  assert.equal(ALPHABET.length, 32);
  const expected = [
    'A', 'B', 'C', 'Ç', 'D', 'E', 'Ə', 'F',
    'G', 'Ğ', 'H', 'X', 'I', 'İ', 'J', 'K',
    'Q', 'L', 'M', 'N', 'O', 'Ö', 'P', 'R',
    'S', 'Ş', 'T', 'U', 'Ü', 'V', 'Y', 'Z'
  ];
  assert.deepEqual([...ALPHABET], expected);
});

test('Alphabet: isValidLetter', () => {
  for (const letter of ALPHABET) {
    assert.equal(isValidLetter(letter), true, `Expected ${letter} to be valid`);
  }
  // Rejects lowercase
  assert.equal(isValidLetter('a'), false);
  assert.equal(isValidLetter('ə'), false);
  assert.equal(isValidLetter('i'), false);
  assert.equal(isValidLetter('ı'), false);

  // Rejects foreign letters not in az
  assert.equal(isValidLetter('W'), false);
  assert.equal(isValidLetter('w'), false);

  // Rejects spaces, hyphens, digits, punctuation
  assert.equal(isValidLetter(' '), false);
  assert.equal(isValidLetter('-'), false);
  assert.equal(isValidLetter('1'), false);
  assert.equal(isValidLetter('!'), false);

  // Rejects multi-char strings and invalid types
  assert.equal(isValidLetter('AA'), false);
  assert.equal(isValidLetter(''), false);
  assert.equal(isValidLetter(null), false);
  assert.equal(isValidLetter(undefined), false);
  assert.equal(isValidLetter(123), false);

  // Case-insensitive mode
  assert.equal(isValidLetter('a', false), true);
  assert.equal(isValidLetter('ə', false), true);
  assert.equal(isValidLetter('w', false), false);
});

test('Alphabet: toAzUpper and toAzLower', () => {
  assert.equal(toAzUpper('i'), 'İ');
  assert.equal(toAzUpper('ı'), 'I');
  assert.equal(toAzUpper('ə'), 'Ə');
  assert.equal(toAzUpper('bakı'), 'BAKI');
  assert.equal(toAzUpper('işıq'), 'İŞIQ');

  assert.equal(toAzLower('İ'), 'i');
  assert.equal(toAzLower('I'), 'ı');
  assert.equal(toAzLower('Ə'), 'ə');
  assert.equal(toAzLower('BAKI'), 'bakı');
  assert.equal(toAzLower('İŞIQ'), 'işıq');

  assert.equal(toAzUpper(null), '');
  assert.equal(toAzLower(undefined), '');
});

test('Alphabet: normalizeAnswer', () => {
  assert.equal(normalizeAnswer('  işıq  '), 'İŞIQ');
  assert.equal(normalizeAnswer('kitab'), 'KİTAB');
  assert.equal(normalizeAnswer('  ƏsAs  '), 'ƏSAS');
});

// ==========================================
// 2. Validator Tests: Rule by Rule
// ==========================================

const createValidLevel = () => ({
  id: 1,
  title: 'Test Level',
  difficulty: 1,
  rows: 5,
  cols: 5,
  entries: [
    { n: 1, row: 0, col: 0, dir: 'across', answer: 'ANA', clue: 'Övlad sahibi qadın' },
    { n: 1, row: 0, col: 0, dir: 'down',   answer: 'ALMA', clue: 'Şirəli bağ meyvəsi' }
  ]
});

test('Rule 1: Schema - missing or invalid fields', () => {
  let lvl = createValidLevel();
  delete lvl.id;
  assert.ok(validateLevelData(lvl).some(e => e.includes('Field "id"')));

  lvl = createValidLevel();
  lvl.id = -1;
  assert.ok(validateLevelData(lvl).some(e => e.includes('Field "id"')));

  lvl = createValidLevel();
  lvl.title = '';
  assert.ok(validateLevelData(lvl).some(e => e.includes('Field "title"')));

  lvl = createValidLevel();
  lvl.difficulty = 0;
  assert.ok(validateLevelData(lvl).some(e => e.includes('Field "difficulty"')));

  lvl = createValidLevel();
  lvl.rows = 0;
  assert.ok(validateLevelData(lvl).some(e => e.includes('Field "rows"')));

  lvl = createValidLevel();
  lvl.entries = [];
  assert.ok(validateLevelData(lvl).some(e => e.includes('Field "entries"')));

  lvl = createValidLevel();
  lvl.entries[0].dir = 'diagonal';
  assert.ok(validateLevelData(lvl).some(e => e.includes('Field "dir" must be either')));

  lvl = createValidLevel();
  lvl.entries[0].answer = 'A';
  assert.ok(validateLevelData(lvl).some(e => e.includes('too short')));
});

test('Rule 2: Alphabet membership in answers', () => {
  let lvl = createValidLevel();
  lvl.entries[0].answer = 'ana'; // lowercase
  assert.ok(validateLevelData(lvl).some(e => e.includes('lowercase letters are forbidden')));

  lvl = createValidLevel();
  lvl.entries[0].answer = 'A NA'; // space
  assert.ok(validateLevelData(lvl).some(e => e.includes('spaces are forbidden')));

  lvl = createValidLevel();
  lvl.entries[0].answer = 'A-NA'; // hyphen
  assert.ok(validateLevelData(lvl).some(e => e.includes('hyphens are forbidden')));

  lvl = createValidLevel();
  lvl.entries[0].answer = 'A1A'; // digit
  assert.ok(validateLevelData(lvl).some(e => e.includes('digits are forbidden')));

  lvl = createValidLevel();
  lvl.entries[0].answer = 'AWA'; // 'W' not in az alphabet
  assert.ok(validateLevelData(lvl).some(e => e.includes('not in the 32-letter Azerbaijani alphabet')));
});

test('Rule 3: Grid bounds', () => {
  let lvl = createValidLevel();
  lvl.entries[0].row = 5; // row >= rows (5)
  assert.ok(validateLevelData(lvl).some(e => e.includes('out of bounds')));

  lvl = createValidLevel();
  lvl.entries[0].col = 4; // col 4 + length 3 = 7 > cols (5)
  assert.ok(validateLevelData(lvl).some(e => e.includes('extends out of bounds')));

  lvl = createValidLevel();
  lvl.entries[1].row = 3; // row 3 + length 4 = 7 > rows (5)
  assert.ok(validateLevelData(lvl).some(e => e.includes('extends out of bounds')));
});

test('Rule 4: Intersections letter match', () => {
  const lvl = createValidLevel();
  lvl.entries[1].answer = 'ELMA'; // 'E' at (0, 0) vs 'A' at (0, 0)
  const errs = validateLevelData(lvl);
  assert.ok(errs.some(e => e.includes('Intersection mismatch at cell (0, 0)')));
});

test('Rule 5: Overlap and touch end-to-end on same line', () => {
  // Across overlap on same row
  let lvl = {
    id: 1,
    title: 'Test',
    difficulty: 1,
    rows: 5,
    cols: 7,
    entries: [
      { n: 1, row: 1, col: 0, dir: 'across', answer: 'ALMA', clue: 'Meyvə' },
      { n: 2, row: 1, col: 2, dir: 'across', answer: 'NAR',  clue: 'Meyvə 2' }
    ]
  };
  assert.ok(validateLevelData(lvl).some(e => e.includes('Overlap on row 1')));

  // Multiple overlaps on same row (outer encompassing non-adjacent inner entries)
  lvl = {
    id: 1,
    title: 'Test',
    difficulty: 1,
    rows: 5,
    cols: 10,
    entries: [
      { n: 1, row: 0, col: 0, dir: 'across', answer: 'ALMAZLAR', clue: 'Daşlar' },
      { n: 2, row: 0, col: 2, dir: 'across', answer: 'MA', clue: 'Ədat' },
      { n: 3, row: 0, col: 5, dir: 'across', answer: 'LA', clue: 'Not' }
    ]
  };
  const multiErrs = validateLevelData(lvl);
  assert.ok(multiErrs.some(e => e.includes('#1 across and #2 across')));
  assert.ok(multiErrs.some(e => e.includes('#1 across and #3 across')));

  // Across touch end-to-end without gap
  lvl = {
    id: 1,
    title: 'Test',
    difficulty: 1,
    rows: 5,
    cols: 7,
    entries: [
      { n: 1, row: 1, col: 0, dir: 'across', answer: 'ALMA', clue: 'Meyvə' },
      { n: 2, row: 1, col: 4, dir: 'across', answer: 'NAR',  clue: 'Meyvə 2' }
    ]
  };
  assert.ok(validateLevelData(lvl).some(e => e.includes('touch end-to-end on row 1')));

  // Down touch end-to-end without gap
  lvl = {
    id: 1,
    title: 'Test',
    difficulty: 1,
    rows: 7,
    cols: 5,
    entries: [
      { n: 1, row: 0, col: 1, dir: 'down', answer: 'ALMA', clue: 'Meyvə' },
      { n: 2, row: 4, col: 1, dir: 'down', answer: 'NAR',  clue: 'Meyvə 2' }
    ]
  };
  assert.ok(validateLevelData(lvl).some(e => e.includes('touch end-to-end on col 1')));
});

test('Rule 6: Derived grid runs (accidental words formed and bijection)', () => {
  // Two parallel across entries placed on adjacent rows in columns that touch
  const lvl = {
    id: 1,
    title: 'Test',
    difficulty: 1,
    rows: 5,
    cols: 5,
    entries: [
      { n: 1, row: 0, col: 0, dir: 'across', answer: 'ANA', clue: 'Qadın' },
      { n: 2, row: 1, col: 0, dir: 'across', answer: 'DAŞ', clue: 'Qaya parçası' }
    ]
  };
  const errs = validateLevelData(lvl);
  assert.ok(errs.some(e => e.includes('Accidental unintended down word')));
});

test('Rule 7: Standard numbering matches geometry', () => {
  const lvl = createValidLevel();
  lvl.entries[1].n = 2; // (0, 0) has across and down, so both MUST have n: 1
  const errs = validateLevelData(lvl);
  assert.ok(errs.some(e => e.includes('Numbering mismatch at cell (0, 0)')));
});

test('Rule 8: Duplicate answers within level', () => {
  const lvl = {
    id: 1,
    title: 'Test',
    difficulty: 1,
    rows: 6,
    cols: 6,
    entries: [
      { n: 1, row: 0, col: 0, dir: 'across', answer: 'ANA', clue: 'Qadın' },
      { n: 1, row: 0, col: 0, dir: 'down',   answer: 'ANA', clue: 'İkinci qadın' }
    ]
  };
  const errs = validateLevelData(lvl);
  assert.ok(errs.some(e => e.includes('Duplicate answer "ANA"')));
});

test('Rule 9: Grid connectivity (disconnected islands)', () => {
  const lvl = {
    id: 1,
    title: 'Test',
    difficulty: 1,
    rows: 6,
    cols: 6,
    entries: [
      { n: 1, row: 0, col: 0, dir: 'across', answer: 'ANA', clue: 'Qadın 1' },
      { n: 2, row: 4, col: 3, dir: 'across', answer: 'DAŞ', clue: 'Mineral 1' }
    ]
  };
  const errs = validateLevelData(lvl);
  assert.ok(errs.some(e => e.includes('Grid is disconnected')));
});

test('Rule 10: Clues non-empty, whole-word check, and apostrophe handling', () => {
  let lvl = createValidLevel();
  lvl.entries[0].clue = '   ';
  assert.ok(validateLevelData(lvl).some(e => e.includes('Field "clue" must be a non-empty string')));

  // Direct case-insensitive match
  lvl = createValidLevel();
  lvl.entries[0].clue = 'Hər kəsin sevimli ana varlığı';
  assert.ok(validateLevelData(lvl).some(e => e.includes('contains its own answer "ANA" as a whole word')));

  // Azerbaijani locale casing check: 'işıq' matching 'İŞIQ'
  lvl = {
    id: 1,
    title: 'Test',
    difficulty: 1,
    rows: 5,
    cols: 5,
    entries: [
      { n: 1, row: 0, col: 0, dir: 'across', answer: 'İŞIQ', clue: 'Otağa düşən işıq şəfəqi' },
      { n: 1, row: 0, col: 0, dir: 'down',   answer: 'İSTİ', clue: 'Soyuq olmayan hərarət' }
    ]
  };
  assert.ok(validateLevelData(lvl).some(e => e.includes('contains its own answer "İŞIQ" as a whole word')));

  // Apostrophe suffixes: 'Bakı\'da', 'Bakı’da', '«Bakı»' for answer 'BAKI'
  lvl = {
    id: 1,
    title: 'Test',
    difficulty: 1,
    rows: 5,
    cols: 5,
    entries: [
      { n: 1, row: 0, col: 0, dir: 'across', answer: 'BAKI', clue: 'Tarixi Bakı\'da yerləşən qala' },
      { n: 1, row: 0, col: 0, dir: 'down',   answer: 'BULAQ', clue: 'Yerdən qaynayan saf su' }
    ]
  };
  assert.ok(validateLevelData(lvl).some(e => e.includes('contains its own answer "BAKI" as a whole word')));

  lvl.entries[0].clue = 'Tarixi Bakı’da yerləşən qala';
  assert.ok(validateLevelData(lvl).some(e => e.includes('contains its own answer "BAKI" as a whole word')));

  lvl.entries[0].clue = 'Gözəl «BAKI» haqqında nəğmə';
  assert.ok(validateLevelData(lvl).some(e => e.includes('contains its own answer "BAKI" as a whole word')));

  // Subword without apostrophe is allowed: 'anası' when answer is 'ANA'
  lvl = createValidLevel();
  lvl.entries[0].clue = 'Uşağın mehriban anası';
  assert.equal(validateLevelData(lvl).length, 0);
});

// ==========================================
// 3. File & Sample Levels Verification
// ==========================================

test('Sample level 001 is completely valid', () => {
  const file = path.resolve(PROJECT_ROOT, 'levels', 'level-001.json');
  const res = validateLevelFile(file);
  assert.equal(res.ok, true, `Errors: ${res.errors.join('; ')}`);
});

test('Sample level 002 is completely valid', () => {
  const file = path.resolve(PROJECT_ROOT, 'levels', 'level-002.json');
  const res = validateLevelFile(file);
  assert.equal(res.ok, true, `Errors: ${res.errors.join('; ')}`);
});

test('Sample level 003 is completely valid', () => {
  const file = path.resolve(PROJECT_ROOT, 'levels', 'level-003.json');
  const res = validateLevelFile(file);
  assert.equal(res.ok, true, `Errors: ${res.errors.join('; ')}`);
});

test('Broken fixture triggers intersection mismatch', () => {
  const file = path.resolve(PROJECT_ROOT, 'tools', 'test-fixtures', 'broken.json');
  const res = validateLevelFile(file);
  assert.equal(res.ok, false);
  assert.ok(res.errors.some(e => e.includes('Intersection mismatch')));
});

test('validateIndexFile validates index.json and all levels', () => {
  const file = path.resolve(PROJECT_ROOT, 'levels', 'index.json');
  const res = validateIndexFile(file);
  assert.equal(res.okLevels, 3);
  assert.equal(res.errorLevels, 0);
});
