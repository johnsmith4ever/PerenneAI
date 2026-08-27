const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
  const res = await ai.models.generateContent({
    model: 'gemini-3.5-flash',
    contents: 'Based on this passage, create a highly realistic AQA exam for GCSE students at Foundation tier. Generate exactly: 4 short answer questions (1 mark each), and 2 long paragraph (8 marks / 2 PETALs) questions. Focus the questions on analyzing a balanced mix of literary elements (theme, character, language, and structure). EACH question MUST explicitly state the marks at the end (e.g. [4 marks]). For any paragraph or 8-mark questions, you MUST explicitly state "(Use the PETAL structure)" in the question text. Do not include any intro, just the raw questions separated by newlines.\n\nPassage:\nThe estuary lay before us like a sheet of tarnished pewter, cold and unresponsive to the dying amber of the November sun. Along its jagged rim, the skeletal cranes of the deep-water port stood like iron sentinels, frozen mid-gesture in an eternal, silent plea to the heavens. Here, the modern world did not merely exist; it dominated, aggressively carving its signature into the ancient mudflats.'
  });
  console.log("RESPONSE:", res.text);
}
run();
