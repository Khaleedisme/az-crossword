#!/usr/bin/env node

/**
 * Crossword Level Validator (Node.js, no external dependencies)
 * Validates level JSON files against all structural, orthographic,
 * geometric, and clue rules.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALPHABET, isValidLetter, toAzUpper, toAzLower, normalizeAnswer } from '../js/alphabet.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

/**
 * Extracts whole words from text taking Azerbaijani locale and orthography into account.
 * Handles Unicode boundaries, quotes, and suffixes attached by apostrophes (e.g. Bakı'da -> Bakı).
 *
 * @param {string} text
 * @returns {string[]}
 */
export function extractWords(text) {
  if (typeof text !== 'string') return [];
  const apostropheRegex = /['’ʼʻ`´]/g;
  const wordTokens = [];

  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    try {
      const segmenter = new Intl.Segmenter('az', { granularity: 'word' });
      for (const seg of segmenter.segment(text)) {
        if (seg.isWordLike) {
          wordTokens.push(seg.segment);
        }
      }
    } catch {
      // Fallback below
    }
  }

  if (wordTokens.length === 0) {
    const matches = text.match(/[\p{L}\p{M}]+/gu);
    if (matches) {
      wordTokens.push(...matches);
    }
  }

  const resultWords = new Set();
  for (const token of wordTokens) {
    // Clean leading and trailing non-letter characters
    const cleanToken = token.replace(/^[^\p{L}\p{M}]+|[^\p{L}\p{M}]+$/gu, '');
    if (cleanToken.length > 0) {
      resultWords.add(cleanToken);
    }
    // If token contains an apostrophe (e.g. Bakı'da, Bakı’nın), split on apostrophe
    // so that the root proper noun stem is isolated and checked against answers
    if (apostropheRegex.test(token)) {
      const subParts = token.split(apostropheRegex);
      for (const part of subParts) {
        const cleanPart = part.replace(/^[^\p{L}\p{M}]+|[^\p{L}\p{M}]+$/gu, '');
        if (cleanPart.length > 0) {
          resultWords.add(cleanPart);
        }
      }
    }
  }

  return Array.from(resultWords);
}

/**
 * Validates a parsed level object.
 *
 * @param {any} data
 * @param {string} filePath
 * @returns {string[]} list of formatted error messages
 */
