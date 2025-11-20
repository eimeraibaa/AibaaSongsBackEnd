# Solución: Problema con múltiples canciones

## Problema Identificado

Cuando un usuario paga por múltiples canciones (por ejemplo, 3 canciones en el carrito), solo recibe 1 canción por correo en lugar de todas.

## Causas Posibles

### 1. Error en la generación de canciones

Si una o más canciones fallan al generarse en Suno, pero el sistema no registra el error correctamente:

- **Antes**: Si fallaba la generación de 1 de 3 canciones, solo se creaban 2 registros de Song en la DB
- **Problema**: El sistema pensaba que "todas las canciones están listas" cuando solo había 2 de 3
- **Resultado**: Se enviaba el email con solo 2 canciones, faltando 1

**Solución implementada**: Ahora cuando falla la generación de una canción, se crea un registro de Song con estado `failed`. Esto permite que el sistema sepa exactamente cuántas canciones debería haber y cuáles fallaron.

### 2. Webhooks de Suno no llegan todos

Cuando se generan múltiples canciones:
- Cada canción recibe su propio `taskId` de Suno
- Suno envía un webhook separado para cada `taskId`
- Si solo llega 1 webhook, solo 1 canción se completa

**Cómo verificar**:
- Busca en los logs del servidor: `"WEBHOOK DE SUNO RECIBIDO"`
- Deberías ver un webhook por cada canción generada
- Si solo ves 1 webhook pero generaste 3 canciones, hay un problema de conectividad

### 3. Canciones quedan en estado "generating"

Si los webhooks no llegan o fallan:
- Las canciones quedan en estado `generating` indefinidamente
- El email NO se envía hasta que todas estén `completed` o `failed`
- El usuario nunca recibe el email

## Herramientas de Diagnóstico

### 1. Diagnosticar una orden

```bash
node diagnose-order.js <orderId>
```

Este script te muestra:
- Información de la orden
- OrderItems esperados
- Songs creadas (y cuántas faltan)
- Estado de cada canción
- Posibles problemas detectados
- Sugerencias de solución

Ejemplo:
```bash
node diagnose-order.js 45
```

Salida esperada:
```
========================================
🔍 DIAGNÓSTICO DE ORDEN 45
========================================

✅ INFORMACIÓN DE LA ORDEN:
   ID: 45
   Usuario ID: 12
   Email: usuario@example.com
   Total: $30.00
   Estado: completed
   Fecha: 2025-01-15T10:30:00.000Z

📦 ORDER ITEMS:
   Total: 3

   1. OrderItem ID: 101
      - Dedicado a: María
      - Géneros: pop, romantic
      - Idioma: es
      - Precio: $10.00
      - Estado: processing

   2. OrderItem ID: 102
      ...

🎵 CANCIONES GENERADAS:
   Total: 3

   📊 Resumen por estado:
      - Generando: 0
      - Completadas: 2
      - Fallidas: 1

   1. ✅ Song ID: 201
      - Título: María
      - Estado: completed
      ...

   2. ✅ Song ID: 202
      ...

   3. ❌ Song ID: 203
      - Estado: failed
      ...

========================================
🔍 ANÁLISIS DE PROBLEMAS:
========================================

❌ PROBLEMA: 1 canción(es) fallidas
   - Canción 203: Pedro
   - Solución: Revisar logs de Suno para entender por qué fallaron
```

### 2. Reenviar email de una orden

Si todas las canciones están completadas pero el email no llegó:

```bash
node resend-order-email.js <orderId>
```

Este script:
- Verifica que la orden existe y tiene email
- Obtiene todas las canciones completadas con audio
- Reenvía el email al usuario
- Muestra preview URL del email (en desarrollo)

### 3. Script de migración de foreign key

Si tienes el error de foreign key constraint:

```bash
node fix-song-foreign-key.js
```

Este script corrige la foreign key de la tabla Songs para que apunte a `order_items` en lugar de `orders`.

## Mejoras Implementadas

### 1. Mejor manejo de errores (webhook.controller.js:398-426)

```javascript
try {
  const sunoResult = await sunoService.generateSong(...);
  const song = await storage.createSong(...);
} catch (error) {
  // NUEVO: Crear registro de canción fallida
  const failedSong = await storage.createSong(item.id, {
    title: item.dedicatedTo || 'Canción Personalizada',
    lyrics: item.lyrics,
    audioUrl: null,
    sunoSongId: `failed-${Date.now()}`,
    genre: item.genres[0] || 'pop',
    language: item.language,
  });
  await storage.updateSongStatus(failedSong.id, 'failed');
}
```

