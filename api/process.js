export default async function handler(req, res) {
  // 1. Cabeceras CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Usa POST" });
  }

  const { text, apiKey } = req.body;

  // 2. Usamos el modelo con el sufijo -latest que es el más compatible
  // Probamos con la v1beta que suele tener mayor disponibilidad para modelos Flash
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

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

    if (!response.ok) {
      // Si falla la v1beta, el error nos dirá por qué, pero el túnel ya funciona
      return res.status(response.status).json({ 
        error: "Google rechazó la petición", 
        details: data 
      });
    }

    res.status(200).json(data);

  } catch (error) {
    res.status(500).json({ error: "Error en el servidor puente", message: error.message });
  }
}
