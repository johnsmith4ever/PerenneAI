import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { generateGeminiText } from "./gemini-fallback";
import { generateMistralText } from "./mistral-fallback";
import { generateClaudeText } from "./claude-fallback";

const groq = createOpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY,
});

const deepseek = createOpenAI({
  baseURL: "https://api.deepseek.com/v1",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateUniversalText({
  model,
  system,
  prompt,
  messages,
  temperature = 0.7,
  maxOutputTokens
}: {
  model: string;
  system: string;
  prompt?: string;
  messages?: any[];
  temperature?: number;
  maxOutputTokens?: number;
}) {
  const m = (model || "").trim().toLowerCase();
  const finalMessages = messages || [{ role: "user", content: prompt }];

  if (m.includes("claude")) {
    const claudeModelName = m.includes("sonnet") ? "claude-sonnet-4-6" : "claude-haiku-4-5-20251001";
    return await generateClaudeText({
      modelName: claudeModelName,
      system,
      messages: finalMessages,
      temperature,
      ...(maxOutputTokens ? { maxOutputTokens } : {})
    });

  } else if (m.includes("deepseek") && (m.includes("pro") || m.includes("reasoner"))) {
    const { text, usage } = await generateText({
      model: deepseek.chat("deepseek-reasoner"),
      system,
      messages: finalMessages,
      temperature,
      ...(maxOutputTokens ? { maxTokens: maxOutputTokens } : {})
    });
    return { text, usage };
  } else if (m.includes("deepseek")) {
    const { text, usage } = await generateText({
      model: deepseek.chat("deepseek-chat"),
      system,
      messages: finalMessages,
      temperature,
      ...(maxOutputTokens ? { maxTokens: maxOutputTokens } : {})
    });
    return { text, usage };
  } else if (m.includes("gpt 5.4") || m.includes("nano") || m.includes("mistral-small") || m.includes("mistral small")) {
    const { text, usage } = await generateText({
      model: openai.chat("gpt-4o-mini"),
      system,
      messages: finalMessages,
      temperature,
      ...(maxOutputTokens ? { maxTokens: maxOutputTokens } : {})
    });
    return { text, usage };
  } else if (m.includes("gpt 6") || m.includes("luna") || m.includes("mistral-large") || m.includes("mistral large")) {
    const { text, usage } = await generateText({
      model: openai.chat("gpt-4o"),
      system,
      messages: finalMessages,
      temperature,
      ...(maxOutputTokens ? { maxTokens: maxOutputTokens } : {})
    });
    return { text, usage };
  } else {
    // Default: all unspecified/Gemini requests route to Deepseek V4.1 Flash
    const { text, usage } = await generateText({
      model: deepseek.chat("deepseek-chat"),
      system,
      messages: finalMessages,
      temperature,
      ...(maxOutputTokens ? { maxTokens: maxOutputTokens } : {})
    });
    return { text, usage };
  }
}

// Alias for backwards compatibility with the previous patches
export const generateAssistantText = generateUniversalText;
