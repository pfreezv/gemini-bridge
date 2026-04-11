export default async function handler(req, res) {
  // 1. Configuración de cabeceras CORS (Crucial para extensiones de Chrome)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); // Permite peticiones desde cualquier origen (tu extensión)
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Responder automáticamente a las peticiones de pre-vuelo (OPTIONS)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 2. Solo aceptamos peticiones POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Método no permitido. Usa POST." });
  }

  const { text, apiKey } = req.body;

  // Validación básica de entrada
  if (!text || !apiKey) {
    return res.status(400).json({ error: "Faltan datos: se requiere 'text' y 'apiKey'." });
  }

  // 3. Configuración de la llamada a la API de Google Gemini
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `Actúa como un experto. Resume el siguiente texto en 3 puntos clave muy breves:\n\n${text}` }]
        }]
      })
    });

    const data = await response.json();

    // Si Google responde con un error, lo enviamos de vuelta para depurar
    if (!response.ok) {
      return res.status(response.status).json({ 
        error: "Error desde la API de Google", 
        details: data 
      });
    }

    // 4. Enviamos la respuesta exitosa a la extensión
    res.status(200).json(data);

  } catch (error) {
    console.error("Error en el puente:", error);
    res.status(500).json({ error: "Error interno en el servidor puente", message: error.message });
  }
}
