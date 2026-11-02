import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildLevel } from '../js/level.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const level001Path = path.resolve(__dirname, '..', 'levels', 'level-001.json');
const level001 = JSON.parse(fs.readFileSync(level001Path, 'utf8'));

test('buildLevel on level-001: numbering, cell list, shared cell', () => {
  const { cells, entries } = buildLevel(level001);

  // 1. Numbering: starting cell has number, non-start cell has null, blocked is null
  assert.equal(cells[0][2].number, 1);
  assert.equal(cells[1][2].number, null);
  assert.equal(cells[0][0], null);

  // 2. One entry's cell list: 1-down (GÖL) at (0,2), (1,2), (2,2)
  const entry1Down = entries.find(e => e.id === '1-down');
  assert.deepEqual(entry1Down.cells, [
    { row: 0, col: 2 },
    { row: 1, col: 2 },
    { row: 2, col: 2 }
  ]);

  // 3. One shared cell referencing both entries: (2,2) shared by 2-across and 1-down
  const sharedCell = cells[2][2];
  assert.equal(sharedCell.across, '2-across');
  assert.equal(sharedCell.down, '1-down');
  assert.equal(sharedCell.solution, 'L');
});
