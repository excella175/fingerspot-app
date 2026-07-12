# TODO - Supabase (DB) untuk Prisma (tanpa ubah flow aplikasi)

## Step 1 — Pasang connection string Supabase ke env

- Siapkan nilai `DATABASE_URL` dari Supabase Postgres (Connection string).
- Pastikan `DATABASE_URL` dipakai oleh Prisma (sudah dipakai di `prisma.config.ts` & `src/lib/prisma.ts`).

## Step 2 — Buat tabel di Supabase

- Aplikasi saat ini belum ada schema di Supabase.
- Jalankan salah satu:
  - (opsi A) Jalankan `node create-tables.js` untuk membuat tabel.
  - (opsi B) Jalankan Prisma migrate (butuh setup migrations yang sesuai).

## Step 3 — Jalankan build & test

- `pnpm build`
- `pnpm dev` lalu test endpoint login dan /api/userinfo.

## Step 4 — (Opsional) Documentasikan env yang diperlukan

- Tambahkan info di README/TODO tentang variabel env yang harus ada.
