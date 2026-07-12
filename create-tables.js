const { Client } = require('pg');
const fs = require('fs');

const client = new Client({
  user: 'postgres.lmzauzkqbxevzrzfuzys',
  password: '6H4udftRSwijTb',
  host: 'aws-0-ap-northeast-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
});

const schema = `
CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  cloud_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'OFFLINE',
  timezone TEXT DEFAULT 'Asia/Jakarta',
  last_sync TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attendance_logs (
  id TEXT PRIMARY KEY,
  employee_pin TEXT NOT NULL,
  device_cloud_id TEXT NOT NULL,
  scan_time TIMESTAMP NOT NULL,
  verify_method INT,
  status_scan INT,
  status TEXT DEFAULT 'IN',
  source TEXT DEFAULT 'realtime',
  raw_payload JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_attendance_logs_employee_pin ON attendance_logs(employee_pin);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_device_cloud_id ON attendance_logs(device_cloud_id);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_scan_time ON attendance_logs(scan_time);

CREATE TABLE IF NOT EXISTS user_infos (
  id TEXT PRIMARY KEY,
  pin TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password TEXT,
  privilege INT DEFAULT 1,
  finger INT DEFAULT 0,
  face INT DEFAULT 0,
  rfid INT DEFAULT 0,
  vein INT DEFAULT 0,
  template TEXT,
  device_cloud_id TEXT,
  raw_payload JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pin_lists (
  id TEXT PRIMARY KEY,
  device_cloud_id TEXT NOT NULL,
  pin TEXT NOT NULL,
  total INT,
  raw_payload JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pin_lists_device_cloud_id ON pin_lists(device_cloud_id);

CREATE TABLE IF NOT EXISTS api_logs (
  id TEXT PRIMARY KEY,
  command TEXT NOT NULL,
  device_cloud_id TEXT NOT NULL,
  trans_id TEXT,
  status TEXT DEFAULT 'PENDING',
  request_payload JSONB,
  response_payload JSONB,
  error_message TEXT,
  duration INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_api_logs_command ON api_logs(command);
CREATE INDEX IF NOT EXISTS idx_api_logs_status ON api_logs(status);
CREATE INDEX IF NOT EXISTS idx_api_logs_created_at ON api_logs(created_at);

CREATE TABLE IF NOT EXISTS webhook_logs (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  device_cloud_id TEXT NOT NULL,
  trans_id TEXT,
  status TEXT DEFAULT 'SUCCESS',
  payload JSONB,
  processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_type ON webhook_logs(type);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_device_cloud_id ON webhook_logs(device_cloud_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON webhook_logs(created_at);
`;

async function createTables() {
  try {
    await client.connect();
    console.log('✅ Connected to Supabase');
    
    const statements = schema.split(';').filter(s => s.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        await client.query(statement);
        console.log('✅ Executed:', statement.substring(0, 50) + '...');
      }
    }
    
    console.log('\n✅ All tables created successfully!');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

createTables();
