// src/controllers/users.controller.js
import jwt from 'jsonwebtoken';
import { storage } from '../services/storage.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { resendEmailService as emailService } from '../services/resendEmailService.js';

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
    const { email, firstName, lastName, password, language } = req.body;

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
      // Determinar si es un usuario temporal
      const finalLastName = lastName || 'Temporal';
      const isTemporaryUser = finalLastName === 'Temporal';

      // Guardar la contraseña sin hashear para enviarla por email (solo si es usuario temporal)
      const plainPassword = password;

      // Crear nuevo usuario
      const newUser = await storage.createUser({
        email,
        firstName: firstName || 'Usuario',
        lastName: finalLastName,
        password: password
      });

      // Si es usuario temporal, enviar email con la contraseña
      if (isTemporaryUser) {
        try {
          // Detectar idioma del usuario (desde body o header Accept-Language)
          let userLanguage = language || 'es'; // Por defecto español

          // Si no se pasó el idioma en el body, intentar detectarlo desde el header
          if (!language && req.headers['accept-language']) {
            const acceptLanguage = req.headers['accept-language'].toLowerCase();
            if (acceptLanguage.includes('en')) {
              userLanguage = 'en';
            }
          }

          console.log(`📧 Enviando contraseña temporal a usuario: ${email} (idioma: ${userLanguage})`);
          const emailResult = await emailService.sendTempPasswordEmail(
            email,
            firstName || 'Usuario',
            plainPassword,
            userLanguage
          );

          if (emailResult.success) {
            console.log('✅ Email de contraseña temporal enviado correctamente');
          } else {
            console.warn('⚠️ No se pudo enviar el email de contraseña temporal:', emailResult.message || emailResult.error);
          }
        } catch (emailError) {
          // No fallar el registro si el email falla, solo loguearlo
          console.error('❌ Error al enviar email de contraseña temporal:', emailError);
        }
      }

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
    const userId = req.user.id; // Del middleware isAuthenticated
    const { firstName, lastName, email, password } = req.body;

    // Validar que el email no esté siendo usado por otro usuario
    if (email) {
      const existingUser = await storage.getUserByEmail(email);

      if (existingUser && existingUser.password === "Cdiek98" ) {
        return res.status(400).json({
          error: 'El correo electrónico ya está en uso por otro usuario'
        });
      }
    }

    // Preparar datos de actualización
    const updateData = {
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      password: password || undefined
    };

    // Si se proporciona una nueva contraseña, hashearla
    if (password && password.trim().length > 0) {
      // Validar longitud mínima de contraseña
      if (password.length < 8) {
        return res.status(400).json({
          error: 'La contraseña debe tener al menos 8 caracteres'
        });
      }

      // Hashear la contraseña
      const hashedPassword = await bcrypt.hash(password, 10);
      updateData.password = hashedPassword;
    }

    await storage.updateUser(userId, updateData);

    // Obtener usuario actualizado
    const updatedUser = await storage.getUser(userId);

    return res.status(200).json(updatedUser.toSafeObject());
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    return res.status(500).json({
      error: 'Error al actualizar el perfil'
    });
  }
};

/**
 * Solicita restablecimiento de contraseña
 * Genera un token y envía email al usuario
 */
export const forgotPassword = async (req, res) => {
  try {
    const { email, language } = req.body;

    // Validar que se proporcionó el email
    if (!email) {
      return res.status(400).json({
        error: 'El email es requerido'
      });
    }

    // Buscar usuario por email
    const user = await storage.getUserByEmail(email);

    // Por seguridad, siempre responder con éxito aunque el usuario no exista
    // Esto previene que se pueda averiguar qué emails están registrados
    if (!user) {
      console.log(`⚠️ Intento de reset para email no registrado: ${email}`);
      return res.status(200).json({
        message: 'Si el email existe, recibirás instrucciones para restablecer tu contraseña'
      });
    }

    // Verificar que el usuario tiene contraseña local (no solo OAuth)
    if (!user.password && user.authProvider !== 'local') {
      console.log(`⚠️ Usuario ${email} usa OAuth, no puede resetear contraseña local`);
      return res.status(200).json({
        message: 'Si el email existe, recibirás instrucciones para restablecer tu contraseña'
      });
    }

    // Generar token de restablecimiento
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    // Guardar token en la base de datos
    await storage.updateUser(user.id, {
      resetToken,
      resetTokenExpires
    });

    // Enviar email con el token
    try {
      const userLanguage = language || 'es';
      const emailResult = await emailService.sendPasswordResetEmail(
        user.email,
        user.firstName,
        resetToken,
        userLanguage
      );

      if (emailResult.success) {
        console.log(`✅ Email de restablecimiento enviado a: ${email}`);
      } else {
        console.error('⚠️ No se pudo enviar email de restablecimiento:', emailResult.error);
        // No fallar el endpoint si el email falla
      }
    } catch (emailError) {
      console.error('❌ Error al enviar email de restablecimiento:', emailError);
      // No fallar el endpoint si el email falla
    }

    return res.status(200).json({
      message: 'Si el email existe, recibirás instrucciones para restablecer tu contraseña'
    });

  } catch (error) {
    console.error('Error en forgotPassword:', error);
    return res.status(500).json({
      error: 'Error al procesar la solicitud'
    });
  }
};

/**
 * Restablece la contraseña usando el token
 */
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // Validar campos requeridos
    if (!token || !newPassword) {
      return res.status(400).json({
        error: 'Token y nueva contraseña son requeridos'
      });
    }

    // Validar longitud mínima de contraseña
    if (newPassword.length < 8) {
      return res.status(400).json({
        error: 'La contraseña debe tener al menos 8 caracteres'
      });
    }

    // Buscar usuario con el token
    const { User } = await import('../models/users.js');
    const user = await User.findOne({
      where: {
        resetToken: token
      }
    });

    if (!user) {
      return res.status(400).json({
        error: 'Token inválido o expirado'
      });
    }

    // Verificar que el token no haya expirado
    if (user.resetTokenExpires < new Date()) {
      return res.status(400).json({
        error: 'El token ha expirado. Por favor solicita un nuevo restablecimiento'
      });
    }

    // Hashear la nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Actualizar contraseña y limpiar tokens
    await storage.updateUser(user.id, {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpires: null
    });

    console.log(`✅ Contraseña restablecida exitosamente para usuario: ${user.email}`);

    return res.status(200).json({
      message: 'Contraseña restablecida exitosamente'
    });

  } catch (error) {
    console.error('Error en resetPassword:', error);
    return res.status(500).json({
      error: 'Error al restablecer la contraseña'
    });
  }
};
