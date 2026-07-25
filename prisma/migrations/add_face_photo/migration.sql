-- Add face_photo column to user_infos table
ALTER TABLE "user_infos" ADD COLUMN IF NOT EXISTS "face_photo" TEXT;
