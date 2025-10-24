// =============================================
// BACKEND - Servicio de Suno AI
// =============================================

// services/sunoService.js
import fetch from 'node-fetch';

const SUNO_API_BASE = 'https://api.sunoapi.org/api/v1';
const SUNO_API_KEY = process.env.SUNO_API_KEY;
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 segundos

export class SunoService {

  /**
   * Función auxiliar para realizar reintentos
   * @param {Function} fn - Función a reintentar
   * @param {number} maxRetries - Número máximo de reintentos
   * @param {number} delay - Delay entre reintentos en ms
   * @returns {Promise} Resultado de la función
   */
  async retryWithBackoff(fn, maxRetries = MAX_RETRIES, delay = RETRY_DELAY) {
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        if (attempt < maxRetries) {
          const waitTime = delay * Math.pow(2, attempt); // Exponential backoff
          console.log(`⚠️ Intento ${attempt + 1}/${maxRetries + 1} falló. Reintentando en ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    throw lastError;
  }

  /**
   * Genera una canción con Suno AI
   * @param {string} lyrics - Letras de la canción
   * @param {string} style - Estilo/género musical
   * @param {string} title - Título de la canción
   * @param {string} callbackUrl - URL para recibir notificación cuando esté lista (opcional)
   * @returns {Promise<Object>} IDs de las canciones generadas
   */
  async generateSong(lyrics, style = 'pop', title = 'Generated Song', callbackUrl = '') {
    try {
      console.log('🎵 Generando canción con Suno AI...');
      console.log(`📊 Parámetros: style="${style}", title="${title}", callbackUrl="${callbackUrl}"`);

      // Validar parámetros
      if (!lyrics || lyrics.trim().length === 0) {
        throw new Error('Letras vacías o inválidas');
      }

      if (!SUNO_API_KEY) {
        throw new Error('SUNO_API_KEY no configurada');
      }

      const generateRequest = async () => {
        const response = await fetch(`${SUNO_API_BASE}/generate`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUNO_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: lyrics,
            style: style,
            title: title,
            make_instrumental: false,
            model: 'V3_5',
            customMode: false,
            instrumental: false,
            callBackUrl: callbackUrl, // Ahora acepta callbackUrl como parámetro
            wait_audio: false // Importante: no esperar el audio inmediatamente
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Suno API error ${response.status}: ${errorText}`);
        }

        return await response.json();
      };

      // Realizar la petición con reintentos
      const data = await this.retryWithBackoff(generateRequest);

      // LOG DETALLADO DE LA RESPUESTA COMPLETA PARA DEBUGGING
      console.log('========================================');
      console.log('🎵 SUNO API RESPONSE COMPLETA:');
      console.log(JSON.stringify(data, null, 2));
      console.log('========================================');
      console.log('🔍 Análisis de la respuesta:');
      console.log('  - Tipo:', typeof data);
      console.log('  - Es array?:', Array.isArray(data));
      console.log('  - Keys:', Object.keys(data));
      console.log('  - data.data:', data.data);
      console.log('  - data.ids:', data.ids);
      console.log('  - data.id:', data.id);
      console.log('  - data.clips:', data.clips);
      console.log('========================================');

      // Intentar extraer IDs de diferentes formatos posibles
      let songIds = [];

      // Formato 1: data.data (array de objetos con id)
      if (data.data && Array.isArray(data.data)) {
        songIds = data.data.map(item => item.id).filter(id => id);
        console.log('✅ Formato detectado: data.data (array)');
        console.log('✅ IDs extraídos:', songIds);
      }
      // Formato 2: data es un array directamente
      else if (Array.isArray(data)) {
        songIds = data.map(item => item?.id).filter(id => id);
        console.log('✅ Formato detectado: array directo');
        console.log('✅ IDs extraídos:', songIds);
      }
      // Formato 3: data.ids (array de strings)
      else if (data.ids && Array.isArray(data.ids)) {
        songIds = data.ids.filter(id => id);
        console.log('✅ Formato detectado: data.ids');
        console.log('✅ IDs extraídos:', songIds);
      }
      // Formato 4: data.id (string único)
      else if (data.id) {
        songIds = [data.id];
        console.log('✅ Formato detectado: data.id');
        console.log('✅ ID extraído:', songIds);
      }
      // Formato 5: data.clips (array de objetos)
      else if (data.clips && Array.isArray(data.clips)) {
        songIds = data.clips.map(clip => clip?.id).filter(id => id);
        console.log('✅ Formato detectado: data.clips');
        console.log('✅ IDs extraídos:', songIds);
      }

