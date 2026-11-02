import { isValidLetter, toAzUpper } from './alphabet.js';
import { renderKeyboard } from './keyboard.js';
import { STRINGS } from './strings.js';

/**
 * DOM-based UI Controller for the Crossword Game.
 */
export class CrosswordUI {
  constructor(game, callbacks = {}) {
    this.game = game;
    this.callbacks = callbacks;
    this.levelList = callbacks.levelList || [];

    this.wrongCellKeys = null;
    this.helpersStatusText = '';

    this.gridEl = document.getElementById('grid');
    this.clueBarEl = document.getElementById('clue-bar');
    this.clueTextEl = document.getElementById('clue-text');
    this.cluePrevBtnEl = document.getElementById('clue-prev-btn');
    this.clueNextBtnEl = document.getElementById('clue-next-btn');
    this.bannerEl = document.getElementById('completion-banner');
    this.completionMsgEl = document.getElementById('completion-message');
    this.nextLevelBtnEl = document.getElementById('next-level-btn');
    this.appTitleEl = document.getElementById('app-title');
    this.currentLevelTitleEl = document.getElementById('current-level-title');
    this.levelsToggleBtnEl = document.getElementById('levels-toggle-btn');
    this.levelsPanelEl = document.getElementById('levels-panel');
    this.acrossHeadingEl = document.getElementById('across-heading');
    this.downHeadingEl = document.getElementById('down-heading');
    this.acrossCluesEl = document.getElementById('across-clues');
    this.downCluesEl = document.getElementById('down-clues');
    this.keyboardEl = document.getElementById('keyboard');
    this.checkBtnEl = document.getElementById('check-btn');
    this.revealLetterBtnEl = document.getElementById('reveal-letter-btn');
    this.revealWordBtnEl = document.getElementById('reveal-word-btn');
    this.resetBtnEl = document.getElementById('reset-btn');
    this.helpersStatusEl = document.getElementById('helpers-status');

    this.initStaticText();
    this.initKeyboardEvents();
    this.initClueNavEvents();
    this.initVirtualKeyboard();
    this.initHelperEvents();
    this.initLevelListEvents();
    this.render();
  }

  /**
   * Populates static UI strings from STRINGS to avoid hardcoded text.
   */
  initStaticText() {
    if (this.appTitleEl) this.appTitleEl.textContent = STRINGS.title;
    if (this.acrossHeadingEl) this.acrossHeadingEl.textContent = STRINGS.across;
    if (this.downHeadingEl) this.downHeadingEl.textContent = STRINGS.down;
    if (this.completionMsgEl) this.completionMsgEl.textContent = STRINGS.completed;
    if (this.nextLevelBtnEl) this.nextLevelBtnEl.textContent = STRINGS.nextLevel;
    if (this.levelsToggleBtnEl) this.levelsToggleBtnEl.textContent = STRINGS.levels;
    if (this.checkBtnEl) this.checkBtnEl.textContent = STRINGS.check;
    if (this.revealLetterBtnEl) this.revealLetterBtnEl.textContent = STRINGS.revealLetter;
    if (this.revealWordBtnEl) this.revealWordBtnEl.textContent = STRINGS.revealWord;
    if (this.resetBtnEl) this.resetBtnEl.textContent = STRINGS.reset;
    if (this.gridEl) this.gridEl.setAttribute('aria-label', STRINGS.gridLabel);
    if (this.cluePrevBtnEl) {
      this.cluePrevBtnEl.setAttribute('aria-label', STRINGS.prevClue);
      this.cluePrevBtnEl.textContent = '‹';
    }
    if (this.clueNextBtnEl) {
      this.clueNextBtnEl.setAttribute('aria-label', STRINGS.nextClue);
      this.clueNextBtnEl.textContent = '›';
    }
  }

  /**
   * Initializes navigation buttons inside the clue bar.
   */
  initClueNavEvents() {
    if (this.cluePrevBtnEl) {
      this.cluePrevBtnEl.addEventListener('pointerdown', (e) => e.preventDefault());
      this.cluePrevBtnEl.addEventListener('mousedown', (e) => e.preventDefault());
      this.cluePrevBtnEl.addEventListener('click', () => {
        this.game.prevEntry();
        this.render();
      });
    }
    if (this.clueNextBtnEl) {
      this.clueNextBtnEl.addEventListener('pointerdown', (e) => e.preventDefault());
      this.clueNextBtnEl.addEventListener('mousedown', (e) => e.preventDefault());
      this.clueNextBtnEl.addEventListener('click', () => {
        this.game.nextEntry();
        this.render();
      });
    }
  }

