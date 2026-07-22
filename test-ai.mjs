import fs from 'fs';
import path from 'path';

// Load env vars manually for test script
const envFile = fs.readFileSync(path.resolve('.env.local'), 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) envVars[match[1]] = match[2];
});

async function testGroq() {
  console.log("Testing Llama-3.3-70b-versatile (Groq)...");
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${envVars.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: "Say 'Hello from Groq!'" }]
      })
    });
    const data = await res.json();
    if (data.choices) {
      console.log("✅ Groq/Llama Success:", data.choices[0].message.content);
    } else {
      console.log("❌ Groq/Llama Error:", data);
    }
  } catch (e) {
    console.log("❌ Groq Exception:", e.message);
  }
}

async function testMistral() {
  console.log("\nTesting Mistral Small...");
  try {
    const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${envVars.MISTRAL_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "mistral-small-latest",
        messages: [{ role: "user", content: "Say 'Hello from Mistral!'" }]
      })
    });
    const data = await res.json();
    if (data.choices) {
      console.log("✅ Mistral Success:", data.choices[0].message.content);
    } else {
      console.log("❌ Mistral Error:", data);
    }
  } catch (e) {
    console.log("❌ Mistral Exception:", e.message);
  }
}

async function run() {
  await testGroq();
  await testMistral();
}

run();
