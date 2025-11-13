/**
 * Script de prueba para el nuevo emailService.js con Resend
 *
 * Uso:
 *   node test-email.js
 *
 * Asegúrate de tener configuradas las variables de entorno en .env:
 *   - RESEND_API_KEY
 *   - EMAIL_FROM
 *   - FRONTEND_URL
 *   - BACKEND_URL
 *   - LOGO_URL (opcional)
 */

import dotenv from 'dotenv';
import { emailService } from './src/services/emailService.js';

// Cargar variables de entorno
dotenv.config();

console.log('🧪 Iniciando prueba del emailService con Resend\n');
console.log('========================================');

// Función principal de prueba
async function testEmailService() {
  console.log('📋 CONFIGURACIÓN:');
  console.log(`   RESEND_API_KEY: ${process.env.RESEND_API_KEY ? '✅ Configurado' : '❌ NO configurado'}`);
  console.log(`   EMAIL_FROM: ${process.env.EMAIL_FROM || 'soporte@makeursong.com (default)'}`);
  console.log(`   FRONTEND_URL: ${process.env.FRONTEND_URL || 'https://makeursong.com (default)'}`);
  console.log(`   BACKEND_URL: ${process.env.BACKEND_URL || 'https://api.makeursong.com (default)'}`);
  console.log(`   LOGO_URL: ${process.env.LOGO_URL || 'https://makeursong.com/logo_sin_fondo.png (default)'}`);
  console.log('========================================\n');

  // Verificar si el servicio está configurado
  if (!emailService.isConfigured()) {
    console.error('❌ ERROR: RESEND_API_KEY no está configurado en .env');
    console.log('\n💡 Para configurar:');
    console.log('   1. Crea un archivo .env en la raíz del proyecto');
    console.log('   2. Agrega: RESEND_API_KEY=re_tu_api_key_aqui');
    console.log('   3. Obtén tu API key en: https://resend.com/api-keys\n');
    process.exit(1);
  }

  console.log('✅ EmailService configurado correctamente\n');

  // Datos de prueba
  const testEmail = process.argv[2] || 'test@example.com';
  const testOrderId = 12345;
  const testUserId = 'test-user-123';
  const testSongs = [
    {
      id: 1,
      title: 'Canción de Prueba en Español',
      genre: 'pop',
      language: 'es',
      isGift: false,
      audioUrl: 'https://example.com/song1.mp3'
    },
    {
      id: 2,
      title: 'Gift Song in English',
      genre: 'rock',
      language: 'en',
      isGift: true,
      variation: 'acoustic',
      audioUrl: 'https://example.com/song2.mp3'
    }
  ];

  console.log('📧 PRUEBA 1: Método sendEmail() - Email de canciones completadas');
  console.log(`   Enviando a: ${testEmail}`);
  console.log(`   Canciones: ${testSongs.length}`);
  console.log('   Ejecutando...\n');

  try {
    const result1 = await emailService.sendEmail(testOrderId, testEmail, testUserId, testSongs);

    if (result1.success) {
      console.log('✅ Email enviado exitosamente!');
      console.log(`   Message ID: ${result1.messageId}`);
      console.log(`   Magic Token: ${result1.magicToken?.substring(0, 20)}...`);
      console.log(`   Expira: ${result1.expiresAt}`);
    } else {
      console.error('❌ Error al enviar email:', result1.error);
    }
  } catch (error) {
    console.error('❌ Excepción al enviar email:', error.message);
  }

  console.log('\n========================================\n');

  // Prueba método de compatibilidad
  console.log('📧 PRUEBA 2: Método de compatibilidad sendSongsReadyEmail()');
  console.log(`   Enviando a: ${testEmail}`);
  console.log('   Ejecutando...\n');

  try {
    const result2 = await emailService.sendSongsReadyEmail(testEmail, testSongs, testOrderId);

    if (result2.success) {
      console.log('✅ Email de compatibilidad enviado exitosamente!');
      console.log(`   Message ID: ${result2.messageId}`);
    } else {
      console.error('❌ Error al enviar email de compatibilidad:', result2.error);
    }
  } catch (error) {
    console.error('❌ Excepción al enviar email de compatibilidad:', error.message);
  }

  console.log('\n========================================\n');

  // Prueba email de error
  console.log('📧 PRUEBA 3: Email de error - sendGenerationFailedEmail()');
  console.log(`   Enviando a: ${testEmail}`);
  console.log('   Ejecutando...\n');

  const failedSongs = [
    { title: 'Canción Fallida 1', error: 'Error de generación' },
    { title: 'Canción Fallida 2', error: 'Timeout en API' }
  ];

  try {
    const result3 = await emailService.sendGenerationFailedEmail(testEmail, testOrderId, failedSongs);

    if (result3.success) {
      console.log('✅ Email de error enviado exitosamente!');
      console.log(`   Message ID: ${result3.messageId}`);
    } else {
      console.error('❌ Error al enviar email de error:', result3.error);
    }
  } catch (error) {
    console.error('❌ Excepción al enviar email de error:', error.message);
  }

  console.log('\n========================================\n');

  // Prueba email de contraseña temporal
  console.log('📧 PRUEBA 4: Email de contraseña temporal - sendTempPasswordEmail()');
  console.log(`   Enviando a: ${testEmail}`);
  console.log('   Ejecutando...\n');

  try {
    const result4 = await emailService.sendTempPasswordEmail(
      testEmail,
      'Usuario de Prueba',
      'TempPass123!',
      'es'
    );

    if (result4.success) {
      console.log('✅ Email de contraseña temporal enviado exitosamente!');
      console.log(`   Message ID: ${result4.messageId}`);
    } else {
      console.error('❌ Error al enviar email de contraseña:', result4.error);
    }
  } catch (error) {
    console.error('❌ Excepción al enviar email de contraseña:', error.message);
  }

  console.log('\n========================================');
  console.log('🎉 Pruebas completadas!');
  console.log('\n💡 Verifica tu bandeja de entrada en:', testEmail);
  console.log('💡 Si usas Resend en modo desarrollo, revisa el dashboard en: https://resend.com/emails');
  console.log('========================================\n');
}

// Ejecutar pruebas
testEmailService().catch(error => {
  console.error('\n❌ Error fatal en las pruebas:', error);
  process.exit(1);
});
