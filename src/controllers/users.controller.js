// src/controllers/users.controller.js
import jwt from 'jsonwebtoken';
import { storage } from '../services/storage.js';

export const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 1) Verificar credenciales como antes
    const user = await storage.verifyPassword(email, password);
    if (!user) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    // 2) Passport guardará user.id en la sesión (req.session.passport.user)
    req.login(user, (err) => {
      if (err) {
        console.error('Error en req.login:', err);
        return next(err);
      }

      // 3) Responder al cliente
      res.status(200).json({
        message: 'Usuario autenticado exitosamente',
        user: user.toSafeObject()
      });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const registerUser = async (req, res) => {
  try {
    const { email, password, confirmPassword, firstName, lastName } = req.body;
    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Las contraseñas no coinciden' });
    }
    // 1) Crea usuario
    const newUser = await storage.createUser({ email, password, firstName, lastName });
    // 2) Responde datos (sin contraseña)
    res.status(201).json({
      id: newUser.id,
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName
    });
  } catch (err) {
    console.error(err);
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'El email ya está registrado' });
    }
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};
