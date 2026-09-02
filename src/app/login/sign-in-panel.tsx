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
    blurb: "Shape an idea, find the faculty whose work it touches, ask for a meeting.",
    idLabel: "USN",
    idHint: "Your university seat number, e.g. 1RV22CS045.",
  },
  {
    role: "teacher",
    title: "Faculty",
    icon: Presentation,
    blurb: "Review student proposals, post open positions, decide who joins.",
    idLabel: "Staff ID",
    idHint: "Your RVCE staff identifier.",
  },
  {
    role: "alumni",
    title: "Alumni",
    icon: Users,
    blurb: "Answer questions from students working on things you have already built.",
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
        <p className="eyebrow">Sign in</p>
        <h2 className="mt-2 font-read text-3xl leading-tight text-ink">Who are you here as?</h2>
      </div>

      <div className="mt-7 space-y-2">
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
                "group flex w-full items-start gap-4 rounded-lg border p-4 text-left transition-all duration-200",
                active
                  ? "border-ink bg-ink text-paper"
                  : "border-rule bg-white text-ink hover:border-ink",
              )}
            >
              <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", active ? "text-paper" : "text-mute")} />
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-medium">{option.title}</span>
                <span
                  className={cn(
                    "mt-1 block text-[13px] leading-relaxed",
                    active ? "text-white/60" : "text-mute",
                  )}
                >
                  {option.blurb}
                </span>
              </span>
              <ArrowRight
                className={cn(
                  "mt-1 h-4 w-4 shrink-0 transition-transform",
                  active ? "translate-x-0 text-paper" : "-translate-x-1 text-transparent",
                )}
              />
            </button>
          );
        })}
      </div>

      {selected ? (
        <form action={action} className="mt-7 space-y-5 border-t border-rule pt-7 animate-rise">
          <input type="hidden" name="role" value={selected.role} />
          <Field label="Full name">
            <Input name="full_name" placeholder="As it appears on college records" required />
          </Field>
          <Field label={selected.idLabel} hint={selected.idHint}>
            <Input name="college_id" placeholder={selected.idLabel} required autoComplete="off" />
          </Field>

          {state.error ? (
            <p className="border-l-2 border-ink bg-fill px-3 py-2 text-[13px] text-ink">
              {state.error}
            </p>
          ) : null}

          <Submit />
          <p className="text-xs leading-relaxed text-mute">
            First time signing in creates your account. Nothing is shared with faculty until you send
            a request yourself.
          </p>
        </form>
      ) : (
        <p className="mt-7 border-t border-rule pt-7 text-sm text-mute">
          Pick one to continue. You can only hold one role per college ID.
        </p>
      )}
    </div>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Signing in" : "Continue"}
      {pending ? null : <ArrowRight className="h-4 w-4" />}
    </Button>
  );
}
