import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const generateLyrics = async (prompt, genres, dedicatedTo) => {
  try {
    // Construir el prompt para la IA
    let aiPrompt = `Genera letras para una canción personalizada basada en los siguientes detalles:

Descripción: ${prompt}
Géneros musicales: ${genres.join(', ')}
${dedicatedTo ? `Dedicada a: ${dedicatedTo}` : ''}

Por favor genera letras que:
- Reflejen el estilo de los géneros mencionados
- Tengan una estructura de canción completa (verso, coro, verso, coro, puente, coro)
- Tengan entre 150-300 palabras

Formato la respuesta con las secciones claramente marcadas:
[VERSO 1]
[CORO]
[VERSO 2]
[CORO]
[PUENTE]
[CORO FINAL]`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "Eres un compositor profesional especializado en escribir letras emotivas y personalizadas para canciones. Escribes en español y tus letras son siempre apropiadas y de alta calidad."
        },
        {
          role: "user",
          content: aiPrompt
        }
      ],
      max_tokens: 600,
      temperature: 0.8,
    });

    const lyrics = completion.choices[0].message.content;
    return lyrics;

  } catch (error) {
    console.error('Error generating lyrics with OpenAI:', error);
    throw new Error('Error generando letras con IA');
  }
};