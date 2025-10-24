// =============================================
// SCRIPT DE PRUEBA DE LA API DE SUNO
// =============================================
// Este script te ayuda a debuggear la API de Suno
// y ver exactamente qué respuesta devuelve

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const SUNO_API_BASE = 'https://api.sunoapi.org/api/v1';
const SUNO_API_KEY = process.env.SUNO_API_KEY;

console.log('========================================');
console.log('🧪 PRUEBA DE API DE SUNO');
console.log('========================================');
console.log('');

// Verificar configuración
console.log('📋 Configuración:');
console.log('  - SUNO_API_KEY:', SUNO_API_KEY ? `${SUNO_API_KEY.substring(0, 10)}...` : '❌ NO CONFIGURADA');
console.log('  - API Base:', SUNO_API_BASE);
console.log('');

if (!SUNO_API_KEY) {
  console.error('❌ ERROR: SUNO_API_KEY no está configurada');
  console.error('');
  console.error('Configura tu API key en el archivo .env:');
  console.error('SUNO_API_KEY=tu-api-key-aqui');
  process.exit(1);
}

// Datos de prueba
const testPayload = {
  prompt: `[VERSO 1]
En este momento quiero cantar
Una canción de prueba para verificar
Que la API de Suno funciona bien
Y que podemos generar música también

[CORO]
Esta es una prueba, una prueba de verdad
Para verificar que todo está en su lugar`,
  style: 'pop',
  title: 'Prueba de API',
  make_instrumental: false,
  model: 'V3_5',
  customMode: false,
  instrumental: false,
  callBackUrl: '',
  wait_audio: false
};

