import { isValidLetter, toAzUpper } from './alphabet.js';
import { STRINGS } from './strings.js';

/**
 * DOM-based UI Controller for the Crossword Game.
 */
export class CrosswordUI {
  constructor(game, callbacks = {}) {
    this.game = game;
    this.callbacks = callbacks;

    this.gridEl = document.getElementById('grid');
    this.clueBarEl = document.getElementById('clue-bar');
    this.bannerEl = document.getElementById('completion-banner');
    this.levelSelectEl = document.getElementById('level-select');
    this.levelSelectLabelEl = document.getElementById('level-select-label');
    this.appTitleEl = document.getElementById('app-title');
    this.acrossHeadingEl = document.getElementById('across-heading');
    this.downHeadingEl = document.getElementById('down-heading');
    this.acrossCluesEl = document.getElementById('across-clues');
    this.downCluesEl = document.getElementById('down-clues');
    this.hiddenInputEl = document.getElementById('hidden-input');

    this.initStaticText();
    this.initKeyboardEvents();
    this.initMobileInput();
    this.render();
  }

  /**
   * Populates static UI strings from STRINGS to avoid hardcoded text.
   */
  initStaticText() {
    if (this.appTitleEl) this.appTitleEl.textContent = STRINGS.title;
    if (this.levelSelectLabelEl) this.levelSelectLabelEl.textContent = STRINGS.selectLevel;
    if (this.acrossHeadingEl) this.acrossHeadingEl.textContent = STRINGS.across;
    if (this.downHeadingEl) this.downHeadingEl.textContent = STRINGS.down;
    if (this.bannerEl) this.bannerEl.textContent = STRINGS.completed;
    if (this.gridEl) this.gridEl.setAttribute('aria-label', STRINGS.gridLabel);
  }

  /**
   * Updates current game state (e.g. when switching levels).
   */
  setGame(game) {
    this.game = game;
    this.render();
  }

  /**
   * Initializes the level selector options from levels/index.json.
   */
  initLevelSelector(levelList, currentFile) {
    if (!this.levelSelectEl) return;
    this.levelSelectEl.innerHTML = '';
    for (const item of levelList) {
      const opt = document.createElement('option');
      opt.value = item.file;
      opt.textContent = item.title;
      if (item.file === currentFile) {
        opt.selected = true;
      }
      this.levelSelectEl.appendChild(opt);
    }

    this.levelSelectEl.addEventListener('change', (e) => {
      this.levelSelectEl.blur();
      if (this.callbacks.onLevelChange) {
        this.callbacks.onLevelChange(e.target.value);
      }
    });
  }

