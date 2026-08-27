require('dotenv').config({ path: '.env.local' });
const { GoogleGenAI } = require('@google/genai');

async function main() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: 'write 10 words'
  });
  console.log(JSON.stringify(response, null, 2));
}
main().catch(console.error);
