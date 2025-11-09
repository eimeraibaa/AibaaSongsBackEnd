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
  emotion = null,
  occasion = null,
  singerGender = null,
) => {
  try {
    // Construir el prompt para OpenAI
      let userPrompt = `Genera letras para una canción personalizada basada en los siguientes detalles:  
Generate personalized song lyrics based on the following details:

Géneros musicales / Musical genres: ${genres.join(', ')}  
${dedicatedTo ? `Dedicada a / Dedicated to: ${dedicatedTo}` : ''}  
${occasion ? `Ocasión especial / Special occasion: ${occasion}` : ''}  
${emotion ? `Emoción principal / Main emotion: ${emotion}` : ''}

INFORMACIÓN ADICIONAL PARA PERSONALIZACIÓN / ADDITIONAL PERSONALIZATION INFO:
${favoriteMemory ? `
🎯 Recuerdo favorito / Favorite memory:
${favoriteMemory}
` : ''}
${whatYouLikeMost ? `
💖 Lo que más te gusta de esta persona / What you love most about this person:
${whatYouLikeMost}
` : ''}
${prompt ? `
📖 Historia o contexto adicional / Additional story or context:
${prompt}
` : ''}
${singerGender ? `
🎤 Voz preferida / Preferred voice:
${singerGender}
` : ''}

Por favor genera letras que / Please generate lyrics that:
- *Mencionen explícitamente la ocasión* indicada *al menos dos veces*:  
  una en *[VERSO 1]* y otra en *[CORO]* o *[PUENTE]* (usa palabras del tipo: “cumpleaños”, “aniversario”, “graduación”, etc.).  
  *Explicitly mention the occasion* at least *twice: once in **[VERSE 1], and once in **[CHORUS]* or *[BRIDGE]* (use the actual occasion words).
- Se adapten automáticamente al *género* (estructura, ritmo, tono y duración). / Auto-adapt to the *genre* (structure, rhythm, tone, duration).

📀 *Guía de géneros / Genre reference guide:*
| Género / Genre | Duración / Duration | Extensión sugerida / Suggested length | Estilo / Style |
|----------------|---------------------|--------------------------------------|----------------|
| *Pop* | 2:50–3:30 | 160–230 palabras / words | Emotivo, universal, lenguaje claro. |
| *Rock* | 3:10–4:30 | 170–240 | Potente, directo, energético. |
| *Reggaetón* | 2:30–3:00 | 140–200 | Rítmico, urbano, con flow natural. |
| *Bachata* | 3:30–4:10 | 190–270 | Romántico, narrativo, cálido. |
| *Balada / Ballad* | 3:40–4:20 | 200–300 | Poético, nostálgico, emocional. |
| *Cumbia / Salsa* | 3:00–4:30 | 150–230 | Alegre, festiva, repetitiva. |
| *Jazz / R&B* | 3:30–4:30 | 170–240 | Suave, elegante, expresivo. |
| *Rap / Hip Hop* | 2:50–3:50 | 220–350 | Narrativo, denso y rítmico. |
| *Electronic* | 2:40–3:20 | 120–180 | Minimalista, con frases cortas y drop. |
| *Country / Folk* | 3:00–4:00 | 170–260 | Cercano, humano, reflexivo. |

🧩 *Estructura y estilo / Structure and style:*
- Usa la *estructura base* [VERSO 1] [CORO] [VERSO 2] [CORO] [PUENTE] [CORO FINAL]  
  pero *ajústala libremente si el género lo requiere*, por ejemplo:  
  - *Pre-Coro* en reggaetón o pop  
  - *Montuno* en salsa o cumbia  
  - *Drop* en electronic  
  - *Intro/Instrumental* en rock o jazz  
  - *Versos extendidos* en rap o folk  
- Mantén la *progresión emocional* a lo largo de la canción.

📏 *Extensión flexible / Flexible length:*  
Usa una extensión *acorde al género y emoción*.  
Como guía: Pop 160–230, Rock 170–240, Reggaetón 140–200, Bachata 190–270, Balada 200–300, Cumbia 150–230, Salsa 160–230, Jazz/R&B 170–240, Country/Folk 170–260, Electronic 120–180, Rap/Hip Hop 220–350.  
Permite un margen de ±30 % si la emoción o narrativa lo requieren.

🪶 *Estilo y tono / Style and tone:*  
- Usa lenguaje *poético, humano y claro*, adaptado al género musical.  
- Si el texto del usuario contiene errores o frases confusas, *interpreta su intención sin alterar la emoción*.  
- *Incorpora sutilmente* recuerdos, cualidades o historia.  
- Si se incluye un nombre o dedicación, *úsalo en los momentos más significativos* (coro o puente).  
- Evita clichés y asegúrate de que el *coro sea pegajoso, emocional y coherente* con la historia.  
- Transmite una sensación de *historia real*, con emoción progresiva de principio a fin.

Formato de la respuesta / Response format:
[VERSO 1]  
[CORO]  
[VERSO 2]  
[CORO]  
[PUENTE]  
[CORO FINAL]`;

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