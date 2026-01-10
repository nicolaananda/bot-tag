# 🤖 Bot Hidetag WhatsApp

Bot sederhana untuk mengirim pesan dengan mention semua anggota grup tanpa menampilkan teks mention (hidetag).

## ✨ Fitur

- 📢 **Hidetag** - Mention semua anggota grup tanpa menampilkan teks mention
- 🔒 **Group Whitelist** - Hanya bekerja di grup yang terdaftar
- 👑 **Owner/Admin Only** - Hanya owner dan admin grup yang bisa menggunakan

## 📋 Requirements

- Node.js >= 16.0.0
- WhatsApp account
- Environment variables (lihat `.env.example`)

## 🚀 Installation

1. Clone repository
```bash
git clone <repository-url>
cd bot-hidetag
```

2. Install dependencies
```bash
npm install
```

3. Copy environment file
```bash
cp env.example .env
```

4. Edit `.env` file dan isi:
```env
BOT_GROUP_NAMES=Ress Zoom & Netflix GH, Ress Baru GH Zoom Netflix, GH bot BARU
BOT_GROUP_LINKS=https://chat.whatsapp.com/L0LR1HBOFKJAiQv5Busd9t,https://chat.whatsapp.com/KwBA0yxcwl0JGpL6uN7L9i,https://chat.whatsapp.com/GO2a2ty2n5JAz5b6E9HpEs
```

5. Edit `setting.js` dan sesuaikan nomor owner:
```javascript
global.owner = ["6287777657944","6281389592985","6287887842985"]
```

6. Jalankan bot
```bash
npm start
```

## 📖 Cara Penggunaan

### Hidetag Command

Ketik di grup WhatsApp:
```
hidetag
```

atau dengan teks:
```
hidetag Selamat pagi semuanya
```

atau reply pesan lalu ketik:
```
hidetag
```

Bot akan mengirim pesan dengan mention semua anggota grup tanpa menampilkan teks mention.

## ⚙️ Konfigurasi

### Group Whitelist

Bot hanya bekerja di grup yang terdaftar di environment variables:

- `BOT_GROUP_NAMES` - Nama grup (comma-separated, case-insensitive, partial match)
- `BOT_GROUP_LINKS` - Link grup WhatsApp (comma-separated)

### Owner List

Edit `setting.js` untuk menambahkan nomor owner:
```javascript
global.owner = ["6287777657944","6281389592985","6287887842985"]
```

Owner bisa menggunakan fitur tanpa perlu menjadi admin grup.

## 📝 License

ISC

