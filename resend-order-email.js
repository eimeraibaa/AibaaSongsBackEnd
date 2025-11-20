/**
 * Script para reenviar el email de una orden con canciones completadas
 *
 * Útil cuando:
 * - Las canciones se completaron pero el email no se envió
 * - El email fue a spam y el usuario no lo encontró
 * - Hubo un error temporal en el servicio de email
 *
 * Ejecución: node resend-order-email.js <orderId>
 * Ejemplo: node resend-order-email.js 45
 */

import { storage } from './src/services/storage.js';
import { emailService } from './src/services/emailService.js';
import sequelize from './src/database/database.js';

const orderId = process.argv[2];

if (!orderId) {
  console.error('❌ Uso: node resend-order-email.js <orderId>');
  console.error('   Ejemplo: node resend-order-email.js 45');
  process.exit(1);
}

async function resendOrderEmail() {
  try {
    console.log('========================================');
    console.log(`📧 REENVIANDO EMAIL PARA ORDEN ${orderId}`);
    console.log('========================================\n');

    // 1. Obtener la orden
    const order = await storage.getOrderById(parseInt(orderId));

    if (!order) {
      console.error(`❌ Orden ${orderId} no encontrada\n`);
      process.exit(1);
    }

    console.log('✅ Orden encontrada');
    console.log(`   Email: ${order.userEmail || 'N/A'}`);
    console.log('');

    if (!order.userEmail) {
      console.error('❌ La orden no tiene email configurado');
      console.error('   Solución: Ejecuta node update-order-email.js <orderId> <email>');
      process.exit(1);
    }

    // 2. Obtener las canciones de la orden
    const songs = await storage.getOrderSongs(parseInt(orderId));

    console.log(`📊 Total canciones: ${songs.length}`);
    console.log('');

    if (songs.length === 0) {
      console.error('❌ No hay canciones en esta orden');
      process.exit(1);
    }

    // 3. Filtrar solo las completadas con audio
    const completedSongs = songs.filter(song =>
      song.status === 'completed' && song.audioUrl
    );

    console.log(`✅ Canciones completadas: ${completedSongs.length}`);
    console.log('');

    if (completedSongs.length === 0) {
      console.error('❌ No hay canciones completadas con audio para enviar');
      console.error('');
      console.error('Estado de las canciones:');
      songs.forEach((song, i) => {
        console.error(`  ${i + 1}. ${song.title || 'N/A'} - Estado: ${song.status} - Audio: ${song.audioUrl ? 'Sí' : 'No'}`);
      });
      console.error('');
      console.error('Solución: Espera a que las canciones se completen o revisa el diagnóstico con:');
      console.error(`  node diagnose-order.js ${orderId}`);
      process.exit(1);
    }

    // 4. Mostrar qué canciones se van a enviar
    console.log('📋 Canciones que se enviarán en el email:');
    completedSongs.forEach((song, i) => {
      console.log(`  ${i + 1}. ${song.title || 'N/A'}`);
      console.log(`     - Audio: ${song.audioUrl ? '✅' : '❌'}`);
      console.log(`     - Variación: V${song.variation || 1}`);
    });
    console.log('');

    // 5. Enviar el email
    console.log(`📧 Enviando email a: ${order.userEmail}...`);
    console.log('');

    const emailResult = await emailService.sendSongsReadyEmail(
      order.userEmail,
      completedSongs,
      parseInt(orderId)
    );

    if (emailResult.success) {
      console.log('========================================');
      console.log('✅ EMAIL ENVIADO EXITOSAMENTE');
      console.log('========================================');
      console.log('');
      console.log(`📧 Destinatario: ${order.userEmail}`);
      console.log(`📊 Canciones enviadas: ${completedSongs.length}`);
      if (emailResult.messageId) {
        console.log(`📨 Message ID: ${emailResult.messageId}`);
      }
      if (emailResult.previewUrl) {
        console.log(`🔗 Preview: ${emailResult.previewUrl}`);
      }
      console.log('');
      process.exit(0);
    } else {
      console.log('========================================');
      console.error('❌ ERROR ENVIANDO EMAIL');
      console.log('========================================');
      console.error('');
      console.error(`Error: ${emailResult.error}`);
      console.error('');
      console.error('Posibles causas:');
      console.error('  1. Configuración incorrecta del servicio de email');
      console.error('  2. Credenciales inválidas');
      console.error('  3. Email del destinatario inválido');
      console.error('  4. Servicio de email temporalmente caído');
      console.error('');
      process.exit(1);
    }

  } catch (error) {
    console.error('========================================');
    console.error('❌ Error reenviando email:', error);
    console.error('========================================');
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Ejecutar
resendOrderEmail();
