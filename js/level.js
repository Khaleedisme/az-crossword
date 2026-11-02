import { normalizeAnswer } from './alphabet.js';

/**
 * Builds runtime grid and entry data structures from a level JSON object.
 * Pure logic, no DOM dependencies.
 *
 * @param {object} levelJson
 * @returns {{
 *   id: number,
 *   title: string,
 *   rows: number,
 *   cols: number,
 *   cells: Array<Array<object|null>>,
 *   entries: Array<object>
 * }}
 */
export function buildLevel(levelJson) {
  const { id, title, rows, cols, entries: rawEntries = [] } = levelJson;

  const cells = Array.from({ length: rows }, () => Array(cols).fill(null));
  const entries = [];

  for (const raw of rawEntries) {
    const entryId = `${raw.n}-${raw.dir}`;
    const answer = normalizeAnswer(raw.answer);
    const cellCoords = [];

    for (let k = 0; k < answer.length; k++) {
      const r = raw.dir === 'down' ? raw.row + k : raw.row;
      const c = raw.dir === 'across' ? raw.col + k : raw.col;
      const ch = answer[k];

      cellCoords.push({ row: r, col: c });

      if (!cells[r][c]) {
        cells[r][c] = {
          row: r,
          col: c,
          solution: ch,
          number: null,
          across: null,
          down: null
        };
      }

      if (raw.dir === 'across') {
        cells[r][c].across = entryId;
      } else if (raw.dir === 'down') {
        cells[r][c].down = entryId;
      }
    }

    // Assign clue number to the entry's starting cell
    cells[raw.row][raw.col].number = raw.n;

    entries.push({
      id: entryId,
      n: raw.n,
      dir: raw.dir,
      clue: raw.clue,
      answer,
      cells: cellCoords
    });
  }

  return {
    id,
    title,
    rows,
    cols,
    cells,
    entries
  };
}
