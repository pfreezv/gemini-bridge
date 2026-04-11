export default async function handler(req, res) {
  // 1. Cabeceras CORS para permitir la comunicación con la extensión de Chrome
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Responder a peticiones pre-vuelo
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 2. Seguridad: Solo aceptamos POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const { text, apiKey } = req.body;

  if (!text || !apiKey) {
    return res.status(400).json({ error: "Faltan datos requeridos (text o apiKey)" });
  }

  // 3. URL Estable (v1) de Gemini 1.5 Flash
  const geminiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `Actúa como un experto. Resume el siguiente texto en 3 puntos clave muy breves:\n\n${text}` }]
        }]
      })
    });

    const data = await response.json();

    // Si Google devuelve error, lo pasamos al popup para saber qué pasó
    if (!response.ok) {
      return res.status(response.status).json({ 
        error: "Error desde la API de Google", 
        details: data 
      });
    }

    // 4. Enviamos el JSON de Google de vuelta a la extensión
    res.status(200).json(data);

  } catch (error) {
    console.error("Fallo en el servidor puente:", error);
    res.status(500).json({ error: "Error interno del puente", message: error.message });
  }
}
