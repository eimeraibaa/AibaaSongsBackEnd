// Script para ejecutar migración en Railway desde tu computadora local
import 'dotenv/config';
import Sequelize from 'sequelize';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Lee la DATABASE_URL de Railway desde una variable de entorno temporal
const RAILWAY_DB_URL = process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL;

if (!RAILWAY_DB_URL) {
  console.error('❌ ERROR: No se encontró RAILWAY_DATABASE_URL');
  console.error('');
  console.error('👉 CÓMO USAR ESTE SCRIPT:');
  console.error('');
  console.error('1. Ve a Railway → Tu servicio PostgreSQL → Variables');
  console.error('2. Copia el valor de DATABASE_URL');
  console.error('3. Ejecuta:');
  console.error('');
  console.error('   $env:RAILWAY_DATABASE_URL="postgresql://usuario:password@host:puerto/dbname"');
  console.error('   npm run migrate:railway');
  console.error('');
  process.exit(1);
}

console.log('🚀 Conectando a Railway...');
console.log('📍 Host:', RAILWAY_DB_URL.split('@')[1]?.split('/')[0] || 'desconocido');

const sequelizeRailway = new Sequelize(RAILWAY_DB_URL, {
  dialect: 'postgres',
  protocol: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
});

async function runMigration() {
  try {
    // Probar conexión
    await sequelizeRailway.authenticate();
    console.log('✅ Conectado a Railway exitosamente');

    // Leer y ejecutar migración
    const migrationPath = join(__dirname, '../migrations/add_password_reset_fields.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('🔄 Ejecutando migración...');
    await sequelizeRailway.query(migrationSQL);

    console.log('✅ Migración completada en Railway!');

    // Verificar que las columnas existen
    console.log('🔍 Verificando columnas...');
    const [results] = await sequelizeRailway.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name IN ('resetToken', 'resetTokenExpires');
    `);

    if (results.length === 2) {
      console.log('✅ Columnas verificadas:');
      results.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type}`);
      });
      console.log('');
      console.log('🎉 ¡TODO LISTO! Ahora puedes usar la funcionalidad de password reset');
    } else {
      console.log('⚠️ No se encontraron todas las columnas. Verifica manualmente.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await sequelizeRailway.close();
  }
}

runMigration()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
