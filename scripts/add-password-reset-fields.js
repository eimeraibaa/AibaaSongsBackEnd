// Script para agregar campos de password reset a la tabla users
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { sequelize } from '../src/database/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function addPasswordResetFields() {
  try {
    console.log('🔄 Iniciando migración: agregar campos de password reset...');

    // Leer el archivo SQL de migración
    const migrationPath = join(__dirname, '../migrations/add_password_reset_fields.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    // Ejecutar la migración usando Sequelize
    await sequelize.query(migrationSQL);

    console.log('✅ Columnas resetToken y resetTokenExpires agregadas');
    console.log('✅ Índice idx_users_reset_token creado');
    console.log('✅ Migración completada exitosamente');

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

addPasswordResetFields()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
