// src/auth.js
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { storage } from '../services/storage.js';
import { Pool } from 'pg';
import { User } from '../models/users.js';

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

  // Google OAuth Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: `${process.env.BACKEND_URL}/users/auth/google/callback`,
          scope: ['profile', 'email']
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            // Buscar usuario existente por googleId o email
            let user = await User.findOne({
              where: { googleId: profile.id }
            });

            if (!user && profile.emails?.[0]?.value) {
              // Buscar por email si el usuario ya existe con autenticación local
              user = await User.findOne({
                where: { email: profile.emails[0].value }
              });

              if (user) {
                // Actualizar usuario existente con googleId
                user.googleId = profile.id;
                user.authProvider = 'google';
                if (profile.photos?.[0]?.value) {
                  user.profilePicture = profile.photos[0].value;
                }
                await user.save();
              }
            }

            if (!user) {
              // Crear nuevo usuario
              user = await User.create({
                googleId: profile.id,
                email: profile.emails[0].value,
                firstName: profile.name.givenName || profile.displayName.split(' ')[0] || 'Usuario',
                lastName: profile.name.familyName || profile.displayName.split(' ').slice(1).join(' ') || 'Google',
                authProvider: 'google',
                profilePicture: profile.photos?.[0]?.value || null,
                password: null // No necesita password para OAuth
              });
            }

            return done(null, user);
          } catch (err) {
            return done(err, null);
          }
        }
      )
    );
  }

  // Facebook OAuth Strategy
  if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
    passport.use(
      new FacebookStrategy(
        {
          clientID: process.env.FACEBOOK_APP_ID,
          clientSecret: process.env.FACEBOOK_APP_SECRET,
          callbackURL: `${process.env.BACKEND_URL}/users/auth/facebook/callback`,
          profileFields: ['id', 'emails', 'name', 'picture.type(large)']
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            // Buscar usuario existente por facebookId o email
            let user = await User.findOne({
              where: { facebookId: profile.id }
            });

            if (!user && profile.emails?.[0]?.value) {
              // Buscar por email si el usuario ya existe con autenticación local
              user = await User.findOne({
                where: { email: profile.emails[0].value }
              });

              if (user) {
                // Actualizar usuario existente con facebookId
                user.facebookId = profile.id;
                user.authProvider = 'facebook';
                if (profile.photos?.[0]?.value) {
                  user.profilePicture = profile.photos[0].value;
                }
                await user.save();
              }
            }

            if (!user) {
              // Crear nuevo usuario
              user = await User.create({
                facebookId: profile.id,
                email: profile.emails?.[0]?.value || `facebook_${profile.id}@placeholder.com`,
                firstName: profile.name.givenName || profile.displayName.split(' ')[0] || 'Usuario',
                lastName: profile.name.familyName || profile.displayName.split(' ').slice(1).join(' ') || 'Facebook',
                authProvider: 'facebook',
                profilePicture: profile.photos?.[0]?.value || null,
                password: null // No necesita password para OAuth
              });
            }

            return done(null, user);
          } catch (err) {
            return done(err, null);
          }
        }
      )
    );
  }

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

