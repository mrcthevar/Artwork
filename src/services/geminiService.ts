import { GoogleGenAI, Type } from "@google/genai";
import { PaintingAnalysis } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function analyzePainting(title: string, artist: string): Promise<PaintingAnalysis> {
  const prompt = `Analyze the painting "${title}" by ${artist} through the lens of high-end cinematography and photography. 
  
  Format the response as two raw, technical visual descriptions. 
  
  CRITICAL: Do not start sentences with "The cinematography of..." or "Friedrich's work uses...". Start directly with the technical description of the light, the color, or the lens. 
  
  1. Cinematography: Focus on lighting (contrast ratios, dynamic range, shadow patterns), lens equivalents (focal length like 85mm, depth of field), blocking/staging, and directorial style comparisons (e.g. Tarkovsky, Kubrick, Vilmos Zsigmond). 
  
  2. Photography: Focus on composition (rule of thirds, golden ratio, leading lines), camera settings (f/stop, ISO equivalents, highlight rolloff), color science (LUTs, saturation profiles), and master photographer comparisons.
  
  Provide 3-5 short stylistic tags (e.g. "Sfumato", "Tenebrism", "Naturalism").
  Provide 2-3 sentences of historical/technical context.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          cinematography: { type: Type.STRING, description: "Detailed paragraph about cinematography" },
          photography: { type: Type.STRING, description: "Detailed paragraph about photography" },
          tags: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "3-5 stylistic tags"
          },
          historicalContext: { type: Type.STRING },
        },
        required: ["cinematography", "photography", "tags", "historicalContext"],
      },
    },
  });

  return JSON.parse(response.text || "{}");
}
