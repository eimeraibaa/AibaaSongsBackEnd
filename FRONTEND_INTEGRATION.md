# Guía de Integración de Stripe Checkout para el Frontend

## 📋 Resumen de Cambios

El backend ahora utiliza **Stripe Checkout Sessions** con precios dinámicos en lugar de PaymentIntents hardcoded. Esto proporciona:

✅ Precios centralizados y configurables
✅ Interfaz de checkout hosteada por Stripe (más segura y mantenible)
✅ Soporte para códigos promocionales
✅ Mejor experiencia de usuario

---

## 🔄 Cambios en el Flujo de Checkout

### ❌ Flujo Anterior (DEPRECADO)

```javascript
// ANTIGUO - Ya no usar
const response = await fetch('/cart/checkout', {
  method: 'POST',
  credentials: 'include'
});

const { clientSecret } = await response.json();

// Usar Stripe Elements con clientSecret
const stripe = await loadStripe(STRIPE_PUBLIC_KEY);
const { error } = await stripe.confirmCardPayment(clientSecret, {
  payment_method: { card: cardElement }
});
```

### ✅ Flujo Nuevo (RECOMENDADO)

```javascript
// NUEVO - Usar este flujo
const response = await fetch('/cart/checkout', {
  method: 'POST',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json'
  }
});

const { sessionUrl, sessionId } = await response.json();

// Redirigir al usuario al Checkout de Stripe
window.location.href = sessionUrl;
```

---

## 🎯 Endpoints Disponibles

### 1. Obtener Configuración de Precios

**GET** `/pricing/config`

Obtiene los precios actuales y configuración del producto.

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "products": {
      "customSong": {
        "name": "Custom AI Song",
        "description": "Personalized AI-generated song with custom lyrics",
        "price": {
          "amount": "29.99",
          "currency": "USD",
          "formatted": "$29.99 USD"
        }
      }
    },
    "checkout": {
      "allowPromotionCodes": true
    }
  }
}
```

**Ejemplo de uso:**
```javascript
// Al cargar la página del carrito o checkout
async function loadPricing() {
  const response = await fetch('/pricing/config');
  const { data } = await response.json();

  // Mostrar precio en la UI
  const price = data.products.customSong.price.formatted;
  document.getElementById('price').textContent = price;
}
```

---

### 2. Calcular Total del Carrito

**POST** `/pricing/calculate`

Calcula el total basado en el número de items.

**Request Body:**
```json
{
  "itemCount": 3
}
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "itemCount": 3,
    "pricePerItem": "29.99",
    "total": "89.97",
    "currency": "USD",
    "formatted": "$89.97 USD"
  }
}
```

**Ejemplo de uso:**
```javascript
async function calculateTotal(cartItems) {
  const response = await fetch('/pricing/calculate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ itemCount: cartItems.length })
  });

  const { data } = await response.json();
  return data.total;
}
```

---

### 3. Crear Checkout Session

**POST** `/cart/checkout`

Crea una sesión de checkout y retorna la URL de Stripe Checkout.

**Requiere:** Usuario autenticado (cookie de sesión)

**Respuesta:**
```json
{
  "success": true,
  "sessionId": "cs_test_xxx...",
  "sessionUrl": "https://checkout.stripe.com/c/pay/cs_test_xxx...",
  "totalAmount": "89.97",
  "currency": "USD",
  "itemCount": 3,
  "cartItems": [
    {
      "id": 1,
      "dedicatedTo": "John",
      "genres": ["pop", "rock"],
      "price": "29.99"
    }
  ]
}
```

**Ejemplo de uso completo:**
```javascript
async function handleCheckout() {
  try {
    // Mostrar loading
    setLoading(true);

    // Crear checkout session
    const response = await fetch('/cart/checkout', {
      method: 'POST',
      credentials: 'include', // Importante para enviar cookies de autenticación
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error en checkout');
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'Error creando checkout');
    }

    // Redirigir al Stripe Checkout
    window.location.href = data.sessionUrl;

  } catch (error) {
    console.error('Error en checkout:', error);
    alert(error.message);
    setLoading(false);
  }
}
```

---

## 🌐 Configuración de URLs de Redirección

Las URLs de éxito y cancelación se configuran en el backend usando la variable de entorno `FRONTEND_URL`.

### Variables de Entorno Requeridas

En tu archivo `.env` del backend:

```env
# URL del frontend (sin barra final)
FRONTEND_URL=http://localhost:5173

