import { GoogleGenAI } from "@google/genai";
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-1.5-pro',
            contents: 'hi',
        });
        console.log("1.5-pro:", response.text);
    } catch(e) { console.error("1.5-pro ERROR", e.message); }
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-pro',
            contents: 'hi',
        });
        console.log("gemini-pro:", response.text);
    } catch(e) { console.error("gemini-pro ERROR", e.message); }
}
run();
