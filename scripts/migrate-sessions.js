// Script para migrar la tabla sessions de SequelizeStore a connect-pg-simple
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrateSessions() {
  const client = await pool.connect();

  try {
    console.log('🔄 Iniciando migración de tabla sessions...');

    // Eliminar la tabla sessions antigua de SequelizeStore
    await client.query('DROP TABLE IF EXISTS sessions CASCADE;');
    console.log('✅ Tabla sessions antigua eliminada');

    // La tabla se recreará automáticamente por connect-pg-simple con createTableIfMissing: true
    console.log('✅ La tabla sessions se recreará automáticamente al iniciar la aplicación');
    console.log('✅ Migración completada exitosamente');

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrateSessions()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