# En producción:
# FRONTEND_URL=https://tu-dominio.com
```

### Páginas que Necesitas Crear en el Frontend

#### 1. Página de Éxito - `/checkout/success`

Esta página se muestra después de un pago exitoso.

**Query parameters disponibles:**
- `session_id`: ID de la sesión de Stripe (para verificación adicional si es necesario)

```javascript
// pages/checkout/success.jsx
import { useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';

export default function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [orderDetails, setOrderDetails] = useState(null);

  useEffect(() => {
    // El webhook ya procesó el pago y creó la orden
    // Puedes mostrar un mensaje de éxito genérico
    // O hacer un fetch a /orders/getUserOrders para mostrar los detalles

    async function loadOrders() {
      const response = await fetch('/orders/getUserOrders', {
        credentials: 'include'
      });
      const data = await response.json();
      // Mostrar la orden más reciente
      if (data.length > 0) {
        setOrderDetails(data[0]);
      }
    }

    loadOrders();
  }, []);

  return (
    <div className="success-page">
      <h1>¡Pago Exitoso! 🎉</h1>
      <p>Tu orden ha sido procesada correctamente.</p>
      <p>Recibirás un email cuando tus canciones estén listas.</p>
      {orderDetails && (
        <div>
          <h2>Detalles de tu Orden</h2>
          <p>Orden #: {orderDetails.id}</p>
          <p>Total: ${orderDetails.totalAmount}</p>
        </div>
      )}
      <button onClick={() => window.location.href = '/orders'}>
        Ver Mis Órdenes
      </button>
    </div>
  );
}
```

#### 2. Página de Cancelación - `/checkout/cancel`

Esta página se muestra si el usuario cancela el pago.

```javascript
// pages/checkout/cancel.jsx
export default function CheckoutCancel() {
  return (
    <div className="cancel-page">
      <h1>Pago Cancelado</h1>
      <p>No se ha realizado ningún cargo a tu tarjeta.</p>
      <p>Tu carrito sigue disponible.</p>
      <button onClick={() => window.location.href = '/cart'}>
        Volver al Carrito
      </button>
    </div>
  );
}
```

---

## 🎨 Ejemplo de Interfaz de Carrito

```javascript
// components/Cart.jsx
import { useState, useEffect } from 'react';

