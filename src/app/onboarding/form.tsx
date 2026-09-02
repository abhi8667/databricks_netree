"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Check, FileText, Upload, X } from "lucide-react";
import { Button, Field, Input, Switch, Textarea } from "@/components/ui/primitives";
import { completeOnboarding, type SignInState } from "@/app/actions/auth";
import type { NetreeUser } from "@/lib/types";
import { cn, parseTopTopics } from "@/lib/utils";

type RosterEntry = {
  faculty_id: string;
  faculty_name: string;
  designation: string;
  n_publications: number;
};

const SUGGESTED_INTERESTS = [
  "Computer Vision",
  "Network Security",
  "Cloud Computing",
  "Machine Learning",
  "Data Engineering",
  "Natural Language Processing",
  "IoT and Embedded Systems",
  "Anomaly Detection",
  "Privacy and Anonymisation",
  "Distributed Systems",
];

export function OnboardingForm({
  user,
  roster,
  suggestedTopics,
  suggestedPublications,
}: {
  user: NetreeUser;
  roster: RosterEntry[];
  suggestedTopics: string;
  suggestedPublications: number;
}) {
  const [state, action] = useActionState<SignInState, FormData>(completeOnboarding, {});
  const [interests, setInterests] = React.useState<string[]>(user.interests);
  const [resume, setResume] = React.useState<{ name: string; text: string } | null>(
    user.resume_name ? { name: user.resume_name, text: user.resume_text } : null,
  );
  const [facultyId, setFacultyId] = React.useState(user.faculty_id ?? "");
  const isTeacher = user.role === "teacher";
  const isAlumni = user.role === "alumni";

  const toggle = (tag: string) =>
    setInterests((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));

  const onFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    // Plain-text CVs are read in full; anything else keeps the filename so the
    // record is honest about what was actually captured.
    const readable = /\.(txt|md|markdown|csv|json)$/i.test(file.name);
    const text = readable ? (await file.text()).slice(0, 12000) : "";
    setResume({ name: file.name, text });
  };

  const linked = roster.find((r) => r.faculty_id === facultyId);
  const topics = parseTopTopics(suggestedTopics).slice(0, 4);

  return (
    <form action={action} className="stagger space-y-10">
      <header>
        <p className="eyebrow">Step 2 of 2</p>
        <h1 className="mt-2 font-read text-4xl leading-[1.05] text-ink">
          {isTeacher
            ? "Set up your faculty profile"
            : isAlumni
              ? "Tell students what you can help with"
              : "Tell us what you work on"}
        </h1>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-mute">
          {isTeacher
            ? "This is what students see before they send you a proposal. The more precise it is, the fewer irrelevant requests reach you."
            : "This is what the matcher reads alongside your project brief. Specific beats broad."}
        </p>
      </header>

      <input type="hidden" name="interests" value={interests.join(", ")} />
      <input type="hidden" name="resume_name" value={resume?.name ?? ""} />
      <input type="hidden" name="resume_text" value={resume?.text ?? ""} />
      <input type="hidden" name="faculty_id" value={facultyId} />

      <Section title="Basic details" note={`Signed in as ${user.full_name} · ${user.college_id}`}>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="College email">
            <Input
              name="email"
              type="email"
              defaultValue={user.email}
              placeholder="name@rvce.edu.in"
            />
          </Field>
          <Field label="Department">
            <Input
              name="department"
              defaultValue={user.department || "Computer Science and Engineering"}
              required
            />
          </Field>
          <Field
            label={isTeacher ? "Designation" : isAlumni ? "Graduation year and role" : "Year and semester"}
            className="sm:col-span-2"
          >
            <Input
              name="standing"
              defaultValue={user.standing}
              placeholder={
                isTeacher
                  ? "Assistant Professor"
                  : isAlumni
                    ? "Class of 2021 · Backend engineer, Bengaluru"
                    : "3rd year, 5th semester"
              }
              required
            />
          </Field>
        </div>
      </Section>

      {isTeacher && roster.length ? (
        <Section
          title="Link your publication record"
          note="Matching runs on published work. Leave this unlinked if none of these are you."
        >
          <div className="space-y-3">
            <select
              value={facultyId}
              onChange={(e) => setFacultyId(e.target.value)}
              className="h-10 w-full rounded-md border border-rule bg-white px-3 text-sm text-ink transition-colors hover:border-faint focus:border-ink focus:outline-none"
            >
              <option value="">Not linked</option>
              {roster.map((r) => (
                <option key={r.faculty_id} value={r.faculty_id}>
                  {r.faculty_name} — {r.designation} ({r.n_publications} publications)
                </option>
              ))}
            </select>

            {linked ? (
              <div className="rulebox p-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-mute">
                    {linked.faculty_id} · {suggestedPublications} publications indexed
                  </p>
                  <button
                    type="button"
                    onClick={() => setFacultyId("")}
                    className="inline-flex items-center gap-1 font-mono text-[11px] text-mute hover:text-ink"
                  >
                    <X className="h-3 w-3" /> Clear
                  </button>
                </div>
                {topics.length ? (
                  <ul className="mt-3 space-y-1.5">
                    {topics.map((t) => (
                      <li key={t.topic} className="flex items-baseline gap-3 text-[13px]">
                        <span className="w-6 shrink-0 font-mono text-[11px] text-faint">
                          {t.count}
                        </span>
                        <span className="text-ink">{t.topic}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </div>
        </Section>
      ) : null}

      <Section
        title="Areas of interest"
        note="Pick what applies, then add anything specific in your own words."
      >
        <div className="flex flex-wrap gap-2">
          {[...new Set([...SUGGESTED_INTERESTS, ...interests])].map((tag) => {
            const active = interests.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggle(tag)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[13px] transition-colors",
                  active
                    ? "border-ink bg-ink text-paper"
                    : "border-rule bg-white text-mute hover:border-ink hover:text-ink",
                )}
              >
                {active ? <Check className="mr-1 inline h-3 w-3" /> : null}
                {tag}
              </button>
            );
          })}
        </div>
        <AddInterest onAdd={(tag) => !interests.includes(tag) && setInterests((p) => [...p, tag])} />
      </Section>

      <Section title={isTeacher ? "About your work" : "About you"}>
        <div className="space-y-5">
          <Field
            label={isTeacher ? "Research summary" : "Short bio"}
            hint={
              isTeacher
                ? "Two or three sentences on what you are working on now, in plain language."
                : "What you are studying, what you have built, what you want to work on."
            }
          >
            <Textarea name="bio" rows={4} defaultValue={user.bio} />
          </Field>

          <Field
            label="Achievements and certifications"
            hint="One per line. Hackathons, papers, internships, certifications."
          >
            <Textarea name="achievements" rows={4} defaultValue={user.achievements} />
          </Field>

          {(isTeacher || isAlumni) && (
            <Field label="Google Scholar profile" hint="Optional. Shown on your public profile.">
              <Input
                name="scholar_url"
                type="url"
                defaultValue={user.scholar_url}
                placeholder="https://scholar.google.com/citations?user=..."
              />
            </Field>
          )}
        </div>
      </Section>

      <Section
        title={isTeacher ? "CV" : "Résumé"}
        note="Text files are read in full. Other formats keep the filename only."
      >
        <label
          className={cn(
            "flex cursor-pointer items-center gap-4 rounded-lg border border-dashed p-5 transition-colors",
            resume ? "border-ink bg-fill" : "border-rule hover:border-ink",
          )}
        >
          <input type="file" className="sr-only" onChange={onFile} accept=".pdf,.doc,.docx,.txt,.md" />
          {resume ? (
            <FileText className="h-5 w-5 text-ink" />
          ) : (
            <Upload className="h-5 w-5 text-mute" />
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm text-ink">
              {resume ? resume.name : "Choose a file"}
            </span>
            <span className="mt-0.5 block font-mono text-[11px] text-mute">
              {resume
                ? resume.text
                  ? `${resume.text.length.toLocaleString()} characters read`
                  : "Filename recorded — paste highlights into achievements above"
                : "PDF, DOCX, TXT or MD"}
            </span>
          </span>
          {resume ? (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.preventDefault();
                setResume(null);
              }}
              className="font-mono text-[11px] text-mute hover:text-ink"
            >
              Remove
            </span>
          ) : null}
        </label>
      </Section>

      {isTeacher ? (
        <Section title="Collaboration" note="Nothing here is inferred from your publication record.">
          <label className="flex items-start gap-4 rounded-lg border border-rule bg-white p-4">
            <Switch name="open_to_collaboration" defaultChecked={user.open_to_collaboration} />
            <span className="min-w-0 flex-1">
              <span className="block text-sm text-ink">Show me as open to collaboration</span>
              <span className="mt-1 block text-[13px] leading-relaxed text-mute">
                Students can send you proposals either way. This only controls whether your profile
                says you are actively looking.
              </span>
            </span>
          </label>
        </Section>
      ) : null}

      {state.error ? (
        <p className="border-l-2 border-ink bg-fill px-3 py-2 text-[13px] text-ink">{state.error}</p>
      ) : null}

      <div className="flex items-center gap-4 border-t border-rule pt-6">
        <SaveButton />
        <p className="text-[13px] text-mute">You can change all of this later.</p>
      </div>
    </form>
  );
}

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-5 border-t border-rule pt-8 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-10">
      <div>
        <h2 className="text-sm font-medium text-ink">{title}</h2>
        {note ? <p className="mt-1.5 text-xs leading-relaxed text-mute">{note}</p> : null}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function AddInterest({ onAdd }: { onAdd: (tag: string) => void }) {
  const [value, setValue] = React.useState("");
  const commit = () => {
    const tag = value.trim();
    if (tag) onAdd(tag);
    setValue("");
  };
  return (
    <div className="flex gap-2 pt-1">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
        }}
        placeholder="Add your own"
        className="h-9 max-w-xs"
      />
      <Button type="button" variant="quiet" size="sm" onClick={commit}>
        Add
      </Button>
    </div>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? "Saving" : "Finish setup"}
    </Button>
  );
}
