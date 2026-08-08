-- AlterTable
ALTER TABLE "api_logs" ALTER COLUMN "status" SET NOT NULL,
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "attendance_logs" ALTER COLUMN "scan_time" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "status" SET NOT NULL,
ALTER COLUMN "source" SET NOT NULL,
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "devices" ALTER COLUMN "status" SET NOT NULL,
ALTER COLUMN "timezone" SET NOT NULL,
ALTER COLUMN "last_sync" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET NOT NULL,
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "pin_lists" ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "user_infos" ALTER COLUMN "privilege" SET NOT NULL,
ALTER COLUMN "finger" SET NOT NULL,
ALTER COLUMN "face" SET NOT NULL,
ALTER COLUMN "rfid" SET NOT NULL,
ALTER COLUMN "vein" SET NOT NULL,
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET NOT NULL,
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "webhook_logs" ALTER COLUMN "status" SET NOT NULL,
ALTER COLUMN "processed_at" SET NOT NULL,
ALTER COLUMN "processed_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- CreateTable
CREATE TABLE "aturans" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "toleransi_terlambat" INTEGER NOT NULL DEFAULT 0,
    "toleransi_pulang_cepat" INTEGER NOT NULL DEFAULT 0,
    "batas_absensi_masuk" INTEGER NOT NULL DEFAULT 0,
    "batas_absensi_pulang" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "aturans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jam_kerjas" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'tetap',
    "aturan_kode" TEXT NOT NULL,
    "hari_kerja" INTEGER NOT NULL DEFAULT 5,
    "start_time" TEXT,
    "end_time" TEXT,
    "istirahat_aktif" BOOLEAN NOT NULL DEFAULT false,
    "istirahat_start" TEXT,
    "istirahat_end" TEXT,
    "lembur_aktif" BOOLEAN NOT NULL DEFAULT false,
    "lembur_awal_min" INTEGER,
    "lembur_awal_max" INTEGER,
    "lembur_akhir_min" INTEGER,
    "lembur_akhir_max" INTEGER,
    "max_duration" INTEGER,
    "cutoff_start" TEXT,
    "cutoff_end" TEXT,
    "lembur_min" INTEGER,
    "lembur_max" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jam_kerjas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jadwal_autos" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jadwal_autos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jadwal_auto_days" (
    "id" TEXT NOT NULL,
    "jadwal_id" TEXT NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "jam_kerja_kode" TEXT NOT NULL,

    CONSTRAINT "jadwal_auto_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jadwal_auto_employees" (
    "id" TEXT NOT NULL,
    "jadwal_id" TEXT NOT NULL,
    "employee_pin" TEXT NOT NULL,

    CONSTRAINT "jadwal_auto_employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jadwal_manuals" (
    "id" TEXT NOT NULL,
    "employee_pin" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "jam_kerja_kode" TEXT NOT NULL,
    "start_time" TEXT,
    "end_time" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jadwal_manuals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_izin_cuti" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "tipe" TEXT NOT NULL DEFAULT 'izin',
    "kuota" INTEGER NOT NULL DEFAULT 1,
    "masaKerja" INTEGER NOT NULL DEFAULT 1,
    "aturPengajuan" INTEGER NOT NULL DEFAULT 0,
    "batasPengajuan" INTEGER NOT NULL DEFAULT 1,
    "statusAbsensi" TEXT NOT NULL DEFAULT 'H',
    "jenisKelamin" TEXT NOT NULL DEFAULT 'semua',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "master_izin_cuti_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "riwayat_izin_cuti" (
    "id" TEXT NOT NULL,
    "employee_pin" TEXT NOT NULL,
    "master_izin_id" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "foto" TEXT,
    "catatan" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "riwayat_izin_cuti_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_reports" (
    "id" TEXT NOT NULL,
    "employee_pin" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'H',
    "scan_in" TIMESTAMP(3),
    "scan_out" TIMESTAMP(3),
    "scheduled_start" TEXT,
    "scheduled_end" TEXT,
    "late_minutes" INTEGER,
    "early_leave_minutes" INTEGER,
    "overtime_minutes" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "aturans_kode_key" ON "aturans"("kode");

-- CreateIndex
CREATE UNIQUE INDEX "jam_kerjas_kode_key" ON "jam_kerjas"("kode");

-- CreateIndex
CREATE UNIQUE INDEX "jadwal_auto_days_jadwal_id_day_of_week_key" ON "jadwal_auto_days"("jadwal_id", "day_of_week");

-- CreateIndex
CREATE UNIQUE INDEX "jadwal_auto_employees_jadwal_id_employee_pin_key" ON "jadwal_auto_employees"("jadwal_id", "employee_pin");

-- CreateIndex
CREATE UNIQUE INDEX "jadwal_manuals_employee_pin_date_key" ON "jadwal_manuals"("employee_pin", "date");

-- CreateIndex
CREATE INDEX "riwayat_izin_cuti_employee_pin_idx" ON "riwayat_izin_cuti"("employee_pin");

-- CreateIndex
CREATE INDEX "riwayat_izin_cuti_start_date_idx" ON "riwayat_izin_cuti"("start_date");

-- CreateIndex
CREATE INDEX "riwayat_izin_cuti_end_date_idx" ON "riwayat_izin_cuti"("end_date");

-- CreateIndex
CREATE INDEX "riwayat_izin_cuti_status_idx" ON "riwayat_izin_cuti"("status");

-- CreateIndex
CREATE INDEX "attendance_reports_employee_pin_idx" ON "attendance_reports"("employee_pin");

-- CreateIndex
CREATE INDEX "attendance_reports_date_idx" ON "attendance_reports"("date");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_reports_employee_pin_date_key" ON "attendance_reports"("employee_pin", "date");

-- AddForeignKey
ALTER TABLE "jadwal_auto_days" ADD CONSTRAINT "jadwal_auto_days_jadwal_id_fkey" FOREIGN KEY ("jadwal_id") REFERENCES "jadwal_autos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jadwal_auto_employees" ADD CONSTRAINT "jadwal_auto_employees_jadwal_id_fkey" FOREIGN KEY ("jadwal_id") REFERENCES "jadwal_autos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "idx_api_logs_command" RENAME TO "api_logs_command_idx";

-- RenameIndex
ALTER INDEX "idx_api_logs_created_at" RENAME TO "api_logs_created_at_idx";

-- RenameIndex
ALTER INDEX "idx_api_logs_status" RENAME TO "api_logs_status_idx";

-- RenameIndex
ALTER INDEX "idx_attendance_logs_device_cloud_id" RENAME TO "attendance_logs_device_cloud_id_idx";

-- RenameIndex
ALTER INDEX "idx_attendance_logs_employee_pin" RENAME TO "attendance_logs_employee_pin_idx";

-- RenameIndex
ALTER INDEX "idx_attendance_logs_scan_time" RENAME TO "attendance_logs_scan_time_idx";

-- RenameIndex
ALTER INDEX "idx_pin_lists_device_cloud_id" RENAME TO "pin_lists_device_cloud_id_idx";

-- RenameIndex
ALTER INDEX "idx_webhook_logs_created_at" RENAME TO "webhook_logs_created_at_idx";

-- RenameIndex
ALTER INDEX "idx_webhook_logs_device_cloud_id" RENAME TO "webhook_logs_device_cloud_id_idx";

-- RenameIndex
ALTER INDEX "idx_webhook_logs_type" RENAME TO "webhook_logs_type_idx";
