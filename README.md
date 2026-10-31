# Azərbaycan Krossvord Oyunu (az-crossword)

Azərbaycan dili üçün krossvord oyunu məlumat strukturu, ortoqrafik və həndəsi validator, əlifba modulu və nümunə səviyyələr.

## Layihə Strukturu

- `js/alphabet.js`: 32 hərfdən ibarət Azərbaycan əlifbası, simvol yoxlanışı və böyük/kiçik hərf çevirmələri.
- `tools/validate.js`: Səviyyə fayllarını bütün qaydalara (sxem, əlifba, sərhədlər, kəsişmələr, toxunmalar, qaçılmaz yan sözlər, nömrələmə, unikal cavablar, əlaqəlilik və ipucu bütöv söz yoxlanışı) uyğun yoxlayan alət.
- `levels/index.json`: Səviyyələrin reyestri.
- `levels/level-XXX.json`: Səviyyə faylları.
- `tools/test-fixtures/broken.json`: Xəta aşkarlanmasını yoxlamaq üçün nümunə xətalı fayl.
- `tests/unit.test.js`: Əlifba və validator qaydaları üçün vahid testləri.

## İstifadə Qaydası

Bütün səviyyələri yoxlamaq:
```bash
node tools/validate.js
```

Tək bir səviyyəni yoxlamaq:
```bash
node tools/validate.js levels/level-001.json
```

Testləri icra etmək:
```bash
npm test
```
