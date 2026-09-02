"use client";

import * as React from "react";
import Link from "next/link";
import {
  Calendar,
  Check,
  Compass,
  ExternalLink,
  Filter,
  Flame,
  Globe,
  GraduationCap,
  MapPin,
  RefreshCw,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import { Avatar, Badge, Button, Ident, Input } from "@/components/ui/primitives";
import { toggleAttendanceAction, refreshEventsAction } from "@/app/actions/events";
import type { EventMatch, EventsFeedPayload } from "@/lib/event-types";
import { cn } from "@/lib/utils";

export function EventsSection({ feed }: { feed: EventsFeedPayload }) {
  const [activeTab, setActiveTab] = React.useState<"hackathons" | "events">("hackathons");
  const [search, setSearch] = React.useState("");
  const [modeFilter, setModeFilter] = React.useState<"all" | "offline" | "online" | "hybrid">("all");
  const [isRefreshing, startRefresh] = React.useTransition();

  const items = activeTab === "hackathons" ? feed.hackathons : feed.events;

  const filteredItems = React.useMemo(() => {
    return items.filter((item) => {
      if (modeFilter !== "all" && item.mode !== modeFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.track.toLowerCase().includes(q) ||
        item.area.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [items, search, modeFilter]);

  return (
    <section className="mt-14 border-t border-rule pt-10">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-baseline">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-read text-2xl text-ink">Happening around you</h2>
            <Badge tone="default" className="normal-case tracking-normal">
              Live Campus Feeds
            </Badge>
          </div>
          <p className="mt-1 text-[13px] text-mute">
            Live hackathons and Bengaluru tech ecosystem events ranked against your research interests.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] text-faint">
            {feed.freshness.label}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={isRefreshing}
            onClick={() => startRefresh(() => refreshEventsAction())}
            title="Sync latest upstream events"
            className="h-7 px-2 text-faint hover:text-ink"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Tabs & Filters */}
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-rule pb-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("hackathons")}
            className={cn(
              "flex items-center gap-2 rounded-full px-4 py-1.5 font-mono text-[12px] uppercase tracking-[0.08em] transition-all",
              activeTab === "hackathons"
                ? "bg-ink text-white shadow-xs font-medium"
                : "border border-rule bg-white text-mute hover:border-forest-600 hover:text-ink",
            )}
          >
            <Flame className={cn("h-3.5 w-3.5", activeTab === "hackathons" ? "text-emerald-400" : "text-forest-600")} />
            Hackathons ({feed.hackathons.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("events")}
            className={cn(
              "flex items-center gap-2 rounded-full px-4 py-1.5 font-mono text-[12px] uppercase tracking-[0.08em] transition-all",
              activeTab === "events"
                ? "bg-ink text-white shadow-xs font-medium"
                : "border border-rule bg-white text-mute hover:border-forest-600 hover:text-ink",
            )}
          >
            <Compass className={cn("h-3.5 w-3.5", activeTab === "events" ? "text-emerald-400" : "text-forest-600")} />
            Events & Talks ({feed.events.length})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-faint" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter topics, venues..."
              className="h-8 w-full rounded-lg border border-rule bg-white pl-8 pr-3 text-xs text-ink placeholder:text-faint focus:border-forest-600 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-rule bg-white p-0.5 text-xs font-mono">
            {(["all", "offline", "online", "hybrid"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setModeFilter(m)}
                className={cn(
                  "rounded-md px-2 py-1 uppercase text-[10px] transition-colors",
                  modeFilter === m ? "bg-ink text-white font-medium" : "text-mute hover:text-ink",
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Event Cards Grid */}
      {filteredItems.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-rule p-8 text-center">
          <p className="font-read text-lg text-ink">No matching events found</p>
          <p className="mt-1 text-xs text-mute">
            Try adjusting your search or switching filters.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {filteredItems.slice(0, 8).map((event) => (
            <EventCard key={event.event_id} event={event} />
          ))}
        </div>
      )}
    </section>
  );
}

function EventCard({ event }: { event: EventMatch }) {
  const [isGoing, setIsGoing] = React.useState(event.attendees.is_current_user_going);
  const [attendeeCount, setAttendeeCount] = React.useState(event.attendees.total_going);
  const [pending, startTransition] = React.useTransition();

  const handleToggle = () => {
    const nextGoing = !isGoing;
    setIsGoing(nextGoing);
    setAttendeeCount((prev) => (nextGoing ? prev + 1 : Math.max(0, prev - 1)));

    startTransition(async () => {
      try {
        const res = await toggleAttendanceAction({
          eventId: event.event_id,
          status: "going",
        });
        setIsGoing(res.status === "going");
      } catch {
        // Revert on failure
        setIsGoing(isGoing);
        setAttendeeCount(event.attendees.total_going);
      }
    });
  };

  const startDate = new Date(event.start_at);
  const dateFormatted = startDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeFormatted = startDate.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <article className="group flex flex-col justify-between rounded-xl border border-rule/80 bg-white p-5 sm:p-6 transition-all hover:border-forest-500/50 hover:shadow-md hover:shadow-forest-950/5">
      <div>
        {/* Match Header */}
        <div className="flex items-center justify-between gap-2 border-b border-rule/60 pb-3">
          <div className="flex items-center gap-1.5 text-xs text-mute">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-forest-600" />
            <span className="line-clamp-1 font-medium text-forest-900">{event.match_reason}</span>
          </div>
          <Badge tone={event.mode === "online" ? "muted" : "default"}>
            {event.mode}
          </Badge>
        </div>

        {/* Title & Timing */}
        <div className="mt-4">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-mono text-[11px] uppercase tracking-wider text-faint">
              {event.organizer_name} · {event.track}
            </span>
            <Ident>{event.source === "hackculture" ? "HackCulture" : "BTW"}</Ident>
          </div>

          <h3 className="mt-1.5 font-read text-lg font-medium leading-snug text-ink group-hover:text-forest-800 transition-colors">
            {event.title}
          </h3>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-mute">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-forest-600/70" />
              {dateFormatted} · {timeFormatted}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-forest-600/70" />
              {event.area || event.venue}
            </span>
          </div>

          {event.description ? (
            <p className="mt-2.5 line-clamp-2 text-[13px] leading-relaxed text-mute">
              {event.description}
            </p>
          ) : null}
        </div>

        {/* Speakers / Faculty Network */}
        {event.speakers && event.speakers.length > 0 ? (
          <div className="mt-4 flex flex-wrap items-center gap-1.5 pt-2">
            <span className="text-[11px] font-mono text-faint uppercase">Speakers:</span>
            {event.speakers.slice(0, 3).map((sp) => (
              <span
                key={sp.id}
                className="inline-flex items-center gap-1 rounded-md border border-forest-200/70 bg-forest-50/70 px-2 py-0.5 text-[11px] text-forest-900"
              >
                {sp.faculty_id ? (
                  <span title="RVCE Faculty" className="inline-flex">
                    <GraduationCap className="h-3 w-3 text-forest-700" />
                  </span>
                ) : null}
                {sp.display_name}
                {sp.company ? <span className="text-faint">({sp.company})</span> : null}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {/* Bottom Action Footer */}
      <div className="mt-5 flex items-center justify-between gap-3 border-t border-rule/60 pt-4">
        {/* Cold Start Attendees Stack */}
        <div className="flex items-center gap-2">
          <div className="flex -space-x-1.5 overflow-hidden">
            {event.attendees.faculty_speakers.slice(0, 2).map((a) => (
              <span
                key={a.user_id}
                title={a.label}
                className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-forest-800 bg-forest-900 text-[10px] font-mono text-white shadow-xs"
              >
                {a.name.slice(0, 1)}
              </span>
            ))}
            {event.attendees.sponsor_alumni.slice(0, 1).map((a) => (
              <span
                key={a.user_id}
                title={a.label}
                className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-forest-200 bg-forest-50 text-[10px] font-mono text-forest-900"
              >
                🎓
              </span>
            ))}
            {event.attendees.student_attendees.slice(0, 2).map((a) => (
              <span
                key={a.user_id}
                title={a.label}
                className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-rule bg-white text-[10px] font-mono text-ink"
              >
                {a.name.slice(0, 1)}
              </span>
            ))}
          </div>

          <span className="font-mono text-[11px] text-mute">
            {attendeeCount > 0 ? (
              <>
                <strong className="text-forest-900">{attendeeCount}</strong> in network
              </>
            ) : (
              "Open registration"
            )}
          </span>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={isGoing ? "solid" : "quiet"}
            onClick={handleToggle}
            disabled={pending}
            className={cn("h-8 text-xs font-mono", isGoing ? "bg-forest-600 hover:bg-forest-700" : "")}
          >
            {isGoing ? (
              <>
                <Check className="h-3.5 w-3.5 text-white" /> Going
              </>
            ) : (
              "+ I'm going"
            )}
          </Button>

          {event.registration_url ? (
            <Button asChild size="sm" variant="ghost" className="h-8 px-2 text-forest-700 hover:text-forest-900">
              <a
                href={event.registration_url}
                target="_blank"
                rel="noreferrer noopener"
                title="Open registration page"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
