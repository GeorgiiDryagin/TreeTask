
import { GoogleGenAI, Type } from "@google/genai";

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API_KEY is missing from environment variables");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const breakdownTaskWithGemini = async (taskTitle: string): Promise<string[]> => {
  const ai = getAiClient();
  if (!ai) return [];

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Break down the task "${taskTitle}" into 3-5 concrete, actionable subtasks.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subtasks: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of actionable subtask titles",
            },
          },
          required: ["subtasks"],
        },
      },
    });

    const text = response.text;
    if (!text) return [];

    const result = JSON.parse(text);
    return result.subtasks || [];
  } catch (error) {
    console.error("Gemini breakdown failed:", error);
    return [];
  }
};
