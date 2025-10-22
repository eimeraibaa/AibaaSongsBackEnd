// =============================================
// BACKEND - Servicio de Suno AI
// =============================================

// services/sunoService.js
import fetch from 'node-fetch';

const SUNO_API_BASE = 'https://api.sunoapi.org/api/v1';
const SUNO_API_KEY = process.env.SUNO_API_KEY;

export class SunoService {
  
  async generateSong(lyrics, style = 'pop', title = 'Generated Song') {
    try {
      console.log('🎵 Generando canción con Suno AI...');
      
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
          wait_audio: false // Importante: no esperar el audio inmediatamente
        }),
      });

      if (!response.ok) {
        throw new Error(`Suno API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('🎵 Suno response:', data);
      
      // Suno devuelve IDs de las canciones generadas
      return {
        success: true,
        songIds: data.ids || [data.id], // Array de IDs
        clipIds: data.clips?.map(clip => clip.id) || []
      };
      
    } catch (error) {
      console.error('❌ Error generando canción con Suno:', error);
      throw new Error('Error generando canción con IA');
    }
  }

  async getSongStatus(songIds) {
    try {
      // Obtener el estado de múltiples canciones
      const promises = songIds.map(id => 
        fetch(`${SUNO_API_BASE}/get?ids=${id}`, {
          headers: {
            'Authorization': `Bearer ${SUNO_API_KEY}`,
          },
        }).then(res => res.json())
      );

      const results = await Promise.all(promises);
      return results;
      
    } catch (error) {
      console.error('❌ Error obteniendo estado de Suno:', error);
      throw error;
    }
  }

  async waitForCompletion(songIds, maxWaitTime = 300000) { // 5 minutos max
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      const statuses = await this.getSongStatus(songIds);
      
      const allCompleted = statuses.every(status => 
        status.status === 'complete' && status.audio_url
      );
      
      if (allCompleted) {
        return statuses;
      }
      
      console.log('🔄 Esperando generación de canciones...');
      await new Promise(resolve => setTimeout(resolve, 10000)); // Esperar 10 segundos
    }
    
    throw new Error('Timeout esperando generación de canciones');
  }
}