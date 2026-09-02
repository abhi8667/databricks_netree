import "server-only";
import { gemini } from "@/lib/env";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };
type ChatOptions = { maxTokens?: number; temperature?: number };

type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  promptFeedback?: { blockReason?: string };
};

function endpoint() {
  const model = gemini.model.replace(/^models\//, "");
  return `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(gemini.apiKey)}`;
}

async function generate(messages: ChatMessage[], options: ChatOptions & { json?: boolean } = {}) {
  if (!gemini.apiKey) throw new Error("Gemini is not configured. Set GEMINI_API_KEY.");

  const system = messages.filter((message) => message.role === "system").map((message) => message.content).join("\n\n");
  const contents = messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }],
    }));

  const res = await fetch(endpoint(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
      contents,
      generationConfig: {
        temperature: options.temperature ?? 0.4,
        maxOutputTokens: options.maxTokens ?? 900,
        ...(options.json ? { responseMimeType: "application/json" } : {}),
      },
    }),
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 500)}`);
  const payload = (await res.json()) as GeminiResponse;
  const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
  if (text) return text;
  if (payload.promptFeedback?.blockReason) throw new Error(`Gemini blocked the prompt: ${payload.promptFeedback.blockReason}`);
  throw new Error("Gemini returned no usable text");
}

export async function chat(messages: ChatMessage[], options: ChatOptions = {}) {
  return generate(messages, options);
}

export async function chatJson<T>(messages: ChatMessage[], options: ChatOptions = {}) {
  const text = await generate(messages, { ...options, json: true, temperature: options.temperature ?? 0.1 });
  return JSON.parse(text.replace(/^```(?:json)?/gm, "").replace(/```$/gm, "").trim()) as T;
}
