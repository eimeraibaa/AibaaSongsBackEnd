// =============================================
// SERVICIO DE CORREO ELECTRÓNICO
// Envía notificaciones cuando las canciones están listas
// =============================================

import nodemailer from 'nodemailer';

// Variables de entorno para SMTP
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;
const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
const EMAIL_PORT = process.env.EMAIL_PORT || 587;
const EMAIL_SECURE = process.env.EMAIL_SECURE === 'true' || EMAIL_PORT == 465;
const EMAIL_FROM = process.env.EMAIL_FROM || EMAIL_USER;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

export class EmailService {
  constructor() {
    // Si no hay configuración de email, usar modo de prueba (ethereal)
    if (!EMAIL_USER || !EMAIL_PASSWORD) {
      console.warn('⚠️ No se configuraron credenciales de email. Usando modo de prueba.');
      this.readyPromise = this.setupTestAccount();
    } else {
      // Configurar transporter de nodemailer con SMTP genérico
      // Soporta SpaceMail, Gmail, Outlook, y cualquier servidor SMTP
      const transportConfig = {
        host: EMAIL_HOST,
        port: parseInt(EMAIL_PORT),
        secure: EMAIL_SECURE, // true para puerto 465, false para otros puertos
        auth: {
          user: EMAIL_USER,
          pass: EMAIL_PASSWORD,
        },
        // Opciones adicionales para mejorar compatibilidad
        connectionTimeout: 10000, // 10 segundos timeout
        greetingTimeout: 10000,
        socketTimeout: 10000,
        // Opciones TLS para manejar certificados auto-firmados o problemas SSL
        tls: {
          rejectUnauthorized: false, // Para desarrollo/servidores con certificados no verificados
          minVersion: 'TLSv1.2'
        },
        // Habilitar debug para ver más información
        debug: process.env.EMAIL_DEBUG === 'true',
        logger: process.env.EMAIL_DEBUG === 'true'
      };

      this.transporter = nodemailer.createTransport(transportConfig);
      this.readyPromise = Promise.resolve();

      console.log(`📧 Configuración SMTP:`);
      console.log(`   - Host: ${EMAIL_HOST}`);
      console.log(`   - Port: ${EMAIL_PORT}`);
      console.log(`   - Secure: ${EMAIL_SECURE}`);
      console.log(`   - User: ${EMAIL_USER}`);
      console.log(`   - From: ${EMAIL_FROM}`);
    }
  }

  /**
   * Configura cuenta de prueba con Ethereal (para desarrollo)
   */
  async setupTestAccount() {
    try {
      const testAccount = await nodemailer.createTestAccount();

      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });

