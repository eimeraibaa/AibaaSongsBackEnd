// =============================================
// SERVICIO DE CORREO ELECTRÓNICO
// Envía notificaciones cuando las canciones están listas
// =============================================

import nodemailer from 'nodemailer';

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;
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
      // Configurar transporter de nodemailer con Gmail
      this.transporter = nodemailer.createTransport({
        service: 'gmail', // Puedes cambiar a 'outlook', 'yahoo', etc.
        auth: {
          user: EMAIL_USER,
          pass: EMAIL_PASSWORD,
        },
      });
      this.readyPromise = Promise.resolve();
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
   * Envía email con la contraseña temporal al usuario
   * @param {string} userEmail - Email del usuario
   * @param {string} userName - Nombre del usuario
   * @param {string} tempPassword - Contraseña temporal
   * @param {string} language - Idioma del email ('es' o 'en')
   */
  async sendTempPasswordEmail(userEmail, userName, tempPassword, language = 'es') {
    try {
      // Esperar a que el transporter esté listo
      await this.ensureReady();

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
        intro: 'We have created a temporary account for you. Here are your access credentials:',
        emailLabel: 'Email:',
        passwordLabel: 'Temporary password:',
        importantTitle: '⚠️ IMPORTANT:',
        warning1: 'This is a temporary password',
        warning2: 'We recommend you change it as soon as possible for security',
        warning3: 'You can change it from your profile once you log in',
        loginButton: 'Log in now',
        profileButton: 'Go to my profile',
        stepsTitle: 'Next steps:',
        step1: 'Log in with your credentials',
        step2: 'Complete your profile and change your password',
        step3: 'Start creating your personalized songs! 🎵',
        footerText: 'This is an automated email, please do not reply to this message.',
        footerCopyright: `© ${new Date().getFullYear()} Make Ur Songs - Creating personalized music`
      } : {
        title: '🎵 ¡Bienvenido a Make Ur Songs!',
        subtitle: 'Tu cuenta temporal ha sido creada',
        greeting: '¡Hola',
        intro: 'Hemos creado una cuenta temporal para ti. Aquí están tus credenciales de acceso:',
        emailLabel: 'Email:',
        passwordLabel: 'Contraseña temporal:',
        importantTitle: '⚠️ IMPORTANTE:',
        warning1: 'Esta es una contraseña temporal',
        warning2: 'Te recomendamos cambiarla lo antes posible por seguridad',
        warning3: 'Puedes cambiarla desde tu perfil una vez que inicies sesión',
        loginButton: 'Iniciar sesión ahora',
        profileButton: 'Ir a mi perfil',
        stepsTitle: 'Próximos pasos:',
        step1: 'Inicia sesión con tus credenciales',
        step2: 'Completa tu perfil y cambia tu contraseña',
        step3: '¡Comienza a crear tus canciones personalizadas! 🎵',
        footerText: 'Este es un correo automático, por favor no respondas a este mensaje.',
        footerCopyright: `© ${new Date().getFullYear()} Make Ur Songs - Creando música personalizada`
      };

      const subject = language.includes('en')
        ? '🔐 Your temporary account at Make Ur Songs'
        : '🔐 Tu cuenta temporal en Make Ur Songs';

      const mailOptions = {
        from: `"🎵 Make Ur Song" <${EMAIL_FROM}>`,
        to: userEmail,
        subject,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #e69216ff 0%, #e69216ff 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .credentials-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #e69216ff; }
              .password { font-family: 'Courier New', monospace; font-size: 18px; font-weight: bold; color: #e69216ff; padding: 10px; background: #f5f5f5; border-radius: 4px; display: inline-block; margin: 10px 0; }
              .button { display: inline-block; padding: 12px 24px; background: #e69216ff; color: white; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
              .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
              .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>${texts.title}</h1>
                <p>${texts.subtitle}</p>
              </div>
              <div class="content">
                <p>${texts.greeting}${userName ? ' ' + userName : ''}! 👋</p>
                <p>${texts.intro}</p>

                <div class="credentials-box">
                  <p><strong>📧 ${texts.emailLabel}</strong> ${userEmail}</p>
                  <p><strong>🔑 ${texts.passwordLabel}</strong></p>
                  <div class="password">${tempPassword}</div>
                </div>

                <div class="warning">
                  <strong>${texts.importantTitle}</strong><br>
                  • ${texts.warning1}<br>
                  • ${texts.warning2}<br>
                  • ${texts.warning3}
                </div>

                <div style="text-align: center; margin-top: 30px;">
                  <a href="${FRONTEND_URL}/login" class="button">${texts.loginButton}</a>
                  <a href="${FRONTEND_URL}/profile" class="button">${texts.profileButton}</a>
                </div>

                <p style="margin-top: 30px;">
                  <strong>${texts.stepsTitle}</strong><br>
                  1. ${texts.step1}<br>
                  2. ${texts.step2}<br>
                  3. ${texts.step3}
                </p>
              </div>
              <div class="footer">
                <p>${texts.footerText}</p>
                <p>${texts.footerCopyright}</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: language.includes('en') ? `
${texts.greeting}${userName ? ' ' + userName : ''}!

${texts.title}

${texts.intro}

📧 ${texts.emailLabel} ${userEmail}
🔑 ${texts.passwordLabel} ${tempPassword}

${texts.importantTitle}
• ${texts.warning1}
• ${texts.warning2}
• ${texts.warning3}

${texts.stepsTitle}
1. ${texts.step1}
2. ${texts.step2}
3. ${texts.step3}

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

${texts.stepsTitle}
1. ${texts.step1}
2. ${texts.step2}
3. ${texts.step3}

${texts.footerCopyright}
        `.trim(),
      };

      const info = await this.transporter.sendMail(mailOptions);

      console.log('✅ Email de contraseña temporal enviado:', info.messageId);

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
      console.error('❌ Error enviando email de contraseña temporal:', error);
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
