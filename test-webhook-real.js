// =============================================
// SCRIPT DE PRUEBA DEL WEBHOOK DE SUNO CON DATOS REALES
// Usa un taskId real de tu base de datos
// =============================================

import fetch from 'node-fetch';

const WEBHOOK_URL = process.env.SUNO_CALLBACK_URL || 'http://localhost:3000/webhook/suno';

// ⚠️ CAMBIA ESTE TASK_ID por uno real de tu BD
// Ejemplo: Si en tu BD hay una canción con sunoSongId = '84e29b500af472f8ca05f0c9dd5115d5'
// usa ese valor aquí
const REAL_TASK_ID = '84e29b500af472f8ca05f0c9dd5115d5'; // ⬅️ CAMBIA ESTO

// Datos de ejemplo de un webhook de Suno
const mockWebhookData = {
  code: 200,
  msg: "All generated successfully.",
  data: {
    callbackType: "complete",
    task_id: REAL_TASK_ID, // 🔑 Usar el taskId real
    data: [
      {
        id: "fake-suno-variation-1",
        audio_url: "https://cdn1.suno.ai/test-song-UPDATED.mp3",
        image_url: "https://cdn2.suno.ai/test-image-UPDATED.jpeg",
        title: "Test Song UPDATED",
        duration: 150.5,
        tags: "pop",
        model_name: "chirp-v3-5",
        prompt: "Test lyrics...",
        createTime: Date.now()
      },
      {
        // Segunda variación - será omitida
        id: "fake-suno-variation-2",
        audio_url: "https://cdn1.suno.ai/test-song-2.mp3",
        image_url: "https://cdn2.suno.ai/test-image-2.jpeg",
        title: "Test Song Variation 2",
        duration: 155.0,
        tags: "pop",
      }
    ]
  }
};

console.log('========================================');
console.log('🧪 PRUEBA DE WEBHOOK DE SUNO (CON DATOS REALES)');
console.log('========================================');
console.log('');
console.log('📍 URL del webhook:', WEBHOOK_URL);
console.log('🔑 TaskId que se buscará en BD:', REAL_TASK_ID);
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
      console.log('✅ WEBHOOK PROCESADO CORRECTAMENTE');
      console.log('========================================');
      console.log('');
      console.log('💡 Verifica en los logs del servidor:');
      console.log('  - Si encontró la canción con taskId:', REAL_TASK_ID);
      console.log('  - Si actualizó el audio URL');
      console.log('  - Si omitió la segunda variación');
      console.log('  - Si intentó enviar email (debería estar desactivado)');
      console.log('');
    } else {
      console.log('========================================');
      console.log('❌ ERROR EN EL WEBHOOK');
      console.log('========================================');
    }

  } catch (error) {
    console.log('');
    console.log('========================================');
    console.log('❌ ERROR ENVIANDO WEBHOOK');
    console.log('========================================');
    console.log('');
    console.log('Error:', error.message);
    console.log('');
  }
}

testWebhook();