      // Validar que obtuvimos IDs válidos
      if (!songIds || songIds.length === 0 || songIds.some(id => !id || id === 'undefined')) {
        console.error('========================================');
        console.error('❌ ERROR CRÍTICO: No se pudieron extraer IDs válidos');
        console.error('📋 Respuesta completa de Suno:');
        console.error(JSON.stringify(data, null, 2));
        console.error('========================================');
        console.error('');
        console.error('🔧 POSIBLES SOLUCIONES:');
        console.error('1. Verifica que SUNO_API_KEY esté configurada correctamente');
        console.error('2. Verifica que tengas créditos en tu cuenta de Suno');
        console.error('3. Revisa la documentación de Suno API: https://docs.sunoapi.org');
        console.error('4. Prueba llamar a la API directamente con curl para ver el formato real');
        console.error('');
        throw new Error('Respuesta de Suno sin IDs válidos. Revisa los logs arriba para más detalles.');
      }

      console.log('========================================');
      console.log('✅ Suno response procesada exitosamente:');
      console.log('  - Total IDs:', songIds.length);
      console.log('  - IDs:', songIds);
      console.log('========================================');

      // Suno devuelve IDs de las canciones generadas
      return {
        success: true,
        songIds: songIds,
        clipIds: data.clips?.map(clip => clip?.id).filter(id => id) || data.data?.map(item => item?.id).filter(id => id) || []
      };

    } catch (error) {
      console.error('❌ Error generando canción con Suno:', error.message);
      console.error('Stack:', error.stack);
      throw new Error(`Error generando canción con IA: ${error.message}`);
    }
  }

  /**
   * Obtiene el estado de una o más canciones
   * @param {Array<string>} songIds - IDs de las canciones a consultar
   * @returns {Promise<Array>} Array con el estado de cada canción
   */
  async getSongStatus(songIds) {
    try {
      // Validación estricta de IDs
      if (!songIds || songIds.length === 0) {
        throw new Error('No se proporcionaron IDs de canciones');
      }

      // Validar que todos los IDs sean válidos (no undefined, null o vacíos)
      const invalidIds = songIds.filter(id => !id || id === 'undefined' || id === 'null');
      if (invalidIds.length > 0) {
        console.error('❌ IDs inválidos detectados:', invalidIds);
        console.error('❌ Todos los IDs:', songIds);
        throw new Error(`IDs de canciones inválidos: ${JSON.stringify(invalidIds)}. No se puede consultar el estado.`);
      }

      console.log(`🔍 Consultando estado de ${songIds.length} canción(es):`, songIds);

      // Obtener el estado de múltiples canciones con reintentos
      const promises = songIds.map(id => {
        const getStatus = async () => {
          const response = await fetch(`${SUNO_API_BASE}/get?ids=${id}`, {
            headers: {
              'Authorization': `Bearer ${SUNO_API_KEY}`,
            },
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error obteniendo estado ${response.status}: ${errorText}`);
          }

          return await response.json();
        };

        return this.retryWithBackoff(getStatus, 2, 1000); // Menos reintentos para status check
      });

      const results = await Promise.all(promises);
      return results;

    } catch (error) {
      console.error('❌ Error obteniendo estado de Suno:', error.message);
      throw error;
    }
  }

  /**
   * Espera a que las canciones estén completadas
   * @param {Array<string>} songIds - IDs de las canciones a esperar
   * @param {number} maxWaitTime - Tiempo máximo de espera en ms (default: 5 minutos)
   * @returns {Promise<Array>} Array con los datos completos de las canciones
   */
  async waitForCompletion(songIds, maxWaitTime = 300000) { // 5 minutos max
    const startTime = Date.now();
    let attempts = 0;
    const pollInterval = 10000; // 10 segundos

    console.log(`⏳ Esperando completitud de ${songIds.length} canción(es)...`);
    console.log(`📊 Tiempo máximo de espera: ${maxWaitTime / 1000} segundos`);

    while (Date.now() - startTime < maxWaitTime) {
      attempts++;
      const elapsed = Math.floor((Date.now() - startTime) / 1000);

      try {
        const statuses = await this.getSongStatus(songIds);

        // Contar estados
        const completed = statuses.filter(s => s.status === 'complete' && s.audio_url);
        const pending = statuses.filter(s => s.status !== 'complete' || !s.audio_url);

        console.log(`🔄 [${elapsed}s] Intento ${attempts}: ${completed.length}/${songIds.length} completadas`);

        // Log de estados individuales para debug
        if (pending.length > 0) {
          pending.forEach((s, i) => {
            console.log(`  - Canción ${i + 1}: status="${s.status}", hasAudio=${!!s.audio_url}`);
          });
        }

        // Verificar si todas están completadas
        const allCompleted = statuses.every(status =>
          status.status === 'complete' && status.audio_url
        );

        if (allCompleted) {
          console.log(`✅ Todas las canciones completadas en ${elapsed} segundos`);
          return statuses;
        }

        // Esperar antes del siguiente intento
        console.log(`⏱️ Esperando ${pollInterval / 1000}s antes del siguiente intento...`);
        await new Promise(resolve => setTimeout(resolve, pollInterval));

      } catch (error) {
        console.error(`⚠️ Error consultando estado (intento ${attempts}):`, error.message);
        // Continuar intentando a pesar del error
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }

    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    throw new Error(`Timeout esperando generación de canciones después de ${elapsed} segundos (${attempts} intentos)`);
  }
}