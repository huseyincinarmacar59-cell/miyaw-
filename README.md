# 🐱 Miyav Doku

Reklamsız, kedili mantık bulmacası. Telefonda ve tablette tam ekran çalışır.

## Kurallar
- Her renkli bölgeye **1 kedi**
- Her satır ve sütuna **1 kedi**
- Kediler birbirine **değemez** (çapraz da dahil)

Orijinal **Meowdoku** gibi: her bölümde 3 balık (can) var, yanlış kareye kedi koyunca biri gider; ilk 100 bölümde bir kedi hediye gelir. Bir dokunuş ❌, iki dokunuş 🐱. Sürükleyerek çok sayıda ❌ atılır. 💡 ipucu bir sonraki mantık adımını anlatır.

## Bölümler
- 1000 hazır bölüm (`levels.js`), hepsi **tek çözümlü** ve **tahminsiz, mantıkla çözülür**
- 1000'den sonrası otomatik üretilir
- Tahta: 5x5'ten başlar, 49. bölümden itibaren 10x10
- Zorluk: 1–30 temel mantık, 31–150 ikili sıkışmalar, 150+ üçlü sıkışmalar
- 💡 ipucu ve 🐱 kedi hakları reklamsız: her bölüm +1 ipucu, her 3 bölümde +1 kedi
- Bölümleri yeniden üretmek için: `node build-levels.js`

## Dosyalar
| Dosya | Ne işe yarar |
|---|---|
| `index.html` | Oyunun kendisi (arayüz) |
| `logic.js` | İnsan gibi adım adım çözen mantık çözücü (ipucu da bunu kullanır) |
| `gen.js` | Bölüm üretici + kesin çözücü |
| `levels.js` | Hazır 1000 bölüm |
| `sw.js`, `manifest.json` | İnternetsiz çalışma ve ana ekrana ekleyince tam ekran |

## Tam ekran kurulum (iPhone / iPad)
Safari'de oyunu aç → **Paylaş** ⬆️ → **Ana Ekrana Ekle**. Ana ekrandaki kediye dokununca tam ekran açılır.
