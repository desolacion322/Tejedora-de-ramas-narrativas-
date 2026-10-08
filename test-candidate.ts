import { GoogleGenAI } from "@google/genai";
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3.7-flash',
            contents: 'write a short poem about a cat',
            config: { candidateCount: 3 }
        });
        console.log(response.candidates?.length);
    } catch(e) { console.error("ERROR", e.message); }
}
run();
