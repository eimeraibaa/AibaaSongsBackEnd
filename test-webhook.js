// =============================================
// SCRIPT DE PRUEBA DEL WEBHOOK DE SUNO
// Simula un webhook de Suno para probar el endpoint
// =============================================

import fetch from 'node-fetch';

const WEBHOOK_URL = process.env.SUNO_CALLBACK_URL || 'http://localhost:3000/webhook/suno';

// Datos de ejemplo de un webhook de Suno
const mockWebhookData = {
  code: 200,
  msg: "All generated successfully.",
  data: {
    callbackType: "complete",
    task_id: "test-task-id-12345",
    data: [
      {
        id: "test-song-id-12345",
        audio_url: "https://cdn1.suno.ai/test-song.mp3",
        image_url: "https://cdn2.suno.ai/test-image.jpeg",
        title: "Test Song",
        duration: 150.5,
        tags: "pop",
        model_name: "chirp-v3-5",
        prompt: "Test lyrics...",
        createTime: Date.now()
      }
    ]
  }
};

console.log('========================================');
console.log('🧪 PRUEBA DE WEBHOOK DE SUNO');
console.log('========================================');
console.log('');
console.log('📍 URL del webhook:', WEBHOOK_URL);
console.log('');
console.log('📋 Datos que se enviarán:');
console.log(JSON.stringify(mockWebhookData, null, 2));
console.log('');
console.log('========================================');
console.log('📤 Enviando webhook de prueba...');
console.log('========================================');

async function testWebhook() {
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mockWebhookData)
    });

    const responseData = await response.json();

    console.log('');
    console.log('✅ Respuesta recibida:');
    console.log('  - Status:', response.status);
    console.log('  - Status Text:', response.statusText);
    console.log('  - Body:', JSON.stringify(responseData, null, 2));
    console.log('');

    if (response.ok) {
      console.log('========================================');
      console.log('✅ WEBHOOK FUNCIONA CORRECTAMENTE');
      console.log('========================================');
      console.log('');
      console.log('💡 Ahora verifica los logs de tu servidor para ver si procesó el webhook');
      console.log('');
    } else {
      console.log('========================================');
      console.log('❌ ERROR EN EL WEBHOOK');
      console.log('========================================');
      console.log('');
      console.log('El servidor respondió con un error. Revisa los logs del servidor.');
      console.log('');
    }

  } catch (error) {
    console.log('');
    console.log('========================================');
    console.log('❌ ERROR ENVIANDO WEBHOOK');
    console.log('========================================');
    console.log('');
    console.log('Error:', error.message);
    console.log('');
    console.log('Posibles causas:');
    console.log('  1. El servidor no está corriendo');
    console.log('  2. La URL del webhook es incorrecta');
    console.log('  3. Problema de red/firewall');
    console.log('');
  }
}

testWebhook();
