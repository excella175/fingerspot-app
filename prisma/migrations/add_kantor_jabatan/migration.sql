-- CreateTable
CREATE TABLE "kantors" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "alamat" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kantors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jabatans" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "kantor_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jabatans_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "user_infos" ADD COLUMN "kantor_id" TEXT,
ADD COLUMN "jabatan_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "kantors_nama_key" ON "kantors"("nama");

-- CreateIndex
CREATE UNIQUE INDEX "jabatans_kantor_id_nama_key" ON "jabatans"("kantor_id", "nama");

-- CreateIndex
CREATE INDEX "jabatans_kantor_id_idx" ON "jabatans"("kantor_id");

-- CreateIndex
CREATE INDEX "user_infos_kantor_id_idx" ON "user_infos"("kantor_id");

-- CreateIndex
CREATE INDEX "user_infos_jabatan_id_idx" ON "user_infos"("jabatan_id");

-- AddForeignKey
ALTER TABLE "jabatans" ADD CONSTRAINT "jabatans_kantor_id_fkey" FOREIGN KEY ("kantor_id") REFERENCES "kantors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_infos" ADD CONSTRAINT "user_infos_kantor_id_fkey" FOREIGN KEY ("kantor_id") REFERENCES "kantors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_infos" ADD CONSTRAINT "user_infos_jabatan_id_fkey" FOREIGN KEY ("jabatan_id") REFERENCES "jabatans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