  /**
   * Initializes the virtual Azerbaijani keyboard.
   */
  initVirtualKeyboard() {
    if (!this.keyboardEl) return;
    renderKeyboard(this.keyboardEl, {
      onLetter: (letter) => {
        this.game.typeLetter(letter);
        this.handleStateChange();
      },
      onBackspace: () => {
        this.game.backspace();
        this.handleStateChange();
      }
    });
  }

  /**
   * Initializes helper buttons (Yoxla, Hərfi aç, Sözü aç, Sıfırla).
   * Prevents focus stealing via pointerdown/mousedown preventDefault.
   */
  initHelperEvents() {
    const attachHelperBtn = (btn, action) => {
      if (!btn) return;
      btn.addEventListener('pointerdown', (e) => e.preventDefault());
      btn.addEventListener('mousedown', (e) => e.preventDefault());
      btn.addEventListener('click', action);
    };

    attachHelperBtn(this.checkBtnEl, () => {
      this.checkLetters();
    });

    attachHelperBtn(this.revealLetterBtnEl, () => {
      this.game.revealCell();
      this.handleStateChange();
    });

    attachHelperBtn(this.revealWordBtnEl, () => {
      this.game.revealEntry();
      this.handleStateChange();
    });

    attachHelperBtn(this.resetBtnEl, () => {
      if (window.confirm(STRINGS.confirmReset)) {
        this.game.reset();
        this.handleStateChange();
      }
    });
  }

  /**
   * Initializes level panel toggle and next level button events.
   */
  initLevelListEvents() {
    if (this.levelsToggleBtnEl && this.levelsPanelEl) {
      this.levelsToggleBtnEl.addEventListener('click', () => {
        this.levelsPanelEl.hidden = !this.levelsPanelEl.hidden;
        if (!this.levelsPanelEl.hidden) {
          this.renderLevelsPanel();
        }
      });
    }

    if (this.nextLevelBtnEl) {
      this.nextLevelBtnEl.addEventListener('click', () => {
        const nextLevel = this.getNextLevel();
        if (nextLevel && this.callbacks.onLevelSelect) {
          this.callbacks.onLevelSelect(nextLevel);
        }
      });
    }
  }

  /**
   * Evaluates filled letters against solutions, marks wrong cells, and sets status text.
   */
  checkLetters() {
    const wrong = this.game.getWrongCells();
    this.wrongCellKeys = new Set(wrong.map(w => `${w.row},${w.col}`));
    if (wrong.length === 0) {
      this.helpersStatusText = STRINGS.allCorrect;
    } else {
      this.helpersStatusText = STRINGS.wrongCount(wrong.length);
    }
    this.render();
  }

  /**
   * Clears wrong marks and status text.
   */
  clearWrongMarks() {
    this.wrongCellKeys = null;
    this.helpersStatusText = '';
  }

  /**
   * Central handler for state-changing actions (typing, backspace, reveal, reset).
   * Clears wrong marks and status text, invokes onChange callback, and re-renders.
   */
  handleStateChange() {
    this.clearWrongMarks();
    if (this.callbacks.onChange) {
      this.callbacks.onChange(this.game);
    }
    this.render();
  }

  /**
   * Returns the next level from index.json if one exists.
   */
  getNextLevel() {
    if (!this.levelList || !this.game?.level) return null;
    const currentIdx = this.levelList.findIndex(
      lvl => lvl.id === this.game.level.id || String(lvl.id) === String(this.game.level.id)
    );
    if (currentIdx !== -1 && currentIdx + 1 < this.levelList.length) {
      return this.levelList[currentIdx + 1];
    }
    return null;
  }

  /**
   * Updates current game state (e.g. when switching levels).
   */
  setGame(game) {
    this.game = game;
    this.clearWrongMarks();
    this.render();
  }