async function testSunoAPI() {
  try {
    console.log('========================================');
    console.log('🎵 LLAMANDO A LA API DE SUNO...');
    console.log('========================================');
    console.log('');
    console.log('📤 Payload enviado:');
    console.log(JSON.stringify({
      ...testPayload,
      prompt: testPayload.prompt.substring(0, 100) + '...'
    }, null, 2));
    console.log('');

    const response = await fetch(`${SUNO_API_BASE}/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUNO_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload),
    });

    console.log('📥 Estado de respuesta HTTP:', response.status, response.statusText);
    console.log('');

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ ERROR EN LA API:');
      console.error('  - Status:', response.status);
      console.error('  - Respuesta:', errorText);
      console.error('');
      console.error('🔧 POSIBLES CAUSAS:');
      console.error('  1. API key inválida o expirada');
      console.error('  2. No tienes créditos en tu cuenta de Suno');
      console.error('  3. El endpoint o formato de la API cambió');
      console.error('  4. Problemas de conectividad');
      console.error('');
      console.error('💡 SOLUCIONES:');
      console.error('  1. Verifica tu API key en https://sunoapi.org');
      console.error('  2. Verifica el balance de tu cuenta');
      console.error('  3. Revisa la documentación: https://docs.sunoapi.org');
      process.exit(1);
    }

    const data = await response.json();

    console.log('========================================');
    console.log('✅ RESPUESTA EXITOSA');
    console.log('========================================');
    console.log('');
    console.log('📋 RESPUESTA COMPLETA:');
    console.log(JSON.stringify(data, null, 2));
    console.log('');
    console.log('========================================');
    console.log('🔍 ANÁLISIS DE LA RESPUESTA:');
    console.log('========================================');
    console.log('');
    console.log('Estructura detectada:');
    console.log('  - Tipo:', typeof data);
    console.log('  - Es array?:', Array.isArray(data));
    console.log('  - Keys disponibles:', Object.keys(data));
    console.log('');
    console.log('Campos importantes:');
    console.log('  - data.data:', data.data ? (Array.isArray(data.data) ? `Array(${data.data.length})` : typeof data.data) : 'undefined');
    console.log('  - data.ids:', data.ids ? (Array.isArray(data.ids) ? `Array(${data.ids.length})` : typeof data.ids) : 'undefined');
    console.log('  - data.id:', data.id || 'undefined');
    console.log('  - data.clips:', data.clips ? (Array.isArray(data.clips) ? `Array(${data.clips.length})` : typeof data.clips) : 'undefined');
    console.log('  - data.success:', data.success);
    console.log('  - data.code:', data.code);
    console.log('  - data.status:', data.status);
    console.log('');

    // Intentar extraer IDs o taskId
    let songIds = [];
    let taskId = null;

    // Formato ESPECIAL: Con callbackUrl, Suno devuelve taskId
    if (data.data && data.data.taskId) {
      taskId = data.data.taskId;
      console.log('========================================');
      console.log('✅ FORMATO CON CALLBACK DETECTADO');
      console.log('========================================');
      console.log('TaskId:', taskId);
      console.log('');
      console.log('ℹ️ Esto es CORRECTO cuando usas callbackUrl.');
      console.log('ℹ️ Suno NO devuelve IDs inmediatamente.');
      console.log('ℹ️ En su lugar, enviará un webhook cuando la canción esté lista.');
      console.log('');
    } else if (data.data && Array.isArray(data.data)) {
      songIds = data.data.map(item => item.id).filter(id => id);
      console.log('✅ IDs encontrados en data.data:', songIds);
    } else if (Array.isArray(data)) {
      songIds = data.map(item => item?.id).filter(id => id);
      console.log('✅ IDs encontrados en array directo:', songIds);
    } else if (data.ids && Array.isArray(data.ids)) {
      songIds = data.ids.filter(id => id);
      console.log('✅ IDs encontrados en data.ids:', songIds);
    } else if (data.id) {
      songIds = [data.id];
      console.log('✅ ID encontrado en data.id:', songIds);
    } else if (data.clips && Array.isArray(data.clips)) {
      songIds = data.clips.map(clip => clip?.id).filter(id => id);
      console.log('✅ IDs encontrados en data.clips:', songIds);
    } else {
      console.error('❌ NO SE ENCONTRARON IDs NI TASKID EN LA RESPUESTA');
      console.error('');
      console.error('Esto significa que el formato de la respuesta no es el esperado.');
      console.error('Por favor, comparte esta salida completa con el equipo de desarrollo.');
    }

    console.log('');
    console.log('========================================');
    console.log('💡 RESULTADO:');
    console.log('========================================');

    if (taskId) {
      console.log('✅ LA API FUNCIONA CORRECTAMENTE (CON CALLBACK)');
      console.log('');
      console.log('TaskId de la tarea:', taskId);
      console.log('');
      console.log('📨 FLUJO CON WEBHOOK:');
      console.log('1. ✅ Suno recibió tu solicitud');
      console.log('2. ⏳ Suno está generando la canción (~60 segundos)');
      console.log('3. 📨 Suno enviará webhook a tu callbackUrl cuando esté listo');
      console.log('4. 🔔 Tu backend recibirá los datos completos (id, audio_url, etc.)');
      console.log('');
      console.log('🔍 CÓMO VERIFICAR:');
      console.log('');
      console.log('1. Mantén tu servidor corriendo (npm start)');
      console.log('2. Mantén ngrok corriendo (ngrok http 3000)');
      console.log('3. Espera ~60 segundos');
      console.log('4. Verás en los logs del servidor:');
      console.log('   📨 Webhook de Suno recibido');
      console.log('   🎵 Procesando canción de Suno: [id]');
      console.log('   ✅ Canción actualizada con audio URL');
      console.log('');
      console.log('⚠️ IMPORTANTE:');
      console.log('- NO cierres el servidor');
      console.log('- NO cierres ngrok');
      console.log('- Espera a ver el webhook en los logs');
      console.log('');
    } else if (songIds.length > 0) {
      console.log('✅ LA API FUNCIONA CORRECTAMENTE (SIN CALLBACK)');
      console.log('');
      console.log('IDs de canciones generadas:', songIds);
      console.log('Total:', songIds.length);
      console.log('');
      console.log('Ahora puedes usar estos IDs para consultar el estado de las canciones.');
      console.log('');
      console.log('Próximos pasos:');
      console.log('1. Espera ~60 segundos para que Suno genere la canción');
      console.log('2. Consulta el estado en:', `${SUNO_API_BASE}/get?ids=${songIds[0]}`);
    } else {
      console.log('⚠️ LA API RESPONDIÓ PERO SIN IDs NI TASKID VÁLIDOS');
      console.log('');
      console.log('Esto puede significar:');
      console.log('1. La API cambió su formato de respuesta');
      console.log('2. Hay un problema con tu cuenta de Suno');
      console.log('3. Los parámetros enviados no son correctos');
      console.log('');
      console.log('Por favor, contacta al soporte de Suno con la respuesta completa mostrada arriba.');
    }

  } catch (error) {
    console.error('========================================');
    console.error('❌ ERROR EJECUTANDO LA PRUEBA');
    console.error('========================================');
    console.error('');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.error('');
    console.error('Esto puede ser un problema de:');
    console.error('1. Conexión a internet');
    console.error('2. La URL de la API está bloqueada o es incorrecta');
    console.error('3. Problema con las credenciales');
    process.exit(1);
  }
}

// Ejecutar prueba
console.log('⏳ Iniciando prueba...');
console.log('');
testSunoAPI();
