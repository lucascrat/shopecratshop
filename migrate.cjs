const fs = require('fs');
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

async function run() {
  try {
    console.log('Testando conexão com o Supabase/PostgreSQL...');
    await pool.query('SELECT 1');
    console.log('Conexão OK!');

    console.log('Executando arquivo de migração schema.sql...');
    const schema = fs.readFileSync('schema.sql', 'utf8');
    await pool.query(schema);
    console.log('✅ Banco de dados atualizado com as novas tabelas de TikTok Shop, Cupons e Moedas!');
  } catch (err) {
    console.error('Erro na migração:', err);
  } finally {
    await pool.end();
  }
}

run();
