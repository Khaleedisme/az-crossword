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
  backspace: 'Sil',
  prevClue: 'Əvvəlki ipucu',
  nextClue: 'Növbəti ipucu',
  check: 'Yoxla',
  revealLetter: 'Hərfi aç',
  revealWord: 'Sözü aç',
  reset: 'Sıfırla',
  confirmReset: 'Bu səviyyədəki bütün hərflər silinsin?',
  allCorrect: 'Bütün yazılanlar düzgündür.',
  wrongCount: (n) => `${n} səhv hərf var.`,
  levels: 'Səviyyələr',
  nextLevel: 'Növbəti səviyyə',
  completedStatus: 'Tamamlandı',
  inProgressStatus: 'Davam edir',
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
