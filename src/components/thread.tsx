"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { Avatar, Button, Textarea } from "@/components/ui/primitives";
import { postMessage } from "@/app/actions/projects";
import type { Message } from "@/lib/types";
import { cn, relativeTime } from "@/lib/utils";

/**
 * The clarification thread that hangs off a proposal. Deliberately plain: this
 * is where a professor asks "which dataset?" and gets an answer, not a chat app.
 */
export function Thread({
  threadId,
  messages,
  meId,
  placeholder,
}: {
  threadId: string;
  messages: Message[];
  meId: string;
  placeholder: string;
}) {
  const router = useRouter();
  const [body, setBody] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const send = () => {
    setError(null);
    startTransition(async () => {
      const result = await postMessage(threadId, body);
      if (result?.error) setError(result.error);
      else {
        setBody("");
        router.refresh();
      }
    });
  };

  return (
    <div>
      {messages.length ? (
        <ul className="space-y-5">
          {messages.map((message) => {
            const mine = message.sender_user_id === meId;
            return (
              <li key={message.message_id} className="flex gap-3">
                <Avatar name={message.sender_name} className="h-7 w-7 text-[10px]" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-baseline gap-2">
                    <span className={cn("text-[13px]", mine ? "text-ink" : "text-ink")}>
                      {mine ? "You" : message.sender_name}
                    </span>
                    <span className="font-mono text-[11px] text-faint">
                      {relativeTime(message.created_at)}
                    </span>
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-[14px] leading-relaxed text-mute">
                    {message.body}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-[14px] text-mute">No messages yet.</p>
      )}

      <div className="mt-5">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
          }}
          rows={3}
          placeholder={placeholder}
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          {error ? (
            <p className="text-[13px] text-ink">{error}</p>
          ) : (
            <span className="font-mono text-[11px] text-faint">Ctrl+Enter to send</span>
          )}
          <Button size="sm" onClick={send} disabled={pending || !body.trim()}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
