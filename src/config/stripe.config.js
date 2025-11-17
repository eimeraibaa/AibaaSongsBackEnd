/**
 * Stripe Configuration
 * Centralized configuration for Stripe products, prices, and checkout settings
 */

export const STRIPE_CONFIG = {
  // Product Configuration
  products: {
    CUSTOM_SONG: {
      name: 'Custom AI Song',
      description: 'Personalized AI-generated song with custom lyrics',
      metadata: {
        type: 'custom_song',
      }
    }
  },

  // Price Configuration (in cents)
  prices: {
    CUSTOM_SONG: {
      amount: 2999, // $29.99 in cents
      currency: 'usd',
      name: 'Standard Song Price'
    },
    // Add more price tiers if needed in the future
    CUSTOM_SONG_PREMIUM: {
      amount: 4999, // $49.99 in cents
      currency: 'usd',
      name: 'Premium Song Price'
    }
  },

  // Checkout Configuration
  checkout: {
    successUrl: process.env.FRONTEND_URL
      ? `${process.env.FRONTEND_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`
      : 'http://localhost:3000/checkout/success?session_id={CHECKOUT_SESSION_ID}',
    cancelUrl: process.env.FRONTEND_URL
      ? `${process.env.FRONTEND_URL}/checkout/cancel`
      : 'http://localhost:3000/checkout/cancel',
    mode: 'payment',
    allowPromotionCodes: true, // Enable promo codes
  },

  // Webhook Events to Handle
  webhookEvents: {
    CHECKOUT_SESSION_COMPLETED: 'checkout.session.completed',
    PAYMENT_INTENT_SUCCEEDED: 'payment_intent.succeeded',
    PAYMENT_INTENT_FAILED: 'payment_intent.payment_failed',
  }
};

/**
 * Get price in dollars (for display)
 * @param {string} priceKey - Key from STRIPE_CONFIG.prices
 * @returns {string} Price formatted as dollars (e.g., "29.99")
 */
export const getPriceInDollars = (priceKey = 'CUSTOM_SONG') => {
  const price = STRIPE_CONFIG.prices[priceKey];
  if (!price) {
    throw new Error(`Price key "${priceKey}" not found in configuration`);
  }
  return (price.amount / 100).toFixed(2);
};

/**
 * Get price in cents (for Stripe API)
 * @param {string} priceKey - Key from STRIPE_CONFIG.prices
 * @returns {number} Price in cents
 */
export const getPriceInCents = (priceKey = 'CUSTOM_SONG') => {
  const price = STRIPE_CONFIG.prices[priceKey];
  if (!price) {
    throw new Error(`Price key "${priceKey}" not found in configuration`);
  }
  return price.amount;
};

/**
 * Get currency for a price
 * @param {string} priceKey - Key from STRIPE_CONFIG.prices
 * @returns {string} Currency code (e.g., "usd")
 */
export const getCurrency = (priceKey = 'CUSTOM_SONG') => {
  const price = STRIPE_CONFIG.prices[priceKey];
  if (!price) {
    throw new Error(`Price key "${priceKey}" not found in configuration`);
  }
  return price.currency;
};

/**
 * Calculate total amount for cart items
 * @param {Array} cartItems - Array of cart items
 * @param {string} priceKey - Price key to use for calculation
 * @returns {Object} Object with amount in cents and dollars
 */
export const calculateTotal = (cartItems, priceKey = 'CUSTOM_SONG') => {
  const itemCount = Array.isArray(cartItems) ? cartItems.length : 0;
  const priceInCents = getPriceInCents(priceKey);
  const totalInCents = itemCount * priceInCents;

  return {
    cents: totalInCents,
    dollars: (totalInCents / 100).toFixed(2),
    currency: getCurrency(priceKey),
    itemCount
  };
};

module.exports = {
  STRIPE_CONFIG,
  getPriceInDollars,
  getPriceInCents,
  getCurrency,
  calculateTotal
};