export function validateLevelData(data, filePath = 'level.json') {
  const errors = [];
  const fileName = path.basename(filePath);

  const addError = (entryRef, reason) => {
    errors.push(`[${fileName}] (${entryRef}): ${reason}`);
  };

  // --- Rule 1: JSON Schema (top-level) ---
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    addError('Level Header', 'Root JSON must be an object');
    return errors;
  }

  if (typeof data.id !== 'number' || !Number.isInteger(data.id) || data.id <= 0) {
    addError('Level Header', `Field "id" must be a positive integer, got ${JSON.stringify(data.id)}`);
  }

  if (typeof data.title !== 'string' || data.title.trim().length === 0) {
    addError('Level Header', `Field "title" must be a non-empty string, got ${JSON.stringify(data.title)}`);
  }

  if (typeof data.difficulty !== 'number' || !Number.isInteger(data.difficulty) || data.difficulty <= 0) {
    addError('Level Header', `Field "difficulty" must be a positive integer, got ${JSON.stringify(data.difficulty)}`);
  }

  if (typeof data.rows !== 'number' || !Number.isInteger(data.rows) || data.rows <= 0) {
    addError('Level Header', `Field "rows" must be a positive integer, got ${JSON.stringify(data.rows)}`);
  }

  if (typeof data.cols !== 'number' || !Number.isInteger(data.cols) || data.cols <= 0) {
    addError('Level Header', `Field "cols" must be a positive integer, got ${JSON.stringify(data.cols)}`);
  }

  if (!Array.isArray(data.entries) || data.entries.length === 0) {
    addError('Level Header', 'Field "entries" must be a non-empty array');
    return errors;
  }

  const { rows, cols, entries } = data;
  const hasValidDimensions = typeof rows === 'number' && Number.isInteger(rows) && rows > 0 &&
                             typeof cols === 'number' && Number.isInteger(cols) && cols > 0;

  // --- Rule 1 (entry fields) & Rule 2 (Alphabet) & Rule 8 (Duplicate answers) & Rule 10 (Clues) ---
  const gridEntries = [];
  const seenAnswers = new Map();

  entries.forEach((entry, idx) => {
    const entryLabel = `Entry #${entry && entry.n !== undefined ? entry.n : idx + 1}${entry && entry.dir ? ' ' + entry.dir : ''}`;

    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      addError(entryLabel, 'Entry must be an object');
      return;
    }

    let hasGeometricIntegrity = true;

    // Check entry.n
    if (typeof entry.n !== 'number' || !Number.isInteger(entry.n) || entry.n <= 0) {
      addError(entryLabel, `Field "n" must be a positive integer, got ${JSON.stringify(entry.n)}`);
    }

    // Check entry.row
    if (typeof entry.row !== 'number' || !Number.isInteger(entry.row) || entry.row < 0) {
      addError(entryLabel, `Field "row" must be a non-negative integer (0-based), got ${JSON.stringify(entry.row)}`);
      hasGeometricIntegrity = false;
    }

    // Check entry.col
    if (typeof entry.col !== 'number' || !Number.isInteger(entry.col) || entry.col < 0) {
      addError(entryLabel, `Field "col" must be a non-negative integer (0-based), got ${JSON.stringify(entry.col)}`);
      hasGeometricIntegrity = false;
    }

    // Check entry.dir
    if (entry.dir !== 'across' && entry.dir !== 'down') {
      addError(entryLabel, `Field "dir" must be either "across" or "down", got ${JSON.stringify(entry.dir)}`);
      hasGeometricIntegrity = false;
    }

    // Check entry.answer
    if (typeof entry.answer !== 'string') {
      addError(entryLabel, `Field "answer" must be a string, got ${typeof entry.answer}`);
      hasGeometricIntegrity = false;
    } else if (entry.answer.length < 2) {
      addError(entryLabel, `Answer "${entry.answer}" is too short (must be at least 2 letters)`);
      hasGeometricIntegrity = false;
    } else {
      // Rule 2: 32-letter Azerbaijani alphabet & UPPERCASE
      for (const char of entry.answer) {
        if (!isValidLetter(char)) {
          let detail = 'not in the 32-letter Azerbaijani alphabet';
          if ((char >= 'a' && char <= 'z') || ['ç', 'ə', 'ğ', 'ı', 'i', 'ö', 'ş', 'ü'].includes(char)) {
            detail = 'lowercase letters are forbidden (answers must be UPPERCASE)';
          } else if (/\s/.test(char)) {
            detail = 'spaces are forbidden in answers';
          } else if (/\d/.test(char)) {
            detail = 'digits are forbidden in answers';
          } else if (char === '-') {
            detail = 'hyphens are forbidden in answers';
          }
          addError(entryLabel, `Invalid character '${char}' (U+${char.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}) in answer "${entry.answer}": ${detail}`);
        }
      }

      // Rule 8: No duplicate answers within a level (case-insensitive check)
      const normAnswer = toAzUpper(entry.answer);
      if (seenAnswers.has(normAnswer)) {
        const prev = seenAnswers.get(normAnswer);
        addError(entryLabel, `Duplicate answer "${entry.answer}" already used in Entry #${prev.n} ${prev.dir}`);
      } else {
        seenAnswers.set(normAnswer, entry);
      }
    }

    // Rule 10: Clues are non-empty strings and do not contain their own answer as a whole word
    if (typeof entry.clue !== 'string' || entry.clue.trim().length === 0) {
      addError(entryLabel, 'Field "clue" must be a non-empty string');
    } else if (typeof entry.answer === 'string' && entry.answer.length >= 2) {
      const clueWords = extractWords(entry.clue);
      const upperAnswer = toAzUpper(entry.answer);
      for (const word of clueWords) {
        if (toAzUpper(word) === upperAnswer) {
          addError(entryLabel, `Clue contains its own answer "${entry.answer}" as a whole word: "${entry.clue}"`);
          break;
        }
      }
    }

    // Rule 3: Entries stay inside rows x cols
    if (hasValidDimensions && hasGeometricIntegrity) {
      if (entry.row >= rows) {
        addError(entryLabel, `Starting row ${entry.row} is out of bounds (grid has ${rows} rows)`);
        hasGeometricIntegrity = false;
      }
      if (entry.col >= cols) {
        addError(entryLabel, `Starting col ${entry.col} is out of bounds (grid has ${cols} cols)`);
        hasGeometricIntegrity = false;
      }
      if (entry.dir === 'across' && entry.col + entry.answer.length > cols) {
        addError(entryLabel, `Entry "${entry.answer}" extends out of bounds: starts at col ${entry.col}, length ${entry.answer.length}, but grid width is ${cols}`);
        hasGeometricIntegrity = false;
      }
      if (entry.dir === 'down' && entry.row + entry.answer.length > rows) {
        addError(entryLabel, `Entry "${entry.answer}" extends out of bounds: starts at row ${entry.row}, length ${entry.answer.length}, but grid height is ${rows}`);
        hasGeometricIntegrity = false;
      }
    }

    if (hasGeometricIntegrity && hasValidDimensions) {
      gridEntries.push(entry);
    }
  });

  if (!hasValidDimensions || gridEntries.length === 0) {
    return errors;
  }

  // --- Rule 4: Intersections (shared cells must match letters) ---
  const cellLetterMap = new Map(); // `${r},${c}` -> { letter, normLetter, entry, charIndex }
  const entryOccupiedCells = new Map(); // entry -> Set of `${r},${c}`

  for (const entry of gridEntries) {
    const cells = new Set();
    for (let k = 0; k < entry.answer.length; k++) {
      const r = entry.dir === 'across' ? entry.row : entry.row + k;
      const c = entry.dir === 'across' ? entry.col + k : entry.col;
      const letter = entry.answer[k];
      const normLetter = toAzUpper(letter);
      const key = `${r},${c}`;
      cells.add(key);

      if (cellLetterMap.has(key)) {
        const existing = cellLetterMap.get(key);
        if (existing.normLetter !== normLetter) {
          addError(
            `Entry #${existing.entry.n} ${existing.entry.dir} and #${entry.n} ${entry.dir}`,
            `Intersection mismatch at cell (${r}, ${c}): '${existing.letter}' vs '${letter}'`
          );
        }
      } else {
        cellLetterMap.set(key, { letter, normLetter, entry, charIndex: k });
      }
    }
    entryOccupiedCells.set(entry, cells);
  }

  // --- Rule 5: No two entries of same dir overlap or touch end-to-end on the same line ---
  const acrossEntries = gridEntries.filter(e => e.dir === 'across');
  const downEntries = gridEntries.filter(e => e.dir === 'down');

  // Across: check all pairs row by row
  const acrossByRow = new Map();
  for (const entry of acrossEntries) {
    if (!acrossByRow.has(entry.row)) acrossByRow.set(entry.row, []);
    acrossByRow.get(entry.row).push(entry);
  }

  for (const [row, list] of acrossByRow.entries()) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const e1 = list[i];
        const e2 = list[j];
        const e1Start = e1.col;
        const e1End = e1.col + e1.answer.length - 1;
        const e2Start = e2.col;
        const e2End = e2.col + e2.answer.length - 1;

        const overlapStart = Math.max(e1Start, e2Start);
        const overlapEnd = Math.min(e1End, e2End);

        if (overlapStart <= overlapEnd) {
          addError(
            `Entry #${e1.n} across and #${e2.n} across`,
            `Overlap on row ${row}: cols ${e1Start}-${e1End} and ${e2Start}-${e2End}`
          );
        } else if (e1End + 1 === e2Start || e2End + 1 === e1Start) {
          addError(
            `Entry #${e1.n} across and #${e2.n} across`,
            `Entries touch end-to-end on row ${row} (cols ${Math.min(e1End, e2End)} and ${Math.max(e1Start, e2Start)}) without an empty gap cell`
          );
        }
      }
    }
  }

  // Down: check all pairs col by col
  const downByCol = new Map();
  for (const entry of downEntries) {
    if (!downByCol.has(entry.col)) downByCol.set(entry.col, []);
    downByCol.get(entry.col).push(entry);
  }

  for (const [col, list] of downByCol.entries()) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const e1 = list[i];
        const e2 = list[j];
        const e1Start = e1.row;
        const e1End = e1.row + e1.answer.length - 1;
        const e2Start = e2.row;
        const e2End = e2.row + e2.answer.length - 1;

        const overlapStart = Math.max(e1Start, e2Start);
        const overlapEnd = Math.min(e1End, e2End);

        if (overlapStart <= overlapEnd) {
          addError(
            `Entry #${e1.n} down and #${e2.n} down`,
            `Overlap on col ${col}: rows ${e1Start}-${e1End} and ${e2Start}-${e2End}`
          );
        } else if (e1End + 1 === e2Start || e2End + 1 === e1Start) {
          addError(
            `Entry #${e1.n} down and #${e2.n} down`,
            `Entries touch end-to-end on col ${col} (rows ${Math.min(e1End, e2End)} and ${Math.max(e1Start, e2Start)}) without an empty gap cell`
          );
        }
      }
    }
  }

  // --- Rule 6: Derived grid runs (every maximal run of 2+ letters matches exactly one entry) ---
  const grid = Array.from({ length: rows }, () => Array(cols).fill(null));
  for (const entry of gridEntries) {
    for (let k = 0; k < entry.answer.length; k++) {
      const r = entry.dir === 'across' ? entry.row : entry.row + k;
      const c = entry.dir === 'across' ? entry.col + k : entry.col;
      grid[r][c] = toAzUpper(entry.answer[k]);
    }
  }

  const matchedAcrossEntries = new Set();
  const matchedDownEntries = new Set();

  // Maximal horizontal runs
  for (let r = 0; r < rows; r++) {
    let c = 0;
    while (c < cols) {
      if (grid[r][c] !== null) {
        const startCol = c;
        let word = '';
        while (c < cols && grid[r][c] !== null) {
          word += grid[r][c];
          c++;
        }
        const length = c - startCol;
        if (length >= 2) {
          const matching = acrossEntries.filter(e => e.row === r && e.col === startCol && e.answer.length === length);
          if (matching.length === 0) {
            addError(
              'Derived Grid',
              `Accidental unintended across word "${word}" (length ${length}) formed at row ${r}, cols ${startCol}-${c - 1}`
            );
          } else if (matching.length > 1) {
            addError(
              'Derived Grid',
              `Multiple across entries (${matching.map(e => '#' + e.n).join(', ')}) share maximal run at row ${r}, cols ${startCol}-${c - 1}`
            );
          } else {
            matchedAcrossEntries.add(matching[0]);
          }
        }
      } else {
        c++;
      }
    }
  }

  // Maximal vertical runs
  for (let c = 0; c < cols; c++) {
    let r = 0;
    while (r < rows) {
      if (grid[r][c] !== null) {
        const startRow = r;
        let word = '';
        while (r < rows && grid[r][c] !== null) {
          word += grid[r][c];
          r++;
        }
        const length = r - startRow;
        if (length >= 2) {
          const matching = downEntries.filter(e => e.col === c && e.row === startRow && e.answer.length === length);
          if (matching.length === 0) {
            addError(
              'Derived Grid',
              `Accidental unintended down word "${word}" (length ${length}) formed at col ${c}, rows ${startRow}-${r - 1}`
            );
          } else if (matching.length > 1) {
            addError(
              'Derived Grid',
              `Multiple down entries (${matching.map(e => '#' + e.n).join(', ')}) share maximal run at col ${c}, rows ${startRow}-${r - 1}`
            );
          } else {
            matchedDownEntries.add(matching[0]);
          }
        }
      } else {
        r++;
      }
    }
  }

  // Verify that every entry corresponds to a maximal run in its direction
  for (const entry of acrossEntries) {
    if (!matchedAcrossEntries.has(entry)) {
      addError(
        `Entry #${entry.n} across`,
        `Entry "${entry.answer}" (row ${entry.row}, col ${entry.col}) does not correspond to a maximal horizontal run in the derived grid`
      );
    }
  }

  for (const entry of downEntries) {
    if (!matchedDownEntries.has(entry)) {
      addError(
        `Entry #${entry.n} down`,
        `Entry "${entry.answer}" (row ${entry.row}, col ${entry.col}) does not correspond to a maximal vertical run in the derived grid`
      );
    }
  }

  // --- Rule 7: Standard numbering recomputed from geometry ---
  // Scan cells left-to-right, top-to-bottom. Every cell that starts an across word (length >= 2)
  // and/or a down word (length >= 2) gets the next number. Entries sharing a start cell share the number.
  let currentNumber = 1;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const starting = gridEntries.filter(e => e.row === r && e.col === c);
      if (starting.length > 0) {
        const assignedNumber = currentNumber++;
        for (const entry of starting) {
          if (entry.n !== assignedNumber) {
            addError(
              `Entry #${entry.n} ${entry.dir}`,
              `Numbering mismatch at cell (${r}, ${c}): geometry requires number ${assignedNumber}, but entry has ${entry.n}`
            );
          }
        }
      }
    }
  }

  // --- Rule 9: Whole grid connected (one single connected component) ---
  if (gridEntries.length > 0) {
    const n = gridEntries.length;
    const adj = Array.from({ length: n }, () => []);

    for (let i = 0; i < n; i++) {
      const cellsA = entryOccupiedCells.get(gridEntries[i]);
      for (let j = i + 1; j < n; j++) {
        const cellsB = entryOccupiedCells.get(gridEntries[j]);
        let intersects = false;
        for (const key of cellsA) {
          if (cellsB.has(key)) {
            intersects = true;
            break;
          }
        }
        if (intersects) {
          adj[i].push(j);
          adj[j].push(i);
        }
      }
    }

    const visited = new Set([0]);
    const queue = [0];

    while (queue.length > 0) {
      const curr = queue.shift();
      for (const neighbor of adj[curr]) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    if (visited.size < n) {
      const unconnected = gridEntries
        .filter((_, idx) => !visited.has(idx))
        .map(e => `#${e.n} ${e.dir} ("${e.answer}")`);
      addError(
        'Level Grid',
        `Grid is disconnected: found separate components. Unconnected entries: ${unconnected.join(', ')}`
      );
    }
  }

  return errors;
}

