export default async function handler(req, res) {
  // 1. Cabeceras CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-goog-api-key');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { text, apiKey } = req.body;

  // 2. ACTUALIZACIÓN: Usamos Gemini 2.0 Flash (v1beta)
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey 
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `Actúa como un experto. Resume en 3 puntos clave:\n\n${text}` }]
        }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: "Google rechazó la petición", 
        details: data 
      });
    }

    res.status(200).json(data);

  } catch (error) {
    res.status(500).json({ error: "Fallo en el servidor puente", message: error.message });
  }
}
