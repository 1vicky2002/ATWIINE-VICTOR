import { GoogleGenAI, ThinkingLevel, Type, Modality } from "@google/genai";

const getAI = () => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generateCandidateBio(candidateName: string, slogan: string) {
  const ai = getAI();
  const currentYear = new Date().getFullYear();
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `Write a professional and inspiring political bio for ${candidateName}, with the slogan "${slogan}" in the Uganda ${currentYear} elections. Keep it under 150 words.`,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
    }
  });
  return response.text;
}

export async function generateCandidateImage(prompt: string, aspectRatio: "1:1" | "3:4" | "4:3" | "9:16" | "16:9" | "2:3" | "3:2" | "21:9") {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-image-preview",
    contents: {
      parts: [{ text: prompt }]
    },
    config: {
      imageConfig: {
        aspectRatio: aspectRatio as any,
        imageSize: "1K"
      }
    }
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return null;
}

export async function askAssistant(query: string) {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: query,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
    }
  });
  return response.text;
}
