const { generateText } = require('ai');
const { createOpenAI } = require('@ai-sdk/openai');

const deepseek = createOpenAI({
  baseURL: 'https://api.deepseek.com/v1',
  apiKey: process.env.DEEPSEEK_API_KEY,
});

async function main() {
  const { usage } = await generateText({
    model: deepseek.chat('deepseek-chat'),
    prompt: 'Say hello!',
  });
  console.log("USAGE IS:", usage);
}
main().catch(console.error);
