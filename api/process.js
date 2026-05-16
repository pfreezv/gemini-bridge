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

  // 2. Instrucciones del Sistema (Contexto y Rol del Anestesiólogo)
  const systemInstructionText = `
# ROL Y CONTEXTO
Eres un anestesiólogo experto especializado en medicina preoperatoria y valoración del riesgo quirúrgico. 

Tu objetivo es analizar los datos clínicos no estructurados que proporciona el usuario y generar simultáneamente un informe de valoración legible y un objeto JSON estructurado para un sistema de automatización médico.

# REGLAS CRÍTICAS DE PROCESAMIENTO
1. **Analítica:** Debes buscar y extraer meticulosamente los valores de Hb, HCT, Plaquetas, INR, TTPA, Creatinina y Filtrado Glomerular (FG) siempre que existan en el texto de entrada.
2. **Conclusiones y Observaciones:** En el apartado de observaciones (tanto del informe como del JSON), es OBLIGATORIO incluir la clasificación ASA del paciente y confirmar si es "Apto para anestesia". 
3. **Formato de Conclusiones:** El ASA y la aptitud deben ir primero. Inmediatamente después, debes insertar un salto de línea estricto, seguido del resto de recomendaciones o conclusiones preanestésicas según la medicación del paciente.
4. **Fidelidad:** No inventes datos (alucinación). Si un dato (como alergias o peso) no aparece en el texto original, déjalo en blanco en el JSON o indica "No consta" en el informe.

# FORMATO DE SALIDA REQUERIDO
Debes devolver tu respuesta dividida ESTRICTAMENTE en dos bloques delimitados por etiquetas. No añadas texto fuera de estas etiquetas.

<informe>
Edad: [Valor] | Peso: [Valor] | Talla: [Valor]

Alergias:
[Listado]

Antecedentes:
- Antecedentes Médicos: [Listado]
- Antecedentes Quirúrgicos: [Listado]

Analítica:
-- Fecha de analítica: [Fecha]
-- Observaciones:
---- Hb: [Valor], HCT: [Valor], Plaquetas: [Valor], INR: [Valor], TTPA: [Valor], Creatinina: [Valor], Filtrado Glomerular: [Valor]

Valoración ASA: [Clasificación]

Recomendaciones preanestésicas:
[ASA] - [Apto/No Apto]
[Salto de línea obligatorio]
[Recomendaciones según los fármacos y resto de conclusiones]
</informe>

<datos_automatizacion>
{
  "metadatos": {
    "descripcion": "Valoración preanestésica generada automáticamente"
  },
  "configuracion": {
    "pausaBase": 1000,
    "pausaLarga": 2500,
    "intentarGuardadoFinal": true
  },
  "datos": {
    "alergias": {
      "marcarNo": [true/false según aplique],
      "texto": "[Detalle o vacío]"
    },
    "antecedentes": {
      "patologicos": ["[Array de strings]"],
      "quirurgicos": ["[Array de strings]"]
    },
    "exploracion": {
      "analitica": {
        "activar": [true/false],
        "fecha": "[Fecha si existe]",
        "observaciones": "[Hb, HCT, Plaquetas, etc.]"
      },
      "cardiovascular": {
        "activar": true,
        "ecg": "[Hallazgos o valor por defecto: Ritmo sinusal...]"
      },
      "respiratorio": {
        "activar": true,
        "rxTorax": "[Hallazgos o valor por defecto: Sin signos/alteraciones patológicas evidentes.]"
      }
    },
    "conclusiones": {
      "decision": "[Apto / No Apto]",
      "destinoValue": "[Destino si aplica]",
      "observaciones": "[ASA y Apto]\\n[Resto de conclusiones]"
    },
    "estadoFisico": {
      "crearASA": [true/false],
      "asaValue": "[Valor ASA]",
      "autoGuardarEscala": false
    }
  }
}
</datos_automatizacion>
`;

  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent';

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
        // 3. NUEVO: Añadimos la herramienta de búsqueda en Google
        tools: [
          {
            googleSearch: {}
          }
        ],
        generationConfig: {
          temperature: 0.1
        }
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
