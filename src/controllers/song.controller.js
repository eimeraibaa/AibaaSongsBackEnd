import { SunoService } from '../services/sunoService.js';
import { Song } from '../models/song.js';
import { storage } from '../services/storage.js';
import fetch from 'node-fetch';

const sunoService = new SunoService();

export const generateSongsFromOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // 1. Obtener order items con letras
    const orderItems = await storage.getOrderItemsWithLyrics(orderId);
    
    console.log(`Iniciando generación de canciones para order ${orderId}, items:`, orderItems);

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

/**
 * Obtener información de una canción específica
 * GET /songs/:id
 */
export const getSong = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const song = await storage.getSongById(id);

    if (!song) {
      return res.status(404).json({
        success: false,
        message: 'Canción no encontrada'
      });
    }

    // Verificar que el usuario sea el dueño de la canción
    if (userId && song.OrderItem?.Order?.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para acceder a esta canción'
      });
    }

    return res.json({
      success: true,
      song
    });

  } catch (error) {
    console.error('Error obteniendo canción:', error);
    return res.status(500).json({
      success: false,
      message: 'Error obteniendo canción'
    });
  }
};

/**
 * Listar todas las canciones del usuario autenticado
 * GET /songs/user
 */
export const getUserSongs = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    const songs = await storage.getUserSongs(userId);

    return res.json({
      success: true,
      count: songs.length,
      songs
    });

  } catch (error) {
    console.error('Error obteniendo canciones del usuario:', error);
    return res.status(500).json({
      success: false,
      message: 'Error obteniendo canciones'
    });
  }
};

/**
 * Descargar archivo de audio de una canción
 * GET /songs/:id/download
 */
export const downloadSong = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const song = await storage.getSongById(id);

    if (!song) {
      return res.status(404).json({
        success: false,
        message: 'Canción no encontrada'
      });
    }

    // Verificar que el usuario sea el dueño de la canción
    if (userId && song.OrderItem?.Order?.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para descargar esta canción'
      });
    }

    // Verificar que la canción esté completada y tenga audioUrl
    if (song.status !== 'completed' || !song.audioUrl) {
      return res.status(400).json({
        success: false,
        message: 'La canción aún no está disponible para descarga',
        status: song.status
      });
    }

    try {
      // Descargar el archivo desde Suno
      const response = await fetch(song.audioUrl);

      if (!response.ok) {
        throw new Error(`Error descargando archivo: ${response.status}`);
      }

      // Configurar headers para la descarga
      const filename = `${song.title || 'cancion'}-${song.id}.mp3`.replace(/[^a-z0-9.-]/gi, '_');

      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      // Stream del archivo al cliente
      response.body.pipe(res);

      console.log(`✅ Descarga iniciada para canción ${id}`);

    } catch (downloadError) {
      console.error('Error descargando archivo:', downloadError);
      return res.status(500).json({
        success: false,
        message: 'Error descargando archivo de audio'
      });
    }

  } catch (error) {
    console.error('Error en downloadSong:', error);
    return res.status(500).json({
      success: false,
      message: 'Error procesando descarga'
    });
  }
};

/**
 * Obtener el audio URL de una canción (streaming)
 * GET /songs/:id/stream
 */
export const streamSong = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const song = await storage.getSongById(id);

    if (!song) {
      return res.status(404).json({
        success: false,
        message: 'Canción no encontrada'
      });
    }

    // Verificar que el usuario sea el dueño de la canción
    if (userId && song.OrderItem?.Order?.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para acceder a esta canción'
      });
    }

    // Verificar que la canción esté completada y tenga audioUrl
    if (song.status !== 'completed' || !song.audioUrl) {
      return res.status(400).json({
        success: false,
        message: 'La canción aún no está disponible',
        status: song.status
      });
    }

    // Redirigir al audioUrl de Suno (o retornar la URL)
    return res.json({
      success: true,
      audioUrl: song.audioUrl,
      imageUrl: song.imageUrl,
      title: song.title,
      genre: song.genre
    });

  } catch (error) {
    console.error('Error en streamSong:', error);
    return res.status(500).json({
      success: false,
      message: 'Error obteniendo audio'
    });
  }
};