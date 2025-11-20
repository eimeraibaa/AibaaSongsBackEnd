import express from 'express'
import cors from 'cors';
import usersRoutes from './routes/users.routes.js'
import paymentsRouter from './routes/payment.routes.js';
import songsRouter from './routes/songs.routes.js';
import cartRoutes from './routes/cart.routes.js';
import ordersRoutes from './routes/orders.routes.js';
import songRouter from './routes/song.routes.js';
import webhookRoutes from './routes/webhook.routes.js';
import pricingRoutes from './routes/pricing.routes.js';
import assetsRoutes from './routes/assets.routes.js';
import { setupAuth } from './middleware/auth.js';

const app = express()

// Confiar en el proxy de Railway para cookies seguras
app.set('trust proxy', 1);

app.use(cors({
  origin: true,          // lee el Origin de la petición y lo responde
  credentials: true, // Permite cookies y headers de autorización
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  optionsSuccessStatus: 200
}));

app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    // automáticamente responde con los headers CORS que ya ha puesto `cors()`
    return res.sendStatus(200)
  }
  next()
})

// IMPORTANTE: Los webhooks necesitan diferentes parsers:
// - Stripe: raw bytes (Buffer) para verificar firma
// - Suno: JSON parseado
// Por eso aplicamos parsers específicos ANTES de las rutas

// Middleware raw SOLO para /webhook/stripe
app.use('/webhook/stripe', express.raw({ type: 'application/json' }));

// Middleware JSON SOLO para /webhook/suno y otros webhooks
app.use('/webhook/suno', express.json());
app.use('/webhook/update-order-email', express.json());
app.use('/webhook/test-email', express.json());
app.use('/webhook/suno-config', express.json());

// Aplicar las rutas de webhook (ya tienen sus parsers configurados)
app.use('/webhook', webhookRoutes);

// AHORA SÍ aplicar JSON parser para el resto de las rutas
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ limit: "2mb", extended: true }));

// Configurar autenticación con Passport
setupAuth(app);

// Rutas de la aplicación
app.use('/users', usersRoutes)
app.use('/payment', paymentsRouter)
app.use('/songs', songsRouter)
app.use('/cart', cartRoutes)
app.use('/orders', ordersRoutes)
app.use('/song', songRouter)
app.use('/pricing', pricingRoutes)
app.use('/assets', assetsRoutes)

app.use((err, req, res, next) => {
  console.error('Error global capturado:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Error interno del servidor'
  });
});

export default app;