export default function Cart() {
  const [cartItems, setCartItems] = useState([]);
  const [pricing, setPricing] = useState(null);
  const [total, setTotal] = useState('0.00');
  const [loading, setLoading] = useState(false);

  // Cargar configuración de precios al montar
  useEffect(() => {
    async function loadPricing() {
      const response = await fetch('/pricing/config');
      const { data } = await response.json();
      setPricing(data);
    }
    loadPricing();
  }, []);

  // Cargar items del carrito
  useEffect(() => {
    async function loadCart() {
      const response = await fetch('/cart/getCart', {
        credentials: 'include'
      });
      const items = await response.json();
      setCartItems(items);

      // Calcular total
      if (items.length > 0) {
        const calcResponse = await fetch('/pricing/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemCount: items.length })
        });
        const { data } = await calcResponse.json();
        setTotal(data.formatted);
      }
    }
    loadCart();
  }, []);

  async function handleCheckout() {
    setLoading(true);

    try {
      const response = await fetch('/cart/checkout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (data.success) {
        // Redirigir a Stripe Checkout
        window.location.href = data.sessionUrl;
      } else {
        alert(data.message || 'Error en checkout');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error procesando el checkout');
      setLoading(false);
    }
  }

  if (!pricing) {
    return <div>Cargando...</div>;
  }

  return (
    <div className="cart">
      <h1>Tu Carrito</h1>

      {cartItems.length === 0 ? (
        <p>Tu carrito está vacío</p>
      ) : (
        <>
          <div className="cart-items">
            {cartItems.map(item => (
              <div key={item.id} className="cart-item">
                <h3>Canción para: {item.dedicatedTo}</h3>
                <p>Géneros: {item.genres.join(', ')}</p>
                <p className="price">
                  {pricing.products.customSong.price.formatted}
                </p>
              </div>
            ))}
          </div>

          <div className="cart-summary">
            <p>Items: {cartItems.length}</p>
            <p className="total">Total: {total}</p>

            <button
              onClick={handleCheckout}
              disabled={loading}
              className="checkout-button"
            >
              {loading ? 'Procesando...' : 'Proceder al Pago'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
```

---

## 🔐 Seguridad

### Autenticación

Todos los endpoints de checkout requieren que el usuario esté autenticado:

```javascript
// Asegúrate de incluir credentials: 'include' en todas las peticiones
fetch('/cart/checkout', {
  method: 'POST',
  credentials: 'include', // Envía las cookies de sesión
  headers: {
    'Content-Type': 'application/json'
  }
});
```

### CORS

El backend está configurado para aceptar requests con credenciales desde cualquier origen en desarrollo. En producción, asegúrate de configurar `FRONTEND_URL` correctamente.

---

## ⚙️ Variables de Entorno del Frontend

Asegúrate de configurar estas variables en tu frontend:

```env
# .env del frontend
VITE_API_URL=http://localhost:3000
VITE_STRIPE_PUBLIC_KEY=pk_test_xxx... # NO es necesario si usas Checkout Sessions
```

**Nota:** Con Stripe Checkout Sessions, NO necesitas cargar Stripe.js en tu frontend. Stripe maneja toda la interfaz de pago.

---

## 🧪 Testing

### 1. Test de Precios

```bash
curl http://localhost:3000/pricing/config
```

### 2. Test de Cálculo

```bash
curl -X POST http://localhost:3000/pricing/calculate \
  -H "Content-Type: application/json" \
  -d '{"itemCount": 3}'
```

### 3. Test de Checkout (requiere autenticación)

```bash
# Primero inicia sesión en tu app
# Luego:
curl -X POST http://localhost:3000/cart/checkout \
  -H "Content-Type: application/json" \
  -H "Cookie: tu-cookie-de-sesion" \
  --include
```

---

## 🐛 Troubleshooting

### Error: "El carrito está vacío"

**Causa:** El usuario no tiene items en el carrito.
**Solución:** Asegúrate de que el usuario agregó items al carrito antes de hacer checkout.

### Error: Unauthorized/No autenticado

**Causa:** El usuario no está logueado o las cookies no se están enviando.
**Solución:**
- Verifica que `credentials: 'include'` esté en el fetch
- Asegúrate de que el usuario haya iniciado sesión
- Verifica la configuración de CORS

### El checkout no redirecciona

**Causa:** `sessionUrl` no está definido o hay un error en la respuesta.
**Solución:**
- Verifica la respuesta del endpoint en DevTools
- Asegúrate de que `FRONTEND_URL` esté configurado en el backend
- Revisa los logs del servidor

### Webhook no se dispara

**Causa:** El webhook de Stripe no está configurado correctamente.
**Solución:**
- En desarrollo: Usa Stripe CLI para forward webhooks
- En producción: Configura el webhook en el Dashboard de Stripe apuntando a `https://tu-dominio.com/webhook/stripe`
- Asegúrate de que `STRIPE_WEBHOOK_SECRET` esté configurado

---

## 📚 Recursos Adicionales

- [Stripe Checkout Documentation](https://stripe.com/docs/payments/checkout)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe Testing Cards](https://stripe.com/docs/testing)

### Tarjetas de Prueba de Stripe

Para testing en modo test:

- **Éxito:** `4242 4242 4242 4242`
- **Requiere autenticación:** `4000 0025 0000 3155`
- **Falla:** `4000 0000 0000 9995`

**CVV:** Cualquier 3 dígitos
**Fecha:** Cualquier fecha futura
**ZIP:** Cualquier 5 dígitos

---

## 📞 Soporte

Si tienes problemas con la integración:

1. Verifica los logs del servidor backend
2. Revisa la consola del navegador (Network tab)
3. Asegúrate de que todas las variables de entorno estén configuradas
4. Verifica que el webhook de Stripe esté funcionando

---

**¡Listo!** Tu frontend ahora puede usar el sistema dinámico de Stripe Checkout 🎉
