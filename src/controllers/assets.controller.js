/**
 * Controlador para servir assets estáticos (logos, imágenes, etc.)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOGO_PATH = path.join(__dirname, '../assets/images/logo-sin-letra.png');

/**
 * Sirve el logo de la aplicación
 * GET /assets/logo
 */
export const serveLogo = async (req, res) => {
  try {
    // Verificar si el archivo existe
    if (!fs.existsSync(LOGO_PATH)) {
      console.error(`❌ Logo no encontrado en: ${LOGO_PATH}`);
      return res.status(404).json({ error: 'Logo no encontrado' });
    }

    // Leer el archivo
    const logoBuffer = fs.readFileSync(LOGO_PATH);

    // Configurar headers para caching (1 año)
    res.set({
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Length': logoBuffer.length
    });

    // Enviar el archivo
    res.send(logoBuffer);
  } catch (error) {
    console.error('❌ Error sirviendo logo:', error);
    res.status(500).json({ error: 'Error sirviendo logo' });
  }
};
