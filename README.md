# 🚀 Discord Sunucu Koruma ve Moderasyon Botu

> **Coded By Zywexx**

Gelişmiş koruma, moderasyon ve yönetim özellikleriyle donatılmış bir Discord botu.
Sunucunuzu davet linklerinden, küfürlerden, spam saldırılarından ve kötü niyetli kullanıcılardan korur.
Aynı zamanda yedekleme, loglama ve kapsamlı moderasyon araçları sunar.

---

## 📌 Özellikler

### 🔒 Koruma

* Davet engelleme
* Tehlikeli rol koruması
* Bot ekleme koruması
* Booster koruması
* Vanity (özel URL) koruması
* Webhook koruması

### 🛡️ Filtreleme

* Spam koruma
* Küfür engelleme
* Link engelleme

### 🛠️ Moderasyon

* Ban, unban, kick
* Mute / unmute (süreli & sınırsız)
* Uyarı sistemi (ekle, kaldır, listele)
* Mesaj temizleme
* Yavaş mod ayarlama
* Kanal kilitle / aç
* Rol verme / alma / oluşturma / silme
* Kanal oluşturma / silme

### 📂 Yönetim & Loglama

* Otomatik loglama
* Sunucu yedekleme & geri yükleme
* Beyaz liste sistemi

---

## ⚙️ Kurulum

1. Repoyu klonla:

   ```bash
   git clone https://github.com/Zywexx/Discord-Sunucu-Koruma-ve-Moderasyon-Botu
   cd projeadi
   ```

2. Gerekli paketleri yükle:

   ```bash
   npm install discord.js dotenv
   ```

3. `.env` dosyası oluştur ve içine bot tokenini ekle:

   ```
   TOKEN=discord-bot-tokenin
   IZINLI_SUNUCU_IDLER=sunucu-ıd
   ```

4. İsteğe bağlı olarak ayarları değiştirmek için `bot-config.json` oluşturabilirsin.
   → Bunun için `bot-config.html` dosyasını tarayıcıda aç, özellikleri seç, “Kaydet”e bas ve dosyayı indir.

5. Botu başlat:

   ```bash
   node index.js
   ```

---

## 💻 Kullanım

* Yardım menüsünü görmek için:

  ```
  !yardim
  ```
* Belirli bir kategori için:

  ```
  !yardim moderasyon
  ```

---

## 📸 Ayar Paneli (HTML)

Projenin içinde `bot-config.html` dosyası bulunur. Bu dosya sayesinde bot özelliklerini görsel arayüzden açıp kapatabilir ve `bot-config.json` olarak indirebilirsin.

---

## 📝 Notlar

* Varsayılan prefix: **`!`**
* Owner ID ve log kanalı ID’sini `index.js` içinden değiştirebilirsin.
* Bot sadece izin verdiğin sunucularda çalışabilir ( `.env` içindeki `ALLOWED_GUILD_IDS` ile).

---

## 📌 Lisans

Bu proje GPL-3.0 lisansı altında lisanslanmıştır. Daha fazla bilgi için LICENSE dosyasına bakın.
