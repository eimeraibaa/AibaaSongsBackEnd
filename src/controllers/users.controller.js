// src/controllers/users.controller.js
import jwt from 'jsonwebtoken';
import { storage } from '../services/storage.js';
import bcrypt from 'bcryptjs';

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
    const { email, firstName, lastName, password } = req.body;

    // Validar campos requeridos
    if (!email || !password) {
      return res.status(400).json({
        error: 'Email y contraseña son requeridos'
      });
    }

    // Verificar si el usuario ya existe
    const existingUser = await storage.getUserByEmail(email);

    if (existingUser) {
      // Si el usuario ya existe, intentar login automático
      // (útil para usuarios temporales que vuelven)
      const isPasswordValid = await bcrypt.compare(password, existingUser.password);

      if (isPasswordValid) {
        // Login automático
        req.login(existingUser, (err) => {
          if (err) {
            return res.status(500).json({ error: 'Error al iniciar sesión' });
          }
          return res.status(200).json({
            message: 'Usuario ya existe, sesión iniciada',
            user: existingUser.toSafeObject()
          });
        });
      } else {
        return res.status(409).json({
          error: 'El correo electrónico ya está registrado'
        });
      }
    } else {
      // Crear nuevo usuario
      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = await storage.createUser({
        email,
        firstName: firstName || 'Usuario',
        lastName: lastName || 'Temporal',
        password: hashedPassword
      });

      // Login automático después del registro
      req.login(newUser, (err) => {
        if (err) {
          return res.status(500).json({ error: 'Error al iniciar sesión' });
        }
        return res.status(201).json({
          message: 'Usuario registrado exitosamente',
          user: newUser.toSafeObject()
        });
      });
    }
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    return res.status(500).json({
      error: 'Error al registrar usuario'
    });
  }
};

export const getAuthenticatedUser = (req, res) => {
  if (req.user) {
    res.json(req.user);
  } else {
    res.status(401).json({ message: 'No autenticado' });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id; // Asumiendo que isAuthenticated agrega req.user
    const { firstName, lastName, email } = req.body;

    // Validar que el email no esté siendo usado por otro usuario
    if (email) {
      const existingUser = await User.findOne({
        where: {
          email,
          id: { [Op.ne]: userId } // Op.ne = not equal
        }
      });

      if (existingUser) {
        return res.status(400).json({
          error: 'El correo electrónico ya está en uso por otro usuario'
        });
      }
    }

    // Actualizar usuario
    await User.update(
      {
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        email: email || undefined
      },
      {
        where: { id: userId }
      }
    );

    // Obtener usuario actualizado
    const updatedUser = await User.findByPk(userId);

    return res.status(200).json(updatedUser.toSafeObject());
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    return res.status(500).json({
      error: 'Error al actualizar el perfil'
    });
  }
};
