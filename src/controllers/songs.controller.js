// src/controllers/songRequests.controller.js
import { z } from 'zod';
import Stripe from 'stripe';
import { SongRequest } from '../models/songs.js';
import { Payment }     from '../models/payment.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// 1) Esquema de validación
const songRequestSchema = z.object({
  userId:           z.number().optional(),
  dedicatedTo:      z.string().optional(),
  email:            z.string().email(),
  prompt:           z.string().min(1),
  genres:           z.array(z.string()).min(1),
  paymentIntentId:  z.string().min(1)
});

export const songRequest = async (req, res) => {
  try {
    // 2) Validar y sanitizar body
    const {
      userId,
      dedicatedTo,
      email,
      prompt,
      genres,
      paymentIntentId
    } = songRequestSchema.parse(req.body);

    // 3) Verificar el pago en Stripe
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (pi.status !== 'succeeded') {
      return res.status(400).json({ success: false, message: 'Pago no completado' });
    }

    // 4) Registrar en tu tabla de SongRequest
    const record = await SongRequest.create({
      userId:             userId || null,
      dedicatedTo,
      email,
      prompt,
      genres,
      status:             'pending',
      timestamp:          new Date()
    });

    // 5) (Opcional) Enlaza tu tabla de pagos
    await Payment.update(
      { status: 'succeeded' },
      { where: { stripePaymentIntentId: paymentIntentId } }
    );

    // 6) Disparar generación de la canción (cola, microservicio, etc.)
    // await queue.add('generate-song', { requestId: record.id });

    return res.json({ success: true, id: record.id });
  } catch (error) {
    console.error('Error en createSongRequest:', error);
    const message = error instanceof z.ZodError
      ? error.errors.map(e => e.message).join(', ')
      : error.message;
    return res.status(400).json({ success: false, message });
  }
};
