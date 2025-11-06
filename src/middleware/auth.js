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
export function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ message: "No autenticado auth" });
}
