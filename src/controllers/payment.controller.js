import Stripe from 'stripe';
import { Payment } from '../models/payment.js';


const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2020-08-27'
});

export const createPaymentIntent = async (req, res) => {
  try {
    const { amount } = req.body;
    console.log('Creando PaymentIntent con amount:', amount);

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Monto inválido' });
    }

    const amountInCents = Math.round(amount * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      metadata: {
        purpose: 'song_creation',
        // userId: req.user?.id  // si manejas autenticación
      }
    });

    return res.status(200).json({
      clientSecret: paymentIntent.client_secret
    });
  } catch (error) {
    console.error('Error en createPaymentIntent:', error);
    return res.status(500).json({ message: 'Error interno al crear el pago' });
  }
};