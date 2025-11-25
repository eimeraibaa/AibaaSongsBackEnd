import { z } from 'zod';
import { SharedSong } from '../models/sharedSong.js';
import { Song } from '../models/song.js';
import { OrderItem, Order } from '../models/orders.js';
import { randomUUID } from 'crypto';

const createSchema = z.object({
  songId: z.number(),
  title: z.string().optional(),
  message: z.string().optional(),
});

export const createSharedSong = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'No autenticado' });

    const body = createSchema.parse(req.body);
    const userId = req.user.id;

    // Verificar que la canción pertenece al usuario
    let song = await Song.findByPk(body.songId);
    let ownerId = null;

    if (song) {
      const orderItem = await OrderItem.findByPk(song.orderItemId, { include: [Order] });
      if (orderItem && orderItem.Order && orderItem.Order.userId) ownerId = orderItem.Order.userId;
    } else {
      const orderItem = await OrderItem.findByPk(body.songId, { include: [Order] });
      if (orderItem && orderItem.Order && orderItem.Order.userId) ownerId = orderItem.Order.userId;
    }

    if (ownerId !== userId) {
      return res.status(403).json({ error: 'No tienes permiso para compartir esta canción' });
    }

    // Generar token único
    const shareToken = randomUUID();

    // Buscar existente
    const existing = await SharedSong.findOne({ where: { songId: body.songId, userId, isActive: true } });

    let result;
    if (existing) {
      existing.title = body.title || existing.title;
      existing.message = body.message || existing.message;
      existing.updatedAt = new Date();
      await existing.save();
      result = existing;
    } else {
      result = await SharedSong.create({
        songId: body.songId,
        userId,
        shareToken,
        title: body.title || null,
        message: body.message || null,
        viewCount: 0,
        feedbackCount: 0,
        isActive: true
      });
    }

    return res.status(201).json({ success: true, shareToken: result.shareToken, shareUrl: `/share/${result.shareToken}` });
  } catch (error) {
    console.error('Error creating shared song:', error);
    const message = error instanceof z.ZodError ? error.errors.map(e => e.message).join(', ') : error.message;
    return res.status(400).json({ success: false, message });
  }
};

export const getSharedSong = async (req, res) => {
  try {
    const token = req.params.token;
    const shared = await SharedSong.findOne({ where: { shareToken: token, isActive: true } });
    if (!shared) return res.status(404).json({ error: 'Canción no encontrada o enlace inválido' });

    if (shared.expiresAt && new Date() > new Date(shared.expiresAt)) {
      return res.status(410).json({ error: 'Este enlace ha expirado' });
    }

    // Incrementar vista
    try { await SharedSong.increment('viewCount', { where: { shareToken: token } }); } catch (err) { /* ignore */ }

    // Obtener datos de la canción
    let songData = await Song.findByPk(shared.songId);
    if (!songData) {
      const orderItem = await OrderItem.findByPk(shared.songId);
      if (orderItem) songData = orderItem;
    }

    if (!songData) return res.status(404).json({ error: 'Datos de la canción no encontrados' });

    const response = {
      id: shared.id,
      songId: shared.songId,
      title: shared.title,
      message: shared.message,
      audioUrl: songData.audioUrl || songData.finalUrl || songData.previewUrl || null,
      imageUrl: songData.imageUrl || null,
      dedicatedTo: songData.dedicatedTo || null,
      viewCount: shared.viewCount + 1,
      feedbackCount: shared.feedbackCount,
      createdAt: shared.createdAt
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('Error fetching shared song:', error);
    return res.status(500).json({ error: 'Error al cargar la canción' });
  }
};
