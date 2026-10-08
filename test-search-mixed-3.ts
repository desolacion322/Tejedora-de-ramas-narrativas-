import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3.7-flash',
            contents: 'List 3 cities in France.',
            config: {
                tools: [
                    { googleSearch: {} },
                    { functionDeclarations: [{ name: "test", description: "test", parameters: { type: Type.OBJECT, properties: {} } }] }
                ],
                toolConfig: { include_server_side_tool_invocations: true } as any
            }
        });
        console.log("TEXT:", response.text);
    } catch(e) {
        console.error("ERROR", e.message);
    }
}
run();