/**
 * Validates a single level file by path.
 *
 * @param {string} filePath
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateLevelFile(filePath) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    return {
      ok: false,
      errors: [`[${path.basename(filePath)}] Cannot read file: ${err.message}`]
    };
  }

  let data;
  try {
    data = JSON.parse(content);
  } catch (err) {
    return {
      ok: false,
      errors: [`[${path.basename(filePath)}] JSON parse error: ${err.message}`]
    };
  }

  const errors = validateLevelData(data, filePath);
  return {
    ok: errors.length === 0,
    errors
  };
}

/**
 * Validates levels listed in an index.json file.
 *
 * @param {string} indexPath
 * @returns {{ okLevels: number, errorLevels: number, details: Array<{ file: string, ok: boolean, errors: string[] }> }}
 */
export function validateIndexFile(indexPath) {
  let content;
  try {
    content = fs.readFileSync(indexPath, 'utf8');
  } catch (err) {
    console.error(`Cannot read index file: ${indexPath} (${err.message})`);
    return { okLevels: 0, errorLevels: 1, details: [] };
  }

  let indexList;
  try {
    indexList = JSON.parse(content);
  } catch (err) {
    console.error(`Index file JSON parse error: ${err.message}`);
    return { okLevels: 0, errorLevels: 1, details: [] };
  }

  if (!Array.isArray(indexList)) {
    console.error('index.json must contain an array of level descriptors');
    return { okLevels: 0, errorLevels: 1, details: [] };
  }

  const baseDir = path.dirname(indexPath);
  let okLevels = 0;
  let errorLevels = 0;
  const details = [];

  for (const item of indexList) {
    const levelFileName = item.file || `level-${String(item.id).padStart(3, '0')}.json`;
    const levelFilePath = path.resolve(baseDir, levelFileName);

    const result = validateLevelFile(levelFilePath);

    // Also check consistency between index descriptor and level content
    if (result.ok) {
      try {
        const levelData = JSON.parse(fs.readFileSync(levelFilePath, 'utf8'));
        if (item.id !== levelData.id) {
          result.ok = false;
          result.errors.push(`[${levelFileName}] Index mismatch: index.json id (${item.id}) does not match level id (${levelData.id})`);
        }
        if (item.title !== levelData.title) {
          result.ok = false;
          result.errors.push(`[${levelFileName}] Index mismatch: index.json title ("${item.title}") does not match level title ("${levelData.title}")`);
        }
        if (item.difficulty !== levelData.difficulty) {
          result.ok = false;
          result.errors.push(`[${levelFileName}] Index mismatch: index.json difficulty (${item.difficulty}) does not match level difficulty (${levelData.difficulty})`);
        }
      } catch {
        // Handled in validateLevelFile
      }
    }

    if (result.ok) {
      okLevels++;
    } else {
      errorLevels++;
    }

    details.push({
      file: levelFileName,
      ok: result.ok,
      errors: result.errors
    });
  }

  return { okLevels, errorLevels, details };
}

