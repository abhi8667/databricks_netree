"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowRight, GraduationCap, Presentation, Users } from "lucide-react";
import { Button, Field, Input } from "@/components/ui/primitives";
import { signIn, type SignInState } from "@/app/actions/auth";
import type { Role } from "@/lib/types";
import { cn } from "@/lib/utils";

const ROLES: {
  role: Role;
  title: string;
  icon: React.ElementType;
  blurb: string;
  idLabel: string;
  idHint: string;
}[] = [
  {
    role: "student",
    title: "Student",
    icon: GraduationCap,
    blurb: "Brainstorm a thesis, calculate published faculty overlap, and pitch for mentorship.",
    idLabel: "USN",
    idHint: "Your university seat number, e.g. 1RV22CS045.",
  },
  {
    role: "teacher",
    title: "Faculty",
    icon: Presentation,
    blurb: "Review matched student proposals, post lab positions, and mentor research.",
    idLabel: "Staff ID",
    idHint: "Your faculty / staff identifier.",
  },
  {
    role: "alumni",
    title: "Alumni",
    icon: Users,
    blurb: "Answer targeted questions from students building what you have built.",
    idLabel: "Alumni ID or USN",
    idHint: "The seat number you graduated with works fine.",
  },
];

export function SignInPanel() {
  const [role, setRole] = React.useState<Role | null>(null);
  const [state, action] = useActionState<SignInState, FormData>(signIn, {});
  const selected = ROLES.find((r) => r.role === role);

  return (
    <div className="w-full max-w-md stagger">
      <div>
        <p className="eyebrow">Academic Sign in</p>
        <h2 className="mt-2 font-read text-3xl leading-tight text-ink dark:text-dark-ink">
          Who are you here as?
        </h2>
      </div>

      <div className="mt-7 space-y-2.5">
        {ROLES.map((option) => {
          const Icon = option.icon;
          const active = role === option.role;
          return (
            <button
              key={option.role}
              type="button"
              onClick={() => setRole(option.role)}
              aria-pressed={active}
              className={cn(
                "group flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition-all duration-200",
                active
                  ? "border-forest-600 bg-forest-800 text-white shadow-soft dark:border-forest-500 dark:bg-forest-600 dark:shadow-glow-sm"
                  : "border-rule bg-white text-ink hover:-translate-y-0.5 hover:border-forest-500/50 hover:bg-forest-50/50 dark:border-dark-border dark:bg-dark-card dark:text-dark-ink dark:hover:border-forest-500/50 dark:hover:bg-forest-950/40",
              )}
            >
              <div
                className={cn(
                  "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors",
                  active
                    ? "bg-white/20 text-white"
                    : "bg-forest-50 text-forest-700 dark:bg-forest-950 dark:text-forest-400",
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-medium">{option.title}</span>
                <span
                  className={cn(
                    "mt-1 block text-[13px] leading-relaxed",
                    active ? "text-white/80" : "text-mute dark:text-dark-mute",
                  )}
                >
                  {option.blurb}
                </span>
              </span>
              <ArrowRight
                className={cn(
                  "mt-2 h-4 w-4 shrink-0 transition-transform",
                  active ? "translate-x-0 text-white" : "-translate-x-1 text-transparent group-hover:text-mute",
                )}
              />
            </button>
          );
        })}
      </div>

      {selected ? (
        <form
          action={action}
          className="mt-7 space-y-5 border-t border-rule pt-7 animate-rise dark:border-dark-border"
        >
          <input type="hidden" name="role" value={selected.role} />
          <Field label="Full name">
            <Input name="full_name" placeholder="As it appears on university records" required />
          </Field>
          <Field label={selected.idLabel} hint={selected.idHint}>
            <Input name="college_id" placeholder={selected.idLabel} required autoComplete="off" />
          </Field>

          {state.error ? (
            <p className="rounded-xl border-l-4 border-red-500 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-800 dark:bg-red-950/40 dark:text-red-300">
              {state.error}
            </p>
          ) : null}

          <Submit />
          <p className="text-xs leading-relaxed text-mute dark:text-dark-mute">
            Signing in registers or loads your profile. Proposals are only dispatched when you confirm
            matching results.
          </p>
        </form>
      ) : (
        <p className="mt-7 border-t border-rule pt-7 text-sm text-mute dark:border-dark-border dark:text-dark-mute">
          Select a role to continue.
        </p>
      )}
    </div>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" variant="emerald" className="w-full" disabled={pending}>
      {pending ? "Signing in..." : "Continue"}
      {pending ? null : <ArrowRight className="h-4 w-4" />}
    </Button>
  );
}
