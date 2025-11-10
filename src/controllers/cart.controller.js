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

    // Crear item en el carrito
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
      price: 29.99
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

// POST /api/cart/checkout
export const checkoutCart = async (req, res) => {
  try {
    console.log('🔵 [BACKEND] POST /cart/checkout llamado para userId:', req.user.id);

    const cartItems = await storage.getUserCartItems(req.user.id);
    if (cartItems.length === 0) {
      console.log('❌ [BACKEND] Carrito vacío');
      return res.status(400).json({
        success: false,
        message: 'El carrito está vacío',
      });
    }

    console.log('🔵 [BACKEND] Items en carrito:', cartItems.length);

    // Asumimos que cada item tiene un campo `price` en string o number
    const totalAmount = cartItems.reduce((sum, item) => {
      const price = typeof item.price === 'string' ? parseFloat(item.price) : item.price;
      return sum + price;
    }, 0);

    // 🔧 IDEMPOTENCIA: Crear clave única basada en el contenido del carrito
    const cartItemIds = cartItems.map(i => i.id).sort().join(',');
    const idempotencyKey = `cart_${req.user.id}_${cartItemIds}`;

    console.log('🔵 [BACKEND] Idempotency key:', idempotencyKey);

    // Buscar si ya existe un PaymentIntent para este carrito
    try {
      const existingIntents = await stripe.paymentIntents.list({
        limit: 10,
      });

      // Filtrar por metadata que coincida con este carrito
      const matchingIntent = existingIntents.data.find(pi =>
        pi.metadata.cartItemIds === cartItemIds &&
        pi.metadata.userId === req.user.id.toString() &&
        pi.metadata.type === 'cart_checkout' &&
        // Solo reutilizar si está en estado requires_confirmation (pendiente de confirmación)
        // Excluimos succeeded, canceled, requires_payment_method (falló), processing, etc.
        pi.status === 'requires_confirmation'
      );

      if (matchingIntent) {
        console.log('✅ [BACKEND] PaymentIntent existente encontrado (reutilizando):', matchingIntent.id, 'status:', matchingIntent.status);
        return res.json({
          success: true,
          clientSecret: matchingIntent.client_secret,
          totalAmount,
          cartItems,
          reused: true, // Flag para debugging
        });
      } else {
        console.log('🔵 [BACKEND] No hay PaymentIntent reutilizable, creando nuevo');
      }
    } catch (searchError) {
      console.error('⚠️ [BACKEND] Error buscando PaymentIntents existentes:', searchError.message);
      // Continuar creando uno nuevo si la búsqueda falla
    }

    // Crear nuevo PaymentIntent
    console.log('🔵 [BACKEND] Creando NUEVO PaymentIntent');
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100),
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      metadata: {
        type: 'cart_checkout',
        cartItemIds,
        userId: req.user.id.toString(),
        createdAt: new Date().toISOString(),
      },
    });

    console.log('✅ [BACKEND] PaymentIntent creado exitosamente:', paymentIntent.id);

    return res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      totalAmount,
      cartItems,
      reused: false, // Flag para debugging
    });
  } catch (error) {
    console.error('❌ [BACKEND] Error creating cart checkout:', error);
    return res.status(500).json({
      success: false,
      message: 'Error procesando checkout del carrito: ' + error.message,
    });
  }
};

