export async function generateClaudeText(options: {
  modelName: string;
  system?: string;
  prompt?: string;
  messages?: { role: string; content: string }[];
  maxOutputTokens?: number;
  temperature?: number;
}) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("No Anthropic API key configured.");
  
  let apiMessages = [];
  
  if (options.messages && options.messages.length > 0) {
    // Anthropic API requires messages to strictly be 'user' or 'assistant'.
    apiMessages = options.messages.filter(m => m.role === "user" || m.role === "assistant");
  } else if (options.prompt) {
    apiMessages.push({ role: "user", content: options.prompt });
  }

  const payload: any = {
    model: options.modelName,
    max_tokens: options.maxOutputTokens || 4096,
    messages: apiMessages,
  };

  // claude-haiku-5-5 deprecates temperature and throws 400 if provided
  if (options.temperature !== undefined && !options.modelName.includes("haiku-5")) {
    payload.temperature = options.temperature;
  }

  if (options.system) {
    payload.system = options.system;
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API Error: ${res.status} ${err}`);
  }

  const data = await res.json();
  const text = data.content?.filter((c: any) => c.type === "text").map((c: any) => c.text).join("") || data.content?.[0]?.text || "";
  
  return {
    text,
    usage: {
      inputTokens: data.usage?.input_tokens ?? 0,
      outputTokens: data.usage?.output_tokens ?? 0,
      totalTokens: (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0),
    }
  };
}
