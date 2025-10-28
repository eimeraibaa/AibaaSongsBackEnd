import { SunoService } from '../services/sunoService.js';
import { Song } from '../models/song.js';
import { storage } from '../services/storage.js';
import { emailService } from '../services/emailService.js';
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

    // Array para rastrear las promesas de completitud (solo para polling)
    const completionPromises = [];
    let useWebhook = false;

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
          sunoSongId: sunoResult.songIds[0], // Puede ser taskId si usa webhook
          genre: item.genres[0] || 'pop',
        });

        console.log(`✅ Canción creada con ID: ${song.id}, Suno ID: ${sunoResult.songIds[0]}`);

        // Verificar si este resultado usa webhook
        if (sunoResult.useWebhook) {
          useWebhook = true;
          console.log(`✅ Canción ${song.id} esperará notificación por webhook (no polling)`);
          if (sunoResult.taskId) {
            console.log(`📋 TaskId de Suno: ${sunoResult.taskId}`);
          }
        }

        return {
          orderItemId: item.id,
          songId: song.id,
          sunoSongIds: sunoResult.songIds,
          useWebhook: sunoResult.useWebhook,
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

    // 4. Iniciar proceso en background SOLO si NO se usa webhook
    const successfulResults = results.filter(r => !r.error);

    if (useWebhook) {
      console.log('========================================');
      console.log('✅ Usando WEBHOOK - NO se ejecutará polling');
      console.log('========================================');
      console.log('ℹ️ Las canciones se actualizarán automáticamente cuando Suno envíe el webhook');
      console.log('ℹ️ El correo se enviará automáticamente por el webhook handler');
      console.log('========================================');
    } else {
      console.log('========================================');
      console.log('🔄 Usando POLLING - iniciando verificación de completitud');
      console.log('========================================');
      setImmediate(() => {
        checkSongCompletion(orderId, successfulResults);
      });
    }

    return res.json({
      success: true,
      message: 'Generación de canciones iniciada',
      results,
      useWebhook,
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
async function checkSongCompletion(orderId, songResults) {
  console.log('🔄 Iniciando verificación de canciones en modo POLLING...');

  // Array de promesas para esperar completitud de todas las canciones
  const completionPromises = songResults.map(result =>
    waitForSongCompletion(result.songId, result.sunoSongIds)
  );

  try {
    console.log(`📧 Esperando que todas las canciones de la orden ${orderId} estén listas...`);

    // Esperar a que todas las canciones estén completadas
    const results = await Promise.allSettled(completionPromises);

    // Contar canciones exitosas y fallidas
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success);
    const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success));

    console.log(`✅ ${successful.length} canciones completadas, ${failed.length} fallidas`);

    // Obtener la orden con el email
    const order = await storage.getOrderById(orderId);

    if (!order || !order.userEmail) {
      console.warn(`⚠️ No se puede enviar email: orden ${orderId} sin email`);
      return;
    }

    // Obtener las canciones completadas
    const songs = await storage.getOrderSongs(orderId);
    const completedSongs = songs.filter(song => song.status === 'completed');

    if (completedSongs.length === 0) {
      console.warn(`⚠️ No hay canciones completadas para notificar en orden ${orderId}`);

      // Si hay canciones fallidas, enviar email de error
      if (failed.length > 0) {
        const failedSongs = songs
          .filter(song => song.status === 'failed')
          .map(song => ({
            title: song.title,
            error: 'Error en la generación'
          }));

        await emailService.sendGenerationFailedEmail(
          order.userEmail,
          orderId,
          failedSongs
        );
      }

      return;
    }

    // Enviar email con las canciones listas
    console.log(`📧 Enviando email a ${order.userEmail} con ${completedSongs.length} canciones`);

    const emailResult = await emailService.sendSongsReadyEmail(
      order.userEmail,
      completedSongs,
      orderId
    );

    if (emailResult.success) {
      console.log(`✅ Email enviado exitosamente a ${order.userEmail}`);
      if (emailResult.previewUrl) {
        console.log(`📧 Preview URL: ${emailResult.previewUrl}`);
      }
    } else {
      console.error(`❌ Error enviando email: ${emailResult.error}`);
    }

  } catch (error) {
    console.error(`❌ Error en checkSongCompletion:`, error);
  }
}

/**
 * Espera a que Suno complete la generación y actualiza la DB
 * @param {number} songId - ID de la canción en nuestra DB
 * @param {Array<string>} sunoSongIds - IDs de Suno
 * @returns {Promise} Promesa que se resuelve cuando la canción está lista
 */
async function waitForSongCompletion(songId, sunoSongIds) {
  try {
    console.log(`🔄 Esperando completitud de canción ${songId}...`);

    // Esperar a que Suno complete (máximo 10 minutos)
    const completedSongs = await sunoService.waitForCompletion(sunoSongIds);

    // Actualizar con la URL del audio
    if (completedSongs[0]?.audio_url) {
      await storage.updateSongStatus(
        songId,
        'completed',
        completedSongs[0].audio_url
      );

      console.log(`✅ Canción ${songId} completada con audio URL`);
      return { success: true, songId };
    } else {
      console.error(`❌ Canción ${songId} completada sin audio URL`);
      await storage.updateSongStatus(songId, 'failed');
      return { success: false, songId, error: 'No audio URL' };
    }

  } catch (error) {
    console.error(`❌ Error esperando completitud de canción ${songId}:`, error);
    await storage.updateSongStatus(songId, 'failed');
    return { success: false, songId, error: error.message };
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
    if (userId && song.OrderItem?.order?.userId !== userId) {
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
 * Accesible públicamente para permitir descargas desde correos
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

      // Sanitizar el título para usarlo como nombre de archivo
      const sanitizedTitle = (song.title || 'cancion')
        .replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\s-]/g, '') // Permitir caracteres españoles
        .replace(/\s+/g, '_') // Reemplazar espacios con guiones bajos
        .substring(0, 50); // Limitar longitud

      const filename = `${sanitizedTitle}.mp3`;

      // Configurar headers para la descarga forzada
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Cache-Control', 'no-cache');

      // Stream del archivo al cliente
      response.body.pipe(res);

      console.log(`✅ Descarga iniciada para canción ${id} - ${filename}`);

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
    if (userId && song.OrderItem?.order?.userId !== userId) {
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