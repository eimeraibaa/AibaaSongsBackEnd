// =============================================
// SCRIPT DE PRUEBA - SERVICIO DE EMAIL RESEND
// Uso: node test-resend-email.js tu-email@ejemplo.com
// =============================================

import { config } from 'dotenv';
import { resendEmailService } from './src/services/resendEmailService.js';

// Cargar variables de entorno
config();

const testEmail = process.argv[2];

if (!testEmail) {
  console.error('❌ Error: Debes proporcionar un email para la prueba');
  console.log('Uso: node test-resend-email.js tu-email@ejemplo.com');
  process.exit(1);
}

// Validar formato de email
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(testEmail)) {
  console.error('❌ Error: Email inválido');
  process.exit(1);
}

console.log('🧪 Iniciando prueba del servicio de email Resend...\n');

// Verificar configuración
if (!process.env.RESEND_API_KEY) {
  console.error('❌ Error: No se encontró RESEND_API_KEY en las variables de entorno');
  console.log('\n📋 Pasos para configurar:');
  console.log('1. Crea una cuenta en https://resend.com');
  console.log('2. Obtén tu API key en https://resend.com/api-keys');
  console.log('3. Crea un archivo .env en la raíz del proyecto');
  console.log('4. Agrega: RESEND_API_KEY=tu_api_key_aqui');
  console.log('5. Opcionalmente configura: EMAIL_FROM=tu-email@tudominio.com\n');
  process.exit(1);
}

console.log('✅ RESEND_API_KEY configurado');
console.log(`✅ EMAIL_FROM: ${process.env.EMAIL_FROM || 'onboarding@resend.dev'}`);
console.log(`✅ FRONTEND_URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
console.log(`✅ BACKEND_URL: ${process.env.BACKEND_URL || 'http://localhost:3000'}\n`);

// Datos de prueba
const testSongs = [
  {
    id: 1,
    title: 'Mi Canción de Prueba',
    genre: 'Pop Rock',
    audioUrl: 'https://example.com/song1.mp3',
  },
  {
    id: 2,
    title: 'Segunda Canción Test',
    genre: 'Jazz',
    audioUrl: 'https://example.com/song2.mp3',
  },
];

const testOrderId = 999;

console.log('📧 Enviando email de prueba a:', testEmail);
console.log('📦 Orden de prueba #', testOrderId);
console.log('🎵 Canciones de prueba:', testSongs.length, '\n');

// Enviar email de prueba
(async () => {
  try {
    console.log('⏳ Enviando email...\n');

    const result = await resendEmailService.sendSongsReadyEmail(
      testEmail,
      testSongs,
      testOrderId
    );

    if (result.success) {
      console.log('✅ ¡Email enviado exitosamente!');
      console.log('📬 Message ID:', result.messageId);
      console.log('\n🎉 Revisa tu bandeja de entrada en:', testEmail);
      console.log('💡 Si no lo ves, revisa la carpeta de spam\n');
    } else {
      console.error('❌ Error al enviar email:', result.error || result.message);

      if (result.message === 'Email service not configured') {
        console.log('\n💡 El servicio de email no está configurado.');
        console.log('Asegúrate de que RESEND_API_KEY esté en tu archivo .env\n');
      }
    }

    // Probar también el email de error
    console.log('\n---\n');
    console.log('🧪 Probando email de error...\n');

    const failedSongs = [
      {
        title: 'Canción Fallida Test',
        error: 'Error de prueba simulado',
      },
    ];

    const errorResult = await resendEmailService.sendGenerationFailedEmail(
      testEmail,
      testOrderId,
      failedSongs
    );

    if (errorResult.success) {
      console.log('✅ ¡Email de error enviado exitosamente!');
      console.log('📬 Message ID:', errorResult.messageId);
      console.log('\n🎉 Revisa tu bandeja de entrada para ver ambos emails\n');
    } else {
      console.error('❌ Error al enviar email de error:', errorResult.error || errorResult.message);
    }

  } catch (error) {
    console.error('❌ Error durante la prueba:', error.message);
    process.exit(1);
  }
})();
