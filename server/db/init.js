import { initDatabase, pool } from './index.js';

async function main() {
  try {
    console.log('🗄️  Initierar PostgreSQL-schema för anna-lea.com...');
    await initDatabase();
    console.log('✅ Databasschema och standardinställningar är klara.');
  } catch (err) {
    console.error('❌ Kunde inte initiera databasen:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
