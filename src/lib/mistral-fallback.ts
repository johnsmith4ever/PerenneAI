export async function generateMistralText(options: {
  modelName: string;
  system?: string;
  prompt?: string;
  messages?: { role: string; content: string }[];
  maxOutputTokens?: number;
  temperature?: number;
}) {
  const keys = [process.env.MISTRAL_API_KEY, process.env.MISTRAL_API_KEY_2].filter(Boolean) as string[];
  if (keys.length === 0) throw new Error("No Mistral API keys configured.");
  
  // Load balance keys randomly
  const key = keys[Math.floor(Math.random() * keys.length)];

  let apiMessages = [];
  if (options.system) {
    apiMessages.push({ role: "system", content: options.system });
  }
  
  if (options.messages) {
    apiMessages.push(...options.messages);
  } else if (options.prompt) {
    apiMessages.push({ role: "user", content: options.prompt });
  }

  const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${key}`
    },
    body: JSON.stringify({
      model: options.modelName,
      messages: apiMessages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxOutputTokens ?? undefined
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Mistral API Error: ${res.status} ${err}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || "";
  
  return {
    text,
    usage: {
      inputTokens: data.usage?.prompt_tokens ?? 0,
      outputTokens: data.usage?.completion_tokens ?? 0,
      totalTokens: data.usage?.total_tokens ?? 0,
    }
  };
}
