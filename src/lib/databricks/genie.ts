import "server-only";
import { dbx } from "@/lib/env";

/**
 * Genie Conversations API. Genie is asynchronous: you post a question, get a
 * message id back immediately, then poll that message until it reaches
 * COMPLETED and carries an attachment you can pull results from.
 */

export type GenieResult = {
  conversationId: string;
  messageId: string;
  /** Genie's own prose answer, when it produced one. */
  text: string | null;
  /** The SQL Genie wrote — worth surfacing, it is the audit trail. */
  sql: string | null;
  columns: string[];
  rows: (string | null)[][];
};

type GenieMessage = {
  id: string;
  conversation_id: string;
  status: string;
  content?: string;
  error?: { error?: string; type?: string };
  attachments?: {
    attachment_id: string;
    text?: { content?: string };
    query?: { query?: string; description?: string };
  }[];
};

async function genieFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${dbx.host}/api/2.0/genie${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${dbx.token}`, "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Genie ${res.status}: ${(await res.text()).slice(0, 400)}`);
  }
  return (await res.json()) as T;
}

const TERMINAL = ["COMPLETED", "FAILED", "CANCELLED", "QUERY_RESULT_EXPIRED"];

async function poll(spaceId: string, conversationId: string, messageId: string) {
  const deadline = Date.now() + 150_000;
  let message = await genieFetch<GenieMessage>(
    `/spaces/${spaceId}/conversations/${conversationId}/messages/${messageId}`,
  );
  while (!TERMINAL.includes(message.status)) {
    if (Date.now() > deadline) throw new Error("Genie timed out before completing");
    await new Promise((r) => setTimeout(r, 1200));
    message = await genieFetch<GenieMessage>(
      `/spaces/${spaceId}/conversations/${conversationId}/messages/${messageId}`,
    );
  }
  if (message.status !== "COMPLETED") {
    throw new Error(`Genie ${message.status}: ${message.error?.error ?? "no detail"}`);
  }
  return message;
}

async function collect(spaceId: string, message: GenieMessage): Promise<GenieResult> {
  const out: GenieResult = {
    conversationId: message.conversation_id,
    messageId: message.id,
    text: null,
    sql: null,
    columns: [],
    rows: [],
  };

  for (const attachment of message.attachments ?? []) {
    if (attachment.text?.content) out.text = attachment.text.content;
    if (attachment.query?.query) {
      out.sql = attachment.query.query;
      if (!out.text && attachment.query.description) out.text = attachment.query.description;
      const result = await genieFetch<{
        statement_response?: {
          manifest?: { schema?: { columns?: { name: string }[] } };
          result?: { data_array?: (string | null)[][] };
        };
      }>(
        `/spaces/${spaceId}/conversations/${message.conversation_id}/messages/${message.id}/attachments/${attachment.attachment_id}/query-result`,
      );
      out.columns = result.statement_response?.manifest?.schema?.columns?.map((c) => c.name) ?? [];
      out.rows = result.statement_response?.result?.data_array ?? [];
    }
  }
  return out;
}

/** Opens a new Genie conversation with the first question. */
export async function askGenie(content: string, spaceId = dbx.genieSpaceId): Promise<GenieResult> {
  const started = await genieFetch<{ conversation_id: string; message_id: string }>(
    `/spaces/${spaceId}/start-conversation`,
    { method: "POST", body: JSON.stringify({ content }) },
  );
  const message = await poll(spaceId, started.conversation_id, started.message_id);
  return collect(spaceId, message);
}

/** Continues an existing Genie conversation — keeps the schema context warm. */
export async function followUpGenie(
  conversationId: string,
  content: string,
  spaceId = dbx.genieSpaceId,
): Promise<GenieResult> {
  const created = await genieFetch<{ message_id: string; id?: string }>(
    `/spaces/${spaceId}/conversations/${conversationId}/messages`,
    { method: "POST", body: JSON.stringify({ content }) },
  );
  const messageId = created.message_id ?? created.id!;
  const message = await poll(spaceId, conversationId, messageId);
  return collect(spaceId, message);
}

/** Turns a Genie table result into row objects. */
export function genieRows(result: GenieResult): Record<string, string | null>[] {
  return result.rows.map((row) => {
    const obj: Record<string, string | null> = {};
    result.columns.forEach((c, i) => (obj[c] = row[i] ?? null));
    return obj;
  });
}
