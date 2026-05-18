// IMPORTANTE: Ampliar el tiempo de ejecución para Vercel (Next.js / Vercel Functions)
// 60 segundos es el máximo en el plan Hobby.
export const maxDuration = 60; 

export default async function handler(req, res) {
  // 1. CORS Restringido: Sustituye 'tu_id_aqui' por el ID real de tu extensión
  const extensionId = 'chrome-extension://abcdefghijklmnopqrstuvwxyz123456';
  
  const origin = req.headers.origin;
  if (origin === extensionId) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 2. Extracción y Validación de Entrada
  const { text } = req.body; 
  if (!text || typeof text !== 'string' || text.trim() === '') {
    return res.status(400).json({ 
      error: "Petición inválida", 
      message: "No se proporcionó texto clínico para analizar." 
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ 
      error: "Error del Servidor", 
      message: "GEMINI_API_KEY no configurada." 
    });
  }

  // 3. System Instructions (Idealmente, muévelo a un archivo separado, ej: prompts.js)
  const systemInstructionText = `
    [... TU PROMPT ORIGINAL AQUÍ ...]
  `;

  // Apuntando a un modelo Pro para mayor capacidad de razonamiento clínico
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro:generateContent';

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey 
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemInstructionText }]
        },
        contents: [{
          parts: [{ text: text }]
        }],
        // BÚSQUEDA WEB ELIMINADA para mayor privacidad y velocidad
        generationConfig: {
          temperature: 0.1, 
          // Opcional: Podrías forzar la salida estructurada si solo quisieras el JSON, 
          // pero como pides <informe> y <datos_automatizacion>, déjalo así.
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Error de la API de Gemini:", data);
      return res.status(response.status).json({ 
        error: "Fallo en la API de IA", 
        details: data.error?.message || "Error desconocido"
      });
    }

    res.status(200).json(data);

  } catch (error) {
    console.error("Error en el servidor:", error);
    res.status(500).json({ error: "Fallo de comunicación", message: error.message });
  }
}
