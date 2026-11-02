import { isValidLetter, toAzUpper } from './alphabet.js';

/**
 * Crossword game state and core logic (pure, no DOM).
 */
export class CrosswordGame {
  constructor(level) {
    this.level = level;
    // Map of "row,col" -> uppercase letter
    this.letters = {};
    // Selected cell coordinates { row, col } or null
    this.selected = null;
    // Current direction: 'across' or 'down'
    this.direction = 'across';
    // Whether the crossword is completely and correctly filled
    this.completed = false;

    // Default to the first entry if available
    const ordered = this.getOrderedEntries();
    if (ordered.length > 0) {
      this.selectEntry(ordered[0].id);
    }
  }

  /**
   * Returns all entries sorted in numeric order, across before down.
   */
  getOrderedEntries() {
    if (!this.level || !Array.isArray(this.level.entries)) return [];
    const across = this.level.entries.filter(e => e.dir === 'across').sort((a, b) => a.n - b.n);
    const down = this.level.entries.filter(e => e.dir === 'down').sort((a, b) => a.n - b.n);
    return [...across, ...down];
  }

  /**
   * Returns the currently selected entry object based on selected cell and direction.
   */
  getSelectedEntry() {
    if (!this.selected || !this.level) return null;
    const cell = this.level.cells[this.selected.row]?.[this.selected.col];
    if (!cell) return null;
    const entryId = this.direction === 'across'
      ? (cell.across || cell.down)
      : (cell.down || cell.across);
    return this.level.entries.find(e => e.id === entryId) || null;
  }

  /**
   * Checks if a cell is part of the currently selected entry.
   */
  isCellInSelectedEntry(r, c) {
    const entry = this.getSelectedEntry();
    if (!entry) return false;
    return entry.cells.some(coord => coord.row === r && coord.col === c);
  }

  /**
   * Selects a cell. Ignores blocked cells.
   * If already selected and cell has both entries, toggles direction.
   * Otherwise keeps the current direction if the cell has an entry in it, else switches.
   */
  selectCell(row, col) {
    if (!this.level || row < 0 || row >= this.level.rows || col < 0 || col >= this.level.cols) {
      return;
    }
    const cell = this.level.cells[row][col];
    if (!cell) return; // ignore blocked

    if (this.selected && this.selected.row === row && this.selected.col === col) {
      if (cell.across && cell.down) {
        this.direction = this.direction === 'across' ? 'down' : 'across';
        return;
      }
    }

    this.selected = { row, col };
    const hasCurrent = this.direction === 'across' ? Boolean(cell.across) : Boolean(cell.down);
    if (!hasCurrent) {
      if (cell.across) {
        this.direction = 'across';
      } else if (cell.down) {
        this.direction = 'down';
      }
    }
  }

  /**
   * Selects an entry by id. Selects first empty cell of the entry (or first cell if full).
   */
  selectEntry(entryId) {
    if (!this.level) return;
    const entry = this.level.entries.find(e => e.id === entryId);
    if (!entry) return;

    this.direction = entry.dir;
    const emptyCell = entry.cells.find(c => !this.letters[`${c.row},${c.col}`]);
    if (emptyCell) {
      this.selected = { row: emptyCell.row, col: emptyCell.col };
    } else if (entry.cells.length > 0) {
      this.selected = { row: entry.cells[0].row, col: entry.cells[0].col };
    }
  }

