# TODO - Debug Absensi (attlog) Tidak Tersimpan ke Supabase

Tujuan: memastikan pipeline berikut bekerja dari awal sampai akhir:
**Device scan → webhook diterima → parse payload valid → insert prisma attendance_logs → data tampil di /api/attlog**

## Step 0 — Pastikan webhook route aktif

- [ ] Cek endpoint yang dipakai device: `/api/webhook/fingerspot`
- [ ] Pastikan device mengirim request ke URL yang benar (host + path)
  - Di device/Fingerspot: pastikan Webhook URL berakhir dengan `/api/webhook/fingerspot`
  - Verifikasi di server log: harus muncul `[Webhook] Received: ...`

## Step 1 — Validasi webhook secret

- [ ] Pastikan env `FINGERSPOT_WEBHOOK_SECRET` di server sama dengan konfigurasi secret di device/Fingerspot
- [ ] Saat scan terjadi, harus muncul log: `[Webhook] Received: ...`
- [ ] Jika ada log: `[Webhook] Invalid secret` berarti request ditolak (401) dan insert tidak akan terjadi

## Step 2 — Validasi payload berisi pin & scan

Di `src/app/api/webhook/fingerspot/route.ts` fungsi `handleAttlog`:

- [ ] Saat scan terjadi, cek console untuk log:
  - `[Webhook][attlog] Missing pin/scan` (pin atau scan null)
- [ ] Pastikan key yang dikirim device sesuai mapping:
  - pin: `pin` / `employee_pin` / `employeePin`
  - scan: `scan` / `scan_time` / `scanTime` / `scan_date` / `scanDate`

## Step 3 — Validasi scanTime tidak Invalid Date

- [ ] Saat scan terjadi, cek console untuk log:
  - `[Webhook][attlog] Invalid scanTime`
- [ ] Pastikan format `scan` yang dikirim device sesuai yang didukung kode parse:
  - `YYYY-MM-DD HH:mm:ss`
  - unix timestamp (sec/ms)
  - `YYYY-MM-DD`
  - varian ISO

## Step 4 — Validasi dedupe tidak menolak semua insert

- [ ] Saat scan terjadi, pastikan record baru muncul di `attendance_logs`
- [ ] Jika tidak bertambah tapi webhook SUCCESS, kemungkinan dedupe `findFirst` menganggap sudah ada
- [ ] Periksa apakah `scanTime` dan `status_scan` dari device konsisten

## Step 5 — Validasi koneksi Prisma ke Supabase (paling umum)

- [ ] Pastikan env `DATABASE_URL` mengarah ke Supabase yang sama dengan tabel `attendance_logs`
- [ ] Jalankan `pnpm build` lalu uji koneksi
- [ ] Saat webhook terjadi, cek `webhook_logs`:
  - Jika `webhook_logs` status `FAILED`, error kemungkinan di DB/Prisma

## Step 6 — Validasi query /api/attlog sesuai timezone

- [ ] Pastikan filter `startDate/endDate` di `/api/attlog` cocok dengan timezone yang disimpan

## Step 7 — Dokumentasi temuan

- [ ] Catat contoh payload mentah dari device untuk 1 scan (tanpa data sensitif)
- [ ] Catat format `scan_date`/`scan_time` yang sebenarnya dikirim device