/**
 * Main CLI entry point.
 */
export async function main() {
  const args = process.argv.slice(2);
  let okCount = 0;
  let errorCount = 0;

  if (args.length === 0) {
    // Default: validate all levels in index.json
    let indexPath = path.resolve(process.cwd(), 'levels', 'index.json');
    if (!fs.existsSync(indexPath)) {
      indexPath = path.resolve(PROJECT_ROOT, 'levels', 'index.json');
    }

    if (!fs.existsSync(indexPath)) {
      console.error(`Error: index.json not found at ${indexPath}`);
      process.exit(1);
    }

    console.log(`Validating levels listed in ${path.relative(process.cwd(), indexPath) || 'levels/index.json'}...\n`);
    const { okLevels, errorLevels, details } = validateIndexFile(indexPath);
    okCount = okLevels;
    errorCount = errorLevels;

    for (const item of details) {
      if (item.ok) {
        console.log(`PASS: ${item.file}`);
      } else {
        console.log(`FAIL: ${item.file}`);
        for (const err of item.errors) {
          console.log(`  - ${err}`);
        }
      }
    }
  } else {
    // Validate specified files (either level files or index files)
    for (const rawArg of args) {
      let targetPath = path.resolve(process.cwd(), rawArg);
      if (!fs.existsSync(targetPath)) {
        targetPath = path.resolve(PROJECT_ROOT, rawArg);
      }

      if (!fs.existsSync(targetPath)) {
        console.error(`File not found: ${rawArg}`);
        errorCount++;
        continue;
      }

      // Detect if the target file is an index file (named index.json or contains a JSON array)
      let isIndexFile = path.basename(targetPath).toLowerCase() === 'index.json';
      if (!isIndexFile) {
        try {
          const parsed = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
          if (Array.isArray(parsed)) {
            isIndexFile = true;
          }
        } catch {
          // Fall through to validateLevelFile for parse error reporting
        }
      }

      if (isIndexFile) {
        console.log(`Validating levels listed in ${rawArg}...\n`);
        const { okLevels, errorLevels, details } = validateIndexFile(targetPath);
        okCount += okLevels;
        errorCount += errorLevels;
        for (const item of details) {
          if (item.ok) {
            console.log(`PASS: ${item.file}`);
          } else {
            console.log(`FAIL: ${item.file}`);
            for (const err of item.errors) {
              console.log(`  - ${err}`);
            }
          }
        }
        console.log('');
        continue;
      }

      console.log(`Validating ${rawArg}...`);
      const { ok, errors } = validateLevelFile(targetPath);
      if (ok) {
        console.log(`PASS: ${rawArg}\n`);
        okCount++;
      } else {
        console.log(`FAIL: ${rawArg}`);
        for (const err of errors) {
          console.log(`  - ${err}`);
        }
        console.log('');
        errorCount++;
      }
    }
  }

  console.log('--------------------------------------------------');
  console.log(`Summary: ${okCount} levels OK, ${errorCount} levels with errors.`);

  if (errorCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

// Run CLI when executed directly
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main().catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });
}