**Beneficio**: El sistema siempre sabe cuántas canciones debería haber, incluso si algunas fallan.

### 2. Logging mejorado (webhook.controller.js:771-837)

Ahora `checkAndNotifyOrderCompletion` muestra:
- Cuántas canciones se esperan (según OrderItems)
- Cuántas canciones existen en la DB
- Si faltan canciones, muestra advertencia con posibles causas
- Estado detallado de cada canción

Ejemplo de log:
```
========================================
🔍 Verificando completitud de orden 45...
========================================
📊 Total canciones en orden: 2
📊 Canciones esperadas (según OrderItems): 3

========================================
⚠️ ADVERTENCIA: FALTAN CANCIONES
   - Esperadas: 3 (según OrderItems)
   - Encontradas: 2 (en tabla Songs)
   - Faltan: 1

Posibles causas:
  1. Error en generateSongsForOrder() al crear algunas canciones
  2. Llamada a Suno falló para algunas canciones
  3. Error de base de datos al crear Songs
========================================
```

## Cómo Prevenir el Problema

### 1. Monitorear los logs

Busca estas señales de alerta:
- `❌ ERROR CRÍTICO generando canción para item`
- `⚠️ ADVERTENCIA: FALTAN CANCIONES`
- `⚠️ Canción lleva X minutos en estado "generating"`

### 2. Verificar webhooks de Suno

- Asegúrate de que `SUNO_CALLBACK_URL` esté configurado correctamente
- Verifica que la URL sea pública (no localhost)
- Monitorea que lleguen webhooks para TODAS las canciones generadas

### 3. Configurar alertas

Considera configurar alertas cuando:
- Una canción lleva más de 5 minutos en estado `generating`
- Hay menos canciones en la DB que OrderItems
- Una orden tiene canciones fallidas

## Flujo Correcto

### Generación exitosa de 3 canciones:

1. **Pago completado** → Webhook de Stripe llega
2. **Crear Order** con 3 OrderItems
3. **Generar 3 canciones**:
   - OrderItem 1 → Suno taskId1 → Song 1 (status: generating)
   - OrderItem 2 → Suno taskId2 → Song 2 (status: generating)
   - OrderItem 3 → Suno taskId3 → Song 3 (status: generating)
4. **Webhooks de Suno llegan**:
   - Webhook con taskId1 → Song 1 (status: completed)
   - Webhook con taskId2 → Song 2 (status: completed)
   - Webhook con taskId3 → Song 3 (status: completed)
5. **Verificación de completitud**:
   - Todas las canciones están completed → ✅
   - Enviar email con las 3 canciones → ✅

### Generación con 1 error:

1. **Pago completado** → Webhook de Stripe llega
2. **Crear Order** con 3 OrderItems
3. **Generar 3 canciones**:
   - OrderItem 1 → Suno taskId1 → Song 1 (status: generating)
   - OrderItem 2 → ❌ ERROR → Song 2 (status: failed) ← **NUEVO**
   - OrderItem 3 → Suno taskId3 → Song 3 (status: generating)
4. **Webhooks de Suno llegan**:
   - Webhook con taskId1 → Song 1 (status: completed)
   - (No hay webhook para Song 2 porque falló)
   - Webhook con taskId3 → Song 3 (status: completed)
5. **Verificación de completitud**:
   - Song 1: completed ✅
   - Song 2: failed ❌ (pero está registrada)
   - Song 3: completed ✅
   - Todas terminaron (completed o failed) → Enviar email con 2 canciones + aviso de 1 fallida

## Próximos Pasos

Si sigues experimentando el problema:

1. **Ejecuta el diagnóstico**:
   ```bash
   node diagnose-order.js <orderId>
   ```

2. **Revisa los logs del servidor** al momento del pago

3. **Verifica la configuración de Suno**:
   ```bash
   curl http://localhost:3000/webhook/suno-config
   ```

4. **Contacta soporte** con:
   - ID de la orden afectada
   - Logs del servidor
   - Salida del diagnóstico

## Archivos Modificados

- `src/models/song.js` - Foreign key corregida
- `src/controllers/webhook.controller.js` - Mejor manejo de errores y logging
- `diagnose-order.js` - Script de diagnóstico
- `resend-order-email.js` - Script para reenviar emails
- `fix-song-foreign-key.js` - Migración de DB
