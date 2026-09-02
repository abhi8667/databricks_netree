import "server-only";
import { dbx } from "@/lib/env";

/**
 * Databricks Model Serving. Two jobs: holding the clarifying conversation that
 * turns a rough idea into a structured brief, and producing embeddings for the
 * publication corpus.
 */

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

async function invoke(endpoint: string, body: unknown) {
  const res = await fetch(`${dbx.host}/serving-endpoints/${endpoint}/invocations`, {
    method: "POST",
    headers: { Authorization: `Bearer ${dbx.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Model Serving ${res.status}: ${(await res.text()).slice(0, 400)}`);
  }
  return res.json();
}

export async function chat(
  messages: ChatMessage[],
  opts: { maxTokens?: number; temperature?: number; endpoint?: string } = {},
): Promise<string> {
  const payload = await invoke(opts.endpoint ?? dbx.chatEndpoint, {
    messages,
    max_tokens: opts.maxTokens ?? 900,
    temperature: opts.temperature ?? 0.4,
  });
  const choice = payload?.choices?.[0];
  const content = choice?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map((part: { text?: string }) => part?.text ?? "").join("");
  }
  if (typeof payload?.predictions?.[0] === "string") return payload.predictions[0];
  throw new Error("Model Serving returned no usable content");
}

/** Asks for JSON and parses it, tolerating a fenced code block around it. */
export async function chatJson<T>(messages: ChatMessage[], opts?: { endpoint?: string }): Promise<T> {
  const text = await chat(messages, { temperature: 0.1, maxTokens: 1400, ...opts });
  const cleaned = text.replace(/^```(?:json)?/gm, "").replace(/```$/gm, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Model Serving returned no JSON object");
  return JSON.parse(cleaned.slice(start, end + 1)) as T;
}

export async function embed(inputs: string[], endpoint = dbx.embeddingEndpoint): Promise<number[][]> {
  const payload = await invoke(endpoint, { input: inputs });
  if (Array.isArray(payload?.data)) {
    return payload.data.map((d: { embedding: number[] }) => d.embedding);
  }
  if (Array.isArray(payload?.predictions)) return payload.predictions;
  throw new Error("Embedding endpoint returned an unexpected shape");
}
