import 'dotenv/config';
import {Router} from 'express'
import {loginUser,registerUser , getAuthenticatedUser , updateProfile} from '../controllers/users.controller.js'
import { isAuthenticated } from '../middleware/auth.js';
import passport from 'passport';

const router = Router()

// Rutas de autenticación local
router.post('/login',loginUser)
router.post('/register',registerUser)
router.get('/auth', isAuthenticated, getAuthenticatedUser);
router.patch('/profile', isAuthenticated, updateProfile);

// Rutas de OAuth - Google
router.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/auth/google/callback',
  passport.authenticate('google', {
    failureRedirect: `/login?error=google_auth_failed`,
    successRedirect: `/dashboard`
  })
);

// Rutas de OAuth - Facebook
router.get('/auth/facebook',
  passport.authenticate('facebook', { scope: ['email'] })
);

router.get('/auth/facebook/callback',
  passport.authenticate('facebook', {
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=facebook_auth_failed`,
    successRedirect: `${process.env.FRONTEND_URL}/dashboard`
  })
);

// Ruta de logout
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Error al cerrar sesión' });
    }
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: 'Error al destruir la sesión' });
      }
      res.clearCookie('connect.sid');
      res.json({ message: 'Sesión cerrada exitosamente' });
    });
  });
});

export default router;