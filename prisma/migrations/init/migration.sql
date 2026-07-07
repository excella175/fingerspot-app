-- Fingerspot Dashboard Database Schema
-- PostgreSQL

-- Devices table
CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  cloud_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OFFLINE',
  timezone TEXT NOT NULL DEFAULT 'Asia/Jakarta',
  last_sync TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Attendance Logs table
CREATE TABLE IF NOT EXISTS attendance_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  employee_pin TEXT NOT NULL,
  device_cloud_id TEXT NOT NULL,
  scan_time TIMESTAMPTZ NOT NULL,
  verify_method INTEGER,
  status_scan INTEGER,
  status TEXT NOT NULL DEFAULT 'IN',
  source TEXT NOT NULL DEFAULT 'realtime',
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_attendance_logs_employee_pin ON attendance_logs(employee_pin);
CREATE INDEX idx_attendance_logs_device_cloud_id ON attendance_logs(device_cloud_id);
CREATE INDEX idx_attendance_logs_scan_time ON attendance_logs(scan_time);

-- User Info table
CREATE TABLE IF NOT EXISTS user_infos (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  pin TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password TEXT,
  privilege INTEGER NOT NULL DEFAULT 1,
  finger INTEGER NOT NULL DEFAULT 0,
  face INTEGER NOT NULL DEFAULT 0,
  rfid INTEGER NOT NULL DEFAULT 0,
  vein INTEGER NOT NULL DEFAULT 0,
  template TEXT,
  device_cloud_id TEXT,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pin List table
CREATE TABLE IF NOT EXISTS pin_lists (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  device_cloud_id TEXT NOT NULL,
  pin TEXT NOT NULL,
  total INTEGER,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pin_lists_device_cloud_id ON pin_lists(device_cloud_id);

-- API Logs table
CREATE TABLE IF NOT EXISTS api_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  command TEXT NOT NULL,
  device_cloud_id TEXT NOT NULL,
  trans_id TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  request_payload JSONB,
  response_payload JSONB,
  error_message TEXT,
  duration INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_api_logs_command ON api_logs(command);
CREATE INDEX idx_api_logs_status ON api_logs(status);
CREATE INDEX idx_api_logs_created_at ON api_logs(created_at);

-- Webhook Logs table
CREATE TABLE IF NOT EXISTS webhook_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  type TEXT NOT NULL,
  device_cloud_id TEXT NOT NULL,
  trans_id TEXT,
  status TEXT NOT NULL DEFAULT 'SUCCESS',
  payload JSONB,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhook_logs_type ON webhook_logs(type);
CREATE INDEX idx_webhook_logs_device_cloud_id ON webhook_logs(device_cloud_id);
CREATE INDEX idx_webhook_logs_created_at ON webhook_logs(created_at);
