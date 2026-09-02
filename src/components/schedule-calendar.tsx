"use client";

import * as React from "react";
import {
  Calendar as CalendarIcon,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Download,
  ExternalLink,
  MapPin,
  Sparkles,
  Video,
} from "lucide-react";
import { Badge, Button } from "@/components/ui/primitives";
import { buildGoogleCalendarUrl, buildIcsContent, downloadIcsFile } from "@/lib/calendar";
import { cn } from "@/lib/utils";

export type ScheduleEvent = {
  id: string;
  title: string;
  type: "meeting" | "event" | "office_hour" | "hackathon";
  status: "confirmed" | "proposed" | "upcoming";
  date: string; // ISO date or parseable string
  time: string; // e.g., "4:00 PM - 4:45 PM"
  location: string;
  mode: "online" | "offline";
  participantName: string;
  participantRole: string;
  agenda?: string;
  link?: string;
};

const SIMULATED_EVENTS: ScheduleEvent[] = [
  {
    id: "sim-1",
    title: "Phishing Detection Browser Extension Discussion",
    type: "meeting",
    status: "confirmed",
    date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 1).toISOString().split("T")[0]!,
    time: "4:00 PM - 4:45 PM",
    location: "Online (Google Meet)",
    mode: "online",
    participantName: "Dr. Minal Moharir",
    participantRole: "Associate Professor, Network Security",
    agenda: "Review prototype architecture and dataset feature extraction for real-time DNS classification.",
  },
  {
    id: "sim-2",
    title: "Drone Crowd Anomaly Surveillance Architecture",
    type: "meeting",
    status: "confirmed",
    date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString().split("T")[0]!,
    time: "11:30 AM - 12:15 PM",
    location: "Vision & Deep Learning Lab, Room 304",
    mode: "offline",
    participantName: "Dr. Mohana",
    participantRole: "Professor, Computer Vision",
    agenda: "Evaluate spatial-temporal graph neural network approaches on campus surveillance feeds.",
  },
  {
    id: "sim-3",
    title: "Smart India Hackathon 2026 - Idea Submission Deadline",
    type: "hackathon",
    status: "upcoming",
    date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString().split("T")[0]!,
    time: "11:59 PM",
    location: "National Portal",
    mode: "online",
    participantName: "Ministry of Education",
    participantRole: "National Hackathon",
    agenda: "Submit executive 3-page research proposal and architecture diagram.",
  },
  {
    id: "sim-4",
    title: "Privacy Preserving Medical Records Sync",
    type: "meeting",
    status: "proposed",
    date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 6).toISOString().split("T")[0]!,
    time: "2:00 PM - 2:45 PM",
    location: "CSE Faculty Wing, 2nd Floor",
    mode: "offline",
    participantName: "Dr. Veena Gadad",
    participantRole: "Assistant Professor, Privacy & Data",
    agenda: "Differential privacy parameters review for hospital federated learning setup.",
  },
];

