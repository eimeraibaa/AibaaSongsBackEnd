import { z } from 'zod';
import { SongFeedback } from '../models/songFeedback.js';
import { SharedSong } from '../models/sharedSong.js';
import { Song } from '../models/song.js';
import { OrderItem, Order } from '../models/orders.js';

const feedbackSchema = z.object({
  songId: z.number(),
  shareToken: z.string().optional(),
  name: z.string().optional(),
  email: z.string().email().optional(),
  rating: z.number().min(1).max(5),
  comment: z.string().optional()
});

export const createFeedback = async (req, res) => {
  try {
    const body = feedbackSchema.parse(req.body);

    const created = await SongFeedback.create({
      songId: body.songId,
      shareToken: body.shareToken || null,
      name: body.name || null,
      email: body.email || null,
      rating: body.rating,
      comment: body.comment || null
    });

    if (body.shareToken) {
      try {
        await SharedSong.increment('feedbackCount', { where: { shareToken: body.shareToken } });
      } catch (err) {
        // fallback: read-modify-write
        const s = await SharedSong.findOne({ where: { shareToken: body.shareToken } });
        if (s) { s.feedbackCount = (s.feedbackCount || 0) + 1; await s.save(); }
      }
    }

    return res.status(201).json({ success: true, feedback: created });
  } catch (error) {
    console.error('Error creating feedback:', error);
    const message = error instanceof z.ZodError ? error.errors.map(e => e.message).join(', ') : error.message;
    return res.status(400).json({ success: false, message });
  }
};

// GET feedback for a song (owner only)
export const getSongFeedback = async (req, res) => {
  try {
    const songId = parseInt(req.params.songId, 10);
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    // Verificar que el usuario es dueño de la canción
    const userId = req.user.id;

    // Buscar en Song
    let song = await Song.findByPk(songId);
    let ownerId = null;

    if (song) {
      // Consultar order item y su orden para verificar owner
      const orderItem = await OrderItem.findByPk(song.orderItemId, { include: [{ model: Order, as: 'order' }] });
      if (orderItem && orderItem.order && orderItem.order.userId) ownerId = orderItem.order.userId;
    } else {
      // Si no está en Song, buscar en order_items directamente
      const orderItem = await OrderItem.findByPk(songId, { include: [{ model: Order, as: 'order' }] });
      if (orderItem && orderItem.order && orderItem.order.userId) ownerId = orderItem.order.userId;
    }

    if (ownerId !== userId) {
      return res.status(403).json({ error: 'No tienes permiso para ver este feedback' });
    }

    const feedbacks = await SongFeedback.findAll({ where: { songId } });
    return res.status(200).json({ success: true, feedbacks });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    return res.status(500).json({ error: 'Error al cargar feedback' });
  }
};
