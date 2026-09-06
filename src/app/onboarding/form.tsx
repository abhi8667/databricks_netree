"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Check, FileText, Upload, X } from "lucide-react";
import { Button, Field, Input, Label, Switch, Textarea } from "@/components/ui/primitives";
import Stepper, { Step } from "@/components/react-bits/stepper";
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
  const [openToCollaboration, setOpenToCollaboration] = React.useState(user.open_to_collaboration);

  const [formData, setFormData] = React.useState({
    email: user.email,
    department: user.department || "Computer Science and Engineering",
    standing: user.standing,
    bio: user.bio,
    achievements: user.achievements,
    linkedin_url: user.linkedin_url ?? "",
    scholar_url: user.scholar_url ?? "",
  });

  const formRef = React.useRef<HTMLFormElement>(null);
  const isTeacher = user.role === "teacher";
  const isAlumni = user.role === "alumni";

  const toggle = (tag: string) =>
    setInterests((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));

  const onFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const readable = /\.(txt|md|markdown|csv|json)$/i.test(file.name);
    const text = readable ? (await file.text()).slice(0, 12000) : "";
    setResume({ name: file.name, text });
  };

  const handleFieldChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const submitForm = () => {
    formRef.current?.requestSubmit();
  };

  const linked = roster.find((r) => r.faculty_id === facultyId);
  const topics = parseTopTopics(suggestedTopics).slice(0, 4);

  return (
    <form ref={formRef} action={action} className="stagger space-y-8">
      <header className="text-center sm:text-left">
        <p className="eyebrow">Academic Profile Setup</p>
        <h1 className="mt-2 font-read text-3xl leading-[1.05] text-ink dark:text-dark-ink sm:text-4xl">
          {isTeacher
            ? "Configure your faculty profile"
            : isAlumni
              ? "Tell students what you can mentor"
              : "Set up your student profile"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-mute dark:text-dark-mute">
          Step through to personalize your matching criteria and verified academic background.
        </p>
      </header>

      {/* Hidden inputs to preserve full state on submit */}
      <input type="hidden" name="email" value={formData.email} />
      <input type="hidden" name="department" value={formData.department} />
      <input type="hidden" name="standing" value={formData.standing} />
      <input type="hidden" name="bio" value={formData.bio} />
      <input type="hidden" name="achievements" value={formData.achievements} />
      <input type="hidden" name="linkedin_url" value={formData.linkedin_url} />
      <input type="hidden" name="scholar_url" value={formData.scholar_url} />
      <input type="hidden" name="interests" value={interests.join(", ")} />
      <input type="hidden" name="resume_name" value={resume?.name ?? ""} />
      <input type="hidden" name="resume_text" value={resume?.text ?? ""} />
      <input type="hidden" name="faculty_id" value={facultyId} />
      <input type="hidden" name="open_to_collaboration" value={openToCollaboration ? "on" : "off"} />

      {/* React Bits Stepper */}
      <Stepper
        onFinalStepCompleted={submitForm}
        nextButtonText="Continue"
        nextButtonProps={{ className: "next-button font-mono text-xs uppercase tracking-wider" }}
      >
        {/* Step 1: Identity & Department */}
        <Step>
          <div className="space-y-4 py-2">
            <div className="border-b border-rule pb-3 dark:border-dark-border">
              <h2 className="text-base font-semibold text-ink dark:text-dark-ink">Step 1: Academic Identity</h2>
              <p className="text-xs text-mute dark:text-dark-mute">
                Signed in as <span className="font-medium text-forest-700 dark:text-forest-400">{user.full_name}</span> ({user.college_id})
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="University Email">
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleFieldChange("email", e.target.value)}
                  placeholder="name@rvce.edu.in"
                  required
                />
              </Field>

              <Field label="Department">
                <Input
                  value={formData.department}
                  onChange={(e) => handleFieldChange("department", e.target.value)}
                  required
                />
              </Field>

              <Field
                label={isTeacher ? "Academic Designation" : isAlumni ? "Graduation Year & Role" : "Academic Year & Standing"}
                className="sm:col-span-2"
              >
                <Input
                  value={formData.standing}
                  onChange={(e) => handleFieldChange("standing", e.target.value)}
                  placeholder={
                    isTeacher
                      ? "Associate Professor · Systems Lab"
                      : isAlumni
                        ? "Class of 2022 · Machine Learning Engineer"
                        : "3rd Year, 6th Semester"
                  }
                  required
                />
              </Field>
            </div>
          </div>
        </Step>

        {/* Step 2: Research Focus & Interests */}
        <Step>
          <div className="space-y-5 py-2">
            <div className="border-b border-rule pb-3 dark:border-dark-border">
              <h2 className="text-base font-semibold text-ink dark:text-dark-ink">Step 2: Research Interests</h2>
              <p className="text-xs text-mute dark:text-dark-mute">
                Select topics that reflect your thesis ideas or expertise.
              </p>
            </div>

            <div>
              <Label className="mb-2 block">Focus Areas</Label>
              <div className="flex flex-wrap gap-2">
                {[...new Set([...SUGGESTED_INTERESTS, ...interests])].map((tag) => {
                  const active = interests.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggle(tag)}
                      className={cn(
                        "rounded-full border px-3 py-1 font-mono text-[11px] transition-all",
                        active
                          ? "border-forest-600 bg-forest-600 text-white shadow-xs dark:bg-forest-500"
                          : "border-rule bg-white text-mute hover:border-forest-500/50 hover:text-forest-800 dark:border-dark-border dark:bg-dark-card dark:text-dark-mute dark:hover:text-forest-200",
                      )}
                    >
                      {active ? <Check className="mr-1 inline h-3 w-3" /> : null}
                      {tag}
                    </button>
                  );
                })}
              </div>
              <AddInterest onAdd={(tag) => !interests.includes(tag) && setInterests((p) => [...p, tag])} />
            </div>

            <Field
              label={isTeacher ? "Research Summary" : "Academic Bio"}
              hint="Two or three sentences on your research problem or what you want to explore."
            >
              <Textarea
                rows={3}
                value={formData.bio}
                onChange={(e) => handleFieldChange("bio", e.target.value)}
                placeholder="Describe your current research topics or project interests..."
              />
            </Field>

            <Field label="LinkedIn Profile URL" hint="Optional. Your public LinkedIn URL.">
              <Input
                type="url"
                value={formData.linkedin_url}
                onChange={(e) => handleFieldChange("linkedin_url", e.target.value)}
                placeholder="https://www.linkedin.com/in/username"
              />
            </Field>
          </div>
        </Step>

        {/* Step 3: Publications, CV & Completion */}
        <Step>
          <div className="space-y-4 py-2">
            <div className="border-b border-rule pb-3 dark:border-dark-border">
              <h2 className="text-base font-semibold text-ink dark:text-dark-ink">Step 3: Verification & Portfolio</h2>
              <p className="text-xs text-mute dark:text-dark-mute">
                Upload your résumé or link your publication record to power accurate matching.
              </p>
            </div>

            {isTeacher && roster.length ? (
              <div className="space-y-2">
                <Label>Link Publication Record</Label>
                <select
                  value={facultyId}
                  onChange={(e) => setFacultyId(e.target.value)}
                  className="h-10 w-full rounded-xl border border-rule bg-white px-3 text-sm text-ink transition-colors hover:border-forest-500 focus:border-forest-600 focus:outline-none dark:border-dark-border dark:bg-dark-card dark:text-dark-ink"
                >
                  <option value="">Not linked</option>
                  {roster.map((r) => (
                    <option key={r.faculty_id} value={r.faculty_id}>
                      {r.faculty_name} — {r.designation} ({r.n_publications} papers)
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div>
              <Label className="mb-1.5 block">{isTeacher ? "Curriculum Vitae" : "Résumé / CV"}</Label>
              <label
                className={cn(
                  "flex cursor-pointer items-center gap-4 rounded-xl border border-dashed p-4 transition-colors",
                  resume
                    ? "border-forest-600 bg-forest-50/50 dark:border-forest-500/50 dark:bg-forest-950/30"
                    : "border-rule hover:border-forest-500 dark:border-dark-border",
                )}
              >
                <input type="file" className="sr-only" onChange={onFile} accept=".pdf,.doc,.docx,.txt,.md" />
                {resume ? (
                  <FileText className="h-5 w-5 text-forest-700 dark:text-forest-400" />
                ) : (
                  <Upload className="h-5 w-5 text-mute" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink dark:text-dark-ink">
                    {resume ? resume.name : "Upload PDF, DOCX, TXT or MD"}
                  </span>
                  <span className="mt-0.5 block font-mono text-[11px] text-mute dark:text-dark-mute">
                    {resume
                      ? resume.text
                        ? `${resume.text.length.toLocaleString()} characters indexed`
                        : "Filename recorded"
                      : "Click to browse file from your device"}
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
                    className="font-mono text-[11px] text-red-600 hover:underline dark:text-red-400"
                  >
                    Remove
                  </span>
                ) : null}
              </label>
            </div>

            {isTeacher && (
              <label className="flex items-center justify-between rounded-xl border border-rule bg-white p-3.5 dark:border-dark-border dark:bg-dark-card">
                <div>
                  <span className="block text-sm font-medium text-ink dark:text-dark-ink">Open to Student Collaborations</span>
                  <span className="text-xs text-mute dark:text-dark-mute">Displays an active recruitment badge on your profile.</span>
                </div>
                <Switch
                  checked={openToCollaboration}
                  onCheckedChange={setOpenToCollaboration}
                />
              </label>
            )}
          </div>
        </Step>
      </Stepper>

      {state.error ? (
        <p className="rounded-xl border-l-4 border-red-500 bg-red-50 px-3 py-2 text-[13px] text-red-800 dark:bg-red-950/40 dark:text-red-300">
          {state.error}
        </p>
      ) : null}
    </form>
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
    <div className="mt-2.5 flex gap-2">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
        }}
        placeholder="Add custom topic (e.g. LLM Reasoning)"
        className="h-9 max-w-xs text-xs"
      />
      <Button type="button" variant="quiet" size="sm" onClick={commit}>
        Add
      </Button>
    </div>
  );
}
