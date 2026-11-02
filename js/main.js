import { buildLevel } from './level.js';
import { CrosswordGame } from './game.js';
import { CrosswordUI } from './ui.js';

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

    const firstLevelItem = indexList[0];
    const initialLevelData = await loadLevelFile(firstLevelItem.file);
    const initialLevel = buildLevel(initialLevelData);
    const game = new CrosswordGame(initialLevel);

    const ui = new CrosswordUI(game, {
      onLevelChange: async (levelFile) => {
        try {
          const levelData = await loadLevelFile(levelFile);
          const level = buildLevel(levelData);
          const newGame = new CrosswordGame(level);
          ui.setGame(newGame);
        } catch (err) {
          console.error('Error switching level:', err);
        }
      }
    });

    ui.initLevelSelector(indexList, firstLevelItem.file);
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
