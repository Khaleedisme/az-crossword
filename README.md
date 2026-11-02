# Azərbaycan Krossvord Oyunu (az-crossword)

Azərbaycan dili üçün krossvord oyunu məlumat strukturu, ortoqrafik və həndəsi validator, əlifba modulu, köməkçilər və nümunə səviyyələr.

## Layihə Strukturu

- `js/alphabet.js`: 32 hərfdən ibarət Azərbaycan əlifbası, simvol yoxlanışı və böyük/kiçik hərf çevirmələri.
- `js/keyboard.js`: Azərbaycan virtual klaviatura düzümü və render funksiyası.
- `js/strings.js`: Bütün interfeys mətnləri.
- `js/level.js`: Səviyyə strukturunu quran modul (`buildLevel`).
- `js/storage.js`: Tərəqqinin yadda saxlanması (`localStorage`) və saxlanmış hərflərin təmizlənməsi (`sanitizeLetters`).
- `js/game.js`: Oyun məntiqi və vəziyyət idarəetməsi.
- `js/ui.js`: DOM render və hadisə idarəetməsi.
- `js/main.js`: Tətbiqin giriş nöqtəsi.
- `tools/validate.js`: Səviyyə fayllarını bütün qaydalara uyğun yoxlayan alət.
- `levels/index.json`: Səviyyələrin reyestri.
- `levels/level-XXX.json`: Səviyyə faylları.
- `tests/unit.test.js`: Əlifba və validator qaydaları üçün vahid testlər.
- `tests/level.test.js`: `buildLevel` modulu üçün vahid testlər.
- `tests/keyboard.test.js`: Virtual klaviatura düzümü üçün vahid testlər.
- `tests/storage.test.js`: `sanitizeLetters` funksiyası üçün vahid testlər.

## Oyunu Başlatmaq

`fetch()` və ES modulları `file://` protokolunda işləmir. Yerli HTTP serveri işə salmaq üçün aşağıdakı əmrdən istifadə edin:

```bash
python -m http.server 8080
```

Brauzerdə açın: http://localhost:8080

### Klaviatura
Ekranda daimi olaraq Azərbaycan virtual klaviaturası göstərilir və bütün ekran ölçülərində (o cümlədən mobil telefonlarda) rahat yazmağa imkan verir. Eyni zamanda fiziki klaviatura da əvvəlki kimi işləyir.

### Tərəqqinin Saxlanması və Köməkçilər

- **Tərəqqinin Saxlanması**: Oyunçu irəliləyişi hər bir brauzer üzrə yerli olaraq `localStorage` vasitəsilə ("az-crossword:v1" açarı ilə) avtomatik saxlanılır. Hər səviyyədə daxil edilmiş hərflər, səviyyənin tamamlanma vəziyyəti və ən son açılmış səviyyə yadda saxlanılır və səhifə yeniləndikdə bərpa olunur.
- **Köməkçi Düymələr**:
  - **Yoxla**: Tor üzərində həlli ilə uyğun gəlməyən bütün səhv hərfləri qırmızı rənglə işarələyir və ümumi vəziyyət barədə məlumat verir.
  - **Hərfi aç**: Seçilmiş xanadakı düzgün hərfi açır və növbəti xanaya keçir.
  - **Sözü aç**: Seçilmiş sözün bütün xanalarını düzgün hərflərlə doldurur.
  - **Sıfırla**: Təsdiq sorğusundan sonra cari səviyyədəki bütün hərfləri təmizləyir və vəziyyəti sıfırlayır.

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
