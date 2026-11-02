/**
 * UI text and labels in Azerbaijani.
 * All user-facing strings are centralized here to prevent hardcoding elsewhere.
 */

export const STRINGS = Object.freeze({
  title: 'Azərbaycan Krossvord Oyunu',
  across: 'Üfüqi',
  down: 'Şaquli',
  selectLevel: 'Səviyyəni seç',
  completed: 'Təbrik edirik! Səviyyə tamamlandı.',
  gridLabel: 'Krossvord toru',
  noClueSelected: 'İpucu seçilməyib',
  cellLabel: (row, col, num, letter) => {
    let desc = `${row + 1}-ci sətir, ${col + 1}-ci sütun`;
    if (num) {
      desc += `, nömrə ${num}`;
    }
    if (letter) {
      desc += `, hərf: ${letter}`;
    }
    return desc;
  }
});
