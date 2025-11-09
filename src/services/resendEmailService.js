// =============================================
// SERVICIO DE CORREO ELECTRÓNICO CON RESEND
// Envía notificaciones cuando las canciones están listas
// =============================================

import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'onboarding@resend.dev';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

export class ResendEmailService {
  constructor() {
    if (!RESEND_API_KEY) {
      console.warn('⚠️ No se configuró RESEND_API_KEY. Los emails no se enviarán.');
      this.resend = null;
    } else {
      this.resend = new Resend(RESEND_API_KEY);
      console.log('✅ Servicio de email Resend configurado correctamente');
    }

    // Cache para prevenir emails duplicados
    this.emailCache = new Map();
    this.CACHE_DURATION = 60000; // 60 segundos
  }

  /**
   * Verifica si ya se envió un email para esta orden recientemente
   */
  wasRecentlySent(orderId) {
    const cacheKey = `order_${orderId}`;
    const lastSent = this.emailCache.get(cacheKey);

    if (lastSent && Date.now() - lastSent < this.CACHE_DURATION) {
      console.log(`⚠️ Email para orden ${orderId} ya fue enviado hace menos de ${this.CACHE_DURATION/1000}s`);
      return true;
    }

    return false;
  }

  /**
   * Marca que se envió un email para esta orden
   */
  markAsSent(orderId) {
    const cacheKey = `order_${orderId}`;
    this.emailCache.set(cacheKey, Date.now());

    // Limpiar cache viejo después de 2 minutos
    setTimeout(() => {
      this.emailCache.delete(cacheKey);
    }, this.CACHE_DURATION * 2);
  }

  /**
   * Verifica si el servicio está configurado
   */
  isConfigured() {
    return this.resend !== null;
  }

