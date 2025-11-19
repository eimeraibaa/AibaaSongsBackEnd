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

      // Detectar el idioma predominante de las canciones
      const languageCounts = songs.reduce((acc, song) => {
        const lang = song.language || 'es';
        acc[lang] = (acc[lang] || 0) + 1;
        return acc;
      }, {});

      const detectedLanguage = languageCounts.en > (languageCounts.es || 0) ? 'en' : 'es';
      console.log(`🌐 Idioma detectado para el email: ${detectedLanguage === 'en' ? 'Inglés' : 'Español'}`);

      // Agrupar canciones por orderItemId para mostrar variaciones juntas
      const songsByOrderItem = songs.reduce((acc, song) => {
        const key = song.orderItemId || 'unknown';
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(song);
        return acc;
      }, {});

      // Detectar el idioma de las letras para los labels del email
      const genreLabel = detectedLanguage.includes('en') ? 'Genre' : 'Género';
      const noTitleLabel = detectedLanguage.includes('en') ? 'Untitled Song' : 'Canción sin título';
      const variationsLabel = detectedLanguage.includes('en') ? 'variations available' : 'variaciones disponibles';
      const listenLabel = detectedLanguage.includes('en') ? 'Listen' : 'Escuchar';
      const downloadLabel = detectedLanguage.includes('en') ? 'Download' : 'Descargar';
      const processingLabel = detectedLanguage.includes('en') ? 'Audio in process...' : 'Audio en proceso...';

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
              ${songGroup.map(song => `
                <div style="margin: 6px 0; padding: 8px; background: white; border-radius: 4px;">
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
      const texts = detectedLanguage.includes('en') ? {
        title: '🎵 Your songs are ready!',
        orderLabel: 'Your order',
        greeting: 'Hello! 👋',
        intro: `We're excited to inform you that your <strong>${songs.length} personalized song${songs.length > 1 ? 's have' : ' has'}</strong> been successfully generated.`,
        songsTitle: 'Your songs:',
        variationsLabel: 'variations available',
        listenLink: 'Listen',
        downloadLink: 'Download',
        audioProcessing: 'Audio in process...',
        viewAllButton: 'View all my songs',
        tipsTitle: 'Tips:',
        tip1: 'Click "Listen" to play the song in your browser',
        tip2: 'Click "Download" to save the MP3 file directly to your device',
        tip3: 'Your songs will be available in your account forever',
        tip4: 'Share your songs with whoever you want 💜',
        contactSupport: 'If you need assistance, feel free to contact our support team.',
        conctactEmail: 'support@makeursong.com',
        footerText: 'This is an automated email, please do not reply to this message.',
        footerCopyright: `© ${new Date().getFullYear()} Make Ur Songs - Creating personalized music`
      } : {
        title: '🎵 ¡Tus canciones están listas!',
        orderLabel: 'Tu orden',
        greeting: '¡Hola! 👋',
        intro: `Estamos emocionados de informarte que ${songs.length > 1 ? 'tus' : 'tu'} <strong>${songs.length} cancion${songs.length > 1 ? 'es' : ''} personalizada${songs.length > 1 ? 's han' : ' ha'}</strong> sido generada${songs.length > 1 ? 's' : ''} con éxito.`,
        songsTitle: 'Tus canciones:',
        variationsLabel: 'variaciones disponibles',
        listenLink: 'Escuchar',
        downloadLink: 'Descargar',
        audioProcessing: 'Audio en proceso...',
        viewAllButton: 'Ver todas mis canciones',
        tipsTitle: 'Consejos:',
        contactSupport: 'Si necesitas ayuda, no dudes en contactar a nuestro equipo de soporte.',
        conctactEmail: 'support@makeursong.com',
        tip1: 'Haz clic en "Escuchar" para reproducir la canción en tu navegador',
        tip2: 'Haz clic en "Descargar" para guardar el archivo MP3 directamente en tu equipo',
        tip3: 'Las canciones estarán disponibles en tu cuenta para siempre',
        tip4: 'Comparte tus canciones con quien quieras 💜',

        footerText: 'Este es un correo automático, por favor no respondas a este mensaje.',
        footerCopyright: `© ${new Date().getFullYear()} Make Ur Songs - Creando música personalizada`
      };

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
              <h1>${texts.title}</h1>
              <p>${texts.orderLabel} #${orderId}</p>
            </div>
            <div class="content">
              <p style="font-size: 16px;">${texts.greeting}</p>
              <p style="font-size: 15px;">${texts.intro}</p>

              <div class="song-list">
                <h3>${texts.songsTitle}</h3>
                <ul>
                  ${songsList}
                </ul>
              </div>

              <div class="button-container">
                <a href="${FRONTEND_URL}/history" class="button">${texts.viewAllButton}</a>
              </div>

              <div class="tips">
                <strong>💡 ${texts.tipsTitle}</strong>
                <ul>
                  <li>${texts.tip1}</li>
                  <li>${texts.tip2}</li>
                  <li>${texts.tip3}</li>
                  <li>${texts.tip4}</li>
                </ul>
              </div>
              <div class="footer">
                <p>${texts.contactSupport}</p>
                <p><a href="mailto:${texts.conctactEmail}" style="color: #e69216; text-decoration: none;">${texts.conctactEmail}</a></p>
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

      const textContent = detectedLanguage.includes('en') ? `
Hello!

Your ${songs.length} personalized song${songs.length > 1 ? 's are' : ' is'} ready!

Order #${orderId}

Your songs:
${songs.map(s => `- ${s.title || 'Untitled'} (${s.genre || 'N/A'})
  ${s.audioUrl && s.id ? `🎵 Listen: ${s.audioUrl}
  📥 Download: ${BACKEND_URL}/song/${s.id}/download` : 'Audio in process...'}`).join('\n\n')}

View all my songs: ${FRONTEND_URL}/history

Enjoy your music!

© ${new Date().getFullYear()} Make Ur Song
      `.trim() : `
¡Hola!

¡Tus ${songs.length} cancion${songs.length > 1 ? 'es' : ''} personalizada${songs.length > 1 ? 's' : ''} está${songs.length > 1 ? 'n' : ''} lista${songs.length > 1 ? 's' : ''}!

Orden #${orderId}

Tus canciones:
${songs.map(s => `- ${s.title || 'Sin título'} (${s.genre || 'N/A'})
  ${s.audioUrl && s.id ? `🎵 Escuchar: ${s.audioUrl}
  📥 Descargar: ${BACKEND_URL}/song/${s.id}/download` : 'Audio en proceso...'}`).join('\n\n')}

Ver todas mis canciones: ${FRONTEND_URL}/history

¡Disfruta tu música!

© ${new Date().getFullYear()} Make Ur Song
      `.trim();

      // Configurar subject según el idioma
      const subject = detectedLanguage.includes('en')
        ? '🎉 Your personalized songs are ready!'
        : '🎉 ¡Tus canciones personalizadas están listas!';

      const { data, error} = await this.resend.emails.send({
        from: EMAIL_FROM,
        to: userEmail,
        subject,
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
              <p>© ${new Date().getFullYear()} Make Ur Songs - Creando música personalizada</p>
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
   * Envía email con la contraseña temporal al usuario
   * @param {string} userEmail - Email del usuario
   * @param {string} userName - Nombre del usuario
   * @param {string} tempPassword - Contraseña temporal
   * @param {string} language - Idioma del email ('es' o 'en')
   */
  async sendTempPasswordEmail(userEmail, userName, tempPassword, language = 'es') {
    try {
      if (!this.isConfigured()) {
        console.warn('⚠️ Servicio de email no configurado. No se enviará el email.');
        return { success: false, message: 'Email service not configured' };
      }

      if (!userEmail) {
        console.warn('⚠️ No se proporcionó email de usuario');
        return { success: false, message: 'No email provided' };
      }

      if (!tempPassword) {
        console.warn('⚠️ No se proporcionó contraseña temporal');
        return { success: false, message: 'No temporary password provided' };
      }

      console.log(`📧 Enviando contraseña temporal a: ${userEmail} (idioma: ${language})`);

      // Textos según el idioma
      const texts = language.includes('en') ? {
        title: '🎵 Welcome to Make Ur Songs!',
        subtitle: 'Your temporary account has been created',
        greeting: 'Hello',
        intro: 'We have created a temporary account for you at Make Ur Songs. Here are your access credentials:',
        emailLabel: 'Access email:',
        passwordLabel: 'Temporary password:',
        importantTitle: '⚠️ IMPORTANT - Please read this:',
        warning1: 'This is a <strong>temporary password</strong>',
        warning2: 'We recommend you <strong>change it as soon as possible</strong> for security',
        warning3: 'You can change it from your profile once you log in',
        warning4: 'Do not share this password with anyone',
        loginButton: '🔓 Log in now',
        profileButton: '👤 Go to my profile',
        stepsTitle: '📋 Next steps:',
        step1: 'Log in with the credentials we provided above',
        step2: 'Complete your profile and <strong>change your password</strong>',
        step3: 'Start creating your personalized songs! 🎵',
        disclaimer: 'If you did not request this account, you can ignore this message.',
        contactSupport: 'If you need assistance, feel free to contact our support team.',
        conctactEmail: 'support@makeursong.com',
        footerText: 'This is an automated email, please do not reply to this message.',
        footerCopyright: `© ${new Date().getFullYear()} Make Ur Songs - Creating personalized music`
      } : {
        title: '🎵 ¡Bienvenido a Make Ur Songs!',
        subtitle: 'Tu cuenta temporal ha sido creada',
        greeting: '¡Hola',
        intro: 'Hemos creado una cuenta temporal para ti en Make Ur Songs. Aquí están tus credenciales de acceso:',
        emailLabel: 'Email de acceso:',
        passwordLabel: 'Contraseña temporal:',
        importantTitle: '⚠️ IMPORTANTE - Por favor lee esto:',
        warning1: 'Esta es una <strong>contraseña temporal</strong>',
        warning2: 'Te recomendamos <strong>cambiarla lo antes posible</strong> por seguridad',
        warning3: 'Puedes cambiarla desde tu perfil una vez que inicies sesión',
        warning4: 'No compartas esta contraseña con nadie',
        loginButton: '🔓 Iniciar sesión ahora',
        profileButton: '👤 Ir a mi perfil',
        stepsTitle: '📋 Próximos pasos:',
        step1: 'Inicia sesión con las credenciales que te proporcionamos arriba',
        step2: 'Completa tu perfil y <strong>cambia tu contraseña</strong>',
        step3: '¡Comienza a crear tus canciones personalizadas! 🎵',
        disclaimer: 'Si no solicitaste esta cuenta, puedes ignorar este mensaje.',
        contactSupport: 'Si necesitas ayuda, no dudes en contactar a nuestro equipo de soporte.',
        conctactEmail: 'support@makeursong.com',
        footerText: 'Este es un correo automático, por favor no respondas a este mensaje.',
        footerCopyright: `© ${new Date().getFullYear()} Make Ur Songs - Creando música personalizada`
      };

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
            .credentials-box {
              background: #fafafa;
              padding: 25px;
              border-radius: 8px;
              margin: 25px 0;
              border: 1px solid #eeeeee;
              border-left: 4px solid #e69216;
            }
            .credentials-box p {
              margin: 10px 0;
              font-size: 15px;
            }
            .password {
              font-family: 'Courier New', monospace;
              font-size: 20px;
              font-weight: bold;
              color: #e69216;
              padding: 12px 16px;
              background: #f5f5f5;
              border-radius: 6px;
              display: inline-block;
              margin: 10px 0;
              border: 2px dashed #e69216;
            }
            .warning {
              background: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 20px;
              margin: 25px 0;
              border-radius: 4px;
            }
            .warning strong {
              color: #856404;
              display: block;
              margin-bottom: 10px;
            }
            .warning ul {
              margin: 0;
              padding-left: 20px;
            }
            .warning li {
              margin-bottom: 5px;
              color: #856404;
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
            .steps {
              background: #e3f2fd;
              border-left: 4px solid #2196f3;
              padding: 20px;
              margin-top: 30px;
              border-radius: 4px;
            }
            .steps strong {
              color: #1976d2;
              display: block;
              margin-bottom: 10px;
              font-size: 16px;
            }
            .steps ol {
              margin: 0;
              padding-left: 20px;
            }
            .steps li {
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
              <h1>${texts.title}</h1>
              <p>${texts.subtitle}</p>
            </div>
            <div class="content">
              <p style="font-size: 16px;">${texts.greeting}${userName ? ' ' + userName : ''}! 👋</p>
              <p style="font-size: 15px;">${texts.intro}</p>

              <div class="credentials-box">
                <p><strong>📧 ${texts.emailLabel}</strong></p>
                <p style="font-size: 16px; color: #555;">${userEmail}</p>
                <p style="margin-top: 20px;"><strong>🔑 ${texts.passwordLabel}</strong></p>
                <div class="password">${tempPassword}</div>
              </div>

              <div class="warning">
                <strong>${texts.importantTitle}</strong>
                <ul>
                  <li>${texts.warning1}</li>
                  <li>${texts.warning2}</li>
                  <li>${texts.warning3}</li>
                  <li>${texts.warning4}</li>
                </ul>
              </div>

              <div class="button-container">
                <a href="${FRONTEND_URL}/login" class="button">${texts.loginButton}</a>
                <a href="${FRONTEND_URL}/profile" class="button">${texts.profileButton}</a>
              </div>

              <div class="steps">
                <strong>${texts.stepsTitle}</strong>
                <ol>
                  <li>${texts.step1}</li>
                  <li>${texts.step2}</li>
                  <li>${texts.step3}</li>
                </ol>
              </div>

              <p style="margin-top: 30px; text-align: center; color: #666; font-size: 14px;">
                ${texts.disclaimer}
              </p>
              <p style="margin-top: 30px; text-align: center; color: #666; font-size: 14px;">
                ${texts.contactSupport}
              </p>
              <p style="margin-top: 30px; text-align: center; color: #666; font-size: 14px;">
                ${texts.conctactEmail}
              </p>
            </div>
            <div class="footer">
              <p>${texts.footerText}</p>
              <p>${texts.footerCopyright}</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const textContent = language.includes('en') ? `
${texts.greeting}${userName ? ' ' + userName : ''}!

${texts.title}

${texts.intro}

📧 ${texts.emailLabel} ${userEmail}
🔑 ${texts.passwordLabel} ${tempPassword}

${texts.importantTitle}
• ${texts.warning1}
• ${texts.warning2}
• ${texts.warning3}
• ${texts.warning4}

${texts.stepsTitle}
1. ${texts.step1}
2. ${texts.step2}
3. ${texts.step3}

${texts.disclaimer}

${texts.footerCopyright}
      `.trim() : `
${texts.greeting}${userName ? ' ' + userName : ''}!

${texts.title}

${texts.intro}

📧 ${texts.emailLabel} ${userEmail}
🔑 ${texts.passwordLabel} ${tempPassword}

${texts.importantTitle}
• ${texts.warning1}
• ${texts.warning2}
• ${texts.warning3}
• ${texts.warning4}

${texts.stepsTitle}
1. ${texts.step1}
2. ${texts.step2}
3. ${texts.step3}

${texts.disclaimer}
${texts.contactSupport}
${texts.conctactEmail}

${texts.footerCopyright}
      `.trim();

      const subject = language.includes('en')
        ? '🔐 Your temporary account at Make Ur Songs'
        : '🔐 Tu cuenta temporal en Make Ur Songs';

      const { data, error } = await this.resend.emails.send({
        from: EMAIL_FROM,
        to: userEmail,
        subject,
        html: htmlContent,
        text: textContent,
      });

      if (error) {
        console.error('❌ Error enviando email de contraseña temporal con Resend:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      console.log('✅ Email de contraseña temporal enviado exitosamente:', data.id);

      return {
        success: true,
        messageId: data.id,
      };

    } catch (error) {
      console.error('❌ Error enviando email de contraseña temporal:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Envía email de restablecimiento de contraseña
   * @param {string} userEmail - Email del usuario
   * @param {string} userName - Nombre del usuario
   * @param {string} resetToken - Token de restablecimiento
   * @param {string} language - Idioma del email ('es' o 'en')
   */
  async sendPasswordResetEmail(userEmail, userName, resetToken, language = 'es') {
    try {
      if (!this.isConfigured()) {
        console.warn('⚠️ Servicio de email no configurado. No se enviará el email.');
        return { success: false, message: 'Email service not configured' };
      }

      if (!userEmail) {
        console.warn('⚠️ No se proporcionó email de usuario');
        return { success: false, message: 'No email provided' };
      }

      console.log(`📧 Enviando email de restablecimiento de contraseña a: ${userEmail} (idioma: ${language})`);

      // URL de restablecimiento
      const resetUrl = `${FRONTEND_URL}/reset-password?token=${resetToken}`;

      // Textos según el idioma
      const texts = language.includes('en') ? {
        title: '🔐 Password Reset',
        subtitle: 'We received a request to reset your password',
        greeting: 'Hello',
        intro: 'We received a request to reset the password for your Make Ur Songs account.',
        instructionsTitle: 'How to reset your password:',
        step1: 'Click the button below to reset your password',
        step2: 'You will be redirected to a secure page',
        step3: 'Enter your new password',
        resetButton: '🔓 Reset Password',
        expiryWarning: '⚠️ This link will expire in 1 hour',
        notRequested: 'If you did not request this password reset, please ignore this email. Your password will remain unchanged.',
        securityNote: 'For security reasons, never share this link with anyone.',
        contactSupport: 'If you need assistance, feel free to contact our support team.',
        conctactEmail: 'support@makeursong.com',
        footerText: 'This is an automated email, please do not reply to this message.',
        footerCopyright: `© ${new Date().getFullYear()} Make Ur Songs - Creating personalized music`
      } : {
        title: '🔐 Restablecer Contraseña',
        subtitle: 'Recibimos una solicitud para restablecer tu contraseña',
        greeting: '¡Hola',
        intro: 'Recibimos una solicitud para restablecer la contraseña de tu cuenta de Make Ur Songs.',
        instructionsTitle: 'Cómo restablecer tu contraseña:',
        step1: 'Haz clic en el botón de abajo para restablecer tu contraseña',
        step2: 'Serás redirigido a una página segura',
        step3: 'Ingresa tu nueva contraseña',
        resetButton: '🔓 Restablecer Contraseña',
        expiryWarning: '⚠️ Este enlace expirará en 1 hora',
        notRequested: 'Si no solicitaste restablecer tu contraseña, ignora este correo. Tu contraseña permanecerá sin cambios.',
        securityNote: 'Por seguridad, nunca compartas este enlace con nadie.',
        contactSupport: 'Si necesitas ayuda, no dudes en contactar a nuestro equipo de soporte.',
        conctactEmail: 'support@makeursong.com',
        footerText: 'Este es un correo automático, por favor no respondas a este mensaje.',
        footerCopyright: `© ${new Date().getFullYear()} Make Ur Songs - Creando música personalizada`
      };

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
            .instructions-box {
              background: #f8f9fa;
              border-left: 4px solid #e69216;
              padding: 20px;
              margin: 25px 0;
              border-radius: 4px;
            }
            .instructions-box h3 {
              margin: 0 0 15px 0;
              color: #333;
              font-size: 16px;
              font-weight: 600;
            }
            .instructions-box ol {
              margin: 0;
              padding-left: 20px;
            }
            .instructions-box li {
              margin-bottom: 8px;
              color: #555;
            }
            .button-container {
              text-align: center;
              margin-top: 30px;
            }
            .button {
              display: inline-block;
              padding: 16px 40px;
              background: linear-gradient(135deg, #e69216 0%, #d67d0a 100%);
              color: white !important;
              text-decoration: none;
              border-radius: 8px;
              font-size: 16px;
              font-weight: 600;
              box-shadow: 0 4px 12px rgba(230, 146, 22, 0.3);
            }
            .button:hover {
              background: linear-gradient(135deg, #d67d0a 0%, #c66d09 100%);
            }
            .warning {
              background: #fff3cd;
              border: 1px solid #ffc107;
              padding: 15px;
              margin: 30px 0;
              border-radius: 6px;
            }
            .warning p {
              margin: 0;
              color: #856404;
              font-size: 14px;
            }
            .security-info {
              margin: 30px 0 0 0;
              padding-top: 30px;
              border-top: 1px solid #e0e0e0;
            }
            .security-info p {
              margin: 0 0 15px 0;
              color: #666;
              font-size: 14px;
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
              <h1>${texts.title}</h1>
              <p>${texts.subtitle}</p>
            </div>
            <div class="content">
              <p style="font-size: 16px;">${texts.greeting}${userName ? ' ' + userName : ''},</p>
              <p style="font-size: 15px; margin-top: 15px;">${texts.intro}</p>

              <div class="instructions-box">
                <h3>${texts.instructionsTitle}</h3>
                <ol>
                  <li>${texts.step1}</li>
                  <li>${texts.step2}</li>
                  <li>${texts.step3}</li>
                </ol>
              </div>

              <div class="button-container">
                <a href="${resetUrl}" class="button">${texts.resetButton}</a>
              </div>

              <div class="warning">
                <p><strong>${texts.expiryWarning}</strong></p>
              </div>

              <div class="security-info">
                <p>${texts.notRequested}</p>
                <p><strong>${texts.securityNote}</strong></p>
              </div>

              <p style="margin-top: 30px; text-align: center; color: #666; font-size: 14px;">
                ${texts.contactSupport}
              </p>
              <p style="margin-top: 10px; text-align: center; color: #666; font-size: 14px;">
                <a href="mailto:${texts.conctactEmail}" style="color: #e69216; text-decoration: none;">${texts.conctactEmail}</a>
              </p>
            </div>
            <div class="footer">
              <p>${texts.footerText}</p>
              <p>${texts.footerCopyright}</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const textContent = language.includes('en') ? `
${texts.greeting}${userName ? ' ' + userName : ''},

${texts.title}

${texts.intro}

${texts.instructionsTitle}
1. ${texts.step1}
2. ${texts.step2}
3. ${texts.step3}

Reset your password: ${resetUrl}

${texts.expiryWarning}

${texts.notRequested}
${texts.securityNote}

${texts.footerCopyright}
      `.trim() : `
${texts.greeting}${userName ? ' ' + userName : ''},

${texts.title}

${texts.intro}

${texts.instructionsTitle}
1. ${texts.step1}
2. ${texts.step2}
3. ${texts.step3}

Restablecer contraseña: ${resetUrl}

${texts.expiryWarning}

${texts.notRequested}
${texts.securityNote}

${texts.footerCopyright}
      `.trim();

      const subject = language.includes('en')
        ? '🔐 Reset Your Password - Make Ur Songs'
        : '🔐 Restablecer tu Contraseña - Make Ur Songs';

      const { data, error } = await this.resend.emails.send({
        from: EMAIL_FROM,
        to: userEmail,
        subject,
        html: htmlContent,
        text: textContent,
      });

      if (error) {
        console.error('❌ Error enviando email de restablecimiento con Resend:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      console.log('✅ Email de restablecimiento enviado exitosamente:', data.id);

      return {
        success: true,
        messageId: data.id,
      };

    } catch (error) {
      console.error('❌ Error enviando email de restablecimiento:', error);
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
