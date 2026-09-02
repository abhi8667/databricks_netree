"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { Badge, Ident, Input, Meter } from "@/components/ui/primitives";

type Entry = {
  faculty_id: string;
  faculty_name: string;
  designation: string;
  department: string;
  n_publications: number;
  latest_year: number | null;
  total_citations: number;
  profile_status: string;
  is_head: boolean;
  topics: { topic: string; n_papers: number; latest_year: number }[];
};

export function Directory({ entries }: { entries: Entry[] }) {
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) =>
        e.faculty_name.toLowerCase().includes(q) ||
        e.designation.toLowerCase().includes(q) ||
        e.topics.some((t) => t.topic.toLowerCase().includes(q)),
    );
  }, [entries, query]);

  const maxPapers = Math.max(1, ...entries.map((e) => e.n_publications));

  return (
    <div className="mt-8">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a name or a research topic"
          className="pl-9"
        />
      </div>

      <p className="mt-3 font-mono text-[11px] text-faint">
        {filtered.length} of {entries.length}
      </p>

      <ul className="mt-4 divide-y divide-rule">
        {filtered.map((entry) => (
          <li key={entry.faculty_id} className="grid gap-4 py-5 sm:grid-cols-[minmax(0,1fr)_200px]">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-[16px] text-ink">{entry.faculty_name}</h2>
                {entry.is_head ? <Badge tone="outline">Head</Badge> : null}
                {entry.profile_status === "incomplete" ? (
                  <Badge tone="muted">No indexed publications</Badge>
                ) : null}
              </div>
              <p className="mt-1 text-[13px] text-mute">
                {entry.designation} · {entry.department}
              </p>
              <Ident className="mt-1 block">{entry.faculty_id}</Ident>

              {entry.topics.length ? (
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {entry.topics.map((topic) => (
                    <li key={topic.topic}>
                      <Badge className="normal-case tracking-normal">
                        {topic.topic} · {topic.n_papers}
                      </Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-[13px] text-mute">
                  Neither OpenAlex nor Crossref returned an affiliation-anchored match for this
                  person, so the matcher cannot route ideas to them.
                </p>
              )}
            </div>

            <div className="space-y-3 sm:pt-1">
              <Meter value={entry.n_publications} max={maxPapers} label="Publications" />
              <p className="font-mono text-[11px] text-faint">
                {entry.total_citations.toLocaleString()} citations
                {entry.latest_year ? ` · latest ${entry.latest_year}` : ""}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