export function ScheduleCalendar({
  role = "student",
  realEvents = [],
}: {
  role?: "student" | "faculty";
  realEvents?: ScheduleEvent[];
}) {
  const [simulationMode, setSimulationMode] = React.useState(true);
  const [viewMode, setViewMode] = React.useState<"month" | "list">("month");
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [selectedEvent, setSelectedEvent] = React.useState<ScheduleEvent | null>(null);
  const [filterType, setFilterType] = React.useState<string>("all");
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const allEvents = React.useMemo(() => {
    if (simulationMode && realEvents.length === 0) return SIMULATED_EVENTS;
    return simulationMode ? [...realEvents, ...SIMULATED_EVENTS] : realEvents;
  }, [simulationMode, realEvents]);

  const filteredEvents = React.useMemo(() => {
    return allEvents.filter((ev) => {
      if (filterType === "all") return true;
      if (filterType === "confirmed") return ev.status === "confirmed";
      if (filterType === "meetings") return ev.type === "meeting";
      if (filterType === "events") return ev.type === "hackathon" || ev.type === "event";
      return true;
    });
  }, [allEvents, filterType]);

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString("default", { month: "long" });

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const today = () => setCurrentDate(new Date());

  const getEventsForDay = (day: number) => {
    const dayStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return filteredEvents.filter((e) => e.date === dayStr);
  };

  const handleCopy = (ev: ScheduleEvent) => {
    const text = `📅 Netree Schedule\nEvent: ${ev.title}\nTime: ${ev.date} at ${ev.time}\nWith: ${ev.participantName} (${ev.participantRole})\nLocation: ${ev.location}${ev.agenda ? `\nAgenda: ${ev.agenda}` : ""}`;
    navigator.clipboard.writeText(text);
    setCopiedId(ev.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadIcs = (ev: ScheduleEvent) => {
    const calOpts = {
      title: `Netree: ${ev.title}`,
      description: `${ev.agenda ? `${ev.agenda}\n\n` : ""}Participant: ${ev.participantName} (${ev.participantRole})`,
      location: ev.location,
      slot: `${ev.date} ${ev.time.split("-")[0]?.trim() || "10:00 AM"}`,
      durationMinutes: 45,
    };
    const content = buildIcsContent(calOpts);
    downloadIcsFile(`netree-${ev.id}`, content);
  };

  return (
    <div className="space-y-8">
      {/* Top Banner & Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-rule pb-5">
        <div>
          <h1 className="font-read text-3xl text-ink">
            {role === "student" ? "My Research Schedule" : "Faculty Office Hours & Meetings"}
          </h1>
          <p className="mt-1 text-[14px] text-mute">
            {role === "student"
              ? "All your confirmed faculty sessions, proposed slots, and research deadlines in one place."
              : "Track incoming proposal discussions, confirm slots, and manage lab visits."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSimulationMode((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] transition",
              simulationMode
                ? "border-ink bg-fill text-ink"
                : "border-rule text-mute hover:border-ink hover:text-ink",
            )}
          >
            <Sparkles className="h-3.5 w-3.5 text-ink" />
            {simulationMode ? "Simulation Mode: ON" : "Simulation Mode: OFF"}
          </button>

          <div className="flex rounded-md border border-rule bg-white p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("month")}
              className={cn(
                "rounded px-3 py-1 font-mono text-[11px] uppercase tracking-wider transition",
                viewMode === "month" ? "bg-ink text-paper" : "text-mute hover:text-ink",
              )}
            >
              Month
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={cn(
                "rounded px-3 py-1 font-mono text-[11px] uppercase tracking-wider transition",
                viewMode === "list" ? "bg-ink text-paper" : "text-mute hover:text-ink",
              )}
            >
              List ({filteredEvents.length})
            </button>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {[
            { id: "all", label: "All Items" },
            { id: "confirmed", label: "Confirmed Only" },
            { id: "meetings", label: "Meetings" },
            { id: "events", label: "Hackathons / Events" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterType(tab.id)}
              className={cn(
                "rounded-md border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.08em] transition-colors",
                filterType === tab.id
                  ? "border-ink bg-ink text-paper"
                  : "border-rule bg-white text-mute hover:border-ink hover:text-ink",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {viewMode === "month" ? (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="quiet" onClick={today}>
              Today
            </Button>
            <button
              type="button"
              onClick={prevMonth}
              className="rounded p-1.5 text-mute hover:bg-fill hover:text-ink"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-mono text-[13px] font-medium text-ink min-w-[120px] text-center">
              {monthName} {year}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="rounded p-1.5 text-mute hover:bg-fill hover:text-ink"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>

      {/* View: Month Grid */}
      {viewMode === "month" ? (
        <div className="rulebox overflow-hidden">
          <div className="grid grid-cols-7 border-b border-rule bg-fill text-center font-mono text-[11px] uppercase tracking-wider text-mute py-2">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          <div className="grid grid-cols-7 auto-rows-[110px] divide-x divide-y divide-rule">
            {/* Blank padding days for start of month */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`blank-${i}`} className="bg-paper/40 p-2" />
            ))}

            {/* Days of month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const events = getEventsForDay(day);
              const isToday =
                new Date().getDate() === day &&
                new Date().getMonth() === month &&
                new Date().getFullYear() === year;

              return (
                <div
                  key={day}
                  className={cn(
                    "group relative p-2 transition-colors hover:bg-fill/60 flex flex-col justify-between overflow-hidden",
                    isToday ? "bg-fill/40" : "",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "inline-flex h-5 w-5 items-center justify-center rounded-full font-mono text-[11px]",
                        isToday ? "bg-ink text-paper font-bold" : "text-mute",
                      )}
                    >
                      {day}
                    </span>
                    {events.length ? (
                      <span className="font-mono text-[9px] text-mute">{events.length}</span>
                    ) : null}
                  </div>

                  <div className="space-y-1 overflow-y-auto no-scrollbar max-h-[75px] mt-1">
                    {events.map((ev) => (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={() => setSelectedEvent(ev)}
                        className={cn(
                          "w-full text-left truncate rounded px-1.5 py-0.5 font-mono text-[10px] transition block",
                          ev.status === "confirmed"
                            ? "bg-ink text-paper"
                            : ev.type === "hackathon"
                            ? "border border-ink bg-white text-ink"
                            : "bg-fill text-mute hover:text-ink",
                        )}
                      >
                        {ev.time.split("-")[0]?.trim()} · {ev.title}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* View: List Cards */}
      <div className="space-y-4">
        <h2 className="font-read text-xl text-ink">
          {viewMode === "list" ? "All Scheduled Events" : "Upcoming Sessions"}
        </h2>

        {filteredEvents.length === 0 ? (
          <div className="rulebox p-8 text-center text-mute text-[14px]">
            No schedule events matching this filter.
          </div>
        ) : (
          <ul className="space-y-3">
            {filteredEvents.map((ev) => {
              const calOpts = {
                title: `Netree: ${ev.title}`,
                description: `${ev.agenda ? `${ev.agenda}\n\n` : ""}Participant: ${ev.participantName} (${ev.participantRole})`,
                location: ev.location,
                slot: `${ev.date} ${ev.time.split("-")[0]?.trim() || "10:00 AM"}`,
                durationMinutes: 45,
              };

              return (
                <li
                  key={ev.id}
                  className="rulebox p-5 transition-shadow hover:shadow-lift flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <Badge tone={ev.status === "confirmed" ? "solid" : "default"}>
                        {ev.status === "confirmed" ? "Confirmed Meeting" : ev.type.toUpperCase()}
                      </Badge>
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] text-mute">
                        <Clock className="h-3.5 w-3.5" />
                        {ev.date} · {ev.time}
                      </span>
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] text-mute">
                        {ev.mode === "online" ? (
                          <Video className="h-3.5 w-3.5" />
                        ) : (
                          <MapPin className="h-3.5 w-3.5" />
                        )}
                        {ev.location}
                      </span>
                    </div>

                    <h3 className="font-read text-lg font-medium text-ink">{ev.title}</h3>

                    <p className="text-[13px] text-mute">
                      <strong className="text-ink font-normal">{ev.participantName}</strong> —{" "}
                      {ev.participantRole}
                    </p>

                    {ev.agenda ? (
                      <p className="text-[13px] leading-relaxed text-mute border-l-2 border-rule pl-3 mt-1">
                        {ev.agenda}
                      </p>
                    ) : null}
                  </div>

                  {/* Actions & Calendar Sync */}
                  <div className="flex flex-wrap md:flex-col items-end gap-2 shrink-0">
                    <a
                      href={buildGoogleCalendarUrl(calOpts)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md border border-rule bg-white px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-ink transition hover:bg-ink hover:text-paper"
                    >
                      <CalendarIcon className="h-3.5 w-3.5" />
                      Google Sync
                      <ExternalLink className="h-3 w-3 opacity-60" />
                    </a>

                    <button
                      type="button"
                      onClick={() => handleDownloadIcs(ev)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-rule bg-white px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-ink transition hover:bg-ink hover:text-paper"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Export .ics
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopy(ev)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-rule bg-white px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-mute transition hover:text-ink"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      {copiedId === ev.id ? "Copied!" : "Copy Details"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Event Details Modal Popup */}
      {selectedEvent ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="rulebox max-w-lg w-full bg-white p-6 space-y-4 shadow-lift animate-rise">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Badge tone={selectedEvent.status === "confirmed" ? "solid" : "default"}>
                  {selectedEvent.status === "confirmed" ? "Confirmed" : selectedEvent.type}
                </Badge>
                <h3 className="font-read text-xl font-medium text-ink mt-2">
                  {selectedEvent.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="text-mute hover:text-ink p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-[14px] text-mute border-y border-rule py-3">
              <p>
                <strong>Date & Time:</strong> {selectedEvent.date} · {selectedEvent.time}
              </p>
              <p>
                <strong>Location:</strong> {selectedEvent.location}
              </p>
              <p>
                <strong>With:</strong> {selectedEvent.participantName} (
                {selectedEvent.participantRole})
              </p>
              {selectedEvent.agenda ? (
                <p>
                  <strong>Agenda:</strong> {selectedEvent.agenda}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <a
                href={buildGoogleCalendarUrl({
                  title: `Netree: ${selectedEvent.title}`,
                  location: selectedEvent.location,
                  slot: `${selectedEvent.date} ${selectedEvent.time.split("-")[0]?.trim() || ""}`,
                  description: selectedEvent.agenda,
                })}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-rule bg-white px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-ink transition hover:bg-ink hover:text-paper"
              >
                <CalendarIcon className="h-3.5 w-3.5" />
                Google Calendar
              </a>
              <button
                type="button"
                onClick={() => handleDownloadIcs(selectedEvent)}
                className="inline-flex items-center gap-1.5 rounded-md border border-rule bg-white px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-ink transition hover:bg-ink hover:text-paper"
              >
                <Download className="h-3.5 w-3.5" />
                Download .ics
              </button>
              <Button size="sm" onClick={() => setSelectedEvent(null)}>
                Done
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
