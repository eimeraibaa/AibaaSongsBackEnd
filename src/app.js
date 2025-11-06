import express from 'express'
import cors from 'cors';
import usersRoutes from './routes/users.routes.js'
import paymentsRouter from './routes/payment.routes.js';
import songsRouter from './routes/songs.routes.js';
import cartRoutes from './routes/cart.routes.js';
import ordersRoutes from './routes/orders.routes.js';
import songRouter from './routes/song.routes.js';
import webhookRoutes from './routes/webhook.routes.js';
import { setupAuth } from './middleware/auth.js';

const app = express()

// Confiar en el proxy de Railway para cookies seguras
app.set('trust proxy', 1);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ limit: "2mb", extended: true }));

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

// IMPORTANTE: Webhook de Stripe debe recibir raw bytes para verificar la firma
// Webhook de Suno debe recibir JSON parseado
// Usamos middleware condicional basado en la ruta

// Middleware personalizado para webhooks
app.use('/webhook/stripe', express.raw({ type: 'application/json' }));
app.use('/webhook/suno', express.json());

// Aplicar las rutas de webhook
app.use('/webhook', webhookRoutes);

// Middleware to parse JSON bodies para el resto de rutas
app.use(express.json());

// Configurar autenticación con Passport
setupAuth(app);

// Rutas de la aplicación
app.use('/users', usersRoutes)
app.use('/payment', paymentsRouter)
app.use('/songs', songsRouter)
app.use('/cart', cartRoutes)
app.use('/orders', ordersRoutes)
app.use('/song', songRouter)

app.use((err, req, res, next) => {
  console.error('Error global capturado:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Error interno del servidor'
  });
});

export default app;
