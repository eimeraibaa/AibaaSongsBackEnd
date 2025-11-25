# Guía de Implementación Backend - Sistema de Feedback y Compartir Canciones

## 📋 Resumen

Esta guía describe los endpoints y la lógica necesaria en el backend para implementar el sistema de feedback de canciones y el sistema mejorado de compartir con landing pages públicas.

## 🗄️ Cambios en la Base de Datos

### 1. Ejecutar Migraciones

Las nuevas tablas ya están definidas en `/shared/schema.ts`. Necesitas crear y ejecutar las migraciones:

```bash
# Generar migración
npm run db:generate

# Ejecutar migración
npm run db:migrate
```

### 2. Tablas Nuevas

#### `song_feedback`
Almacena las opiniones y calificaciones de las canciones.

```typescript
{
  id: serial,
  songId: integer,           // ID de la canción (OrderItem o Song)
  shareToken: varchar,       // Token único si viene de URL compartida
  name: varchar,             // Nombre de quien da feedback (opcional)
  email: varchar,            // Email (opcional)
  rating: integer,           // Calificación 1-5
  comment: text,             // Comentario (opcional)
  createdAt: timestamp
}
```

#### `shared_songs`
Gestiona los enlaces únicos para compartir canciones.

```typescript
{
  id: serial,
  songId: integer,           // ID de la canción a compartir
  userId: varchar,           // Quien compartió
  shareToken: varchar,       // Token único (UUID o nanoid)
  title: varchar,            // Título personalizado
  message: text,             // Mensaje personalizado
  viewCount: integer,        // Contador de vistas
  feedbackCount: integer,    // Contador de feedback
  isActive: boolean,         // Permite deshabilitar
  expiresAt: timestamp,      // Fecha de expiración (opcional)
  createdAt: timestamp,
  updatedAt: timestamp
}
```

---

## 🔌 Endpoints a Implementar

### 1. POST `/api/feedback`
**Descripción:** Crear una nueva opinión/feedback para una canción

**Autenticación:** No requerida (público)

**Body:**
```json
{
  "songId": 123,
  "shareToken": "abc123xyz",  // Opcional
  "name": "Juan Pérez",       // Opcional
  "email": "juan@email.com",  // Opcional
  "rating": 5,                // Requerido (1-5)
  "comment": "¡Me encantó!"   // Opcional
}
```

**Lógica:**
```typescript
async function createFeedback(req, res) {
  try {
    const { songId, shareToken, name, email, rating, comment } = req.body;

    // Validar rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        error: "Rating debe estar entre 1 y 5"
      });
    }

    // Insertar feedback en DB
    const feedback = await db.insert(songFeedback).values({
      songId,
      shareToken,
      name: name || null,
      email: email || null,
      rating,
      comment: comment || null,
      createdAt: new Date()
    }).returning();

    // Si hay shareToken, incrementar contador de feedback
    if (shareToken) {
      await db.update(sharedSongs)
        .set({
          feedbackCount: sql`${sharedSongs.feedbackCount} + 1`,
          updatedAt: new Date()
        })
        .where(eq(sharedSongs.shareToken, shareToken));
    }

    return res.status(201).json({
      success: true,
      feedback: feedback[0]
    });

  } catch (error) {
    console.error("Error creating feedback:", error);
    return res.status(500).json({
      error: "Error al guardar feedback"
    });
  }
}
```

**Response (201):**
```json
{
  "success": true,
  "feedback": {
    "id": 1,
    "songId": 123,
    "rating": 5,
    "comment": "¡Me encantó!",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### 2. POST `/api/shared-songs/create`
**Descripción:** Crear un enlace único para compartir una canción

**Autenticación:** Requerida (usuario debe estar logueado)

**Body:**
```json
{
  "songId": 123,
  "title": "Canción para María",
  "message": "🎵 Escucha esta canción creada especialmente para María"
}
```

**Lógica:**
```typescript
import { nanoid } from 'nanoid';
// o usar crypto: import { randomUUID } from 'crypto';

