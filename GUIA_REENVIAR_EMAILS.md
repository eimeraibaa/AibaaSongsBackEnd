# Guía para Reenviar Correos de Órdenes

## 🎯 Endpoint para Reenviar Correos

Ya existe un endpoint listo para reenviar correos de órdenes completadas.

### 📡 Endpoint

```
POST https://aibaasongsbackend-production.up.railway.app/webhook/test-email/:orderId
```

### 🔧 Cómo Usar

#### Opción 1: Usando curl (Terminal)

```bash
curl -X POST https://aibaasongsbackend-production.up.railway.app/webhook/test-email/27
```

Reemplaza `27` con el ID de tu orden.

#### Opción 2: Usando un navegador (Extensión REST Client)

1. Instala una extensión como "REST Client" o "Postman"
2. Haz un POST request a:
   ```
   POST https://aibaasongsbackend-production.up.railway.app/webhook/test-email/27
   ```

#### Opción 3: Usando JavaScript (Consola del navegador)

```javascript
fetch('https://aibaasongsbackend-production.up.railway.app/webhook/test-email/27', {
  method: 'POST'
})
.then(r => r.json())
.then(console.log);
```

#### Opción 4: Crear un formulario HTML simple

Guarda esto como `reenviar-email.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Reenviar Email de Orden</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 500px;
      margin: 50px auto;
      padding: 20px;
    }
    input, button {
      font-size: 16px;
      padding: 10px;
      margin: 10px 0;
      width: 100%;
    }
    button {
      background: #e69216;
      color: white;
      border: none;
      cursor: pointer;
      border-radius: 5px;
    }
    button:hover {
      background: #d67d0a;
    }
    #resultado {
      margin-top: 20px;
      padding: 15px;
      border-radius: 5px;
      display: none;
    }
    .exito {
      background: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }
    .error {
      background: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
    }
  </style>
</head>
<body>
  <h1>🔄 Reenviar Email de Orden</h1>
  <p>Ingresa el ID de la orden para reenviar el correo con las canciones:</p>

  <input type="number" id="orderId" placeholder="Ej: 27" min="1">
  <button onclick="reenviarEmail()">📧 Reenviar Email</button>

  <div id="resultado"></div>

  <script>
    async function reenviarEmail() {
      const orderId = document.getElementById('orderId').value;
      const resultado = document.getElementById('resultado');

      if (!orderId) {
        mostrarResultado('Por favor ingresa un ID de orden', false);
        return;
      }

      resultado.textContent = '⏳ Enviando...';
      resultado.className = '';
      resultado.style.display = 'block';

      try {
        const response = await fetch(
          `https://aibaasongsbackend-production.up.railway.app/webhook/test-email/${orderId}`,
          { method: 'POST' }
        );

        const data = await response.json();

        if (data.success) {
          mostrarResultado(
            `✅ Email reenviado exitosamente a ${data.email || 'usuario'}!\n` +
            `Canciones enviadas: ${data.songsCount || 0}`,
            true
          );
        } else {
          mostrarResultado(`❌ Error: ${data.message || 'Error desconocido'}`, false);
        }
      } catch (error) {
        mostrarResultado(`❌ Error de conexión: ${error.message}`, false);
      }
    }

    function mostrarResultado(mensaje, esExito) {
      const resultado = document.getElementById('resultado');
      resultado.textContent = mensaje;
      resultado.className = esExito ? 'exito' : 'error';
      resultado.style.display = 'block';
    }

    // Permitir Enter para enviar
    document.getElementById('orderId').addEventListener('keypress', function(e) {
      if (e.key === 'Enter') reenviarEmail();
    });
  </script>
</body>
</html>
```

## 📋 Respuestas del Endpoint

### Éxito
```json
{
  "success": true,
  "message": "Email enviado exitosamente",
  "email": "usuario@ejemplo.com",
  "orderId": 27,
  "songsCount": 2
}
```

### Error - Orden no encontrada
```json
{
  "success": false,
  "message": "Orden no encontrada"
}
```

### Error - Sin canciones
```json
{
  "success": false,
  "message": "No hay canciones en esta orden"
}
```

### Error - Sin canciones completadas
```json
{
  "success": false,
  "message": "No hay canciones completadas en esta orden"
}
```

## 🔍 Cómo Encontrar el Order ID

1. **En los logs del servidor** (Railway):
   - Busca líneas que digan `"Order ID: XX"`
   - O busca `"Orden creada: ID XX"`

2. **En la base de datos**:
   ```sql
   SELECT id, "userEmail", "totalAmount", status, "createdAt"
   FROM orders
   ORDER BY "createdAt" DESC
   LIMIT 10;
   ```

3. **Por email del usuario**:
   ```sql
   SELECT id FROM orders WHERE "userEmail" = 'usuario@ejemplo.com';
   ```

## ⚠️ Notas Importantes

- El correo solo se enviará si hay canciones **completadas** en la orden
- El email se envía a la dirección configurada en la orden
- Si una orden tiene canciones en estado "generating", el endpoint dará error
- Puedes ejecutar este endpoint múltiples veces sin problema

## 🐛 Troubleshooting

### "Email no llega"
1. Verifica que el email en la orden sea correcto
2. Revisa la carpeta de spam
3. Algunos clientes de email bloquean imágenes externas por defecto

### "No hay canciones completadas"
1. Verifica el estado de las canciones: `node diagnose-order.js <orderId>`
2. Espera a que Suno complete la generación
3. Revisa los logs del webhook de Suno

### "Orden no encontrada"
1. Verifica que el Order ID sea correcto
2. Asegúrate de estar usando la base de datos correcta (producción vs desarrollo)
