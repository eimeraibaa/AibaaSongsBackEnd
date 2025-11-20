/**
 * Endpoint para corregir la foreign key de Songs
 * Útil en producción cuando no se tiene acceso directo a la BD
 *
 * Uso: GET /api/admin/fix-song-fkey
 */

import { sequelize } from '../database/database.js';

export const fixSongForeignKey = async (req, res) => {
  try {
    console.log('========================================');
    console.log('🔧 Iniciando corrección de foreign key...');
    console.log('========================================');

    const queryInterface = sequelize.getQueryInterface();
    const results = [];

    // 1. Verificar constraint actual
    console.log('📊 Verificando constraint existente...');
    results.push('Verificando constraint existente...');

    const [constraints] = await sequelize.query(`
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
      results.push(`Constraint actual encontrada: ${constraint.constraint_name}`);
      results.push(`  - Apunta a tabla: ${constraint.foreign_table_name}`);

      if (constraint.foreign_table_name === 'order_items') {
        results.push('✅ La foreign key ya está correcta (apunta a order_items)');
        return res.json({
          success: true,
          message: 'Foreign key ya está correcta',
          results
        });
      }

      results.push(`⚠️ La foreign key apunta a "${constraint.foreign_table_name}" en lugar de "order_items"`);
    } else {
      results.push('⚠️ No se encontró constraint existente');
    }

    // 2. Eliminar constraint incorrecta
    console.log('📊 Eliminando constraint incorrecta...');
    results.push('Eliminando constraint incorrecta...');

    try {
      await sequelize.query(`
        ALTER TABLE "Songs"
        DROP CONSTRAINT IF EXISTS "Songs_orderItemId_fkey";
      `);
      results.push('✅ Constraint eliminada');
      console.log('✅ Constraint eliminada');
    } catch (error) {
      results.push(`⚠️ Error eliminando constraint (puede que no existiera): ${error.message}`);
      console.log('⚠️ Error eliminando constraint:', error.message);
    }

    // 3. Crear nueva constraint correcta
    console.log('📊 Creando nueva foreign key correcta...');
    results.push('Creando nueva foreign key correcta...');

    await sequelize.query(`
      ALTER TABLE "Songs"
      ADD CONSTRAINT "Songs_orderItemId_fkey"
      FOREIGN KEY ("orderItemId")
      REFERENCES "order_items"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
    `);

    results.push('✅ Nueva foreign key creada');
    console.log('✅ Nueva foreign key creada');

    // 4. Verificar la nueva constraint
    console.log('📊 Verificando la nueva constraint...');
    results.push('Verificando la nueva constraint...');

    const [newConstraints] = await sequelize.query(`
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

    if (newConstraints.length > 0) {
      const constraint = newConstraints[0];
      results.push(`✅ Constraint verificada:`);
      results.push(`  - Tabla: ${constraint.table_name}`);
      results.push(`  - Columna: ${constraint.column_name}`);
      results.push(`  - Referencia a tabla: ${constraint.foreign_table_name}`);
      results.push(`  - Referencia a columna: ${constraint.foreign_column_name}`);

      if (constraint.foreign_table_name === 'order_items') {
        results.push('✅ ¡Foreign key apunta correctamente a order_items!');
        console.log('✅ ¡Foreign key apunta correctamente a order_items!');

        return res.json({
          success: true,
          message: 'Foreign key corregida exitosamente',
          results
        });
      } else {
        results.push(`❌ Error: Foreign key apunta a ${constraint.foreign_table_name} en lugar de order_items`);
        throw new Error(`Foreign key apunta a ${constraint.foreign_table_name} en lugar de order_items`);
      }
    } else {
      results.push('❌ No se encontró la constraint después de crearla');
      throw new Error('No se encontró la constraint después de crearla');
    }

  } catch (error) {
    console.error('========================================');
    console.error('❌ Error ejecutando migración:', error);
    console.error('========================================');
    console.error('Stack:', error.stack);

    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
};
