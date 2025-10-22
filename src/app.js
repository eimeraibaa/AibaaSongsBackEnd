import express from 'express'
import cors from 'cors';
import usersRoutes from './routes/users.routes.js'
import paymentsRouter from './routes/payment.routes.js';
import songsRouter from './routes/songs.routes.js';
import cartRoutes from './routes/cart.routes.js';
import ordersRoutes from './routes/orders.routes.js';
import songRouter from './routes/song.routes.js';
import { setupAuth } from './middleware/auth.js';
import session from 'express-session';
import SequelizeStoreFactory from 'connect-session-sequelize';
import sequelize from './database/database.js';

const SequelizeStore = SequelizeStoreFactory(session.Store);

const app = express()

const sessionStore = new SequelizeStore({
  db: sequelize,
  tableName: 'sessions',
  checkExpirationInterval: 15 * 60 * 1000, // Limpiar sesiones expiradas cada 15 min
  expiration: 24 * 60 * 60 * 1000 // 24 horas
});

app.use(session({
  secret: process.env.SESSION_SECRET || 'tu-clave-secreta-super-segura',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 horas
  }
}));

sessionStore.sync();

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

app.use(express.json()) // Middleware to parse JSON bodies
// después de todas tus rutas, justo antes de app.listen(...)
setupAuth(app);

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
