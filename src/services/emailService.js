// =============================================
// SERVICIO DE CORREO ELECTRÓNICO
// Envía notificaciones cuando las canciones están listas
// =============================================

import nodemailer from 'nodemailer';

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;
const EMAIL_FROM = process.env.EMAIL_FROM || EMAIL_USER;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

export class EmailService {
  constructor() {
    // Configurar transporter de nodemailer
    this.transporter = nodemailer.createTransport({
      service: 'gmail', // Puedes cambiar a 'outlook', 'yahoo', etc.
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASSWORD,
      },
    });

    // Si no hay configuración de email, usar modo de prueba (ethereal)
    if (!EMAIL_USER || !EMAIL_PASSWORD) {
      console.warn('⚠️ No se configuraron credenciales de email. Usando modo de prueba.');
      this.setupTestAccount();
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
      if (!userEmail) {
        console.warn('⚠️ No se proporcionó email de usuario');
        return { success: false, message: 'No email provided' };
      }

      const songsList = songs.map(song => `
        <li>
          <strong>${song.title || 'Canción sin título'}</strong><br>
          <small>Género: ${song.genre || 'N/A'}</small><br>
          <a href="${FRONTEND_URL}/songs/${song.id}">Escuchar canción</a> |
          <a href="${FRONTEND_URL}/songs/${song.id}/download">Descargar</a>
        </li>
      `).join('');

      const mailOptions = {
        from: `"🎵 Aibaa Songs" <${EMAIL_FROM}>`,
        to: userEmail,
        subject: '🎉 ¡Tus canciones personalizadas están listas!',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .song-list { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
              .song-list li { margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #eee; }
              .song-list li:last-child { border-bottom: none; }
              .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
              .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
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
                  • Puedes descargar tus canciones en formato MP3<br>
                  • Las canciones estarán disponibles en tu cuenta para siempre<br>
                  • Comparte tus canciones con quien quieras 💜
                </p>
              </div>
              <div class="footer">
                <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
                <p>© ${new Date().getFullYear()} Aibaa Songs - Creando música con IA</p>
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
${songs.map(s => `- ${s.title || 'Sin título'} (${s.genre || 'N/A'})\n  ${FRONTEND_URL}/songs/${s.id}`).join('\n')}

Ver orden completa: ${FRONTEND_URL}/orders/${orderId}

¡Disfruta tu música!

© ${new Date().getFullYear()} Aibaa Songs
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
        from: `"🎵 Aibaa Songs" <${EMAIL_FROM}>`,
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
      await this.transporter.verify();
      console.log('✅ Servidor de email listo');
      return true;
    } catch (error) {
      console.error('❌ Error verificando conexión de email:', error);
      return false;
    }
  }
}

// Exportar instancia singleton
export const emailService = new EmailService();
