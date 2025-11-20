/**
 * Script de diagnóstico para verificar el estado de órdenes y canciones
 *
 * Este script ayuda a diagnosticar problemas cuando:
 * - Solo se recibe 1 canción por correo en lugar de todas
 * - Las canciones se quedan en estado "generating"
 * - Los webhooks de Suno no están llegando
 *
 * Ejecución: node diagnose-order.js <orderId>
 * Ejemplo: node diagnose-order.js 45
 */

import { storage } from './src/services/storage.js';
import sequelize from './src/database/database.js';

const orderId = process.argv[2];

if (!orderId) {
  console.error('❌ Uso: node diagnose-order.js <orderId>');
  console.error('   Ejemplo: node diagnose-order.js 45');
  process.exit(1);
}

async function diagnoseOrder() {
  try {
    console.log('========================================');
    console.log(`🔍 DIAGNÓSTICO DE ORDEN ${orderId}`);
    console.log('========================================\n');

    // 1. Verificar que la orden existe
    const order = await storage.getOrderById(parseInt(orderId));

    if (!order) {
      console.error(`❌ Orden ${orderId} no encontrada\n`);
      process.exit(1);
    }

    console.log('✅ INFORMACIÓN DE LA ORDEN:');
    console.log(`   ID: ${order.id}`);
    console.log(`   Usuario ID: ${order.userId}`);
    console.log(`   Email: ${order.userEmail || 'N/A'}`);
    console.log(`   Total: $${order.totalAmount}`);
    console.log(`   Estado: ${order.status}`);
    console.log(`   Fecha: ${order.createdAt}`);
    console.log('');

    // 2. Obtener OrderItems
    const orderItems = await storage.getOrderItemsWithLyrics(parseInt(orderId));

    console.log('📦 ORDER ITEMS:');
    console.log(`   Total: ${orderItems.length}`);
    console.log('');

    orderItems.forEach((item, i) => {
      console.log(`   ${i + 1}. OrderItem ID: ${item.id}`);
      console.log(`      - Dedicado a: ${item.dedicatedTo || 'N/A'}`);
      console.log(`      - Géneros: ${item.genres?.join(', ') || 'N/A'}`);
      console.log(`      - Idioma: ${item.language || 'N/A'}`);
      console.log(`      - Precio: $${item.price}`);
      console.log(`      - Estado: ${item.status}`);
      console.log(`      - Tiene lyrics: ${item.lyrics ? 'Sí' : 'No'}`);
      console.log('');
    });

    // 3. Obtener todas las canciones de la orden
    const songs = await storage.getOrderSongs(parseInt(orderId));

    console.log('🎵 CANCIONES GENERADAS:');
    console.log(`   Total: ${songs.length}`);
    console.log('');

    if (songs.length === 0) {
      console.warn('⚠️ No se encontraron canciones para esta orden');
      console.warn('   Esto significa que la generación nunca se inició o falló completamente');
      console.log('');
    } else {
      // Agrupar por estado
      const byStatus = {
        generating: songs.filter(s => s.status === 'generating'),
        completed: songs.filter(s => s.status === 'completed'),
        failed: songs.filter(s => s.status === 'failed')
      };

      console.log(`   📊 Resumen por estado:`);
      console.log(`      - Generando: ${byStatus.generating.length}`);
      console.log(`      - Completadas: ${byStatus.completed.length}`);
      console.log(`      - Fallidas: ${byStatus.failed.length}`);
      console.log('');

      // Detalle de cada canción
      songs.forEach((song, i) => {
        const statusIcon = song.status === 'completed' ? '✅' :
                          song.status === 'failed' ? '❌' : '⏳';

        console.log(`   ${i + 1}. ${statusIcon} Song ID: ${song.id}`);
        console.log(`      - Título: ${song.title || 'N/A'}`);
        console.log(`      - Estado: ${song.status}`);
        console.log(`      - OrderItemId: ${song.orderItemId}`);
        console.log(`      - Suno TaskId: ${song.sunoSongId || 'N/A'}`);
        console.log(`      - Variación: ${song.variation || 1}`);
        console.log(`      - Audio URL: ${song.audioUrl ? '✅ Sí' : '❌ No'}`);
        console.log(`      - Image URL: ${song.imageUrl ? '✅ Sí' : '❌ No'}`);
        console.log(`      - Idioma: ${song.language || 'N/A'}`);
        console.log(`      - Creada: ${song.createdAt}`);
        console.log(`      - Actualizada: ${song.updatedAt}`);
        console.log('');
      });

      // 4. Análisis de problemas
      console.log('========================================');
      console.log('🔍 ANÁLISIS DE PROBLEMAS:');
      console.log('========================================\n');

      // Problema 1: Canciones en estado "generating" por mucho tiempo
      const now = new Date();
      byStatus.generating.forEach(song => {
        const createdAt = new Date(song.createdAt);
        const minutesElapsed = Math.floor((now - createdAt) / 1000 / 60);

        if (minutesElapsed > 5) {
          console.log(`⚠️ PROBLEMA: Canción ${song.id} lleva ${minutesElapsed} minutos en estado "generating"`);
          console.log(`   - TaskId: ${song.sunoSongId}`);
          console.log(`   - Posible causa: Webhook de Suno no llegó o falló`);
          console.log(`   - Solución: Verificar logs del webhook o manualmente actualizar la canción\n`);
        }
      });

      // Problema 2: Menos canciones que orderItems
      if (songs.length < orderItems.length) {
        console.log(`⚠️ PROBLEMA: Hay ${orderItems.length} OrderItems pero solo ${songs.length} canciones`);
        console.log(`   - Faltan ${orderItems.length - songs.length} canciones por crear`);
        console.log(`   - Posible causa: Error en generateSongsForOrder() antes de completar todas las canciones`);
        console.log(`   - Solución: Revisar logs del servidor al momento del pago\n`);
      }

      // Problema 3: Todas completadas pero email no enviado
      if (byStatus.completed.length === songs.length && byStatus.completed.length > 0) {
        console.log(`✅ ÉXITO: Todas las canciones están completadas`);
        console.log(`   - Si no recibiste el email, podría ser:`);
        console.log(`     1. Error en el servicio de email`);
        console.log(`     2. Email en spam`);
        console.log(`     3. Email incorrecto en la orden: ${order.userEmail || 'NO CONFIGURADO'}\n`);
      }

      // Problema 4: Algunas completadas, otras generando
      if (byStatus.completed.length > 0 && byStatus.generating.length > 0) {
        console.log(`⚠️ PROBLEMA: Algunas canciones completadas, otras aún generándose`);
        console.log(`   - Completadas: ${byStatus.completed.length}`);
        console.log(`   - Generando: ${byStatus.generating.length}`);
        console.log(`   - El email NO se enviará hasta que TODAS terminen (o fallen)`);
        console.log(`   - Solución: Esperar o manualmente marcar como fallidas las que están trabadas\n`);
      }

      // Problema 5: Canciones fallidas
      if (byStatus.failed.length > 0) {
        console.log(`❌ PROBLEMA: ${byStatus.failed.length} canción(es) fallidas`);
        byStatus.failed.forEach(song => {
          console.log(`   - Canción ${song.id}: ${song.title}`);
        });
        console.log(`   - Solución: Revisar logs de Suno para entender por qué fallaron\n`);
      }

      // Problema 6: Solo 1 canción cuando debería haber más
      if (orderItems.length > 1 && songs.length === 1) {
        console.log(`❌ PROBLEMA CRÍTICO: Deberían haberse creado ${orderItems.length} canciones, pero solo existe 1`);
        console.log(`   - Esto indica que generateSongsForOrder() falló después de crear la primera canción`);
        console.log(`   - Solución: Revisar logs del servidor para ver el error exacto\n`);
      }
    }

    console.log('========================================');
    console.log('💡 SUGERENCIAS:');
    console.log('========================================\n');
    console.log('1. Si hay canciones en "generating" por mucho tiempo:');
    console.log('   → Ejecuta: node scripts/retry-song-generation.js <songId>');
    console.log('');
    console.log('2. Si faltan canciones:');
    console.log('   → Revisa los logs del servidor al momento del pago');
    console.log('   → Busca errores en generateSongsForOrder()');
    console.log('');
    console.log('3. Si todas están completadas pero no llegó el email:');
    console.log('   → Ejecuta: node scripts/resend-order-email.js ' + orderId);
    console.log('');
    console.log('4. Para ver los webhooks de Suno:');
    console.log('   → Revisa los logs y busca "WEBHOOK DE SUNO RECIBIDO"');
    console.log('');

    console.log('========================================');
    console.log('✅ DIAGNÓSTICO COMPLETADO');
    console.log('========================================');

    process.exit(0);

  } catch (error) {
    console.error('========================================');
    console.error('❌ Error ejecutando diagnóstico:', error);
    console.error('========================================');
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Ejecutar el diagnóstico
diagnoseOrder();
