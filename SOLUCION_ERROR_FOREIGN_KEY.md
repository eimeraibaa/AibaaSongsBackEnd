# Solución: Error de Foreign Key al Crear Canciones

## El Problema

Cuando intentas crear canciones después de aceptar el pago, obtienes este error:

```
Error creando canción: Error
    at Query.run (/app/node_modules/sequelize/lib/dialects/postgres/query.js:50:25)
    code: '23503',
    detail: 'Key (orderItemId)=(28) is not present in table "orders".',
    constraint: 'Songs_orderItemId_fkey',
```

## Causa Raíz

La tabla `Songs` tiene una **foreign key constraint incorrecta** llamada `Songs_orderItemId_fkey` que está apuntando a la tabla `"orders"` en lugar de la tabla `"order_items"`.

Cuando el sistema intenta crear una canción:
1. Se crea una `Order` (orden) ✅
2. Se crean varios `OrderItem` (items de la orden, uno por cada canción) ✅
3. Se intenta crear una `Song` con `orderItemId = 28` ❌
4. PostgreSQL busca el ID 28 en la tabla `"orders"` (INCORRECTO)
5. No lo encuentra porque debería buscar en `"order_items"`
6. Lanza el error de foreign key constraint

## La Solución

Necesitas corregir la foreign key constraint en tu base de datos. Hay 3 formas de hacerlo:

### Opción 1: Usar el endpoint HTTP (✅ RECOMENDADO para producción)

Si estás en producción (Render, Heroku, etc.) y no tienes acceso directo a la base de datos:

**Paso 1:** Primero haz deploy de estos cambios (ver abajo las instrucciones de commit y push)

**Paso 2:** Luego accede al endpoint desde tu navegador o con curl:

```bash
curl https://aibaasongsbackend.onrender.com/webhook/fix-song-fkey
```

O simplemente visita en el navegador:
```
https://aibaasongsbackend.onrender.com/webhook/fix-song-fkey
```

El endpoint te responderá con un JSON indicando si la corrección fue exitosa:

```json
{
  "success": true,
  "message": "Foreign key corregida exitosamente",
  "results": [
    "Verificando constraint existente...",
    "Constraint actual encontrada: Songs_orderItemId_fkey",
    "  - Apunta a tabla: orders",
    "⚠️ La foreign key apunta a \"orders\" en lugar de \"order_items\"",
    "Eliminando constraint incorrecta...",
    "✅ Constraint eliminada",
    "Creando nueva foreign key correcta...",
    "✅ Nueva foreign key creada",
    "Verificando la nueva constraint...",
    "✅ Constraint verificada:",
    "  - Tabla: Songs",
    "  - Columna: orderItemId",
    "  - Referencia a tabla: order_items",
    "  - Referencia a columna: id",
    "✅ ¡Foreign key apunta correctamente a order_items!"
  ]
}
```

**IMPORTANTE**: Solo necesitas ejecutar esto **una vez**. Si lo ejecutas de nuevo, el endpoint detectará que ya está corregido y te dirá:

```json
{
  "success": true,
  "message": "Foreign key ya está correcta"
}
```

### Opción 2: Ejecutar el script localmente

Si tienes acceso a la base de datos localmente:

```bash
node fix-song-foreign-key.js
```

### Opción 3: Ejecutar manualmente en PostgreSQL

Si tienes acceso directo a PostgreSQL:

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

## Verificar que Funcionó

Después de ejecutar cualquiera de las opciones anteriores:

1. **Intenta crear una canción nuevamente** haciendo un nuevo pago de prueba
2. **Verifica los logs** - deberías ver:
   ```
   🎵 [createSong] Creando canción para orderItemId: 28
   ✅ [createSong] Canción creada: ID 123, Language guardado: es
   ```
3. **NO deberías ver más el error**: `Key (orderItemId)=(28) is not present in table "orders"`

## Flujo Correcto Después de la Corrección

Cuando se crea una canción para una orden con 2 canciones:

```
1. Pago completado ✅
   └─> Webhook de Stripe llega

2. Crear Order (ID: 15) ✅
   └─> Tabla: orders

3. Crear OrderItems ✅
   ├─> OrderItem ID: 28 (Canción 1)
   └─> OrderItem ID: 29 (Canción 2)
   └─> Tabla: order_items

4. Crear Songs ✅ (AHORA SÍ FUNCIONA)
   ├─> Song ID: 201, orderItemId: 28 ← Busca en order_items ✅
   └─> Song ID: 202, orderItemId: 29 ← Busca en order_items ✅
   └─> Tabla: Songs

5. Generar con Suno ✅
   └─> 2 canciones generándose...

6. Webhook de Suno ✅
   └─> Canciones completadas

7. Enviar email ✅
   └─> Usuario recibe 2 canciones
```

## Archivos Modificados en Este Fix

- `src/migrations/fix-song-fkey-endpoint.js` - Nuevo endpoint para corregir la foreign key
- `src/routes/webhook.routes.js` - Ruta agregada para el endpoint
- `INSTRUCCIONES_MIGRACION_SONGS.md` - Actualizado con nueva opción
- `SOLUCION_ERROR_FOREIGN_KEY.md` - Este archivo (documentación completa)

## Próximos Pasos

1. ✅ Hacer commit de estos cambios
2. ✅ Push a la rama claude/fix-song-creation-payment-017dA1LJEgJeCcsR9ZF2u7ZB
3. ✅ Deploy a producción (Render automáticamente)
4. ⚠️ **EJECUTAR** el endpoint: `https://aibaasongsbackend.onrender.com/webhook/fix-song-fkey`
5. ✅ Probar creando una orden con 2 canciones
6. ✅ Verificar que ambas canciones se creen correctamente

## Preguntas Frecuentes

### ¿Por qué pasó esto?

El modelo de Sequelize se definió inicialmente apuntando a `'orders'` en lugar de `'order_items'`. Aunque se corrigió en el código (commit 41e7c3f), la constraint en la base de datos existente no se actualizó automáticamente.

### ¿Puedo ejecutar el endpoint múltiples veces?

Sí, es seguro. El endpoint verifica primero si la constraint ya está correcta y solo hace cambios si es necesario.

### ¿Qué pasa con las canciones que fallaron antes de la corrección?

Las canciones que fallaron antes seguirán en estado `failed` en la base de datos. Después de corregir la foreign key, los nuevos intentos de crear canciones funcionarán correctamente.

### ¿Necesito reiniciar el servidor?

No es necesario reiniciar el servidor después de ejecutar la corrección. La constraint se actualiza directamente en la base de datos y toma efecto inmediatamente.

## Soporte

Si después de ejecutar la corrección sigues teniendo problemas:

1. Verifica los logs del servidor
2. Ejecuta el diagnóstico: `node diagnose-order.js <orderId>`
3. Revisa el archivo `SOLUCION_MULTIPLES_CANCIONES.md` para más ayuda
