# 🐱 Miyav Doku

Reklamsız, kedili mantık bulmacası. Telefonda ve tablette tam ekran çalışır.

## Kurallar
- Her renkli bölgeye **1 kedi**
- Her satır ve sütuna **1 kedi**
- Kediler birbirine **değemez** (çapraz da dahil)

Bir dokunuş ❌, iki dokunuş 🐱. Sürükleyerek çok sayıda ❌ atılır. 💡 ipucu bir sonraki mantık adımını anlatır.

## Bölümler
- 1000 hazır bölüm (`levels.js`), hepsi **tek çözümlü** ve **tahminsiz, mantıkla çözülür**
- 1000'den sonrası otomatik üretilir
- Zorluk: 1–40 temel mantık, 41–200 ikili sıkışmalar, 200+ üçlü sıkışmalar
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
