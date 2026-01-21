import { GoogleGenAI, Type } from "@google/genai";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateThemeStyles = async (prompt: string, currentCss: string): Promise<string> => {
  try {
    const ai = getClient();
    
    const fullPrompt = `
      You are an expert CSS developer specializing in Sphinx documentation themes.
      
      User request: "${prompt}"
      
      Current CSS:
      \`\`\`css
      ${currentCss}
      \`\`\`
      
      Return ONLY the updated CSS content. 
      Maintain the existing CSS variables if they are useful, or update them to match the request. 
      Ensure the CSS is valid, clean, and formatted with 2-space indentation and proper line breaks for human readability.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: fullPrompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            css: {
              type: Type.STRING,
              description: "The complete, valid, and formatted CSS code for the theme."
            },
            explanation: {
              type: Type.STRING,
              description: "A very brief explanation of changes."
            }
          },
          required: ["css"]
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No response from AI");
    
    const data = JSON.parse(jsonText);
    return data.css;

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
