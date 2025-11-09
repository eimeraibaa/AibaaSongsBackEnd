// =============================================
// SERVICIO DE CORREO ELECTRÓNICO CON RESEND - FIXED
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
   * ⭐ NUEVO: Enriquece los datos de canciones asegurando que tengan la propiedad language
   * Esto soluciona el problema de que el backend no devuelva language en todos los casos
   */
  enrichSongsWithLanguage(songs) {
    return songs.map(song => ({
      ...song,
      // Intenta obtener language de múltiples posibles nombres de propiedades
      language: song.language || song.lang || song.songLanguage || song.translationLanguage || 'es',
      // Asegura que language sea un string válido
      ...(
        typeof song.language !== 'string' || song.language.trim() === ''
          ? { language: 'es' }
          : {}
      )
    }));
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
      console.log(`📊 Total canciones recibidas para email: ${songs.length}`);
      
      // ⭐ NUEVO: Enriquecer datos ANTES de usarlos
      const enrichedSongs = this.enrichSongsWithLanguage(songs);
      
      console.log(`📝 Datos enriquecidos de canciones:`);
      enrichedSongs.forEach((song, i) => {
        console.log(`   ${i + 1}. ID: ${song.id}, Title: ${song.title}, Language: ${song.language}, OrderItemId: ${song.orderItemId}, Variation: ${song.variation || 1}`);
      });

      // Detectar el idioma predominante de las canciones
      const languageCounts = enrichedSongs.reduce((acc, song) => {
        const lang = song.language || 'es';
        acc[lang] = (acc[lang] || 0) + 1;
        return acc;
      }, {});

      console.log(`📊 Conteo de idiomas:`, languageCounts);
      
      // ⭐ MEJORADO: Detección más robusta
      const detectedLanguage = (languageCounts.en || 0) > (languageCounts.es || 0) ? 'en' : 'es';
      console.log(`🌐 Idioma detectado para el email: ${detectedLanguage === 'en' ? 'Inglés' : 'Español'}`);

      // Agrupar canciones por orderItemId para mostrar variaciones juntas
      const songsByOrderItem = enrichedSongs.reduce((acc, song) => {
        const key = song.orderItemId || 'unknown';
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(song);
        return acc;
      }, {});

      console.log(`📦 Grupos de canciones por OrderItem:`);
      Object.entries(songsByOrderItem).forEach(([orderItemId, songsGroup]) => {
        console.log(`   OrderItem ${orderItemId}: ${songsGroup.length} canción(es)`);
        songsGroup.forEach((s, i) => {
          console.log(`      ${i + 1}. ${s.title} (Variation ${s.variation || 1}, Language: ${s.language})`);
        });
      });

      // Detectar el idioma de las letras para los labels del email
      const genreLabel = detectedLanguage === 'en' ? 'Genre' : 'Género';
      const noTitleLabel = detectedLanguage === 'en' ? 'Untitled Song' : 'Canción sin título';
      const variationsLabel = detectedLanguage === 'en' ? 'variations available' : 'variaciones disponibles';
      const listenLabel = detectedLanguage === 'en' ? 'Listen' : 'Escuchar';
      const downloadLabel = detectedLanguage === 'en' ? 'Download' : 'Descargar';
      const processingLabel = detectedLanguage === 'en' ? 'Audio in process...' : 'Audio en proceso...';
      const giftSongLabel = detectedLanguage === 'en' ? 'We gift you this additional song' : 'Te regalamos esta canción adicional';

      // Generar HTML para cada grupo de canciones
      const songsList = Object.values(songsByOrderItem).map(songGroup => {
        // Ordenar por variación (V1, V2, V3...)
        songGroup.sort((a, b) => (a.variation || 1) - (b.variation || 1));

        const baseSong = songGroup[0];
        const baseTitle = baseSong.title?.replace(/\s*\(V\d+\)/, '') || noTitleLabel;

        return `
        <li style="margin-bottom: 25px; padding-bottom: 25px; border-bottom: 1px solid #eee;">
          <strong style="font-size: 17px; color: #333; display: block; margin-bottom: 8px;">${baseTitle}</strong>
          <small style="color: #666; display: block; margin-bottom: 10px;">${genreLabel}: ${baseSong.genre || 'N/A'}</small>
          ${songGroup.length > 1 ? `
            <div style="background: #f9f9f9; padding: 12px; border-radius: 6px; margin-top: 8px;">
              <small style="color: #888; display: block; margin-bottom: 8px;">🎵 ${songGroup.length} ${variationsLabel}:</small>
              ${songGroup.map((song) => `
                <div style="margin: 6px 0; padding: 8px; background: white; border-radius: 4px;">
                  ${song.variation === 2 ? `<div style="background: linear-gradient(135deg, #e69216 0%, #d67d0a 100%); color: white; padding: 6px 10px; border-radius: 4px; margin-bottom: 8px; font-size: 12px; font-weight: 500;">
                    🎁 ${giftSongLabel}: ${song.title}
                  </div>` : ''}
                  <strong style="color: #555; font-size: 14px;">${song.title}</strong><br>
                  ${song.audioUrl && song.id ? `
                    <a href="${song.audioUrl}" target="_blank" style="color: #e69216; text-decoration: none; margin-right: 12px; font-size: 13px;">🎵 ${listenLabel}</a>
                    <a href="${BACKEND_URL}/song/${song.id}/download" style="color: #e69216; text-decoration: none; font-size: 13px;">📥 ${downloadLabel}</a>
                  ` : `
                    <span style="color: #999; font-size: 13px;">${processingLabel}</span>
                  `}
                </div>
              `).join('')}
            </div>
          ` : `
            ${baseSong.audioUrl && baseSong.id ? `
              <a href="${baseSong.audioUrl}" target="_blank" style="color: #e69216; text-decoration: none; margin-right: 15px;">🎵 ${listenLabel}</a>
              <a href="${BACKEND_URL}/song/${baseSong.id}/download" style="color: #e69216; text-decoration: none;">📥 ${downloadLabel}</a>
            ` : `
              <span style="color: #999;">${processingLabel}</span>
            `}
          `}
        </li>
      `;
      }).join('');

      // Textos según el idioma
      const texts = detectedLanguage === 'en' ? {
        title: '🎵 Your songs are ready!',
        orderLabel: 'Your order',
        greeting: 'Hello! 👋',
        intro: `We're excited to inform you that your <strong>${enrichedSongs.length} personalized song${enrichedSongs.length > 1 ? 's have' : ' has'}</strong> been successfully generated.`,
        songsTitle: 'Your songs:',
        variationsLabel: 'variations available',
        listenLink: 'Listen',
        downloadLink: 'Download',
        audioProcessing: 'Audio in process...',
        viewAllButton: 'View all my songs',
        shareButton: '📢 Share my songs',
        shareUrl: FRONTEND_URL,
        tipsTitle: 'Tips:',
        tip1: 'Click "Listen" to play the song in your browser',
        tip2: 'Click "Download" to save the MP3 file directly to your device',
        tip3: 'Your songs will be available in your account forever',
        tip4: 'Share your songs with whoever you want 💜',
        footerText: 'This is an automated email, please do not reply to this message.',
        footerCopyright: `© ${new Date().getFullYear()} Make Ur Songs - Creating personalized music with AI`
      } : {
        title: '🎵 ¡Tus canciones están listas!',
        orderLabel: 'Tu orden',
        greeting: '¡Hola! 👋',
        intro: `Estamos emocionados de informarte que ${enrichedSongs.length > 1 ? 'tus' : 'tu'} <strong>${enrichedSongs.length} cancion${enrichedSongs.length > 1 ? 'es' : ''} personalizada${enrichedSongs.length > 1 ? 's han' : ' ha'}</strong> sido generada${enrichedSongs.length > 1 ? 's' : ''} con éxito.`,
        songsTitle: 'Tus canciones:',
        variationsLabel: 'variaciones disponibles',
        listenLink: 'Escuchar',
        downloadLink: 'Descargar',
        audioProcessing: 'Audio en proceso...',
        viewAllButton: 'Ver todas mis canciones',
        shareButton: '📢 Comparte mis canciones',
        shareUrl: FRONTEND_URL,
        tipsTitle: 'Consejos:',
        tip1: 'Haz clic en "Escuchar" para reproducir la canción en tu navegador',
        tip2: 'Haz clic en "Descargar" para guardar el archivo MP3 directamente en tu equipo',
        tip3: 'Las canciones estarán disponibles en tu cuenta para siempre',
        tip4: 'Comparte tus canciones con quien quieras 💜',
        footerText: 'Este es un correo automático, por favor no respondas a este mensaje.',
        footerCopyright: `© ${new Date().getFullYear()} Make Ur Songs - Creando música personalizada con IA`
      };

      // [Aquí va el resto del HTML - mantiene la estructura idéntica del archivo nuevo]
      // Por brevedad, mostro solo hasta aquí el cambio crítico implementado

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
            .songs-list {
              background: #fafafa;
              padding: 25px;
              border-radius: 8px;
              margin: 25px 0;
            }
            .songs-list ul {
              list-style: none;
              padding: 0;
              margin: 0;
            }
            .songs-list li:last-child {
              border-bottom: none !important;
              margin-bottom: 0 !important;
              padding-bottom: 0 !important;
            }
            .tips-section {
              background: #f0f7ff;
              padding: 25px;
              border-radius: 8px;
              margin: 25px 0;
              border-left: 4px solid #2196f3;
            }
            .tips-section ol {
              padding-left: 20px;
              margin: 10px 0;
            }
            .tips-section li {
              margin: 8px 0;
              color: #555;
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
              <h1>${texts.title}</h1>
              <p>${texts.orderLabel} #${orderId}</p>
            </div>
            <div class="content">
              <p style="font-size: 16px;">${texts.greeting}</p>
              <p style="font-size: 15px;">${texts.intro}</p>

              <div class="songs-list">
                <h3 style="margin-top: 0; color: #333;">${texts.songsTitle}</h3>
                <ul>
                  ${songsList}
                </ul>
              </div>

              <div class="tips-section">
                <strong>${texts.tipsTitle}</strong>
                <ol style="margin: 15px 0 0 0;">
                  <li>${texts.tip1}</li>
                  <li>${texts.tip2}</li>
                  <li>${texts.tip3}</li>
                  <li>${texts.tip4}</li>
                </ol>
              </div>

              <div class="button-container">
                <a href="${FRONTEND_URL}/orders/${orderId}" class="button">${texts.viewAllButton}</a>
              </div>
            </div>
            <div class="footer">
              <p>${texts.footerText}</p>
              <p>${texts.footerCopyright}</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const textContent = `
${texts.title}
Orden #${orderId}

${texts.greeting}

${texts.intro}

${texts.songsTitle}
${enrichedSongs.map((s, i) => `${i + 1}. ${s.title} (${s.genre || 'N/A'})`).join('\n')}

${texts.tipsTitle}
- ${texts.tip1}
- ${texts.tip2}
- ${texts.tip3}
- ${texts.tip4}

${texts.footerText}

${texts.footerCopyright}
      `.trim();

      this.markAsSent(orderId);

      const { data, error } = await this.resend.emails.send({
        from: EMAIL_FROM,
        to: userEmail,
        subject: texts.title,
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
   * Envía email cuando falla la generación (sin cambios)
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
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; background: white; }
            .header { background: #f44336; color: white; padding: 40px 30px; text-align: center; }
            .content { padding: 40px 30px; }
            .failed-list { background: #fff3e0; padding: 25px; border-radius: 8px; margin: 25px 0; }
            .failed-list ul { list-style: none; padding: 0; }
            .failed-list li:last-child { border-bottom: none !important; }
            .button { display: inline-block; padding: 14px 28px; background: #e69216; color: white; text-decoration: none; border-radius: 6px; }
            .footer { text-align: center; padding: 30px; background: #fafafa; font-size: 12px; border-top: 1px solid #eee; }
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
                <ul>${failedList}</ul>
              </div>
              <p style="background: #e3f2fd; padding: 20px; border-radius: 8px; border-left: 4px solid #2196f3;">
                <strong style="color: #1976d2;">💬 ¿Necesitas ayuda?</strong><br>
                No te preocupes, nuestro equipo está disponible para ayudarte.
              </p>
              <div style="text-align: center; margin-top: 30px;">
                <a href="${FRONTEND_URL}/orders/${orderId}" class="button">Ver detalles de mi orden</a>
              </div>
            </div>
            <div class="footer">
              <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
              <p>© ${new Date().getFullYear()} Make Ur Songs</p>
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

No te preocupes, nuestro equipo está revisando el problema.

Ver detalles: ${FRONTEND_URL}/orders/${orderId}

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
        console.error('❌ Error enviando email de error:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Email de error enviado:', data.id);
      return { success: true, messageId: data.id };

    } catch (error) {
      console.error('❌ Error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Verifica la configuración del servicio
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