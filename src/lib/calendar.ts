/**
 * Calendar integration utilities for Netree.
 * Generates Google Calendar 1-click sync URLs and downloadable RFC-5545 .ics files.
 */

export type CalendarEventOptions = {
  title: string;
  description?: string;
  location?: string;
  slot: string;
  durationMinutes?: number;
  url?: string;
};

/**
 * Parses user-input time slots like "Tue 9 Sep, 4:00 pm" or "2026-09-10 14:30"
 * into valid Date objects with start and end times.
 */
export function parseSlotTimes(slot: string, durationMinutes = 45): { start: Date; end: Date } {
  const now = new Date();
  const currentYear = now.getFullYear();

  // Try direct date parsing first
  let parsed = new Date(slot);

  if (isNaN(parsed.getTime())) {
    // Attempt conversational parser: "Tue 9 Sep, 4:00 pm" or "9 Sep 4:00 pm"
    const cleaned = slot.replace(/^[a-zA-Z]+,\s*/, "").trim(); // Remove day name "Tue,"
    const withYear = `${cleaned} ${currentYear}`;
    parsed = new Date(withYear);
  }

  // If still invalid, default to tomorrow at 10:00 AM
  if (isNaN(parsed.getTime())) {
    parsed = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    parsed.setHours(10, 0, 0, 0);
  }

  const start = parsed;
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  return { start, end };
}

function formatUtcForCalendar(date: Date): string {
  return date.toISOString().replace(/-|:|\.\d+/g, "");
}

/**
 * Generates a 1-click Google Calendar web link.
 */
export function buildGoogleCalendarUrl(opts: CalendarEventOptions): string {
  const { start, end } = parseSlotTimes(opts.slot, opts.durationMinutes);
  const startIso = formatUtcForCalendar(start);
  const endIso = formatUtcForCalendar(end);

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: opts.title,
    dates: `${startIso}/${endIso}`,
    details: [opts.description, opts.url ? `\n\nNetree Proposal Link: ${opts.url}` : ""]
      .filter(Boolean)
      .join("\n"),
    location: opts.location || "Online",
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generates an RFC 5545 compliant .ics (iCalendar) text for Apple Calendar, Outlook, and mobile devices.
 */
export function buildIcsContent(opts: CalendarEventOptions): string {
  const { start, end } = parseSlotTimes(opts.slot, opts.durationMinutes);
  const startIso = formatUtcForCalendar(start);
  const endIso = formatUtcForCalendar(end);
  const nowIso = formatUtcForCalendar(new Date());
  const uid = `netree-meeting-${Date.now()}@netree.campus`;

  const escapeIcs = (str: string) =>
    str.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Netree//Academic Collaboration Meeting//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${nowIso}`,
    `DTSTART:${startIso}`,
    `DTEND:${endIso}`,
    `SUMMARY:${escapeIcs(opts.title)}`,
    `DESCRIPTION:${escapeIcs(
      [opts.description, opts.url ? `Netree Link: ${opts.url}` : ""].filter(Boolean).join("\n"),
    )}`,
    `LOCATION:${escapeIcs(opts.location || "Online Meeting")}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

/**
 * Helper to trigger client-side download of an .ics file.
 */
export function downloadIcsFile(filename: string, content: string) {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename.endsWith(".ics") ? filename : `${filename}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