      console.log('📧 Modo de prueba activado. Usuario:', testAccount.user);
    } catch (error) {
      console.error('❌ Error configurando cuenta de prueba:', error);
      throw error;
    }
  }

  /**
   * Asegura que el transporter está listo antes de enviar emails
   */
  async ensureReady() {
    if (this.readyPromise) {
      await this.readyPromise;
    }
  }

  /**
   * Envía email cuando las canciones están listas
   * @param {string} userEmail - Email del usuario
   * @param {Array} songs - Array de canciones completadas
   * @param {number} orderId - ID de la orden
   */
  async sendSongsReadyEmail(userEmail, songs, orderId) {
    try {
      // Esperar a que el transporter esté listo

      console.warn('Intentaremos hacer el primer paso!');

      await this.ensureReady();

      if (!userEmail) {
        console.warn('⚠️ No se proporcionó email de usuario');
        return { success: false, message: 'No email provided' };
      }

      const songsList = songs.map(song => `
        <li>
          <strong>${song.title || 'Canción sin título'}</strong><br>
          <small>Género: ${song.genre || 'N/A'}</small><br>
          ${song.audioUrl && song.id ? `
            <a href="${song.audioUrl}" target="_blank" style="color: #667eea; text-decoration: none;">🎵 Escuchar</a> |
            <a href="${BACKEND_URL}/song/${song.id}/download" style="color: #667eea; text-decoration: none;">📥 Descargar</a>
          ` : `
            <span style="color: #999;">Audio en proceso...</span>
          `}
        </li>
      `).join('');

      const mailOptions = {
        from: `"🎵 Make Ur Song" <${EMAIL_FROM}>`,
        to: userEmail,
        subject: '🎉 ¡Tus canciones personalizadas están listas!',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #e69216ff 0%, #e69216ff 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .song-list { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
              .song-list li { margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #eee; }
              .song-list li:last-child { border-bottom: none; }
              .button { display: inline-block; padding: 12px 24px; background: #e69216ff; color: white; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
              .footer { text-align: center; margin-top: 30px; color: #e69216ff; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎵 ¡Tus canciones están listas!</h1>
                <p>Tu orden #${orderId} ha sido completada</p>
              </div>
              <div class="content">
                <p>¡Hola! 👋</p>
                <p>Estamos emocionados de informarte que tus <strong>${songs.length} cancion${songs.length > 1 ? 'es' : ''} personalizada${songs.length > 1 ? 's' : ''}</strong> ha${songs.length > 1 ? 'n' : ''} sido generada${songs.length > 1 ? 's' : ''} con éxito.</p>

                <div class="song-list">
                  <h3>Tus canciones:</h3>
                  <ul style="list-style: none; padding: 0;">
                    ${songsList}
                  </ul>
                </div>

                <div style="text-align: center; margin-top: 30px;">
                  <a href="${FRONTEND_URL}/orders/${orderId}" class="button">Ver mi orden completa</a>
                  <a href="${FRONTEND_URL}/songs" class="button">Ver todas mis canciones</a>
                </div>

                <p style="margin-top: 30px;">
                  <strong>Consejos:</strong><br>
                  • Haz clic en "Escuchar" para reproducir la canción en tu navegador<br>
                  • Haz clic en "Descargar" para guardar el archivo MP3 con el nombre original directamente en tu equipo<br>
                  • Las canciones estarán disponibles en tu cuenta para siempre<br>
                  • Comparte tus canciones con quien quieras 💜
                </p>
              </div>
              <div class="footer">
                <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
                <p>© ${new Date().getFullYear()} Make Ur Songs - Creando música</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
¡Hola!

¡Tus ${songs.length} cancion${songs.length > 1 ? 'es' : ''} personalizada${songs.length > 1 ? 's' : ''} está${songs.length > 1 ? 'n' : ''} lista${songs.length > 1 ? 's' : ''}!

Orden #${orderId}

Tus canciones:
${songs.map(s => `- ${s.title || 'Sin título'} (${s.genre || 'N/A'})
  ${s.audioUrl && s.id ? `🎵 Escuchar: ${s.audioUrl}
  📥 Descargar: ${BACKEND_URL}/song/${s.id}/download` : 'Audio en proceso...'}`).join('\n')}

Ver orden completa: ${FRONTEND_URL}/orders/${orderId}
Ver todas mis canciones: ${FRONTEND_URL}/songs

¡Disfruta tu música!

© ${new Date().getFullYear()} Make Ur Songs
        `.trim(),
      };

      const info = await this.transporter.sendMail(mailOptions);

      console.log('✅ Email enviado:', info.messageId);

      // Si estamos usando Ethereal, mostrar preview URL
      if (info.messageId && !EMAIL_USER) {
        console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info));
      }

      return {
        success: true,
        messageId: info.messageId,
        previewUrl: nodemailer.getTestMessageUrl(info),
      };

    } catch (error) {
      console.error('❌ Error enviando email:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Envía email de error si la generación falla
   * @param {string} userEmail - Email del usuario
   * @param {number} orderId - ID de la orden
   * @param {Array} failedSongs - Canciones que fallaron
   */
  async sendGenerationFailedEmail(userEmail, orderId, failedSongs) {
    try {
      // Esperar a que el transporter esté listo
      await this.ensureReady();

      if (!userEmail) {
        console.warn('⚠️ No se proporcionó email de usuario');
        return { success: false, message: 'No email provided' };
      }

      const failedList = failedSongs.map(song => `
        <li>
          <strong>${song.title || 'Canción sin título'}</strong><br>
          <small>Error: ${song.error || 'Error desconocido'}</small>
        </li>
      `).join('');

      const mailOptions = {
        from: `"🎵 Make Ur Song" <${EMAIL_FROM}>`,
        to: userEmail,
        subject: '⚠️ Problema con la generación de tus canciones',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #f44336; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>⚠️ Problema con tu orden</h1>
                <p>Orden #${orderId}</p>
              </div>
              <div class="content">
                <p>¡Hola! 👋</p>
                <p>Lamentamos informarte que hubo un problema al generar algunas de tus canciones:</p>

                <ul>
                  ${failedList}
                </ul>

                <p>No te preocupes, nuestro equipo está revisando el problema y te contactaremos pronto para resolverlo.</p>

                <div style="text-align: center; margin-top: 30px;">
                  <a href="${FRONTEND_URL}/orders/${orderId}" class="button">Ver detalles de mi orden</a>
                </div>
              </div>
            </div>
          </body>
          </html>
        `,
      };

      const info = await this.transporter.sendMail(mailOptions);

      console.log('✅ Email de error enviado:', info.messageId);

      return {
        success: true,
        messageId: info.messageId,
      };

    } catch (error) {
      console.error('❌ Error enviando email de error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Verifica la configuración del servicio de email
   */
  async verifyConnection() {
    try {
      // Esperar a que el transporter esté listo
      await this.ensureReady();

      console.log('🔍 Verificando conexión SMTP...');
      await this.transporter.verify();
      console.log('✅ Servidor de email listo y conectado');
      return true;
    } catch (error) {
      console.error('========================================');
      console.error('❌ ERROR VERIFICANDO CONEXIÓN DE EMAIL');
      console.error('========================================');
      console.error('Código de error:', error.code);
      console.error('Mensaje:', error.message);
      console.error('Comando:', error.command);
      console.error('');
      console.error('Configuración actual:');
      console.error(`  - Host: ${EMAIL_HOST}`);
      console.error(`  - Port: ${EMAIL_PORT}`);
      console.error(`  - Secure: ${EMAIL_SECURE}`);
      console.error(`  - User: ${EMAIL_USER}`);
      console.error('');
      console.error('Posibles soluciones:');
      console.error('  1. Verifica que el host sea correcto (mail.spacemail.com)');
      console.error('  2. Prueba con puerto 587 en lugar de 465');
      console.error('  3. Verifica tus credenciales de SpaceMail');
      console.error('  4. Asegúrate de que tu servidor puede conectarse a SpaceMail');
      console.error('  5. Habilita EMAIL_DEBUG=true en .env para más detalles');
      console.error('========================================');
      return false;
    }
  }
}

// Exportar instancia singleton
export const emailService = new EmailService();
