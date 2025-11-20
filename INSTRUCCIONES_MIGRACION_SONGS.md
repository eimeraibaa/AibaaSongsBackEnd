# Instrucciones para Migración de Foreign Key de Songs

## Problema Identificado

La tabla `Songs` tenía una foreign key constraint incorrecta que apuntaba a la tabla `orders` en lugar de `order_items`, causando el siguiente error al crear canciones:

```
SequelizeForeignKeyConstraintError
error: insert or update on table "Songs" violates foreign key constraint "Songs_orderItemId_fkey"
detail: 'Key (orderItemId)=(23) is not present in table "orders".'
```

## Solución Implementada

### 1. Corrección del Modelo

El archivo `src/models/song.js` ha sido corregido para que la foreign key apunte correctamente a `order_items`:

```javascript
orderItemId: {
  type: DataTypes.INTEGER,
  allowNull: false,
  references: {
    model: 'order_items',  // ✅ Corregido (antes era 'orders')
    key: 'id'
  }
}
```

### 2. Migración de Base de Datos

Para bases de datos existentes, es necesario ejecutar el script de migración que corrige la foreign key constraint.

## Cómo Ejecutar la Migración

### Opción 1: Ejecutar el script de migración (Recomendado)

```bash
node fix-song-foreign-key.js
```

Este script:
1. Elimina la constraint incorrecta `Songs_orderItemId_fkey` (si existe)
2. Crea una nueva constraint correcta que apunta a `order_items`
3. Verifica que la nueva constraint esté configurada correctamente

### Opción 2: Ejecutar manualmente en la base de datos

Si prefieres ejecutar la migración directamente en PostgreSQL:

```sql
-- 1. Eliminar constraint incorrecta
ALTER TABLE "Songs"
DROP CONSTRAINT IF EXISTS "Songs_orderItemId_fkey";

-- 2. Crear nueva constraint correcta
ALTER TABLE "Songs"
ADD CONSTRAINT "Songs_orderItemId_fkey"
FOREIGN KEY ("orderItemId")
REFERENCES "order_items"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
```

## Verificación

Después de ejecutar la migración, verifica que la constraint esté correctamente configurada:

```sql
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
```

Deberías ver que `foreign_table_name` es `order_items`.

## Notas Importantes

- ✅ **Desarrollo**: Si estás iniciando un nuevo ambiente, el modelo corregido se aplicará automáticamente
- ✅ **Producción**: Debes ejecutar la migración en producción para corregir la constraint existente
- ⚠️ **Backup**: Recomendamos hacer un backup de la base de datos antes de ejecutar la migración
- 🔒 **Transacciones**: El script usa transacciones para garantizar consistencia

## Próximos Pasos

Después de ejecutar la migración:

1. Reinicia tu servidor Node.js
2. Verifica que las canciones se puedan crear correctamente
3. Monitorea los logs para confirmar que no hay más errores de foreign key

## Ambiente de Desarrollo

Si estás en desarrollo local y quieres recrear la base de datos desde cero:

```javascript
// En src/index.js, temporalmente cambiar:
await sequelize.sync({ force: true, alter: false });
```

**⚠️ ADVERTENCIA**: `force: true` eliminará todos los datos. Solo usar en desarrollo.
