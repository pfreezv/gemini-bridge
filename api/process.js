export default async function handler(req, res) {
  // 1. Cabeceras CORS (Indispensables)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 2. Extracción de datos
  const { text, apiKey } = req.body;

  if (!text || !apiKey) {
    return res.status(400).json({ error: "Faltan parámetros" });
  }

  // 3. LA URL DEFINITIVA (Sin v1beta, usando v1 estable)
  // El modelo se escribe exactamente: gemini-1.5-flash
  const geminiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: `Resume esto en 3 puntos clave:\n\n${text}` }]
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: "Google rechazó la petición", 
        details: data 
      });
    }

    // Enviamos la respuesta de vuelta a tu oficina
    res.status(200).json(data);

  } catch (error) {
    res.status(500).json({ error: "Fallo en el servidor puente", message: error.message });
  }
}
