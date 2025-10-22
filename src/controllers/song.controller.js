import { SunoService } from '../services/sunoService.js';
import { Song } from '../models/song.js';
import { storage } from '../services/storage.js';

const sunoService = new SunoService();

export const generateSongsFromOrder = async (req, res) => {
  debugger;
  try {
    const { orderId } = req.params;
    
    // 1. Obtener order items con letras
    const orderItems = await storage.getOrderItemsWithLyrics(orderId);
    
    if (orderItems.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No se encontraron items para generar'
      });
    }
    
    const songGenerationPromises = orderItems.map(async (item) => {
      try {
        // 2. Generar canción con Suno para cada item
        const sunoResult = await sunoService.generateSong(
          item.lyrics,
          item.genres[0] || 'pop',
          item.dedicatedTo || 'Canción Personalizada'
        );
        
        // 3. Crear registro de canción (inicialmente sin audio URL)
        const song = await storage.createSong(item.id, {
          title: item.dedicatedTo || 'Canción Personalizada',
          lyrics: item.lyrics,
          audioUrl: null, // Se actualizará cuando esté listo
          sunoSongId: sunoResult.songIds[0],
          genre: item.genres[0] || 'pop',
        });
        
        return {
          orderItemId: item.id,
          songId: song.id,
          sunoSongIds: sunoResult.songIds,
          status: 'generating'
        };
        
      } catch (error) {
        console.error(`Error generando canción para item ${item.id}:`, error);
        return {
          orderItemId: item.id,
          error: error.message,
          status: 'failed'
        };
      }
    });
    
    const results = await Promise.all(songGenerationPromises);
    
    // 4. Iniciar proceso en background para verificar completitud
    setImmediate(() => {
      checkSongCompletion(results.filter(r => !r.error));
    });
    
    return res.json({
      success: true,
      message: 'Generación de canciones iniciada',
      results,
    });
    
  } catch (error) {
    console.error('Error generando canciones:', error);
    return res.status(500).json({
      success: false,
      message: 'Error iniciando generación de canciones'
    });
  }
};

// Proceso en background para verificar cuando las canciones estén listas
async function checkSongCompletion(songResults) {
  console.log('🔄 Iniciando verificación de canciones...');
  
  for (const result of songResults) {
    try {
      // Esperar a que la canción esté completa
      const completedSongs = await sunoService.waitForCompletion(result.sunoSongIds);
      
      // Actualizar con la URL del audio
      if (completedSongs[0]?.audio_url) {
        await storage.updateSongStatus(
          result.songId,
          'completed',
          completedSongs[0].audio_url
        );
        
        console.log(`✅ Canción ${result.songId} completada`);
      }
      
    } catch (error) {
      console.error(`❌ Error completando canción ${result.songId}:`, error);
      await storage.updateSongStatus(result.songId, 'failed');
    }
  }
}