  /**
   * Sets the level list from index.json.
   */
  setLevelList(levelList) {
    this.levelList = levelList;
    this.render();
  }

  /**
   * Sets up physical keyboard event listeners on document.
   */
  initKeyboardEvents() {
    document.addEventListener('keydown', (e) => {
      // Do not hijack typing or navigation when levels panel is open
      if (this.levelsPanelEl && !this.levelsPanelEl.hidden) {
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
        this.handleStateChange();
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
          this.handleStateChange();
        }
      }
    });
  }

  /**
   * Main render function that updates grid, clues, clue bar, helpers status, and completion banner.
   */
  render() {
    if (!this.game || !this.game.level) return;

    // 1. Update CSS columns variable
    document.documentElement.style.setProperty('--cols', String(this.game.level.cols));

    // 2. Update Header Level Title
    if (this.currentLevelTitleEl) {
      this.currentLevelTitleEl.textContent = this.game.level.title || '';
    }

    // 3. Render Completion Banner & Next Level Button
    if (this.bannerEl) {
      if (this.game.completed) {
        this.bannerEl.classList.add('visible');
        const nextLevel = this.getNextLevel();
        if (nextLevel && this.nextLevelBtnEl) {
          this.nextLevelBtnEl.hidden = false;
        } else if (this.nextLevelBtnEl) {
          this.nextLevelBtnEl.hidden = true;
        }
      } else {
        this.bannerEl.classList.remove('visible');
        if (this.nextLevelBtnEl) {
          this.nextLevelBtnEl.hidden = true;
        }
      }
    }

    // 4. Render Clue Bar
    if (this.clueTextEl) {
      const entry = this.game.getSelectedEntry();
      if (entry) {
        const dirName = STRINGS[entry.dir] || entry.dir;
        this.clueTextEl.textContent = `${entry.n} ${dirName}: ${entry.clue}`;
      } else {
        this.clueTextEl.textContent = STRINGS.noClueSelected;
      }
    }

    // 5. Render Helpers Status
    if (this.helpersStatusEl) {
      this.helpersStatusEl.textContent = this.helpersStatusText || '';
    }

    // 6. Re-render levels panel if visible
    if (this.levelsPanelEl && !this.levelsPanelEl.hidden) {
      this.renderLevelsPanel();
    }

    // 7. Render Grid
    this.renderGrid();

    // 8. Render Clue Lists
    this.renderClueLists();
  }

  /**
   * Renders the grid of level buttons inside the levels panel.
   */
  renderLevelsPanel() {
    if (!this.levelsPanelEl) return;
    this.levelsPanelEl.innerHTML = '';

    const grid = document.createElement('div');
    grid.className = 'levels-grid';

    const progress = this.callbacks.getProgress ? this.callbacks.getProgress() : null;
    const currentLevelId = this.game?.level?.id;

    for (const lvl of this.levelList) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'level-btn';

      const lvlProgress = progress?.levels?.[String(lvl.id)];
      const isCompleted = Boolean(lvlProgress?.completed);
      const hasSavedLetters = Boolean(
        !isCompleted &&
        lvlProgress?.letters &&
        Object.values(lvlProgress.letters).some(l => typeof l === 'string' && l.trim().length > 0)
      );

      let statusMark = '';
      let ariaStatus = '';
      if (isCompleted) {
        statusMark = ' ✓';
        ariaStatus = ` - ${STRINGS.completedStatus}`;
      } else if (hasSavedLetters) {
        statusMark = ' •';
        ariaStatus = ` - ${STRINGS.inProgressStatus}`;
      }

      btn.textContent = `${lvl.id}${statusMark}`;
      btn.setAttribute('aria-label', `${lvl.title}${ariaStatus}`);

      if (lvl.id === currentLevelId || String(lvl.id) === String(currentLevelId)) {
        btn.classList.add('current');
      }

      btn.addEventListener('click', () => {
        this.levelsPanelEl.hidden = true;
        if (this.callbacks.onLevelSelect) {
          this.callbacks.onLevelSelect(lvl);
        }
      });

      grid.appendChild(btn);
    }

    this.levelsPanelEl.appendChild(grid);
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

          if (this.wrongCellKeys && this.wrongCellKeys.has(`${r},${c}`)) {
            cellEl.classList.add('wrong');
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
