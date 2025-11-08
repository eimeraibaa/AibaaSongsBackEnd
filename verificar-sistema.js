// =============================================
// SCRIPT PARA VERIFICAR EL ESTADO DEL SISTEMA
// Verifica configuración y últimas canciones
// =============================================

import fetch from 'node-fetch';
import { storage } from './src/services/storage.js';

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:3000';

console.log('========================================');
console.log('🔍 VERIFICACIÓN DEL SISTEMA');
console.log('========================================');
console.log('');

async function verificarSistema() {
  try {
    // 1. Verificar configuración de webhook de Suno
    console.log('1️⃣ Verificando configuración de webhook de Suno...');
    console.log('');

    try {
      const configResponse = await fetch(`${BASE_URL}/webhook/suno-config`);
      const configData = await configResponse.json();

      if (configData.success) {
        const config = configData.diagnostics.configuration;
        console.log('   ✅ Configuración de Suno:');
        console.log(`      - Callback URL: ${config.sunoCallbackUrl.configured ? '✅' : '❌'} ${config.sunoCallbackUrl.value}`);
        console.log(`      - API Key: ${config.sunoApiKey.configured ? '✅' : '❌'} ${config.sunoApiKey.value}`);
        console.log('');

        if (configData.diagnostics.recommendations.length > 0) {
          console.log('   ⚠️ Recomendaciones:');
          configData.diagnostics.recommendations.forEach(rec => {
            console.log(`      [${rec.level}] ${rec.message}`);
          });
          console.log('');
        }
      }
    } catch (error) {
      console.log('   ⚠️ No se pudo verificar configuración (endpoint puede no estar disponible)');
      console.log('');
    }

    // 2. Verificar últimas canciones en BD
    console.log('2️⃣ Verificando últimas canciones en la base de datos...');
    console.log('');

    const recentSongs = await storage.query(
      `SELECT id, title, status, "sunoSongId", "createdAt", "audioUrl"
       FROM songs
       ORDER BY "createdAt" DESC
       LIMIT 5`
    );

    if (recentSongs.length === 0) {
      console.log('   ℹ️ No hay canciones en la base de datos');
    } else {
      console.log(`   ✅ Últimas ${recentSongs.length} canciones:`);
      console.log('');
      recentSongs.forEach((song, index) => {
        console.log(`   ${index + 1}. ID: ${song.id}`);
        console.log(`      - Título: ${song.title || 'N/A'}`);
        console.log(`      - Estado: ${song.status}`);
        console.log(`      - TaskId (sunoSongId): ${song.sunoSongId}`);
        console.log(`      - Audio URL: ${song.audioUrl ? '✅ Sí' : '❌ No'}`);
        console.log(`      - Creada: ${new Date(song.createdAt).toLocaleString()}`);
        console.log('');
      });
    }

    // 3. Verificar variables de entorno importantes
    console.log('3️⃣ Verificando variables de entorno...');
    console.log('');
    console.log(`   - EMAIL_USER: ${process.env.EMAIL_USER ? '✅ Configurado' : '❌ No configurado'}`);
    console.log(`   - EMAIL_PASSWORD: ${process.env.EMAIL_PASSWORD ? '✅ Configurado' : '❌ No configurado'}`);
    console.log(`   - SUNO_API_KEY: ${process.env.SUNO_API_KEY ? '✅ Configurado' : '❌ No configurado'}`);
    console.log(`   - SUNO_CALLBACK_URL: ${process.env.SUNO_CALLBACK_URL ? '✅ Configurado' : '❌ No configurado'}`);
    console.log(`   - STRIPE_SECRET_KEY: ${process.env.STRIPE_SECRET_KEY ? '✅ Configurado' : '❌ No configurado'}`);
    console.log('');

    // 4. Resumen
    console.log('========================================');
    console.log('📊 RESUMEN');
    console.log('========================================');
    console.log('');

    const emailConfigured = process.env.EMAIL_USER && process.env.EMAIL_PASSWORD;
    const sunoConfigured = process.env.SUNO_API_KEY && process.env.SUNO_CALLBACK_URL;

    if (!emailConfigured) {
      console.log('⚠️ EMAILS DESACTIVADOS (sin credenciales)');
      console.log('   → Los usuarios NO recibirán notificaciones por email');
      console.log('   → Solución: Ver CONFIGURAR_EMAIL.md');
      console.log('');
    } else {
      console.log('✅ Emails configurados');
      console.log('');
    }

    if (!sunoConfigured) {
      console.log('⚠️ Suno puede no estar completamente configurado');
      console.log('   → Verifica SUNO_API_KEY y SUNO_CALLBACK_URL');
      console.log('');
    } else {
      console.log('✅ Suno configurado');
      console.log('');
    }

    if (recentSongs.length > 0) {
      const completedCount = recentSongs.filter(s => s.status === 'completed').length;
      const generatingCount = recentSongs.filter(s => s.status === 'generating').length;
      const failedCount = recentSongs.filter(s => s.status === 'failed').length;

      console.log(`📊 De las últimas ${recentSongs.length} canciones:`);
      console.log(`   - ${completedCount} completadas`);
      console.log(`   - ${generatingCount} generándose`);
      console.log(`   - ${failedCount} fallidas`);
      console.log('');
    }

    console.log('========================================');

    // Sugerir siguiente paso
    console.log('');
    console.log('💡 SIGUIENTE PASO:');
    if (recentSongs.length > 0) {
      const lastSong = recentSongs[0];
      console.log('');
      console.log('Para probar el webhook con una canción real:');
      console.log('');
      console.log('1. Edita test-webhook-real.js');
      console.log(`2. Cambia REAL_TASK_ID a: "${lastSong.sunoSongId}"`);
      console.log('3. Ejecuta: node test-webhook-real.js');
      console.log('');
    } else {
      console.log('');
      console.log('No hay canciones en la BD. Genera una canción desde el frontend primero.');
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error verificando sistema:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    // Cerrar conexión a la BD
    process.exit(0);
  }
}

verificarSistema();
