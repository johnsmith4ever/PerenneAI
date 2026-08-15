import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { generateGeminiText } from "./gemini-fallback";

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
  const finalMessages = messages || [{ role: "user", content: prompt }];

  if (model === "Claude 4.5 Haiku" || model === "Claude 5 Pro") {
    const claudeModelName = model === "Claude 5 Pro" ? "claude-3-5-sonnet-20241022" : "claude-haiku-4-5-20251001";
    const { text, usage } = await generateText({
      model: anthropic(claudeModelName),
      system,
      messages: finalMessages,
      temperature,
      ...(maxOutputTokens ? { maxTokens: maxOutputTokens } : {})
    });
    return { text, usage };
  } else if (model === "GPT Luna" || model === "GPT Terra") {
    const openaiModelName = model === "GPT Luna" ? "gpt-5.6-luna" : "gpt-5.6-terra";
    const { text, usage } = await generateText({
      model: openai(openaiModelName),
      system,
      messages: finalMessages,
      temperature,
      ...(maxOutputTokens ? { maxTokens: maxOutputTokens } : {})
    });
    return { text, usage };
  } else if (model === "Deepseek-V4-Pro" || model === "Deepseek V4 Pro") {
    const { text, usage } = await generateText({
      model: deepseek.chat("deepseek-reasoner"),
      system,
      messages: finalMessages,
      temperature,
      ...(maxOutputTokens ? { maxTokens: maxOutputTokens } : {})
    });
    return { text, usage };
  } else if (model === "Deepseek-V4-Flash" || model === "Deepseek V4 Flash") {
    const { text, usage } = await generateText({
      model: deepseek.chat("deepseek-chat"),
      system,
      messages: finalMessages,
      temperature,
      ...(maxOutputTokens ? { maxTokens: maxOutputTokens } : {})
    });
    return { text, usage };
  } else {
    // Fallback to Gemini for Guest/Free or if Gemini is specifically requested
    return await generateGeminiText({
      modelName: "gemini-3.6-flash",
      system,
      ...(prompt ? { prompt } : {}),
      ...(messages ? { messages } : {}),
      temperature,
      ...(maxOutputTokens ? { maxOutputTokens } : {})
    });
  }
}

// Alias for backwards compatibility with the previous patches
export const generateAssistantText = generateUniversalText;
