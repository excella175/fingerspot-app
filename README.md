# Fingerspot Attendance App

Aplikasi web absensi yang terintegrasi dengan **Fingerspot Cloud API** (Task 2 — Integrasi API & Webhook). Dibangun dengan Next.js (App Router), Prisma, dan PostgreSQL (Supabase).

## Fitur

- **Autentikasi** — login/logout dengan JWT (token di cookie `httpOnly`), halaman dashboard terlindungi middleware.
- **Data Absensi** — tarik data `get_attlog` dari mesin (chunk 2 hari untuk rentang lama), filter tanggal/PIN/mesin, polling realtime, laporan detail & rekap kehadiran dengan export.
- **Data User** — sinkron `get_all_pin`, turunkan data ke mesin (`set_userinfo`), set QR code (VIDA Series), import/export Excel dengan **preview validasi** (PIN wajib & unik, kantor/jabatan tidak cocok = peringatan), hapus user (DB ± mesin).
- **Kantor & Jabatan** — kelola kantor beserta jabatannya; user diarahkan ke kantor/jabatan; hapus kantor yang masih punya user diblokir sampai user dipindahkan (reassign).
- **Multi-Mesin** — daftar mesin (Cloud ID), kirim perintah ke mesin terpilih, auto-register mesin saat webhook/perintah API masuk, filter laporan per mesin.
- **Perangkat** — info perangkat (`get_device`), set zona waktu (`set_time`), restart mesin (`restart_device`), set QR code dengan preview & download PNG.
- **Izin & Cuti, Jam Kerja, Jadwal** — master izin/cuti, riwayat, jam kerja, jadwal manual & auto.
- **Monitoring** — riwayat API (`api_logs`), riwayat webhook (`webhook_logs`), test webhook.

## Teknologi

- [Next.js 16](https://nextjs.org) (App Router, Turbopack)
- [Prisma ORM](https://www.prisma.io) + PostgreSQL (Supabase)
- [Tailwind CSS](https://tailwindcss.com) + shadcn/ui-style components
- JWT (jose), xlsx (import/export), qrcode (QR preview)

## Struktur Database

```
Device ─────────────┐
                    ├── AttendanceLog (per scan, simpan deviceCloudId)
UserInfo ───────────┘
  ├── Kantor ─── 1:N ─── Jabatan ─── 1:N ─── UserInfo
WebhookLog, ApiLog, PinList
```

ERD lengkap: `docs/erd.drawio` (import ke draw.io). Regenerate: `node scripts/generate-erd.js`.

## Setup

### 1. Prasyarat

- Node.js 20+
- Akun [Fingerspot Developer](https://developer.fingerspot.io) (API key & Cloud ID mesin)
- Database PostgreSQL (mis. [Supabase](https://supabase.com))

### 2. Install dependensi

```bash
pnpm install   # npm dapat gagal (ERESOLVE), gunakan pnpm
```

### 3. Konfigurasi environment

Salin `.env.example` ke `.env` dan isi:

```env
# Database (Supabase)
DATABASE_URL="postgresql://..."

# Fingerspot Cloud API
FINGERSPOT_API_URL="https://developer.fingerspot.io/api"
FINGERSPOT_API_KEY="<api-key-dari-portal>"
FINGERSPOT_CLOUD_ID="<cloud-id-mesin-utama>"

# JWT untuk autentikasi aplikasi
JWT_SECRET="<secret-random-kuat>"

# URL publik aplikasi (untuk link webhook & web)
NEXT_PUBLIC_APP_URL="https://fingerspot-app.vercel.app"
```

### 4. Migrasi database

Database tidak selalu bisa dijangkau dari lokal — migration sudah disiapkan di `prisma/migrations/`. Jalankan:

```bash
npx prisma migrate deploy
npx prisma generate
```

### 5. Jalankan

```bash
pnpm dev        # development: http://localhost:3000
pnpm build      # production build
pnpm start      # jalankan hasil build
```

### 6. Deploy ke Vercel

1. Push repo ke GitHub, import ke Vercel.
2. Isi semua env variable di Vercel Project Settings → Environment Variables.
3. Deploy. Vercel otomatis menjalankan `prisma migrate deploy` jika build command diatur, atau jalankan migration manual ke Supabase (SQL di `prisma/migrations/`).

## Webhook Fingerspot

Satu URL webhook cukup untuk semua mesin (payload berisi `cloud_id`):

```
https://<domain>/api/webhook/fingerspot
```

Isi URL tersebut di **developer.fingerspot.io → Webhook**. Tipe yang ditangani:

- `attlog` — simpan log absensi (dedupe by `trans_id`+`scan_date`+`pin`)
- `userinfo` — simpan/update user (PIN, nama, template wajah, fingerprint, RFID)
- `pinlist` — sinkron daftar PIN
- lainnya — dicatat sebagai log saja

Setiap webhook yang masuk otomatis **mendaftarkan mesin** (dari `cloud_id`) dan menandainya ONLINE.

## Integrasi API

Semua perintah Fingerspot diproksi lewat `/api/fingerspot` (terlindungi JWT):

| command          | fungsi                |
|------------------|-----------------------|
| `get_attlog`     | tarik log absensi     |
| `get_userinfo`   | ambil data user       |
| `get_all_pin`    | sinkron daftar PIN    |
| `set_userinfo`   | turunkan user ke mesin |
| `delete_userinfo`| hapus user di mesin   |
| `set_qrcode`     | set QR code (VIDA)    |
| `get_device`     | info perangkat        |
| `set_time`       | set zona waktu        |
| `restart_device` | restart mesin         |

Multi-mesin: setiap request dapat menyertakan `params.cloudId` untuk menargetkan mesin tertentu (default: `FINGERSPOT_CLOUD_ID`).

## Akun Default

Login pertama (seeder `src/app/api/seed-sample` bila digunakan):

```
username: admin
password: admin123
```

## Screenshot & Dokumentasi

- Screenshot halaman: folder `docs/screenshots/` (isi saat pengumpulan).
- ERD: `docs/erd.drawio`.
