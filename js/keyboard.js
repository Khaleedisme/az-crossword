import { STRINGS } from './strings.js';

/**
 * Standard Azerbaijani QWERTY layout.
 * Exactly 32 letters of the alphabet, each once across 3 rows.
 */
export const KEYBOARD_LAYOUT = [
  ['Q', 'Ü', 'E', 'R', 'T', 'Y', 'U', 'İ', 'O', 'P', 'Ö', 'Ğ'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'I', 'Ə'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M', 'Ç', 'Ş']
];

/**
 * Renders the virtual keyboard into a given container element.
 *
 * @param {HTMLElement} container
 * @param {{ onLetter?: (letter: string) => void, onBackspace?: () => void }} [options]
 */
export function renderKeyboard(container, { onLetter, onBackspace } = {}) {
  if (!container) return;
  container.innerHTML = '';

  KEYBOARD_LAYOUT.forEach((rowLetters, rowIndex) => {
    const rowEl = document.createElement('div');
    rowEl.className = 'keyboard-row';

    for (const letter of rowLetters) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'keyboard-key';
      btn.textContent = letter;
      btn.setAttribute('aria-label', letter);

      btn.addEventListener('pointerdown', (e) => e.preventDefault());
      btn.addEventListener('mousedown', (e) => e.preventDefault());
      btn.addEventListener('click', () => {
        if (typeof onLetter === 'function') {
          onLetter(letter);
        }
      });

      rowEl.appendChild(btn);
    }

    // Add backspace key at the end of Row 3
    if (rowIndex === 2) {
      const backspaceBtn = document.createElement('button');
      backspaceBtn.type = 'button';
      backspaceBtn.className = 'keyboard-key keyboard-key-backspace';
      backspaceBtn.textContent = '⌫';
      backspaceBtn.setAttribute('aria-label', STRINGS.backspace);

      backspaceBtn.addEventListener('pointerdown', (e) => e.preventDefault());
      backspaceBtn.addEventListener('mousedown', (e) => e.preventDefault());
      backspaceBtn.addEventListener('click', () => {
        if (typeof onBackspace === 'function') {
          onBackspace();
        }
      });

      rowEl.appendChild(backspaceBtn);
    }

    container.appendChild(rowEl);
  });
}
