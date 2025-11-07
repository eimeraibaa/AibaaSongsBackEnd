import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY, // O CLAUDE_API_KEY
});

export const generateLyrics = async (
  prompt, 
  genres, 
  dedicatedTo, 
  favoriteMemory = null, 
  whatYouLikeMost = null, 
  emotion = null
) => {
  try {
    // Construir el prompt para Claude
    let userPrompt = `Genera letras para una canción personalizada basada en los siguientes detalles:

Descripción principal: ${prompt}
Géneros musicales: ${genres.join(', ')}
${dedicatedTo ? `Dedicada a: ${dedicatedTo}` : ''}
${emotion ? `Emoción a transmitir: ${emotion}` : ''}

INFORMACIÓN ADICIONAL PARA PERSONALIZACIÓN:
${favoriteMemory ? `
🎯 Recuerdo favorito con esta persona:
${favoriteMemory}
` : ''}
${whatYouLikeMost ? `
💖 Lo que más me gusta de esta persona:
${whatYouLikeMost}
` : ''}

Por favor genera letras que:
- Sean parecidas al prompt que te envían.
- Sea lo más parecido al prompt generado por el usuario, sin importar sus errores ortográficos, letra extraña o significado confuso.
- Toma el contexto del prompt muy en serio, para que las letras reflejen fielmente la intención del usuario.
${favoriteMemory ? '- Incorporen sutilmente el recuerdo favorito mencionado en la letra de la canción.' : ''}
${whatYouLikeMost ? '- Reflejen las cualidades que más se aprecian de esta persona.' : ''}
- Tengan una estructura de canción completa (verso, coro, verso, coro, puente, coro)
- Tengan entre 150-300 palabras
- Sean emotivas y capturen los sentimientos descritos
- Fluyan naturalmente con el género musical seleccionado

Formato la respuesta con las secciones claramente marcadas:
[VERSO 1]
[CORO]
[VERSO 2]
[CORO]
[PUENTE]
[CORO FINAL]`;

    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022", // O claude-3-opus-20240229 para mejor calidad
      max_tokens: 1024,
      temperature: 0.8,
      system: "Eres un compositor profesional especializado en escribir letras emotivas y personalizadas para canciones. Escribes en español y tus letras son siempre apropiadas y de alta calidad. Tienes un don especial para capturar recuerdos, emociones y cualidades únicas de las personas en tus letras, haciendo que cada canción sea verdaderamente personal y significativa.",
      messages: [
        {
          role: "user",
          content: userPrompt
        }
      ]
    });

    // Extraer el texto de la respuesta
    const lyrics = message.content[0].text;
    return lyrics;

  } catch (error) {
    console.error('Error generating lyrics with Claude:', error);
    throw new Error('Error generando letras con IA');
  }
};