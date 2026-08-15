import { GoogleGenAI } from "@google/genai";

const keys = [
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
].filter(Boolean) as string[];

// Call Google's API directly using their own SDK (not Vercel wrappers)
// Model: gemini-3.6-flash via Google's API keys
export async function generateGeminiText(options: {
  modelName?: string;
  prompt?: string;
  system?: string;
  messages?: { role: string; content: string }[];
  maxOutputTokens?: number;
  temperature?: number;
  [key: string]: any;
}) {
  const modelName = options.modelName || "gemini-3.6-flash";
  let lastError: any;

  // Build the prompt string from either prompt or messages
  let contents: string;
  if (options.prompt) {
    contents = options.prompt;
  } else if (options.messages) {
    contents = options.messages.map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`).join("\n\n");
  } else {
    contents = "";
  }

  for (const key of keys) {
    try {
      const client = new GoogleGenAI({ apiKey: key });
      const response = await client.models.generateContent({
        model: modelName,
        contents,
        config: {
          ...(options.system ? { systemInstruction: options.system } : {}),
          ...(options.maxOutputTokens ? { maxOutputTokens: options.maxOutputTokens } : {}),
          ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
        },
      });

      const text = response.text ?? "";
      return {
        text,
        usage: {
          promptTokens: response.usageMetadata?.promptTokenCount ?? 0,
          completionTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
          totalTokens: response.usageMetadata?.totalTokenCount ?? 0,
        },
      };
    } catch (e: any) {
      console.warn(`Gemini direct (generateText): Key failed.`, e.message || e);
      lastError = e;
    }
  }

  throw lastError || new Error("All Gemini keys failed.");
}

export async function streamGeminiText(options: {
  modelName?: string;
  prompt?: string;
  system?: string;
  messages?: { role: string; content: string }[];
  maxOutputTokens?: number;
  temperature?: number;
  [key: string]: any;
}) {
  const modelName = options.modelName || "gemini-3.5-flash";
  let lastError: any;

  let contents: string;
  if (options.prompt) {
    contents = options.prompt;
  } else if (options.messages) {
    contents = options.messages.map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`).join("\n\n");
  } else {
    contents = "";
  }

  for (const key of keys) {
    try {
      const client = new GoogleGenAI({ apiKey: key });

      // Stream using Google's SDK directly
      const streamResult = await client.models.generateContentStream({
        model: modelName,
        contents,
        config: {
          ...(options.system ? { systemInstruction: options.system } : {}),
          ...(options.maxOutputTokens ? { maxOutputTokens: options.maxOutputTokens } : {}),
          ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
        },
      });

      // Return a compatible object with toDataStreamResponse-like behaviour
      return {
        stream: streamResult,
        toDataStreamResponse: () => {
          const encoder = new TextEncoder();
          const readable = new ReadableStream({
            async start(controller) {
              try {
                for await (const chunk of streamResult) {
                  const text = chunk.text ?? "";
                  if (text) {
                    controller.enqueue(encoder.encode(`0:${JSON.stringify(text)}\n`));
                  }
                }
                controller.close();
              } catch (e) {
                controller.error(e);
              }
            },
          });
          return new Response(readable, {
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
              "X-Vercel-AI-Data-Stream": "v1",
            },
          });
        },
      };
    } catch (e: any) {
      console.warn(`Gemini direct (streamText): Key failed.`, e.message || e);
      lastError = e;
    }
  }

  throw lastError || new Error("All Gemini keys failed for streaming.");
}
