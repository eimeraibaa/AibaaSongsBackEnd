import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Detecta el idioma predominante en un texto
 * @param {string} text - Texto a analizar
 * @returns {string} - 'en' para inglés, 'es' para español
 */
export const detectLanguage = (text) => {
  if (!text || text.trim() === '') {
    return 'es'; // Por defecto español
  }

  // Palabras comunes en inglés que no existen en español
  const englishWords = /\b(the|and|is|are|was|were|have|has|had|will|would|could|should|can|may|might|must|shall|being|been|do|does|did|my|your|his|her|their|our|this|that|these|those|with|from|about|into|through|during|before|after|above|below|between|among|because|since|while|where|when|what|which|who|whom|whose|why|how|all|each|every|both|few|more|most|other|some|such|only|own|same|than|too|very|just|already|also|only|still|even|however|therefore|thus|hence|yet)\b/gi;

  // Palabras comunes en español que no existen en inglés
  const spanishWords = /\b(el|la|los|las|un|una|unos|unas|de|del|al|y|o|pero|porque|para|por|con|sin|sobre|entre|hasta|desde|hacia|cuando|donde|como|que|quien|cual|cuales|muy|más|menos|también|tampoco|siempre|nunca|cada|todo|toda|todos|todas|este|esta|estos|estas|ese|esa|esos|esas|aquel|aquella|aquellos|aquellas|mi|tu|su|nuestro|nuestra|vuestro|vuestra|ser|estar|haber|tener|hacer|decir|poder|deber|querer|saber|ver|dar|venir|salir|poner|pasar|llegar|seguir|quedar|creer|hablar|llevar|dejar|sentir|tomar|vivir|conocer|parecer|resultar|encontrar|llamar|volver|pensar|empezar|deber|conseguir|sentarse|acabar|permitir|parecer|quedar|intentar|recordar|considerar|aparecer|producir|tratar|llevar|observar|suponer|lograr|expresar|reconocer|señalar|ocurrir|cumplir|realizar|comprender|contener|sostener|alcanzar|asegurar|presentar|indicar|descubrir|escribir|aumentar|cambiar|establecer|explicar|existir|formar|ofrecer|recibir|recordar|reducir|representar|resolver|superar|mostrar|añadir|comenzar|crear|desarrollar|evitar|mejorar|obtener|perder|publicar|repetir|responder|sufrir|unir|utilizar|valer)\b/gi;

  const englishMatches = (text.match(englishWords) || []).length;
  const spanishMatches = (text.match(spanishWords) || []).length;

  console.log(`🌐 Detección de idioma - Inglés: ${englishMatches} palabras, Español: ${spanishMatches} palabras`);

  // Si hay más palabras en inglés que en español, es inglés
  return englishMatches > spanishMatches ? 'en' : 'es';
};

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
    // Detectar el idioma del prompt
    const combinedText = `${prompt || ''} ${dedicatedTo || ''} ${favoriteMemory || ''} ${whatYouLikeMost || ''} ${emotion || ''} ${occasion || ''}`;
    const detectedLanguage = detectLanguage(combinedText);

    console.log(`🌐 Idioma detectado: ${detectedLanguage === 'en' ? 'Inglés' : 'Español'}`);

    // Construir el prompt según el idioma detectado
    let userPrompt;
    let systemPrompt;

    if (detectedLanguage === 'en') {
      // Prompt en inglés
      systemPrompt = "You are a professional songwriter specialized in writing emotional and personalized song lyrics. You write in English and your lyrics are always appropriate and high-quality. You have a special gift for capturing memories, emotions, and unique qualities of people in your lyrics, making each song truly personal and meaningful.";

      userPrompt = `Generate personalized song lyrics based on the following details:

Musical genres: ${genres.join(', ')}
${dedicatedTo ? `Dedicated to: ${dedicatedTo}` : ''}
${occasion ? `Special occasion: ${occasion}` : ''}
${emotion ? `Main emotion: ${emotion}` : ''}

ADDITIONAL PERSONALIZATION INFO:
${favoriteMemory ? `
🎯 Favorite memory:
${favoriteMemory}
` : ''}
${whatYouLikeMost ? `
💖 What you love most about this person:
${whatYouLikeMost}
` : ''}
${prompt ? `
📖 Additional story or context:
${prompt}
` : ''}
${singerGender ? `
🎤 Preferred voice: ${singerGender}
` : ''}

🌐 Language / Idioma:
- Since the main description, emotion, or occasion are written mostly in **English**, generate **the entire song in English** with correct grammar and native fluency.
- **DO NOT** mix both languages in the same song unless explicitly requested (e.g., "I want a bilingual song").
- Review spelling and final coherence before showing the result.
- Ensure **native-like fluency** and correct spelling throughout.

Please generate lyrics that:
- *Explicitly mention the occasion* at least *twice*: once in *[VERSE 1]*, and once in *[CHORUS]* or *[BRIDGE]* (use the actual occasion words).
- Auto-adapt to the *genre* (structure, rhythm, tone, and duration).

📀 *Genre reference guide:*
| Genre | Duration | Suggested length | Style |
|-------|----------|------------------|-------|
| *Pop* | 2:50–3:30 | 160–230 words | Emotional, universal, clear language. |
| *Rock* | 3:10–4:30 | 170–240 | Powerful, direct, energetic. |
| *Reggaetón* | 2:30–3:00 | 140–200 | Rhythmic, urban, natural flow. |
| *Bachata* | 3:30–4:10 | 190–270 | Romantic, narrative, warm. |
| *Ballad* | 3:40–4:20 | 200–300 | Poetic, nostalgic, emotional. |
| *Cumbia / Salsa* | 3:00–4:30 | 150–230 | Joyful, festive, repetitive. |
| *Jazz / R&B* | 3:30–4:30 | 170–240 | Smooth, elegant, expressive. |
| *Rap / Hip Hop* | 2:50–3:50 | 220–350 | Narrative, dense, rhythmic. |
| *Electronic* | 2:40–3:20 | 120–180 | Minimalist, short phrases and drop. |
| *Country / Folk* | 3:00–4:00 | 170–260 | Close, human, reflective. |

🧩 *Structure and style:*
- Use the *base structure* [VERSE 1] [CHORUS] [VERSE 2] [CHORUS] [BRIDGE] [FINAL CHORUS]
  but *adjust freely if the genre requires it*, for example:
  - *Pre-Chorus* in reggaeton or pop
  - *Montuno* in salsa or cumbia
  - *Drop* in electronic
  - *Intro/Instrumental* in rock or jazz
  - *Extended verses* in rap or folk
- Maintain *emotional progression* throughout the song.

📏 *Flexible length:*
Use a length *according to genre and emotion*.
As a guide: Pop 160–230, Rock 170–240, Reggaetón 140–200, Bachata 190–270, Ballad 200–300, Cumbia 150–230, Salsa 160–230, Jazz/R&B 170–240, Country/Folk 170–260, Electronic 120–180, Rap/Hip Hop 220–350.
Allow a margin of ±30% if emotion or narrative requires it.

🪶 *Style and tone:*
- Use *poetic, human, and clear* language, adapted to the musical genre.
- If the user's text contains errors or confusing phrases, *interpret their intention without altering the emotion*.
- *Subtly incorporate* memories, qualities, or story.
- If a name or dedication is included, *use it in the most significant moments* (chorus or bridge).
- Avoid clichés and ensure the *chorus is catchy, emotional, and coherent* with the story.
- Convey a sense of *real story*, with progressive emotion from beginning to end.

Response format:
[VERSE 1]
[CHORUS]
[VERSE 2]
[CHORUS]
[BRIDGE]
[FINAL CHORUS]`;

    } else {
      // Prompt en español
      systemPrompt = "Eres un compositor profesional especializado en escribir letras emotivas y personalizadas para canciones. Escribes en español y tus letras son siempre apropiadas y de alta calidad. Tienes un don especial para capturar recuerdos, emociones y cualidades únicas de las personas en tus letras, haciendo que cada canción sea verdaderamente personal y significativa.";

      userPrompt = `Genera letras para una canción personalizada basada en los siguientes detalles:

Géneros musicales: ${genres.join(', ')}
${dedicatedTo ? `Dedicada a: ${dedicatedTo}` : ''}
${occasion ? `Ocasión especial: ${occasion}` : ''}
${emotion ? `Emoción principal: ${emotion}` : ''}

INFORMACIÓN ADICIONAL PARA PERSONALIZACIÓN:
${favoriteMemory ? `
🎯 Recuerdo favorito:
${favoriteMemory}
` : ''}
${whatYouLikeMost ? `
💖 Lo que más te gusta de esta persona:
${whatYouLikeMost}
` : ''}
${prompt ? `
📖 Historia o contexto adicional:
${prompt}
` : ''}
${singerGender ? `
🎤 Voz preferida: ${singerGender}
` : ''}

🌐 Idioma / Language:
- Si la descripción principal, emoción u ocasión están escritas mayormente en **español**, genera **toda la canción en español** con gramática correcta y naturalidad nativa.
- Si están mayormente en **inglés**, genera **toda la canción en inglés fluido y gramaticalmente correcto**, evitando errores ortográficos o traducciones literales.
- Si el texto mezcla ambos idiomas, detecta el idioma predominante y usa solo ese para la letra completa.
- **NO** combines ambos idiomas en una misma canción, a menos que el usuario lo indique explícitamente (por ejemplo: "quiero una canción bilingüe").
- Revisa ortografía y coherencia final antes de mostrar el resultado.
- Si se elige inglés, asegura **fluidez nativa** y ortografía correcta. Si se elige español, asegura **gramática adecuada y tildes correctas**.

Por favor genera letras que:
- *Mencionen explícitamente la ocasión* indicada *al menos dos veces*: una en *[VERSO 1]* y otra en *[CORO]* o *[PUENTE]* (usa palabras del tipo: "cumpleaños", "aniversario", "graduación", etc.).
- Se adapten automáticamente al *género* (estructura, ritmo, tono y duración).

📀 *Guía de géneros:*
| Género | Duración | Extensión sugerida | Estilo |
|--------|----------|-------------------|--------|
| *Pop* | 2:50–3:30 | 160–230 palabras | Emotivo, universal, lenguaje claro. |
| *Rock* | 3:10–4:30 | 170–240 | Potente, directo, energético. |
| *Reggaetón* | 2:30–3:00 | 140–200 | Rítmico, urbano, con flow natural. |
| *Bachata* | 3:30–4:10 | 190–270 | Romántico, narrativo, cálido. |
| *Balada* | 3:40–4:20 | 200–300 | Poético, nostálgico, emocional. |
| *Cumbia / Salsa* | 3:00–4:30 | 150–230 | Alegre, festiva, repetitiva. |
| *Jazz / R&B* | 3:30–4:30 | 170–240 | Suave, elegante, expresivo. |
| *Rap / Hip Hop* | 2:50–3:50 | 220–350 | Narrativo, denso y rítmico. |
| *Electronic* | 2:40–3:20 | 120–180 | Minimalista, con frases cortas y drop. |
| *Country / Folk* | 3:00–4:00 | 170–260 | Cercano, humano, reflexivo. |

🧩 *Estructura y estilo:*
- Usa la *estructura base* [VERSO 1] [CORO] [VERSO 2] [CORO] [PUENTE] [CORO FINAL]
  pero *ajústala libremente si el género lo requiere*, por ejemplo:
  - *Pre-Coro* en reggaetón o pop
  - *Montuno* en salsa o cumbia
  - *Drop* in electronic
  - *Intro/Instrumental* en rock o jazz
  - *Versos extendidos* en rap o folk
- Mantén la *progresión emocional* a lo largo de la canción.

📏 *Extensión flexible:*
Usa una extensión *acorde al género y emoción*.
Como guía: Pop 160–230, Rock 170–240, Reggaetón 140–200, Bachata 190–270, Balada 200–300, Cumbia 150–230, Salsa 160–230, Jazz/R&B 170–240, Country/Folk 170–260, Electronic 120–180, Rap/Hip Hop 220–350.
Permite un margen de ±30% si la emoción o narrativa lo requieren.

🪶 *Estilo y tono:*
- Usa lenguaje *poético, humano y claro*, adaptado al género musical.
- Si el texto del usuario contiene errores o frases confusas, *interpreta su intención sin alterar la emoción*.
- *Incorpora sutilmente* recuerdos, cualidades o historia.
- Si se incluye un nombre o dedicación, *úsalo en los momentos más significativos* (coro o puente).
- Evita clichés y asegúrate de que el *coro sea pegajoso, emocional y coherente* con la historia.
- Transmite una sensación de *historia real*, con emoción progresiva de principio a fin.

Formato de la respuesta:
[VERSO 1]
[CORO]
[VERSO 2]
[CORO]
[PUENTE]
[CORO FINAL]`;
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 1024,
      temperature: 0.8,
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userPrompt
        }
      ]
    });

    // Extraer el texto de la respuesta
    const lyrics = completion.choices[0].message.content;

    // Retornar las letras junto con el idioma detectado
    return {
      lyrics,
      language: detectedLanguage
    };

  } catch (error) {
    console.error('Error generating lyrics with OpenAI:', error);
    throw new Error('Error generando letras con IA');
  }
};
