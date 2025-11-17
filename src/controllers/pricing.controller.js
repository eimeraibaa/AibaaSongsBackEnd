/**
 * Pricing Controller
 * Endpoints para obtener configuración de precios para el frontend
 */

import {
  STRIPE_CONFIG,
  getPriceInDollars,
  getPriceInCents,
  getCurrency
} from '../config/stripe.config.js';

/**
 * GET /api/pricing/config
 * Obtiene la configuración de precios para mostrar en el frontend
 * No requiere autenticación - información pública
 */
export const getPricingConfig = async (req, res) => {
  try {
    // Construir respuesta con información de precios
    const pricingConfig = {
      products: {
        customSong: {
          name: STRIPE_CONFIG.products.CUSTOM_SONG.name,
          description: STRIPE_CONFIG.products.CUSTOM_SONG.description,
          price: {
            amount: getPriceInDollars('CUSTOM_SONG'),
            currency: getCurrency('CUSTOM_SONG').toUpperCase(),
            formatted: `$${getPriceInDollars('CUSTOM_SONG')} ${getCurrency('CUSTOM_SONG').toUpperCase()}`
          }
        }
      },
      checkout: {
        allowPromotionCodes: STRIPE_CONFIG.checkout.allowPromotionCodes
      }
    };

    return res.json({
      success: true,
      data: pricingConfig
    });

  } catch (error) {
    console.error('Error obteniendo configuración de precios:', error);
    return res.status(500).json({
      success: false,
      message: 'Error obteniendo configuración de precios',
      error: error.message
    });
  }
};

/**
 * POST /api/pricing/calculate
 * Calcula el total para un conjunto de items
 * Útil para mostrar el precio total antes del checkout
 * Body: { itemCount: number }
 */
export const calculateCartTotal = async (req, res) => {
  try {
    const { itemCount } = req.body;

    if (!itemCount || itemCount < 1) {
      return res.status(400).json({
        success: false,
        message: 'itemCount debe ser mayor a 0'
      });
    }

    const pricePerItem = getPriceInDollars('CUSTOM_SONG');
    const total = (parseFloat(pricePerItem) * itemCount).toFixed(2);
    const currency = getCurrency('CUSTOM_SONG').toUpperCase();

    return res.json({
      success: true,
      data: {
        itemCount,
        pricePerItem: pricePerItem,
        total: total,
        currency: currency,
        formatted: `$${total} ${currency}`
      }
    });

  } catch (error) {
    console.error('Error calculando total:', error);
    return res.status(500).json({
      success: false,
      message: 'Error calculando total',
      error: error.message
    });
  }
};
