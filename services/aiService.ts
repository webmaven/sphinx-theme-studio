import { GoogleGenAI, Type } from "@google/genai";
import { AiSettings } from '../types';

const SYSTEM_INSTRUCTION = `
You are an expert CSS developer specializing in Sphinx documentation themes.
Return ONLY the updated CSS content. 
Maintain the existing CSS variables if they are useful, or update them to match the request. 
Ensure the CSS is valid, clean, and formatted with 2-space indentation.
`;

export const generateThemeStyles = async (prompt: string, currentCss: string, settings: AiSettings): Promise<string> => {
  const fullPrompt = `
    User request: "${prompt}"
    
    Current CSS:
    \`\`\`css
    ${currentCss}
    \`\`\`
    
    Return ONLY the updated CSS content.
  `;

  try {
    if (settings.provider === 'gemini') {
        const apiKey = process.env.API_KEY;
        if (!apiKey) throw new Error("System API Key not found");
        
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: fullPrompt,
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        css: { type: Type.STRING }
                    },
                    required: ["css"]
                }
            }
        });

        const jsonText = response.text;
        if (!jsonText) throw new Error("No response from AI");
        const data = JSON.parse(jsonText);
        return data.css;
    } 
    else if (settings.provider === 'openai') {
        if (!settings.openAiKey) throw new Error("OpenAI API Key is required");
        
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${settings.openAiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                    { role: 'system', content: SYSTEM_INSTRUCTION },
                    { role: 'user', content: fullPrompt }
                ],
                response_format: { type: "json_object" }
            })
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error?.message || "OpenAI API Error");
        }

        const data = await res.json();
        const content = data.choices[0]?.message?.content;
        if (!content) throw new Error("No content from OpenAI");
        
        const parsed = JSON.parse(content);
        return parsed.css || parsed.CSS || content; // Fallback
    }
    else if (settings.provider === 'anthropic') {
         if (!settings.anthropicKey) throw new Error("Anthropic API Key is required");
         
         // Basic Anthropic implementation (Client-side calls to Anthropic require CORS support or proxy, 
         // but assuming user has a key that allows it or is testing locally)
         const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': settings.anthropicKey,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json',
                'dangerously-allow-browser': 'true' // Required for client-side usage
            },
            body: JSON.stringify({
                model: "claude-3-5-sonnet-20240620",
                max_tokens: 4096,
                system: SYSTEM_INSTRUCTION,
                messages: [
                    { role: "user", content: fullPrompt }
                ]
            })
         });

         if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error?.message || "Anthropic API Error");
         }

         const data = await res.json();
         // Anthropic usually returns text, we need to extract CSS block if not JSON mode, 
         // but we can try to prompt for JSON or just extract.
         // For now assuming the prompt instruction works well enough.
         const text = data.content[0]?.text;
         
         // Simple extraction if markdown code blocks are present
         const match = text.match(/```css\s*([\s\S]*?)\s*```/);
         if (match) return match[1];
         return text;
    }

    throw new Error("Invalid Provider");

  } catch (error) {
    console.error("AI Service Error:", error);
    throw error;
  }
};
