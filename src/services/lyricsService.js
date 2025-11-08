import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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
    // Construir el prompt para OpenAI
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
${favoriteMemory ? '- Incorpora el recuerdo favorito mencionado en la letra de la canción.' : ''}
${whatYouLikeMost ? '- Refleja las cualidades que más se aprecian de esta persona.' : ''}
- Tengan una estructura de canción completa (verso, coro, verso, coro, puente, coro)
- Tengan entre 150-300 palabras
- Captura los sentimientos descritos
- Fluyan naturalmente con el género musical seleccionado

Formato la respuesta con las secciones claramente marcadas:
[VERSO 1]
[CORO]
[VERSO 2]
[CORO]
[PUENTE]
[CORO FINAL]`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // O gpt-4-turbo para una opción alternativa
      max_tokens: 1024,
      temperature: 0.8,
      messages: [
        {
          role: "system",
          content: "Eres un compositor profesional especializado en escribir letras emotivas y personalizadas para canciones. Escribes en español y tus letras son siempre apropiadas y de alta calidad. Tienes un don especial para capturar recuerdos, emociones y cualidades únicas de las personas en tus letras, haciendo que cada canción sea verdaderamente personal y significativa."
        },
        {
          role: "user",
          content: userPrompt
        }
      ]
    });

    // Extraer el texto de la respuesta
    const lyrics = completion.choices[0].message.content;
    return lyrics;

  } catch (error) {
    console.error('Error generating lyrics with OpenAI:', error);
    throw new Error('Error generando letras con IA');
  }
};