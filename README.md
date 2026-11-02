# Azərbaycan Krossvord Oyunu (az-crossword)

Azərbaycan dili üçün krossvord oyunu məlumat strukturu, ortoqrafik və həndəsi validator, əlifba modulu və nümunə səviyyələr.

## Layihə Strukturu

- `js/alphabet.js`: 32 hərfdən ibarət Azərbaycan əlifbası, simvol yoxlanışı və böyük/kiçik hərf çevirmələri.
- `js/keyboard.js`: Azərbaycan virtual klaviatura düzümü və render funksiyası.
- `js/strings.js`: Bütün interfeys mətnləri.
- `js/level.js`: Səviyyə strukturunu quran modul (`buildLevel`).
- `js/game.js`: Oyun məntiqi və vəziyyət idarəetməsi.
- `js/ui.js`: DOM render və hadisə idarəetməsi.
- `js/main.js`: Tətbiqin giriş nöqtəsi.
- `tools/validate.js`: Səviyyə fayllarını bütün qaydalara uyğun yoxlayan alət.
- `levels/index.json`: Səviyyələrin reyestri.
- `levels/level-XXX.json`: Səviyyə faylları.
- `tests/unit.test.js`: Əlifba və validator qaydaları üçün vahid testləri.
- `tests/level.test.js`: `buildLevel` modulu üçün vahid testlər.
- `tests/keyboard.test.js`: Virtual klaviatura düzümü üçün vahid testlər.

## Oyunu Başlatmaq

`fetch()` və ES modulları `file://` protokolunda işləmir. Yerli HTTP serveri işə salmaq üçün aşağıdakı əmrdən istifadə edin:

```bash
python -m http.server 8080
```

Brauzerdə açın: http://localhost:8080

### Klaviatura
Ekranda daimi olaraq Azərbaycan virtual klaviaturası göstərilir və bütün ekran ölçülərində (o cümlədən mobil telefonlarda) rahat yazmağa imkan verir. Eyni zamanda fiziki klaviatura da əvvəlki kimi işləyir.

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
