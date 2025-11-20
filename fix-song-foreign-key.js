/**
 * Script de migración para corregir la foreign key de la tabla Songs
 *
 * Problema: La tabla Songs tiene una foreign key que apunta a la tabla 'orders'
 * cuando debería apuntar a 'order_items'
 *
 * Este script:
 * 1. Elimina la constraint incorrecta 'Songs_orderItemId_fkey'
 * 2. Crea una nueva constraint correcta que apunta a 'order_items'
 *
 * Ejecución: node fix-song-foreign-key.js
 */

import sequelize from './src/database/database.js';

async function fixSongForeignKey() {
  const queryInterface = sequelize.getQueryInterface();

  try {
    console.log('========================================');
    console.log('🔧 Iniciando corrección de foreign key...');
    console.log('========================================');

    // 1. Eliminar la constraint incorrecta si existe
    console.log('📊 Verificando constraint existente...');

    try {
      await queryInterface.sequelize.query(`
        ALTER TABLE "Songs"
        DROP CONSTRAINT IF EXISTS "Songs_orderItemId_fkey";
      `);
      console.log('✅ Constraint incorrecta eliminada (si existía)');
    } catch (error) {
      console.log('ℹ️ No se encontró constraint para eliminar o ya fue eliminada');
    }

    // 2. Crear la nueva constraint correcta
    console.log('📊 Creando nueva foreign key correcta...');

    await queryInterface.sequelize.query(`
      ALTER TABLE "Songs"
      ADD CONSTRAINT "Songs_orderItemId_fkey"
      FOREIGN KEY ("orderItemId")
      REFERENCES "order_items"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
    `);

    console.log('✅ Nueva foreign key creada correctamente');

    // 3. Verificar la nueva constraint
    console.log('📊 Verificando la nueva constraint...');

    const [constraints] = await queryInterface.sequelize.query(`
      SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'Songs'
        AND kcu.column_name = 'orderItemId';
    `);

    if (constraints.length > 0) {
      const constraint = constraints[0];
      console.log('✅ Constraint verificada:');
      console.log(`   - Tabla: ${constraint.table_name}`);
      console.log(`   - Columna: ${constraint.column_name}`);
      console.log(`   - Referencia a tabla: ${constraint.foreign_table_name}`);
      console.log(`   - Referencia a columna: ${constraint.foreign_column_name}`);

      if (constraint.foreign_table_name === 'order_items') {
        console.log('✅ ¡Foreign key apunta correctamente a order_items!');
      } else {
        console.error(`❌ Error: Foreign key apunta a ${constraint.foreign_table_name} en lugar de order_items`);
        process.exit(1);
      }
    } else {
      console.error('❌ No se encontró la constraint después de crearla');
      process.exit(1);
    }

    console.log('========================================');
    console.log('✅ Migración completada exitosamente');
    console.log('========================================');

    process.exit(0);

  } catch (error) {
    console.error('========================================');
    console.error('❌ Error ejecutando migración:', error);
    console.error('========================================');
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Ejecutar la migración
fixSongForeignKey();