async function createSharedSong(req, res) {
  try {
    const userId = req.user.id; // De la sesión autenticada
    const { songId, title, message } = req.body;

    if (!songId) {
      return res.status(400).json({
        error: "songId es requerido"
      });
    }

    // Verificar que la canción pertenece al usuario
    // Primero buscar en la tabla songs
    let song = await db.query.songs.findFirst({
      where: eq(songs.id, songId)
    });

    // Si no se encuentra, buscar en orderItems
    if (!song) {
      const orderItem = await db.query.orderItems.findFirst({
        where: eq(orderItems.id, songId),
        with: {
          order: true
        }
      });

      if (!orderItem || orderItem.order.userId !== userId) {
        return res.status(403).json({
          error: "No tienes permiso para compartir esta canción"
        });
      }
    }

    // Generar token único
    const shareToken = nanoid(16); // o randomUUID()

    // Verificar si ya existe un enlace compartido para esta canción
    const existingShare = await db.query.sharedSongs.findFirst({
      where: and(
        eq(sharedSongs.songId, songId),
        eq(sharedSongs.userId, userId),
        eq(sharedSongs.isActive, true)
      )
    });

    let result;

    if (existingShare) {
      // Actualizar el existente
      result = await db.update(sharedSongs)
        .set({
          title: title || existingShare.title,
          message: message || existingShare.message,
          updatedAt: new Date()
        })
        .where(eq(sharedSongs.id, existingShare.id))
        .returning();
    } else {
      // Crear nuevo
      result = await db.insert(sharedSongs).values({
        songId,
        userId,
        shareToken,
        title: title || "Mi canción personalizada",
        message: message || null,
        viewCount: 0,
        feedbackCount: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
    }

    return res.status(201).json({
      success: true,
      shareToken: existingShare?.shareToken || result[0].shareToken,
      shareUrl: `/share/${existingShare?.shareToken || result[0].shareToken}`
    });

  } catch (error) {
    console.error("Error creating shared song:", error);
    return res.status(500).json({
      error: "Error al crear enlace de compartir"
    });
  }
}
```

**Response (201):**
```json
{
  "success": true,
  "shareToken": "abc123xyz456",
  "shareUrl": "/share/abc123xyz456"
}
```

---

### 3. GET `/api/shared-songs/:token`
**Descripción:** Obtener datos de una canción compartida (público)

**Autenticación:** No requerida

**URL:** `/api/shared-songs/abc123xyz456`

**Lógica:**
```typescript
async function getSharedSong(req, res) {
  try {
    const { token } = req.params;

    // Buscar enlace compartido
    const sharedSong = await db.query.sharedSongs.findFirst({
      where: and(
        eq(sharedSongs.shareToken, token),
        eq(sharedSongs.isActive, true)
      )
    });

    if (!sharedSong) {
      return res.status(404).json({
        error: "Canción no encontrada o enlace inválido"
      });
    }

    // Verificar expiración (si existe)
    if (sharedSong.expiresAt && new Date() > sharedSong.expiresAt) {
      return res.status(410).json({
        error: "Este enlace ha expirado"
      });
    }

    // Incrementar contador de vistas
    await db.update(sharedSongs)
      .set({
        viewCount: sql`${sharedSongs.viewCount} + 1`,
        updatedAt: new Date()
      })
      .where(eq(sharedSongs.id, sharedSong.id));

    // Obtener datos de la canción
    // Primero intentar desde la tabla songs
    let songData = await db.query.songs.findFirst({
      where: eq(songs.id, sharedSong.songId),
      with: {
        orderItem: true
      }
    });

    // Si no está en songs, buscar en orderItems directamente
    if (!songData) {
      songData = await db.query.orderItems.findFirst({
        where: eq(orderItems.id, sharedSong.songId)
      });
    }

    if (!songData) {
      return res.status(404).json({
        error: "Datos de la canción no encontrados"
      });
    }

    // Preparar respuesta
    const response = {
      id: sharedSong.id,
      songId: sharedSong.songId,
      title: sharedSong.title,
      message: sharedSong.message,
      audioUrl: songData.audioUrl || songData.finalUrl || songData.previewUrl,
      imageUrl: songData.imageUrl || null,
      dedicatedTo: songData.dedicatedTo || songData.OrderItem?.dedicatedTo,
      viewCount: sharedSong.viewCount + 1, // Incluir la vista actual
      feedbackCount: sharedSong.feedbackCount,
      createdAt: sharedSong.createdAt
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error("Error fetching shared song:", error);
    return res.status(500).json({
      error: "Error al cargar la canción"
    });
  }
}
```

**Response (200):**
```json
{
  "id": 1,
  "songId": 123,
  "title": "Canción para María",
  "message": "🎵 Escucha esta canción creada especialmente para María",
  "audioUrl": "https://storage.example.com/song123.mp3",
  "imageUrl": "https://storage.example.com/cover123.jpg",
  "dedicatedTo": "María",
  "viewCount": 42,
  "feedbackCount": 8,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

---

### 4. GET `/api/feedback/:songId` (Opcional)
**Descripción:** Obtener todos los feedbacks de una canción

**Autenticación:** Requerida (solo el dueño puede ver)

**URL:** `/api/feedback/123`

**Lógica:**
```typescript
async function getSongFeedback(req, res) {
  try {
    const userId = req.user.id;
    const { songId } = req.params;

    // Verificar que el usuario es dueño de la canción
    const song = await db.query.songs.findFirst({
      where: eq(songs.id, parseInt(songId)),
      with: {
        orderItem: {
          with: {
            order: true
          }
        }
      }
    });

    if (!song || song.orderItem.order.userId !== userId) {
      return res.status(403).json({
        error: "No tienes permiso para ver este feedback"
      });
    }

    // Obtener feedbacks
    const feedbacks = await db.query.songFeedback.findMany({
      where: eq(songFeedback.songId, parseInt(songId)),
      orderBy: desc(songFeedback.createdAt)
    });

    // Calcular estadísticas
    const stats = {
      totalFeedbacks: feedbacks.length,
      averageRating: feedbacks.length > 0
        ? feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length
        : 0,
      ratingDistribution: {
        5: feedbacks.filter(f => f.rating === 5).length,
        4: feedbacks.filter(f => f.rating === 4).length,
        3: feedbacks.filter(f => f.rating === 3).length,
        2: feedbacks.filter(f => f.rating === 2).length,
        1: feedbacks.filter(f => f.rating === 1).length,
      }
    };

    return res.status(200).json({
      feedbacks,
      stats
    });

  } catch (error) {
    console.error("Error fetching feedback:", error);
    return res.status(500).json({
      error: "Error al cargar feedback"
    });
  }
}
```

**Response (200):**
```json
{
  "feedbacks": [
    {
      "id": 1,
      "rating": 5,
      "comment": "¡Me encantó!",
      "name": "Juan Pérez",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "stats": {
    "totalFeedbacks": 15,
    "averageRating": 4.5,
    "ratingDistribution": {
      "5": 10,
      "4": 3,
      "3": 2,
      "2": 0,
      "1": 0
    }
  }
}
```

---

## 🔒 Consideraciones de Seguridad

### 1. Rate Limiting
Implementa límites de tasa para prevenir abuso:

```typescript
import rateLimit from 'express-rate-limit';

const feedbackLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 feedbacks por IP
  message: "Demasiados feedbacks, intenta más tarde"
});

app.post('/api/feedback', feedbackLimiter, createFeedback);
```

### 2. Validación de Inputs
Usa Zod para validar todos los inputs:

```typescript
import { z } from 'zod';

const feedbackSchema = z.object({
  songId: z.number().int().positive(),
  shareToken: z.string().optional(),
  name: z.string().max(100).optional(),
  email: z.string().email().optional(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional()
});

// En el endpoint
const validatedData = feedbackSchema.parse(req.body);
```

### 3. Sanitización
Sanitiza los comentarios para prevenir XSS:

```typescript
import sanitizeHtml from 'sanitize-html';

const sanitizedComment = sanitizeHtml(comment, {
  allowedTags: [], // No permitir HTML
  allowedAttributes: {}
});
```

### 4. CORS
Asegúrate de configurar CORS correctamente:

```typescript
import cors from 'cors';

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
```

---

## 📊 Índices Recomendados en Base de Datos

Para mejorar el rendimiento, crea estos índices:

```sql
-- Índice en shareToken para búsquedas rápidas
CREATE INDEX idx_shared_songs_token ON shared_songs(share_token);

-- Índice compuesto para búsquedas activas
CREATE INDEX idx_shared_songs_active ON shared_songs(share_token, is_active);

-- Índice en songId para obtener feedbacks
CREATE INDEX idx_song_feedback_song_id ON song_feedback(song_id);

-- Índice en shareToken para contar feedbacks de enlaces compartidos
CREATE INDEX idx_song_feedback_share_token ON song_feedback(share_token);
```

---

## 🧪 Testing

### Ejemplo de Test para POST /api/feedback

```typescript
describe('POST /api/feedback', () => {
  it('debería crear un feedback válido', async () => {
    const response = await request(app)
      .post('/api/feedback')
      .send({
        songId: 1,
        rating: 5,
        comment: 'Excelente canción'
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.feedback.rating).toBe(5);
  });

  it('debería rechazar rating inválido', async () => {
    const response = await request(app)
      .post('/api/feedback')
      .send({
        songId: 1,
        rating: 6 // Inválido
      });

    expect(response.status).toBe(400);
  });
});
```

---

## 📝 Variables de Entorno Necesarias

Agrega estas variables a tu `.env`:

```bash
# Frontend URL para CORS
FRONTEND_URL=http://localhost:5173

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/makeyrsong

# Session secret (si usas express-session)
SESSION_SECRET=your-secret-key-here
```

---

## 🚀 Deployment Checklist

Antes de hacer deploy:

- [ ] Ejecutar migraciones en producción
- [ ] Crear índices en base de datos
- [ ] Configurar rate limiting
- [ ] Validar todas las variables de entorno
- [ ] Probar endpoints con Postman/Insomnia
- [ ] Configurar monitoring para errores
- [ ] Configurar backup de base de datos
- [ ] Probar flujo completo:
  - [ ] Crear enlace compartido
  - [ ] Acceder a landing page público
  - [ ] Enviar feedback
  - [ ] Verificar contadores

---

## 📚 Recursos Adicionales

### Librerías Recomendadas

```json
{
  "dependencies": {
    "nanoid": "^5.0.0",           // Para generar tokens únicos
    "express-rate-limit": "^7.0.0", // Rate limiting
    "sanitize-html": "^2.11.0",   // Sanitización HTML
    "zod": "^3.22.0"              // Validación
  }
}
```

### Estructura de Archivos Sugerida

```
backend/
├── routes/
│   ├── feedback.routes.ts       // Rutas de feedback
│   └── sharedSongs.routes.ts    // Rutas de canciones compartidas
├── controllers/
│   ├── feedback.controller.ts   // Lógica de feedback
│   └── sharedSongs.controller.ts // Lógica de compartir
├── middleware/
│   ├── auth.middleware.ts       // Verificar autenticación
│   ├── rateLimiter.ts          // Rate limiting
│   └── validation.ts           // Validación con Zod
└── services/
    ├── feedback.service.ts      // Servicios de feedback
    └── sharedSongs.service.ts   // Servicios de compartir
```

---

## 🐛 Debugging

### Logs Importantes

Agrega logging estratégico:

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// En los endpoints
logger.info('Feedback created', { songId, rating, userId });
logger.error('Error creating shared link', { error, userId });
```

---

## 💡 Mejoras Futuras Opcionales

1. **Analytics avanzados**: Rastrear de dónde vienen las vistas (país, dispositivo)
2. **Notificaciones**: Email al creador cuando recibe feedback
3. **Moderación**: Sistema para reportar feedback inapropiado
4. **Expiración automática**: Cleanup job para eliminar enlaces expirados
5. **Estadísticas públicas**: Mostrar "X personas escucharon esta canción"
6. **Compartir en redes**: Botones específicos para WhatsApp, Facebook, etc.

---

## 📞 Soporte

Si tienes dudas sobre la implementación:
1. Revisa los ejemplos de código
2. Verifica que las migraciones se ejecutaron correctamente
3. Prueba los endpoints con Postman antes de integrar con el frontend
4. Revisa los logs en caso de errores

---

**¡Éxito con la implementación! 🎉**
