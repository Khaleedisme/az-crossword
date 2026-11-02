import { buildLevel } from './level.js';
import { CrosswordGame } from './game.js';
import { CrosswordUI } from './ui.js';
import { loadProgress, saveProgress, sanitizeLetters } from './storage.js';

async function initApp() {
  try {
    const indexResponse = await fetch('levels/index.json');
    if (!indexResponse.ok) {
      throw new Error(`Failed to load index.json: ${indexResponse.status}`);
    }
    const indexList = await indexResponse.json();
    if (!Array.isArray(indexList) || indexList.length === 0) {
      throw new Error('No levels found in index.json');
    }

    const progress = loadProgress();

    // Determine initial level: open lastLevelId if it exists in index.json, otherwise the first level
    let currentLevelItem = null;
    if (progress.lastLevelId != null) {
      currentLevelItem = indexList.find(lvl => lvl.id === progress.lastLevelId || String(lvl.id) === String(progress.lastLevelId));
    }
    if (!currentLevelItem) {
      currentLevelItem = indexList[0];
    }

    async function createGameForLevel(levelItem) {
      const levelData = await loadLevelFile(levelItem.file);
      const level = buildLevel(levelData);
      const savedLevel = progress.levels?.[String(levelItem.id)];
      const sanitized = sanitizeLetters(level, savedLevel?.letters);
      return new CrosswordGame(level, sanitized);
    }

    const initialGame = await createGameForLevel(currentLevelItem);

    // Save initial open so lastLevelId is recorded
    progress.lastLevelId = currentLevelItem.id;
    saveProgress(progress);

    const ui = new CrosswordUI(initialGame, {
      levelList: indexList,
      getProgress: () => progress,
      onChange: (currentGame) => {
        progress.lastLevelId = currentGame.level.id;
        if (!progress.levels || typeof progress.levels !== 'object') {
          progress.levels = {};
        }
        progress.levels[String(currentGame.level.id)] = {
          letters: { ...currentGame.letters },
          completed: currentGame.completed
        };
        saveProgress(progress);
      },
      onLevelSelect: async (levelItem) => {
        try {
          const newGame = await createGameForLevel(levelItem);
          progress.lastLevelId = levelItem.id;
          saveProgress(progress);
          ui.setGame(newGame);
        } catch (err) {
          console.error('Error switching level:', err);
        }
      }
    });

    ui.setLevelList(indexList);
  } catch (err) {
    console.error('Error initializing crossword app:', err);
  }
}

async function loadLevelFile(filename) {
  const resp = await fetch(`levels/${filename}`);
  if (!resp.ok) {
    throw new Error(`Failed to load levels/${filename}: ${resp.status}`);
  }
  return await resp.json();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
