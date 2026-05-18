// 1. URL corregida apuntando a la versión estable de gemini-1.5-pro
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent';

  try {
    // 2. Envío de la petición estructurada hacia la API de Google
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
        // ELIMINADO: tools: [{ googleSearch: {} }] -> Evita alucinaciones con datos externos
        generationConfig: {
          temperature: 0.0, // Bajado a 0.0 para que sea 100% determinista y analítico
          topP: 0.1 // Ayuda a que las respuestas sean directas y basadas en el texto
        }
      })
    });

    const data = await response.json();

    // Si Google responde con un código de error (ej. clave inválida o mal formato)
    if (!response.ok) {
      return res.status(response.status).json({ 
        error: "Google rechazó la petición", 
        details: data 
      });
    }

    // Retornar la respuesta exitosa directamente al frontend
    res.status(200).json(data);

  } catch (error) {
    // Capturar fallos de red o caídas del servicio puente
    res.status(500).json({ error: "Fallo en el servidor puente", message: error.message });
  }
