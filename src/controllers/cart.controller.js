// src/controllers/cart.controller.js
import Stripe from 'stripe';
import { insertCartItemSchema } from '../shared/schema.js';
import { storage } from '../services/storage.js'; // ajusta la ruta si tu storage está en otro sitio

// Inicializa Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2020-08-27',
});

// POST /api/cart/add
export const addToCart = async (req, res) => {
  try {

    console.log('req.user:', req.user);
    console.log('Adding to cart:', req.body);

    const cartItemData = insertCartItemSchema.parse({
      ...req.body,
      userId: req.user.id,
    });

    const cartItem = await storage.addToCart(cartItemData);

    return res.json({
      success: true,
      message: 'Canción agregada al carrito',
      cartItem,
    });
  } catch (error) {
    console.error('Error adding to cart:', error);
    const message = error instanceof Error ? error.message : 'Error agregando al carrito';
    return res.status(400).json({
      success: false,
      message,
    });
  }
};

// GET /api/cart
export const getCart = async (req, res) => {
  try {
    console.log('Fetching cart for user:', req.user.id);
    const cartItems = await storage.getUserCartItems(req.user.id);
    console.log('Cart items:', cartItems);
    return res.json(cartItems);
  } catch (error) {
    console.error('Error fetching cart:', error);
    return res.status(500).json({
      success: false,
      message: 'Error obteniendo carrito',
    });
  }
};

// POST /api/cart/:id/generate-preview
export const generatePreview = async (req, res) => {
  try {
    const cartItemId = parseInt(req.params.id, 10);
    const previewUrl = await storage.generatePreview(cartItemId);

    return res.json({
      success: true,
      previewUrl,
      message: 'Preview generado exitosamente',
    });
  } catch (error) {
    console.error('Error generating preview:', error);
    const message = error instanceof Error ? error.message : 'Error generando preview';
    return res.status(500).json({
      success: false,
      message,
    });
  }
};

// DELETE /api/cart/:id
export const removeFromCart = async (req, res) => {
  try {
    const cartItemId = parseInt(req.params.id, 10);
    await storage.removeFromCart(cartItemId);

    return res.json({
      success: true,
      message: 'Canción eliminada del carrito',
    });
  } catch (error) {
    console.error('Error removing from cart:', error);
    return res.status(500).json({
      success: false,
      message: 'Error eliminando del carrito',
    });
  }
};

// POST /api/cart/checkout
export const checkoutCart = async (req, res) => {
  try {
    const cartItems = await storage.getUserCartItems(req.user.id);
    if (cartItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El carrito está vacío',
      });
    }

    // Asumimos que cada item tiene un campo `price` en string o number
    const totalAmount = cartItems.reduce((sum, item) => {
      const price = typeof item.price === 'string' ? parseFloat(item.price) : item.price;
      return sum + price;
    }, 0);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100),
      currency: 'usd',
      metadata: {
        type: 'cart_checkout',
        cartItemIds: cartItems.map(i => i.id).join(','),
        userId: req.user.id,
      },
    });

    return res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      totalAmount,
      cartItems,
    });
  } catch (error) {
    console.error('Error creating cart checkout:', error);
    return res.status(500).json({
      success: false,
      message: 'Error procesando checkout del carrito',
    });
  }
};