  /**
   * Writes a letter if valid, then moves to the next empty cell in the entry
   * (or the next cell, or stays at the end).
   */
  typeLetter(letter) {
    if (!this.selected || !this.level) return;
    const upper = toAzUpper(letter);
    if (!isValidLetter(upper)) return;

    const cell = this.level.cells[this.selected.row]?.[this.selected.col];
    if (!cell) return;

    this.letters[`${this.selected.row},${this.selected.col}`] = upper;

    const entry = this.getSelectedEntry();
    if (entry) {
      const idx = entry.cells.findIndex(
        c => c.row === this.selected.row && c.col === this.selected.col
      );
      if (idx !== -1) {
        let nextEmpty = null;
        for (let i = idx + 1; i < entry.cells.length; i++) {
          const coord = entry.cells[i];
          if (!this.letters[`${coord.row},${coord.col}`]) {
            nextEmpty = coord;
            break;
          }
        }
        if (nextEmpty) {
          this.selected = { row: nextEmpty.row, col: nextEmpty.col };
        } else if (idx + 1 < entry.cells.length) {
          this.selected = { row: entry.cells[idx + 1].row, col: entry.cells[idx + 1].col };
        } else {
          this.selected = { row: entry.cells[idx].row, col: entry.cells[idx].col };
        }
      }
    }

    this.checkCompletion();
  }

  /**
   * Clears the current letter; if already empty, steps back one cell and clears that.
   */
  backspace() {
    if (!this.selected || !this.level) return;
    const key = `${this.selected.row},${this.selected.col}`;

    if (this.letters[key]) {
      delete this.letters[key];
    } else {
      const entry = this.getSelectedEntry();
      if (entry) {
        const idx = entry.cells.findIndex(
          c => c.row === this.selected.row && c.col === this.selected.col
        );
        if (idx > 0) {
          const prevCoord = entry.cells[idx - 1];
          this.selected = { row: prevCoord.row, col: prevCoord.col };
          delete this.letters[`${prevCoord.row},${prevCoord.col}`];
        }
      }
    }

    this.checkCompletion();
  }

  /**
   * Moves to the nearest non-blocked cell in the specified (dr, dc) direction.
   */
  moveArrow(dr, dc) {
    if (!this.level) return;
    if (!this.selected) {
      for (let r = 0; r < this.level.rows; r++) {
        for (let c = 0; c < this.level.cols; c++) {
          if (this.level.cells[r][c]) {
            this.selectCell(r, c);
            return;
          }
        }
      }
      return;
    }

    let r = this.selected.row + dr;
    let c = this.selected.col + dc;
    while (r >= 0 && r < this.level.rows && c >= 0 && c < this.level.cols) {
      const cell = this.level.cells[r][c];
      if (cell) {
        this.selected = { row: r, col: c };
        if (this.direction === 'across' && !cell.across && cell.down) {
          this.direction = 'down';
        } else if (this.direction === 'down' && !cell.down && cell.across) {
          this.direction = 'across';
        }
        return;
      }
      r += dr;
      c += dc;
    }
  }

  /**
   * Cycles to the next entry in numeric order (across before down).
   */
  nextEntry() {
    const ordered = this.getOrderedEntries();
    if (ordered.length === 0) return;
    const current = this.getSelectedEntry();
    const idx = current ? ordered.findIndex(e => e.id === current.id) : -1;
    const nextIdx = (idx + 1) % ordered.length;
    this.selectEntry(ordered[nextIdx].id);
  }

  /**
   * Cycles to the previous entry in numeric order (across before down).
   */
  prevEntry() {
    const ordered = this.getOrderedEntries();
    if (ordered.length === 0) return;
    const current = this.getSelectedEntry();
    const idx = current ? ordered.findIndex(e => e.id === current.id) : -1;
    const prevIdx = idx <= 0 ? ordered.length - 1 : idx - 1;
    this.selectEntry(ordered[prevIdx].id);
  }

  /**
   * Checks if every non-blocked cell equals its solution.
   */
  checkCompletion() {
    if (!this.level || !this.level.cells) {
      this.completed = false;
      return false;
    }

    for (let r = 0; r < this.level.rows; r++) {
      for (let c = 0; c < this.level.cols; c++) {
        const cell = this.level.cells[r][c];
        if (cell) {
          const letter = this.letters[`${r},${c}`];
          if (!letter || letter !== cell.solution) {
            this.completed = false;
            return false;
          }
        }
      }
    }

    this.completed = true;
    return true;
  }
}