  /**
   * Sets up physical keyboard event listeners on document.
   */
  initKeyboardEvents() {
    document.addEventListener('keydown', (e) => {
      // Do not hijack keyboard navigation when interacting with the level select dropdown
      if (e.target === this.levelSelectEl) {
        return;
      }

      // Ignore key combinations with ctrl, alt, or meta
      if (e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }

      // Arrows
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        this.game.moveArrow(0, -1);
        this.render();
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        this.game.moveArrow(0, 1);
        this.render();
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.game.moveArrow(-1, 0);
        this.render();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.game.moveArrow(1, 0);
        this.render();
        return;
      }

      // Backspace
      if (e.key === 'Backspace') {
        e.preventDefault();
        this.game.backspace();
        this.render();
        return;
      }

      // Tab / Shift+Tab
      if (e.key === 'Tab') {
        e.preventDefault();
        if (e.shiftKey) {
          this.game.prevEntry();
        } else {
          this.game.nextEntry();
        }
        this.render();
        return;
      }

      // Single characters: letters
      if (e.key.length === 1) {
        const letter = toAzUpper(e.key);
        if (isValidLetter(letter)) {
          e.preventDefault();
          this.game.typeLetter(letter);
          this.render();
        }
      }
    });
  }

  /**
   * Sets up hidden input for mobile software keyboard fallback.
   */
  initMobileInput() {
    if (!this.hiddenInputEl) return;

    this.hiddenInputEl.addEventListener('input', (e) => {
      if (e.inputType === 'deleteContentBackward' || e.inputType === 'deleteWordBackward') {
        this.game.backspace();
        this.render();
        this.hiddenInputEl.value = '';
        return;
      }

      const text = e.data || this.hiddenInputEl.value;
      this.hiddenInputEl.value = '';
      if (text) {
        for (const char of text) {
          const upper = toAzUpper(char);
          if (isValidLetter(upper)) {
            this.game.typeLetter(upper);
          }
        }
        this.render();
      }
    });
  }

  /**
   * Main render function that updates grid, clues, clue bar, and completion banner.
   */
  render() {
    if (!this.game || !this.game.level) return;

    // 1. Update CSS columns variable
    document.documentElement.style.setProperty('--cols', String(this.game.level.cols));

    // 2. Render Completion Banner
    if (this.bannerEl) {
      if (this.game.completed) {
        this.bannerEl.classList.add('visible');
      } else {
        this.bannerEl.classList.remove('visible');
      }
    }

    // 3. Render Clue Bar
    if (this.clueBarEl) {
      const entry = this.game.getSelectedEntry();
      if (entry) {
        const dirName = STRINGS[entry.dir] || entry.dir;
        this.clueBarEl.textContent = `${entry.n} ${dirName}: ${entry.clue}`;
      } else {
        this.clueBarEl.textContent = STRINGS.noClueSelected;
      }
    }

    // 4. Render Grid
    this.renderGrid();

    // 5. Render Clue Lists
    this.renderClueLists();
  }

  /**
   * Renders the crossword cells into the grid.
   */
  renderGrid() {
    if (!this.gridEl) return;
    this.gridEl.innerHTML = '';

    const { rows, cols, cells } = this.game.level;
    const selected = this.game.selected;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cellData = cells[r][c];
        const cellEl = document.createElement('div');
        cellEl.setAttribute('role', 'gridcell');

        if (!cellData) {
          cellEl.className = 'cell blocked';
          cellEl.setAttribute('aria-hidden', 'true');
        } else {
          cellEl.className = 'cell letter';
          const isSelected = selected && selected.row === r && selected.col === c;
          const isHighlighted = this.game.isCellInSelectedEntry(r, c);

          if (isSelected) {
            cellEl.classList.add('selected');
          } else if (isHighlighted) {
            cellEl.classList.add('highlighted');
          }

          if (cellData.number !== null && cellData.number !== undefined) {
            const numEl = document.createElement('span');
            numEl.className = 'cell-number';
            numEl.textContent = String(cellData.number);
            cellEl.appendChild(numEl);
          }

          const letter = this.game.letters[`${r},${c}`] || '';
          const letterSpan = document.createElement('span');
          letterSpan.className = 'cell-letter';
          letterSpan.textContent = letter;
          cellEl.appendChild(letterSpan);

          cellEl.setAttribute('aria-label', STRINGS.cellLabel(r, c, cellData.number, letter));

          cellEl.addEventListener('click', () => {
            this.game.selectCell(r, c);
            if (this.hiddenInputEl) {
              this.hiddenInputEl.focus({ preventScroll: true });
            }
            this.render();
          });
        }

        this.gridEl.appendChild(cellEl);
      }
    }
  }

  /**
   * Renders the across and down clue lists.
   */
  renderClueLists() {
    if (!this.acrossCluesEl || !this.downCluesEl) return;

    this.acrossCluesEl.innerHTML = '';
    this.downCluesEl.innerHTML = '';

    const selectedEntry = this.game.getSelectedEntry();
    const ordered = this.game.getOrderedEntries();

    for (const entry of ordered) {
      const li = document.createElement('li');
      li.className = 'clue-item';
      li.textContent = `${entry.n}. ${entry.clue}`;

      if (selectedEntry && selectedEntry.id === entry.id) {
        li.classList.add('selected');
      }

      li.addEventListener('click', () => {
        this.game.selectEntry(entry.id);
        if (this.hiddenInputEl) {
          this.hiddenInputEl.focus({ preventScroll: true });
        }
        this.render();
      });

      if (entry.dir === 'across') {
        this.acrossCluesEl.appendChild(li);
      } else {
        this.downCluesEl.appendChild(li);
      }
    }
  }
}
