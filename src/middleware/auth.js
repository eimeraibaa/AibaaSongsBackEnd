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
    cookie: {
      maxAge: sessionTtl,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production'
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
  res.status(401).json({ message: "No autenticado" });
}

// Send welcome email via external webhook
export async function sendWelcomeEmail(user) {
  try {
    await fetch(
      process.env.WELCOME_WEBHOOK_URL || "https://n8n.jengoautomatization.site/webhook/welcomeEmail",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          timestamp: new Date().toISOString(),
          source: "registration"
        })
      }
    );
    console.log("✅ Welcome email sent successfully");
  } catch (err) {
    console.error("Error sending welcome email:", err);
  }
}
