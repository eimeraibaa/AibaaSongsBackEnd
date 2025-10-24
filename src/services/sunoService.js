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

      console.log('🎵 Suno response:', {
        success: data.success !== false,
        ids: data.ids || data.id,
        clips: data.clips?.length || 0
      });

      // Suno devuelve IDs de las canciones generadas
      return {
        success: true,
        songIds: data.ids || [data.id], // Array de IDs
        clipIds: data.clips?.map(clip => clip.id) || []
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
      if (!songIds || songIds.length === 0) {
        throw new Error('No se proporcionaron IDs de canciones');
      }

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