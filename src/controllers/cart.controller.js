// src/controllers/cart.controller.js
import Stripe from 'stripe';
import { insertCartItemSchema } from '../shared/schema.js';
import { storage } from '../services/storage.js'; // ajusta la ruta si tu storage está en otro sitio
import {
  STRIPE_CONFIG,
  getPriceInCents,
  getPriceInDollars,
  calculateTotal
} from '../config/stripe.config.js';

// Inicializa Stripe (sin especificar apiVersion usa la versión predeterminada de tu cuenta)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// POST /api/cart/add
export const addToCart = async (req, res) => {
  try {
    const userId = req.user.id; // Del middleware isAuthenticated
    const {
      dedicatedTo,
      prompt,
      genres,
      emotion,
      singerGender,
      favoriteMemory,      // NUEVO
      whatYouLikeMost,     // NUEVO
      userEmail,
      occasion,            // NUEVO
      language
    } = req.body;

    // Validaciones
    if (!prompt || prompt.trim().length < 10) {
      return res.status(400).json({
        error: 'El prompt debe tener al menos 10 caracteres'
      });
    }

    if (!genres || genres.length === 0) {
      return res.status(400).json({
        error: 'Debe seleccionar al menos un género musical'
      });
    }

    // Crear item en el carrito con precio dinámico
    const cartItem = await storage.addToCart({
      userId,
      dedicatedTo,
      prompt,
      genres,
      emotion,
      singerGender: singerGender || 'male',
      favoriteMemory: favoriteMemory || null,      // NUEVO
      whatYouLikeMost: whatYouLikeMost || null,    // NUEVO
      userEmail: userEmail || null,                // NUEVO
      occasion: occasion || null,                  // NUEVO
      language: language || 'en',
      status: 'draft',
      price: getPriceInDollars('CUSTOM_SONG') // Precio dinámico desde configuración
    });

    return res.status(201).json(cartItem);
  } catch (error) {
    console.error('Error al agregar al carrito:', error);
    return res.status(500).json({
      error: 'Error al agregar la canción al carrito'
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
    
    if (isNaN(cartItemId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de item inválido',
      });
    }

    // Generar letras para el cart item
    const updatedCartItem = await storage.generateLyricsForCartItem(cartItemId);

    return res.json({
      success: true,
      lyrics: updatedCartItem.lyrics,
      cartItem: updatedCartItem,
      message: 'Letras generadas exitosamente',
    });
  } catch (error) {
    console.error('Error generating preview:', error);
    const message = error instanceof Error ? error.message : 'Error generando letras';
    return res.status(500).json({
      success: false,
      message,
    });
  }
};

export const updateLyrics = async (req, res) => {
  try {
    const cartItemId = parseInt(req.params.id);
    const { lyrics } = req.body;
    const userId = req.user.id;

    // Validar que se envíen las letras
    if (!lyrics || typeof lyrics !== 'string' || lyrics.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Las letras son requeridas y deben ser un texto válido"
      });
    }

    // Verificar que el item existe y pertenece al usuario
    const cartItem = await storage.getCartItemById(cartItemId);
    
    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: "Item no encontrado en el carrito"
      });
    }

    if (cartItem.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: "No tienes permiso para editar este item"
      });
    }

    // Actualizar las letras
    const updatedItem = await storage.updateCartItemLyrics(cartItemId, lyrics);

    return res.status(200).json({
      success: true,
      message: "Letras actualizadas exitosamente",
      cartItem: updatedItem
    });

  } catch (error) {
    console.error("Error actualizando letras:", error);
    return res.status(500).json({
      success: false,
      message: "Error al actualizar las letras",
      error: error.message
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

  export const clearCart =  async (req, res) => {
    try {
      await storage.clearCart(req.user.id);
      
      res.json({ 
        success: true, 
        message: "Carrito vaciado exitosamente" 
      });
    } catch (error) {
      console.error("Error clearing cart:", error);
      res.status(500).json({ 
        success: false, 
        message: "Error vaciando el carrito" 
      });
    }
  };

// POST /api/cart/checkout - Crea una Stripe Checkout Session
export const checkoutCart = async (req, res) => {
  try {
    console.log('🔵 [BACKEND] POST /cart/checkout llamado para userId:', req.user.id);
    const { locale } = req.body; // Recibir idioma del frontend
    const stripeLocale = locale || 'auto'; // Usar 'auto' si no se proporciona

    // 🚫 Headers anti-caché para prevenir que el navegador use respuestas viejas
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    const cartItems = await storage.getUserCartItems(req.user.id);
    if (cartItems.length === 0) {
      console.log('❌ [BACKEND] Carrito vacío');
      return res.status(400).json({
        success: false,
        message: 'El carrito está vacío',
      });
    }

    console.log('🔵 [BACKEND] Items en carrito:', cartItems.length);

    // Calcular total dinámicamente
    const { cents: totalInCents, dollars: totalInDollars, currency, itemCount } = calculateTotal(cartItems, 'CUSTOM_SONG');
    console.log(`🔵 [BACKEND] Total calculado: ${totalInDollars} ${currency.toUpperCase()} (${itemCount} items)`);

    // Preparar line_items para Stripe Checkout
    const lineItems = cartItems.map(item => {
      // Extraer información relevante para el nombre del producto
      const songDescription = item.dedicatedTo
        ? `Song dedicated to ${item.dedicatedTo}`
        : 'Custom AI-generated song';

      const genres = Array.isArray(item.genres) ? item.genres.join(', ') : 'Various';

      return {
        price_data: {
          currency: currency,
          unit_amount: getPriceInCents('CUSTOM_SONG'), // Precio dinámico
          product_data: {
            name: STRIPE_CONFIG.products.CUSTOM_SONG.name,
            description: `${songDescription} (${genres})`,
            metadata: {
              cartItemId: item.id.toString(),
              genres: genres,
              singerGender: item.singerGender || 'male',
              language: item.language || 'en'
            }
          }
        },
        locale: stripeLocale,
        quantity: 1
      };
    });

    // Metadata para rastrear el checkout
    const cartItemIds = cartItems.map(i => i.id).sort().join(',');
    const metadata = {
      type: 'cart_checkout',
      cartItemIds,
      userId: req.user.id.toString(),
      itemCount: itemCount.toString(),
      createdAt: new Date().toISOString(),
    };

    // Agregar email del usuario si está disponible
    const customerEmail = req.user.email || cartItems.find(item => item.userEmail)?.userEmail;

    // Crear Stripe Checkout Session
    console.log('🔵 [BACKEND] Creando Stripe Checkout Session...');

    const sessionParams = {
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: STRIPE_CONFIG.checkout.mode,
      success_url: STRIPE_CONFIG.checkout.successUrl,
      cancel_url: STRIPE_CONFIG.checkout.cancelUrl,
      metadata,
      locale: stripeLocale,
      allow_promotion_codes: STRIPE_CONFIG.checkout.allowPromotionCodes,
      // Configuración de expiración (24 horas)
      expires_at: Math.floor(Date.now() / 1000) + (24 * 60 * 60),
    };

    // Agregar email si existe
    if (customerEmail) {
      sessionParams.customer_email = customerEmail;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log('✅ [BACKEND] Checkout Session creado exitosamente:', session.id);
    console.log('🔍 [BACKEND] Session URL:', session.url);

    return res.json({
      success: true,
      sessionId: session.id,
      sessionUrl: session.url, // URL para redirigir al usuario
      totalAmount: totalInDollars,
      currency: currency.toUpperCase(),
      itemCount,
      cartItems: cartItems.map(item => ({
        id: item.id,
        dedicatedTo: item.dedicatedTo,
        genres: item.genres,
        price: item.price
      }))
    });
  } catch (error) {
    console.error('❌ [BACKEND] Error creating checkout session:', error);
    console.error('❌ [BACKEND] Error type:', error.type);
    console.error('❌ [BACKEND] Error message:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error procesando checkout del carrito: ' + error.message,
      errorType: error.type,
    });
  }
};

