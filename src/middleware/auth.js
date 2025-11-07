// src/auth.js
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { storage } from '../services/storage.js';
import { Pool } from 'pg'; // ajusta la ruta si tu storage está en otro sitio

// Configure session store using PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Función para verificar y recrear la tabla sessions si tiene estructura incorrecta
async function ensureSessionsTable() {
  const client = await pool.connect();
  try {
    // Intentar verificar si la columna 'sess' existe
    const result = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'sessions' AND column_name = 'sess'
    `);

    // Si la tabla existe pero no tiene la columna 'sess', recrearla
    if (result.rows.length === 0) {
      console.log('⚠️  Tabla sessions tiene estructura incorrecta, recreando...');
      await client.query('DROP TABLE IF EXISTS sessions CASCADE;');
      console.log('✅ Tabla sessions recreada');
    }
  } catch (error) {
    // Si la tabla no existe, connect-pg-simple la creará
    console.log('📝 Tabla sessions será creada por connect-pg-simple');
  } finally {
    client.release();
  }
}

// Ejecutar verificación al importar el módulo
await ensureSessionsTable();

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000;
  const PgStore = connectPgSimple(session);

  // Ahora, en vez de conString, pasas el pool
  const store = new PgStore({
    pool,                    // <— aquí
    tableName: 'sessions',
    createTableIfMissing: true,
    ttl: sessionTtl
  });

  return session({
    secret: process.env.SESSION_SECRET,
    store,
    resave: false,
    saveUninitialized: false,
    proxy: true, // Confía en el proxy de Railway
    cookie: {
      maxAge: sessionTtl,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax' // 'none' para cross-origin en producción
    }
  });
}

export function setupAuth(app) {
  // Initialize session and passport
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Serialize/deserialize user
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });

  // Local strategy
  passport.use(
    new LocalStrategy(
      { usernameField: "email", passwordField: "password" },
      async (email, password, done) => {
        try {
          const user = await storage.verifyPassword(email, password);
          if (!user) return done(null, false, { message: "Credenciales incorrectas" });
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );

}
// Middleware to protect routes
export const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }

  return res.status(401).json({
    error: 'No autenticado',
    message: 'Debes iniciar sesión para acceder a este recurso'
  });
};