  /**
   * Envía email cuando las canciones están listas
   * @param {string} userEmail - Email del usuario
   * @param {Array} songs - Array de canciones completadas
   * @param {number} orderId - ID de la orden
   */
  async sendSongsReadyEmail(userEmail, songs, orderId) {
    try {
      if (!this.isConfigured()) {
        console.warn('⚠️ Servicio de email no configurado. No se enviará el email.');
        return { success: false, message: 'Email service not configured' };
      }

      if (!userEmail) {
        console.warn('⚠️ No se proporcionó email de usuario');
        return { success: false, message: 'No email provided' };
      }

      // Verificar si ya se envió un email recientemente para esta orden
      if (this.wasRecentlySent(orderId)) {
        console.log(`⏭️ Omitiendo envío de email duplicado para orden ${orderId}`);
        return { success: true, skipped: true, message: 'Email already sent recently' };
      }

      console.log(`📧 Enviando email de canciones listas a: ${userEmail}`);

      // Agrupar canciones por orderItemId para mostrar variaciones juntas
      const songsByOrderItem = songs.reduce((acc, song) => {
        const key = song.orderItemId || 'unknown';
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(song);
        return acc;
      }, {});

      // Generar HTML para cada grupo de canciones
      const songsList = Object.values(songsByOrderItem).map(songGroup => {
        // Ordenar por variación (V1, V2, V3...)
        songGroup.sort((a, b) => (a.variation || 1) - (b.variation || 1));

        const baseSong = songGroup[0];
        const baseTitle = baseSong.title?.replace(/\s*\(V\d+\)/, '') || 'Canción sin título';

        return `
        <li style="margin-bottom: 25px; padding-bottom: 25px; border-bottom: 1px solid #eee;">
          <strong style="font-size: 17px; color: #333; display: block; margin-bottom: 8px;">${baseTitle}</strong>
          <small style="color: #666; display: block; margin-bottom: 10px;">Género: ${baseSong.genre || 'N/A'}</small>
          ${songGroup.length > 1 ? `
            <div style="background: #f9f9f9; padding: 12px; border-radius: 6px; margin-top: 8px;">
              <small style="color: #888; display: block; margin-bottom: 8px;">🎵 ${songGroup.length} variaciones disponibles:</small>
              ${songGroup.map(song => `
                <div style="margin: 6px 0; padding: 8px; background: white; border-radius: 4px;">
                  <strong style="color: #555; font-size: 14px;">${song.title}</strong><br>
                  ${song.audioUrl && song.id ? `
                    <a href="${song.audioUrl}" target="_blank" style="color: #e69216; text-decoration: none; margin-right: 12px; font-size: 13px;">🎵 Escuchar</a>
                    <a href="${BACKEND_URL}/song/${song.id}/download" style="color: #e69216; text-decoration: none; font-size: 13px;">📥 Descargar</a>
                  ` : `
                    <span style="color: #999; font-size: 13px;">Audio en proceso...</span>
                  `}
                </div>
              `).join('')}
            </div>
          ` : `
            ${baseSong.audioUrl && baseSong.id ? `
              <a href="${baseSong.audioUrl}" target="_blank" style="color: #e69216; text-decoration: none; margin-right: 15px;">🎵 Escuchar</a>
              <a href="${BACKEND_URL}/song/${baseSong.id}/download" style="color: #e69216; text-decoration: none;">📥 Descargar</a>
            ` : `
              <span style="color: #999;">Audio en proceso...</span>
            `}
          `}
        </li>
      `;
      }).join('');

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              margin: 0;
              padding: 0;
              background-color: #f5f5f5;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
            }
            .header {
              background: linear-gradient(135deg, #e69216 0%, #d67d0a 100%);
              color: white;
              padding: 40px 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0 0 10px 0;
              font-size: 28px;
              font-weight: 600;
            }
            .header p {
              margin: 0;
              font-size: 16px;
              opacity: 0.95;
            }
            .content {
              padding: 40px 30px;
            }
            .song-list {
              background: #fafafa;
              padding: 25px;
              border-radius: 8px;
              margin: 25px 0;
              border: 1px solid #eeeeee;
            }
            .song-list h3 {
              margin-top: 0;
              color: #333;
              font-size: 18px;
            }
            .song-list ul {
              list-style: none;
              padding: 0;
              margin: 0;
            }
            .song-list li:last-child {
              border-bottom: none !important;
              margin-bottom: 0 !important;
              padding-bottom: 0 !important;
            }
            .button-container {
              text-align: center;
              margin-top: 30px;
            }
            .button {
              display: inline-block;
              padding: 14px 28px;
              background: #e69216;
              color: white !important;
              text-decoration: none;
              border-radius: 6px;
              margin: 10px 5px;
              font-weight: 500;
              transition: background 0.3s;
            }
            .button:hover {
              background: #d67d0a;
            }
            .tips {
              background: #f0f9ff;
              border-left: 4px solid #e69216;
              padding: 20px;
              margin-top: 30px;
              border-radius: 4px;
            }
            .tips strong {
              color: #e69216;
              display: block;
              margin-bottom: 10px;
              font-size: 16px;
            }
            .tips ul {
              margin: 0;
              padding-left: 20px;
            }
            .tips li {
              margin-bottom: 8px;
              color: #555;
            }
            .footer {
              text-align: center;
              padding: 30px;
              background-color: #fafafa;
              color: #666;
              font-size: 12px;
              border-top: 1px solid #eeeeee;
            }
            .footer p {
              margin: 5px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎵 ¡Tus canciones están listas!</h1>
              <p>Tu orden #${orderId} ha sido completada</p>
            </div>
            <div class="content">
              <p style="font-size: 16px;">¡Hola! 👋</p>
              <p style="font-size: 15px;">Estamos emocionados de informarte que tus <strong>${songs.length} cancion${songs.length > 1 ? 'es' : ''} personalizada${songs.length > 1 ? 's' : ''}</strong> ha${songs.length > 1 ? 'n' : ''} sido generada${songs.length > 1 ? 's' : ''} con éxito.</p>

              <div class="song-list">
                <h3>Tus canciones:</h3>
                <ul>
                  ${songsList}
                </ul>
              </div>

              <div class="button-container">
                <a href="${FRONTEND_URL}/history" class="button">Ver todas mis canciones</a>
              </div>

              <div class="tips">
                <strong>💡 Consejos:</strong>
                <ul>
                  <li>Haz clic en "Escuchar" para reproducir la canción en tu navegador</li>
                  <li>Haz clic en "Descargar" para guardar el archivo MP3 directamente en tu equipo</li>
                  <li>Las canciones estarán disponibles en tu cuenta para siempre</li>
                  <li>Comparte tus canciones con quien quieras 💜</li>
                </ul>
              </div>
            </div>
            <div class="footer">
              <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
              <p>© ${new Date().getFullYear()} Make Ur Songs - Creando música personalizada con IA</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const textContent = `
¡Hola!

¡Tus ${songs.length} cancion${songs.length > 1 ? 'es' : ''} personalizada${songs.length > 1 ? 's' : ''} está${songs.length > 1 ? 'n' : ''} lista${songs.length > 1 ? 's' : ''}!

Orden #${orderId}

Tus canciones:
${songs.map(s => `- ${s.title || 'Sin título'} (${s.genre || 'N/A'})
  ${s.audioUrl && s.id ? `🎵 Escuchar: ${s.audioUrl}
  📥 Descargar: ${BACKEND_URL}/song/${s.id}/download` : 'Audio en proceso...'}`).join('\n\n')}

Ver orden completa: ${FRONTEND_URL}/orders/${orderId}
Ver todas mis canciones: ${FRONTEND_URL}/songs

¡Disfruta tu música!

© ${new Date().getFullYear()} Make Ur Songs
      `.trim();

      const { data, error } = await this.resend.emails.send({
        from: EMAIL_FROM,
        to: userEmail,
        subject: '🎉 ¡Tus canciones personalizadas están listas!',
        html: htmlContent,
        text: textContent,
      });

      if (error) {
        console.error('❌ Error enviando email con Resend:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      console.log('✅ Email enviado exitosamente:', data.id);

      // Marcar como enviado para prevenir duplicados
      this.markAsSent(orderId);

      return {
        success: true,
        messageId: data.id,
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
      if (!this.isConfigured()) {
        console.warn('⚠️ Servicio de email no configurado. No se enviará el email.');
        return { success: false, message: 'Email service not configured' };
      }

      if (!userEmail) {
        console.warn('⚠️ No se proporcionó email de usuario');
        return { success: false, message: 'No email provided' };
      }

      console.log(`📧 Enviando email de error a: ${userEmail}`);

      const failedList = failedSongs.map(song => `
        <li style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #ffebee;">
          <strong style="color: #d32f2f;">${song.title || 'Canción sin título'}</strong><br>
          <small style="color: #666;">Error: ${song.error || 'Error desconocido'}</small>
        </li>
      `).join('');

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              margin: 0;
              padding: 0;
              background-color: #f5f5f5;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
            }
            .header {
              background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
              color: white;
              padding: 40px 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0 0 10px 0;
              font-size: 28px;
              font-weight: 600;
            }
            .header p {
              margin: 0;
              font-size: 16px;
              opacity: 0.95;
            }
            .content {
              padding: 40px 30px;
            }
            .failed-list {
              background: #fff3e0;
              padding: 25px;
              border-radius: 8px;
              margin: 25px 0;
              border: 1px solid #ffccbc;
            }
            .failed-list ul {
              list-style: none;
              padding: 0;
              margin: 0;
            }
            .failed-list li:last-child {
              border-bottom: none !important;
              margin-bottom: 0 !important;
              padding-bottom: 0 !important;
            }
            .button {
              display: inline-block;
              padding: 14px 28px;
              background: #e69216;
              color: white !important;
              text-decoration: none;
              border-radius: 6px;
              margin: 10px 5px;
              font-weight: 500;
            }
            .button:hover {
              background: #d67d0a;
            }
            .button-container {
              text-align: center;
              margin-top: 30px;
            }
            .footer {
              text-align: center;
              padding: 30px;
              background-color: #fafafa;
              color: #666;
              font-size: 12px;
              border-top: 1px solid #eeeeee;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⚠️ Problema con tu orden</h1>
              <p>Orden #${orderId}</p>
            </div>
            <div class="content">
              <p style="font-size: 16px;">¡Hola! 👋</p>
              <p style="font-size: 15px;">Lamentamos informarte que hubo un problema al generar algunas de tus canciones:</p>

              <div class="failed-list">
                <ul>
                  ${failedList}
                </ul>
              </div>

              <p style="background: #e3f2fd; padding: 20px; border-radius: 8px; border-left: 4px solid #2196f3;">
                <strong style="color: #1976d2;">💬 ¿Necesitas ayuda?</strong><br>
                No te preocupes, nuestro equipo está disponible para ayudarte. Te contactaremos pronto para resolver este problema o puedes escribirnos directamente.
              </p>

              <div class="button-container">
                <a href="${FRONTEND_URL}/orders/${orderId}" class="button">Ver detalles de mi orden</a>
              </div>
            </div>
            <div class="footer">
              <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
              <p>© ${new Date().getFullYear()} Make Ur Songs - Creando música personalizada con IA</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const textContent = `
⚠️ Problema con tu orden #${orderId}

¡Hola!

Lamentamos informarte que hubo un problema al generar algunas de tus canciones:

${failedSongs.map(s => `- ${s.title || 'Sin título'}: ${s.error || 'Error desconocido'}`).join('\n')}

No te preocupes, nuestro equipo está revisando el problema y te contactaremos pronto para resolverlo.

Ver detalles de mi orden: ${FRONTEND_URL}/orders/${orderId}

© ${new Date().getFullYear()} Make Ur Songs
      `.trim();

      const { data, error } = await this.resend.emails.send({
        from: EMAIL_FROM,
        to: userEmail,
        subject: '⚠️ Problema con la generación de tus canciones',
        html: htmlContent,
        text: textContent,
      });

      if (error) {
        console.error('❌ Error enviando email de error con Resend:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      console.log('✅ Email de error enviado exitosamente:', data.id);

      return {
        success: true,
        messageId: data.id,
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
    if (!this.isConfigured()) {
      console.warn('⚠️ Servicio de email no configurado');
      return false;
    }

    console.log('✅ Servicio de email Resend configurado correctamente');
    return true;
  }
}

// Exportar instancia singleton
export const resendEmailService = new ResendEmailService();
