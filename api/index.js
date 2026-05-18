export const maxDuration = 60;

const DEFAULT_MODEL = "gemini-3.1-pro-preview";
const MAX_TEXT_LENGTH = 60000;
const GEMINI_TIMEOUT_MS = 55000;

const systemInstructionText = `
Eres un asistente clinico para apoyar la valoracion preanestesica. Tu respuesta es material de apoyo para profesionales sanitarios y no sustituye el criterio medico, la valoracion presencial ni los protocolos locales.

Analiza solo la informacion aportada. No inventes datos. Si falta informacion, dilo de forma explicita. Marca incertidumbres y riesgos potenciales sin convertirlos en diagnosticos cerrados.

Devuelve siempre la respuesta en espanol y exactamente con esta estructura:

<informe>
Valoracion preanestesica breve y clara, incluyendo:
- Resumen clinico relevante.
- Riesgos anestesicos o perioperatorios detectados.
- Alergias, medicacion y antecedentes relevantes si aparecen.
- Datos importantes que faltan para completar la valoracion.
- Recomendaciones prudentes y accionables para revisar antes de la intervencion.
</informe>

<datos_automatizacion>
{
  "resumen_clinico": "",
  "riesgos_detectados": [],
  "alergias": [],
  "medicacion_relevante": [],
  "pruebas_pendientes": [],
  "alertas": [],
  "recomendaciones_preoperatorias": [],
  "datos_insuficientes": []
}
</datos_automatizacion>

El bloque datos_automatizacion debe contener JSON valido, sin comentarios y sin markdown.
`;

function setCorsHeaders(req, res, allowedOrigin) {
  const origin = req.headers.origin;

  if (allowedOrigin && origin === allowedOrigin) {
    res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
    res.setHeader("Vary", "Origin");
  }

  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Bridge-Token");
}

function getRequestToken(req) {
  const header = req.headers["x-bridge-token"];
  return Array.isArray(header) ? header[0] : header;
}

export default async function handler(req, res) {
  const allowedOrigin = process.env.ALLOWED_EXTENSION_ORIGIN;
  const sharedSecret = process.env.BRIDGE_SHARED_SECRET;
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  setCorsHeaders(req, res, allowedOrigin);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Metodo no permitido",
      message: "Este endpoint solo acepta POST."
    });
  }

  if (!apiKey) {
    return res.status(500).json({
      error: "Error del servidor",
      message: "GEMINI_API_KEY no configurada."
    });
  }

  if (!allowedOrigin) {
    return res.status(500).json({
      error: "Error del servidor",
      message: "ALLOWED_EXTENSION_ORIGIN no configurada."
    });
  }

  if (!sharedSecret) {
    return res.status(500).json({
      error: "Error del servidor",
      message: "BRIDGE_SHARED_SECRET no configurada."
    });
  }

  if (req.headers.origin !== allowedOrigin) {
    return res.status(403).json({
      error: "Origen no autorizado",
      message: "La extension no esta autorizada para usar este bridge."
    });
  }

  if (getRequestToken(req) !== sharedSecret) {
    return res.status(401).json({
      error: "No autorizado",
      message: "Token del bridge ausente o invalido."
    });
  }

  const { text } = req.body ?? {};
  if (!text || typeof text !== "string" || text.trim() === "") {
    return res.status(400).json({
      error: "Peticion invalida",
      message: "No se proporciono texto clinico para analizar."
    });
  }

  const normalizedText = text.trim();
  if (normalizedText.length > MAX_TEXT_LENGTH) {
    return res.status(413).json({
      error: "Texto demasiado largo",
      message: `El texto clinico supera el limite de ${MAX_TEXT_LENGTH} caracteres.`
    });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      signal: controller.signal,
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemInstructionText }]
        },
        contents: [{
          role: "user",
          parts: [{ text: normalizedText }]
        }],
        generationConfig: {
          temperature: 0.1
        }
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("Gemini API error", {
        status: response.status,
        message: data.error?.message || "Unknown error"
      });

      return res.status(response.status).json({
        error: "Fallo en la API de IA",
        details: data.error?.message || "Error desconocido"
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    if (error.name === "AbortError") {
      return res.status(504).json({
        error: "Tiempo de espera agotado",
        message: "Gemini tardo demasiado en responder."
      });
    }

    console.error("Server communication error", { message: error.message });
    return res.status(500).json({
      error: "Fallo de comunicacion",
      message: "No se pudo completar la peticion al modelo."
    });
  } finally {
    clearTimeout(timeoutId);
  }
}
