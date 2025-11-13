import { Resend } from 'resend';
import crypto from 'crypto';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'soporte@makeursong.com';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://makeursong.com';
const BACKEND_URL = process.env.BACKEND_URL || 'https://api.makeursong.com';
const LOGO_URL = process.env.LOGO_URL || 'https://makeursong.com/logo_sin_fondo.png';

/**
 * Servicio de Email FINAL - Make Ur Song
 *
 * Características:
 * - Optimizado para iPhone/iOS
 * - Magic token auto-login
 * - Auto-play y auto-download
 * - Sin botón compartir (se hace desde web)
 * - Géneros traducidos correctamente
 * - Logo integrado
 * - Regalo = misma canción, versión alternativa
 */
class EmailService {
  constructor() {
    if (!RESEND_API_KEY) {
      console.warn('⚠️ RESEND_API_KEY no configurado');
    }
    this.resend = new Resend(RESEND_API_KEY);
  }

  /**
   * Genera un magic token único para el usuario
   */
  async generateMagicToken(userId, orderId) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 días

    return {
      token,
      expiresAt,
      metadata: {
        userId,
        orderId,
        createdAt: new Date()
      }
    };
  }

  /**
   * Traduce géneros musicales del español al inglés
   */
  translateGenreToEnglish(genre) {
    const translations = {
      // Géneros principales
      'pop': 'Pop',
      'rock': 'Rock',
      'jazz': 'Jazz',
      'blues': 'Blues',
      'country': 'Country',
      'reggae': 'Reggae',
      'metal': 'Metal',
      'punk': 'Punk',
      'folk': 'Folk',
      'soul': 'Soul',
      'funk': 'Funk',
      'disco': 'Disco',
      'techno': 'Techno',
      'house': 'House',
      'trap': 'Trap',
      'drill': 'Drill',
      'gospel': 'Gospel',

      // Géneros latinos
      'salsa': 'Salsa',
      'merengue': 'Merengue',
      'bachata': 'Bachata',
      'cumbia': 'Cumbia',
      'reggaeton': 'Reggaeton',
      'reguetón': 'Reggaeton',
      'mariachi': 'Mariachi',
      'ranchera': 'Ranchera',
      'bolero': 'Bolero',
      'tango': 'Tango',
      'samba': 'Samba',
      'bossa nova': 'Bossa Nova',

      // Géneros electrónicos
      'electrónica': 'Electronic',
      'electronica': 'Electronic',
      'dubstep': 'Dubstep',
      'trance': 'Trance',
      'ambient': 'Ambient',
      'edm': 'EDM',

      // Géneros urbanos
      'hip hop': 'Hip Hop',
      'rap': 'Rap',
      'r&b': 'R&B',

      // Géneros clásicos
      'clásica': 'Classical',
      'clasica': 'Classical',
      'ópera': 'Opera',
      'opera': 'Opera',
      'sinfónica': 'Symphonic',
      'sinfonica': 'Symphonic',

      // Géneros románticos
      'romántica': 'Romantic',
      'romantica': 'Romantic',
      'balada': 'Ballad',

      // Otros
      'indie': 'Indie',
      'alternativa': 'Alternative',
      'experimental': 'Experimental',
      'acústica': 'Acoustic',
      'acustica': 'Acoustic',
    };

    const lowerGenre = genre.toLowerCase().trim();
    return translations[lowerGenre] || genre;
  }

  /**
   * Enriquece las canciones con información de idioma
   */
  enrichSongsWithLanguage(songs) {
    return songs.map(song => {
      const language = song.language ||
                       song.lang ||
                       song.songLanguage ||
                       song.metadata?.language ||
                       'es';

      const validLanguage = ['en', 'es'].includes(language) ? language : 'es';

      return {
        ...song,
        language: validLanguage
      };
    });
  }

  /**
   * Genera el HTML de una canción individual optimizado para iOS
   */
  generateSongHTML(song, texts, magicToken) {
    const genreText = texts.language === 'en'
      ? this.translateGenreToEnglish(song.genre || '')
      : (song.genre || '');

    const variationText = song.variation && texts.variationLabels[song.variation]
      ? ` • ✨ ${texts.variationLabels[song.variation]}`
      : '';

    // URLs con magic token y parámetros para auto-play/download
    const listenUrl = `${FRONTEND_URL}/my-songs?token=${magicToken}&play=${song.id}`;
    const downloadUrl = `${FRONTEND_URL}/my-songs?token=${magicToken}&download=${song.id}`;

    return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; padding: 20px; margin: 0 0 20px 0; border: 1px solid #f0f0f0;">
        <tr>
          <td>
            <!-- Título -->
            <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: 700; color: #333;">
              ${song.title || texts.untitled}
            </p>

            <!-- Género + Variación -->
            ${genreText ? `
              <p style="margin: 0 0 15px 0; font-size: 13px; color: #666; font-style: italic;">
                🎸 ${genreText}${variationText}
              </p>
            ` : ''}

            <!-- Botones optimizados para iOS -->
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top: 10px;">
              <tr>
                <!-- Botón Escuchar (auto-play) -->
                <td style="padding-right: 10px; padding-bottom: 8px;">
                  <a href="${listenUrl}"
                     target="_blank"
                     style="display: inline-block !important;
                            color: #ffffff !important;
                            text-decoration: none !important;
                            font-size: 14px;
                            font-weight: 600;
                            padding: 12px 24px;
                            border-radius: 6px;
                            background-color: #e69216;
                            border: none;
                            text-align: center;
                            min-width: 120px;
                            mso-padding-alt: 0;
                            -webkit-text-size-adjust: none;">
                    🎵 ${texts.listenLink}
                  </a>
                </td>

                <!-- Botón Descargar (auto-download) -->
                <td style="padding-bottom: 8px;">
                  <a href="${downloadUrl}"
                     target="_blank"
                     style="display: inline-block !important;
                            color: #ffffff !important;
                            text-decoration: none !important;
                            font-size: 14px;
                            font-weight: 600;
                            padding: 12px 24px;
                            border-radius: 6px;
                            background-color: #4CAF50;
                            border: none;
                            text-align: center;
                            min-width: 120px;
                            mso-padding-alt: 0;
                            -webkit-text-size-adjust: none;">
                    📥 ${texts.downloadLink}
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `;
  }

  /**
   * Genera el template completo del email optimizado para iOS
   */
  generateEmailTemplate(orderId, songs, detectedLanguage, magicToken) {
    // Separar canción principal y regalo
    const mainSongs = songs.filter(s => !s.isGift);
    const giftSongs = songs.filter(s => s.isGift);

    // Textos bilingües
    const texts = {
      language: detectedLanguage,
      ...(detectedLanguage === 'en' ? {
        // English
        title: '🎵 Your personalized song is ready!',
        subtitle: 'Thank you for trusting us to transform your feelings into music.',
        subtitle2: 'Every note and word were created with you in mind.',
        orderLabel: 'Your order',
        greeting: 'Hello Songmaker! 👋',
        mainSongTitle: 'Your Personalized Song',
        giftTitle: '🎁 Special gift just for you',
        giftText: 'We wanted to thank you in a unique way.',
        giftText2: 'Enjoy an alternative version of your song, created especially for you.',
        variationLabels: {
          alternative: 'Alternative Version',
          acoustic: 'Acoustic Version',
          instrumental: 'Instrumental Version',
          extended: 'Extended Version',
          remix: 'Remix'
        },
        listenLink: 'Listen',
        downloadLink: 'Download',
        viewAllButton: '🎵 View all my songs',
        tipsTitle: '💡 Tips & Recommendations',
        tip1: 'Click "Listen" to go directly to your song and play it',
        tip2: 'Click "Download" to save the MP3 file automatically',
        tip3: 'Your songs will be available forever in your account',
        tip4: 'You can share your songs with anyone from your history',
        supportTitle: 'Need a revision or small adjustment?',
        supportText: 'We want your song to be perfect.',
        supportContact: 'Contact us at:',
        surveyTitle: 'Tell us what you thought of your song',
        surveyText: 'Your opinion helps us improve.',
        surveyButton: 'Leave my feedback',
        closingText: 'Thank you for trusting us to transform your feelings into music.',
        signature: '— The MakeUrSong Team',
        followText: 'Follow us and discover more stories turned into music:',
        footerText: 'This is an automated email, please do not reply to this message.',
        footerCopyright: '© 2025 Make Ur Song - Creating personalized music',
        untitled: 'Untitled song'
      } : {
        // Spanish
        title: '🎵 ¡Tu canción personalizada está lista!',
        subtitle: 'Gracias por confiar en nosotros para transformar tus sentimientos en música.',
        subtitle2: 'Cada nota y palabra fueron creadas pensando en ti.',
        orderLabel: 'Tu orden',
        greeting: '¡Hola Songmaker! 👋',
        mainSongTitle: 'Tu Canción Personalizada',
        giftTitle: '🎁 Regalo especial solo para ti',
        giftText: 'Queríamos agradecerte de una forma única.',
        giftText2: 'Disfruta una versión alternativa de tu canción, creada especialmente para ti.',
        variationLabels: {
          alternative: 'Versión Alternativa',
          acoustic: 'Versión Acústica',
          instrumental: 'Versión Instrumental',
          extended: 'Versión Extendida',
          remix: 'Remix'
        },
        listenLink: 'Escuchar',
        downloadLink: 'Descargar',
        viewAllButton: '🎵 Ver todas mis canciones',
        tipsTitle: '💡 Consejos y Recomendaciones',
        tip1: 'Haz clic en "Escuchar" para ir directamente a tu canción y reproducirla',
        tip2: 'Haz clic en "Descargar" para guardar el archivo MP3 automáticamente',
        tip3: 'Tus canciones estarán disponibles para siempre en tu cuenta',
        tip4: 'Puedes compartir tus canciones con quien quieras desde tu historial',
        supportTitle: '¿Necesitas una revisión o pequeño ajuste?',
        supportText: 'Queremos que tu canción sea perfecta.',
        supportContact: 'Contáctanos en:',
        surveyTitle: 'Cuéntanos qué te pareció tu canción',
        surveyText: 'Tu opinión nos ayuda a mejorar.',
        surveyButton: 'Dejar mi opinión',
        closingText: 'Gracias por confiar en nosotros para transformar tus sentimientos en música.',
        signature: '— El equipo de MakeUrSong',
        followText: 'Síguenos y descubre más historias convertidas en música:',
        footerText: 'Este es un correo automático, por favor no respondas a este mensaje.',
        footerCopyright: '© 2025 Make Ur Song - Creando música personalizada',
        untitled: 'Canción sin título'
      })
    };

    // Generar HTML para canción principal (solo la primera)
    const mainSongHTML = mainSongs.length > 0
      ? this.generateSongHTML(mainSongs[0], texts, magicToken)
      : '';

    // Generar HTML para regalo (si existe)
    const giftSongHTML = giftSongs.length > 0
      ? this.generateSongHTML(giftSongs[0], texts, magicToken)
      : '';

    // URL para ver todas las canciones
    const viewAllUrl = `${FRONTEND_URL}/my-songs?token=${magicToken}`;
    const surveyUrl = `${FRONTEND_URL}/survey/${orderId}?token=${magicToken}`;

    // Template completo optimizado para iOS
    return `
<!DOCTYPE html>
<html lang="${detectedLanguage}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${texts.title}</title>
  <!--[if mso]>
  <style type="text/css">
    table {border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;}
    td {border-collapse: collapse;}
  </style>
  <![endif]-->
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }

    @media screen and (max-width: 600px) {
      .container { width: 100% !important; max-width: 100% !important; }
      .content { padding: 20px !important; }
      .button-table td { display: block !important; width: 100% !important; padding: 5px 0 !important; }
      .button-table a { display: block !important; width: 100% !important; }
      .social-icons td { display: inline-block !important; padding: 0 8px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 30px 0;">

        <!-- Container principal -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="container" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">

          <!-- Header con Logo -->
          <tr>
            <td style="background: linear-gradient(135deg, #e69216 0%, #d67d0a 100%); padding: 50px 30px 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">

              <!-- Logo -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin-bottom: 25px;">
                <tr>
                  <td style="text-align: center;">
                    <img src="${LOGO_URL}"
                         alt="Make Ur Song"
                         width="80"
                         height="80"
                         style="display: block; margin: 0 auto 15px auto; border: none;"/>

                    <div style="background-color: #ffffff; padding: 12px 30px; border-radius: 50px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); display: inline-block;">
                      <span style="font-size: 24px; font-weight: 800; color: #e69216; letter-spacing: 0.5px;">Make Ur Song</span>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Título -->
              <h1 style="margin: 0 0 15px 0; color: #ffffff; font-size: 30px; font-weight: 700; line-height: 1.2;">
                ${texts.title}
              </h1>

              <!-- Subtítulo -->
              <p style="margin: 0 0 8px 0; color: #ffffff; font-size: 16px; line-height: 1.5; opacity: 0.95;">
                ${texts.subtitle}
              </p>
              <p style="margin: 0; color: #ffffff; font-size: 16px; line-height: 1.5; opacity: 0.95;">
                ${texts.subtitle2}
              </p>

              <!-- Número de orden -->
              <div style="margin-top: 20px; padding: 10px 20px; background-color: rgba(255,255,255,0.2); border-radius: 20px; display: inline-block;">
                <span style="color: #ffffff; font-size: 14px; font-weight: 600;">
                  ${texts.orderLabel} #${orderId}
                </span>
              </div>
            </td>
          </tr>

          <!-- Contenido principal -->
          <tr>
            <td class="content" style="padding: 40px 30px;">

              <!-- Saludo -->
              <p style="font-size: 18px; color: #333; margin: 0 0 30px 0; font-weight: 600;">
                ${texts.greeting}
              </p>

              <!-- Tu Canción Personalizada -->
              <div style="margin-bottom: 35px;">
                <h2 style="margin: 0 0 20px 0; font-size: 22px; color: #e69216; font-weight: 700; border-bottom: 3px solid #e69216; padding-bottom: 10px;">
                  ${texts.mainSongTitle}
                </h2>
                ${mainSongHTML}
              </div>

              ${giftSongs.length > 0 ? `
              <!-- Regalo Especial -->
              <div style="margin-bottom: 35px; background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%); padding: 25px; border-radius: 12px; border: 2px dashed #e69216;">
                <h2 style="margin: 0 0 10px 0; font-size: 22px; color: #d67d0a; font-weight: 700;">
                  ${texts.giftTitle}
                </h2>
                <p style="margin: 0 0 5px 0; font-size: 15px; color: #666; line-height: 1.6;">
                  ${texts.giftText}
                </p>
                <p style="margin: 0 0 20px 0; font-size: 15px; color: #666; line-height: 1.6;">
                  ${texts.giftText2}
                </p>
                ${giftSongHTML}
              </div>
              ` : ''}

              <!-- Botón Ver todas mis canciones -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 35px 0;">
                <tr>
                  <td align="center">
                    <a href="${viewAllUrl}"
                       target="_blank"
                       style="display: inline-block !important;
                              text-decoration: none !important;
                              color: #ffffff !important;
                              background: linear-gradient(135deg, #e69216 0%, #d67d0a 100%);
                              border-radius: 8px;
                              padding: 18px 45px;
                              font-size: 17px;
                              font-weight: 700;
                              text-align: center;
                              box-shadow: 0 4px 12px rgba(230, 146, 22, 0.3);
                              letter-spacing: 0.5px;
                              mso-padding-alt: 0;
                              -webkit-text-size-adjust: none;">
                      ${texts.viewAllButton}
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Tips -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); border-radius: 12px; padding: 25px; margin: 35px 0;">
                <tr>
                  <td>
                    <h3 style="margin: 0 0 15px 0; font-size: 18px; color: #1565c0; font-weight: 700;">
                      ${texts.tipsTitle}
                    </h3>
                    <ul style="margin: 0; padding-left: 20px; color: #555; font-size: 14px; line-height: 1.9;">
                      <li>${texts.tip1}</li>
                      <li>${texts.tip2}</li>
                      <li>${texts.tip3}</li>
                      <li>${texts.tip4}</li>
                    </ul>
                  </td>
                </tr>
              </table>

              <!-- Soporte -->
              <div style="margin: 35px 0; padding: 20px; background-color: #fafafa; border-radius: 8px; border-left: 4px solid #4CAF50;">
                <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #333; font-weight: 700;">
                  ${texts.supportTitle}
                </h3>
                <p style="margin: 0 0 10px 0; font-size: 14px; color: #666; line-height: 1.6;">
                  ${texts.supportText}
                </p>
                <p style="margin: 0; font-size: 14px; color: #666;">
                  ${texts.supportContact}
                  <a href="mailto:${EMAIL_FROM}" style="color: #4CAF50; text-decoration: none; font-weight: 600;">
                    ${EMAIL_FROM}
                  </a>
                </p>
              </div>

              <!-- Encuesta -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 35px 0;">
                <tr>
                  <td align="center" style="padding: 25px; background-color: #fff8f0; border-radius: 8px;">
                    <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #333; font-weight: 700;">
                      ${texts.surveyTitle}
                    </h3>
                    <p style="margin: 0 0 20px 0; font-size: 14px; color: #666;">
                      ${texts.surveyText}
                    </p>
                    <a href="${surveyUrl}"
                       target="_blank"
                       style="display: inline-block;
                              text-decoration: none;
                              color: #ffffff;
                              background-color: #e69216;
                              border-radius: 6px;
                              padding: 14px 32px;
                              font-size: 15px;
                              font-weight: 600;
                              text-align: center;">
                      ${texts.surveyButton}
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Cierre -->
              <div style="margin: 40px 0 30px 0; text-align: center; padding: 30px 20px; background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%); border-radius: 8px;">
                <p style="margin: 0 0 15px 0; font-size: 16px; color: #555; line-height: 1.6; font-style: italic;">
                  ${texts.closingText}
                </p>
                <p style="margin: 0; font-size: 15px; color: #e69216; font-weight: 700;">
                  ${texts.signature}
                </p>
              </div>

            </td>
          </tr>

          <!-- Redes Sociales -->
          <tr>
            <td style="background-color: #fafafa; padding: 30px; text-align: center; border-top: 1px solid #eeeeee;">
              <p style="margin: 0 0 20px 0; font-size: 14px; color: #666; font-weight: 600;">
                ${texts.followText}
              </p>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" class="social-icons">
                <tr>
                  <td style="padding: 0 10px;">
                    <a href="https://instagram.com/makeursong" target="_blank" style="text-decoration: none;">
                      <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
                        <span style="color: white; font-size: 20px; font-weight: bold;">📷</span>
                      </div>
                    </a>
                  </td>
                  <td style="padding: 0 10px;">
                    <a href="https://tiktok.com/@makeursong" target="_blank" style="text-decoration: none;">
                      <div style="width: 40px; height: 40px; background-color: #000000; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
                        <span style="color: white; font-size: 20px; font-weight: bold;">🎵</span>
                      </div>
                    </a>
                  </td>
                  <td style="padding: 0 10px;">
                    <a href="https://youtube.com/@makeursong" target="_blank" style="text-decoration: none;">
                      <div style="width: 40px; height: 40px; background-color: #FF0000; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
                        <span style="color: white; font-size: 20px; font-weight: bold;">▶️</span>
                      </div>
                    </a>
                  </td>
                  <td style="padding: 0 10px;">
                    <a href="https://facebook.com/makeursong" target="_blank" style="text-decoration: none;">
                      <div style="width: 40px; height: 40px; background-color: #1877F2; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
                        <span style="color: white; font-size: 20px; font-weight: bold;">f</span>
                      </div>
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f5f5f5; padding: 25px 30px; text-align: center; border-radius: 0 0 12px 12px;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #999;">
                ${texts.footerText}
              </p>
              <p style="margin: 0; font-size: 12px; color: #999;">
                ${texts.footerCopyright}
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  /**
   * Envía el email de canciones completadas
   */
  async sendEmail(orderId, userEmail, userId, songs) {
    try {
      if (!this.resend) {
        console.error('❌ Resend no configurado');
        return { success: false, error: 'Email service not configured' };
      }

      // 1. Generar magic token
      const { token: magicToken, expiresAt } = await this.generateMagicToken(userId, orderId);

      console.log(`🔐 Magic token generado para ${userEmail}`);
      console.log(`   Token: ${magicToken.substring(0, 10)}...`);
      console.log(`   Expira: ${expiresAt}`);

      // 2. Enriquecer datos con información de idioma
      const enrichedSongs = this.enrichSongsWithLanguage(songs);

      console.log(`📊 Email para: ${userEmail}`);
      console.log(`📊 Total canciones: ${enrichedSongs.length}`);
      enrichedSongs.forEach((song, i) => {
        console.log(`   ${i + 1}. ${song.title} - Idioma: ${song.language} - Género: ${song.genre || 'N/A'} - Regalo: ${song.isGift ? 'Sí' : 'No'}`);
      });

      // 3. Detectar idioma del email
      const languageCounts = enrichedSongs.reduce((acc, song) => {
        const lang = song.language || 'es';
        acc[lang] = (acc[lang] || 0) + 1;
        return acc;
      }, {});

      const detectedLanguage = languageCounts.en > (languageCounts.es || 0) ? 'en' : 'es';

      console.log(`🌍 Idioma detectado: ${detectedLanguage}`);
      console.log(`📈 Conteos: EN=${languageCounts.en || 0}, ES=${languageCounts.es || 0}`);

      // 4. Generar template optimizado
      const htmlContent = this.generateEmailTemplate(orderId, enrichedSongs, detectedLanguage, magicToken);

      // Subject según idioma
      const subject = detectedLanguage === 'en'
        ? '🎵 Your personalized song is ready!'
        : '🎵 ¡Tu canción personalizada está lista!';

      // 5. Enviar email
      const { data, error } = await this.resend.emails.send({
        from: EMAIL_FROM,
        to: userEmail,
        subject: subject,
        html: htmlContent,
      });

      if (error) {
        console.error('❌ Error enviando email:', error);
        return { success: false, error: error.message };
      }

      console.log(`✅ Email enviado: ${data.id}`);

      return {
        success: true,
        messageId: data.id,
        magicToken: magicToken,
        expiresAt: expiresAt
      };

    } catch (error) {
      console.error('❌ Error general:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Verifica la configuración del servicio
   */
  isConfigured() {
    return !!RESEND_API_KEY;
  }
}

// Exportar instancia singleton
export const emailService = new EmailService();
export default emailService;
