import { User } from "../models/users.js";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const loginUser = async (req, res) => {
  try {

    const { email, password } = req.body;
    console.log('Login intento:', req.body);

    // 1. Buscar al usuario por email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: 'Usuario no registrado' });
    }

    // 2. Verificar la contraseña (asumiendo que la guardas hasheada)
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    // 3. Generar el JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION || '1h' }
    );

    console.log('Usuario logueado:', user);
    console.log('Token generado:', token);

    // 4. Enviar respuesta única con user + token
    return res.status(200).json({
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
      token
    });

  } catch (error) {
    console.error('Error en registerUser:', error);

    // Si es un error de constraint (email duplicado, campos faltantes, etc.)
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'El email ya está registrado' });
    }
    if (error.name === 'SequelizeValidationError') {
      // recopilar mensajes de validación
      const msgs = error.errors.map(e => e.message);
      return res.status(400).json({ message: msgs.join(', ') });
    }

    // Para cualquier otro error
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const registerUser = async (req, res) => {
  try {
    const { email, password,confirmPassword, firstName, lastName } = req.body;

    // 1) Validar que ambos passwords coincidan
    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Las contraseñas no coinciden' });
    }

    // 2) Hashear y guardar solo password
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      email,
      password: hashedPassword,
      firstName,
      lastName
    });

    // 3) Responder con JSON
    return res.status(201).json({
      id: newUser.id,
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName
    });

  } catch (error) {
    console.error('Error en registerUser:', error);

    // Si es un error de constraint (email duplicado, campos faltantes, etc.)
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'El email ya está registrado' });
    }
    if (error.name === 'SequelizeValidationError') {
      // recopilar mensajes de validación
      const msgs = error.errors.map(e => e.message);
      return res.status(400).json({ message: msgs.join(', ') });
    }

    // Para cualquier otro error
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// const updateUser = (req, res) => {
//   const userId = req.params.id;
//   const { name, lastname, email, password } = req.body;

//   // Simulate updating user
//   const updatedUser = { id: userId, name, lastname, email, password };

//   res.status(200).json(updatedUser);
// }

// const deleteUser = (req, res) => {
//   const userId = req.params.id;

//   // Simulate deleting user
//   res.status(204).send(); // No content to return
// }
