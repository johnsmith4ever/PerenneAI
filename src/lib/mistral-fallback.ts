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
  
  // Load balance keys by shuffling them
  const shuffledKeys = [...keys].sort(() => Math.random() - 0.5);

  let apiMessages = [];
  if (options.system) {
    apiMessages.push({ role: "system", content: options.system });
  }
  
  if (options.messages) {
    apiMessages.push(...options.messages);
  } else if (options.prompt) {
    apiMessages.push({ role: "user", content: options.prompt });
  }

  let lastError: Error | null = null;
  let data: any = null;

  for (const key of shuffledKeys) {
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
      if (res.status === 429) {
        lastError = new Error(`Mistral API Error: ${res.status} ${err}`);
        continue; // Try the next key
      }
      throw new Error(`Mistral API Error: ${res.status} ${err}`);
    }

    data = await res.json();
    break; // Success! Break out of the loop
  }

  if (!data) {
    throw lastError || new Error("All Mistral API keys failed.");
  }

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

import { createMistral } from "@ai-sdk/mistral";

/** Custom fetch for Mistral that rotates keys on 429 Rate Limit errors */
export const customMistralFetch = async (url: RequestInfo | URL, init?: RequestInit) => {
  const keys = [process.env.MISTRAL_API_KEY, process.env.MISTRAL_API_KEY_2].filter(Boolean) as string[];
  const shuffledKeys = [...keys].sort(() => Math.random() - 0.5);
  
  let lastResponse: Response | undefined;
  for (const key of shuffledKeys) {
    const headers = new Headers(init?.headers);
    headers.set("authorization", `Bearer ${key}`);
    
    const res = await fetch(url, {
      ...init,
      headers
    });
    if (res.status === 429) {
      lastResponse = res;
      continue;
    }
    return res;
  }
  return lastResponse || fetch(url, init); // Fallback if all fail
};

/** A robust Mistral provider that automatically handles rate limit failovers */
export const mistralProvider = createMistral({
  fetch: customMistralFetch,
});
