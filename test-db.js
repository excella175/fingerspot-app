const { Client } = require('pg');

const client = new Client({
  user: 'postgres.lmzauzkqbxevzrzfuzys',
  password: '6H4udftRSwijTb',
  host: 'aws-0-ap-northeast-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
});

client.connect((err) => {
  if (err) {
    console.error('Connection error:', err.message);
    process.exit(1);
  } else {
    console.log('✅ Connected to Supabase!');
    client.query('SELECT 1', (err, res) => {
      if (err) {
        console.error('Query error:', err.message);
      } else {
        console.log('✅ Query successful:', res.rows);
      }
      client.end();
    });
  }
});
