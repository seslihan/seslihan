# Basit Seslihan

Ücretsiz, uçtan uca (peer-to-peer) sesli ve görüntülü konuşma, anlık sohbet ve dosya paylaşımı yapan basit bir web uygulaması.

## Özellikler

- **Sesli ve görüntülü konuşma** (WebRTC, mesh topolojisi, 2-4 kişi)
- **Oda bazlı** çalışma — paylaşılabilir oda kodu
- **Anlık sohbet** — metin mesajları, "yazıyor..." göstergesi
- **Dosya/belge paylaşımı** — resim, PDF, belge vb. (max 25 MB)
- **Ekran paylaşımı**
- **Mikrofon/kamera açma-kapama**
- Modern, karanlık tema arayüz
- Mobil uyumlu

## Gereksinimler

- Node.js 18 ve üzeri
- Modern bir tarayıcı (Chrome, Edge, Firefox, Safari — son sürümler)
- Kamera ve mikrofon erişimi için **HTTPS** (veya `localhost`)

## Kurulum

```bash
cd "C:\Users\teramisu\Desktop\basit seslihan"
npm install
```

## Çalıştırma

```bash
npm start
```

Sunucu `http://localhost:3000` adresinde çalışır. Tarayıcınızdan açın.

## Kullanım

1. Ana sayfada **adınızı** girin
2. **Yeni oda oluştur** deyin veya bir oda kodu ile **Katıl**'a tıklayın
3. Oluşturduğunuz oda kodunu paylaşarak başkalarının katılmasını sağlayın
4. Tarayıcı kamera/mikrofon izni isteyecek — kabul edin
5. Oda panelinde:
   - Sol: video ızgarası ve kontrol butonları (mikrofon, kamera, ekran paylaş, ayrıl)
   - Sağ: sohbet paneli (mesaj yazma, dosya gönderme, emoji göstergesi)

## Notlar

- Dosyalar sunucuya 6 saat boyunca saklanır, sonra otomatik silinir
- Mesajlar kaydedilmez (sadece o anda odada olan kişiler görür)
- Sunucu sadece **sinyalleşme** (signaling) için kullanılır — ses/görüntü trafiği tarayıcılar arasında doğrudan (peer-to-peer) gider
- İnternet üzerinden kullanmak için HTTPS gerekir (örn. [ngrok](https://ngrok.com), [Cloudflare Tunnel](https://www.cloudflare.com/products/tunnel/) veya bir VPS + Let's Encrypt)

## Ücretsiz Deploy Seçenekleri

- [Render](https://render.com) — ücretsiz Node.js hosting
- [Railway](https://railway.app) — ücretsiz katman mevcut
- [Fly.io](https://fly.io) — ücretsiz katman
- [Cyclic](https://cyclic.sh) — ücretsiz Node.js

> Not: Bazı ücretsiz platformlarda dosya yükleme (disk) kalıcı olmayabilir. Bu durumda `public/uploads` klasörünü S3/Cloudinary gibi bir servise bağlamanız gerekir.

## Dosya Yapısı

```
basit seslihan/
├── server.js              # Express + Socket.io sunucu
├── package.json
├── public/
│   ├── index.html         # Ana sayfa
│   ├── room.html          # Oda sayfası
│   ├── css/style.css
│   ├── js/
│   │   ├── main.js        # Ana sayfa JS
│   │   └── room.js        # Oda sayfası + WebRTC
│   └── uploads/           # Yüklenen dosyalar (geçici)
```

## Lisans

MIT
