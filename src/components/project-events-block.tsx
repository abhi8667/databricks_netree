"use client";

import * as React from "react";
import { Calendar, Compass, ExternalLink, Flame, MapPin, Sparkles } from "lucide-react";
import { Badge, Button, Ident } from "@/components/ui/primitives";
import type { EventMatch } from "@/lib/event-types";

export function ProjectEventsBlock({ events }: { events: EventMatch[] }) {
  if (!events || events.length === 0) return null;

  return (
    <section className="mt-10 border-t border-rule pt-8">
      <div className="flex items-center justify-between border-b border-rule pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-ink" />
          <h2 className="font-read text-xl text-ink">Upcoming events for this project</h2>
        </div>
        <span className="font-mono text-[11px] text-faint">
          Ranked against project scope
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => {
          const startDate = new Date(event.start_at);
          const dateStr = startDate.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });

          return (
            <div
              key={event.event_id}
              className="flex flex-col justify-between rounded-lg border border-rule bg-white p-4 transition-all hover:border-ink"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-faint">
                    {event.kind === "hackathon" ? (
                      <Flame className="h-3 w-3" />
                    ) : (
                      <Compass className="h-3 w-3" />
                    )}
                    {event.kind}
                  </span>
                  <Badge tone="default">{event.mode}</Badge>
                </div>

                <h3 className="mt-2 font-read text-[15px] font-medium leading-snug text-ink">
                  {event.title}
                </h3>

                <p className="mt-1.5 line-clamp-2 text-xs text-mute">
                  {event.match_reason}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-rule/60 pt-3 text-xs text-faint">
                <span className="flex items-center gap-1 font-mono text-[11px]">
                  <Calendar className="h-3 w-3" /> {dateStr}
                </span>

                {event.registration_url ? (
                  <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-xs">
                    <a
                      href={event.registration_url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="flex items-center gap-1"
                    >
                      Register <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
