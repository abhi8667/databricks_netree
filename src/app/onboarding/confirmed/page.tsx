import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Award,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  Compass,
  FileText,
  GraduationCap,
  Mic,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { Badge, Button } from "@/components/ui/primitives";
import { currentUser } from "@/lib/auth";
import { homeFor } from "@/lib/routes";

export default async function OnboardingConfirmedPage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  const isTeacher = user.role === "teacher";
  const homeUrl = homeFor(user);

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12 sm:px-10">
      {/* Top Celebratory Header */}
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-50 text-emerald-600 shadow-glow dark:border-emerald-500/40 dark:bg-emerald-950/60 dark:text-emerald-400 animate-rise">
          <CheckCircle2 className="h-8 w-8" />
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-forest-50/80 px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-forest-800 dark:border-emerald-500/40 dark:bg-forest-950/60 dark:text-emerald-300">
          <Sparkles className="h-3 w-3 text-emerald-500 animate-pulse" />
          <span>Profile Conformed & Active</span>
        </div>

        <h1 className="mt-3 font-read text-3xl font-normal leading-tight text-ink dark:text-dark-ink sm:text-4xl">
          Profile Successfully Created!
        </h1>
        <p className="mx-auto mt-2.5 max-w-lg text-[15px] leading-relaxed text-mute dark:text-dark-mute">
          Welcome to Netree, <strong className="text-ink dark:text-dark-ink">{user.full_name}</strong>.
          Your research credentials are now indexed across the campus lakehouse for student and faculty discovery.
        </p>
      </div>

      {/* Profile At A Glance Card */}
      <div className="mt-8 overflow-hidden rounded-3xl border border-rule/80 bg-white/95 p-6 shadow-sm backdrop-blur-xl dark:border-dark-border/80 dark:bg-dark-card/95 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-rule/70 pb-5 dark:border-dark-border/70">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-read text-xl font-medium text-ink dark:text-dark-ink">
                {user.full_name}
              </span>
              <Badge tone="emerald" className="normal-case tracking-normal">
                {isTeacher ? "Faculty Investigator" : "Student Researcher"}
              </Badge>
            </div>
            <p className="mt-1 font-mono text-xs text-mute dark:text-dark-mute">
              {user.email} · {user.standing || (isTeacher ? "Faculty" : "Undergraduate")}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-forest-500/30 bg-forest-50 px-3 py-1 font-mono text-xs text-forest-800 dark:border-forest-500/40 dark:bg-forest-950/60 dark:text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-glow-sm" />
              Verified Account
            </span>
          </div>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {/* Department & Standing */}
          <div>
            <p className="eyebrow">Department & School</p>
            <p className="mt-1 text-sm font-medium text-ink dark:text-dark-ink">
              {user.department || "Computer Science and Engineering"}
            </p>
            <p className="mt-0.5 text-xs text-mute dark:text-dark-mute">
              RV College of Engineering, Bengaluru
            </p>
          </div>

          {/* Verification Status */}
          <div>
            <p className="eyebrow">Credentials & Lakehouse Index</p>
            {user.resume_name ? (
              <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                <FileText className="h-4 w-4" />
                <span>{user.resume_name} (Indexed)</span>
              </p>
            ) : user.faculty_id ? (
              <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                <GraduationCap className="h-4 w-4" />
                <span>Publications linked & verified</span>
              </p>
            ) : (
              <p className="mt-1 text-sm text-mute dark:text-dark-mute">
                Base profile active · Portfolio verified
              </p>
            )}
          </div>
        </div>

        {/* Selected Research Topics */}
        {user.interests && user.interests.length > 0 && (
          <div className="mt-6 border-t border-rule/70 pt-5 dark:border-dark-border/70">
            <p className="eyebrow">Indexed Research Topics</p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {user.interests.map((interest) => (
                <Badge
                  key={interest}
                  tone="outline"
                  className="normal-case tracking-normal text-xs"
                >
                  {interest}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Academic Bio */}
        {user.bio && (
          <div className="mt-5 border-t border-rule/70 pt-5 dark:border-dark-border/70">
            <p className="eyebrow">Academic Bio</p>
            <p className="mt-1.5 text-sm leading-relaxed text-mute dark:text-dark-mute">
              {user.bio}
            </p>
          </div>
        )}
      </div>

      {/* Quick Launch Pathways */}
      <div className="mt-8">
        <p className="eyebrow text-center sm:text-left">Recommended Next Steps</p>

        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {/* Pathway 1: Voice AI Ideation */}
          <Link
            href="/student/projects/new"
            className="group flex flex-col justify-between rounded-2xl border border-rule/80 bg-white/95 p-5 shadow-xs transition-all hover:border-emerald-500/40 hover:shadow-md dark:border-dark-border/80 dark:bg-dark-card/95"
          >
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/20 bg-forest-50 text-emerald-600 dark:border-emerald-500/30 dark:bg-forest-950/60 dark:text-emerald-400">
                <Mic className="h-5 w-5" />
              </div>
              <h3 className="mt-3 font-read text-lg font-medium text-ink group-hover:text-forest-700 dark:text-dark-ink dark:group-hover:text-emerald-400">
                Voice AI Ideation Desk
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-mute dark:text-dark-mute">
                Talk through your research hypothesis with our conversational AI to craft a professor-ready brief in minutes.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-forest-700 dark:text-emerald-400">
              <span>Start an interview</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          {/* Pathway 2: Hackathons & Events */}
          <Link
            href="/student/events"
            className="group flex flex-col justify-between rounded-2xl border border-rule/80 bg-white/95 p-5 shadow-xs transition-all hover:border-purple-500/40 hover:shadow-md dark:border-dark-border/80 dark:bg-dark-card/95"
          >
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-purple-500/20 bg-purple-50 text-purple-600 dark:border-purple-500/30 dark:bg-purple-950/60 dark:text-purple-400">
                <Calendar className="h-5 w-5" />
              </div>
              <h3 className="mt-3 font-read text-lg font-medium text-ink group-hover:text-purple-700 dark:text-dark-ink dark:group-hover:text-purple-400">
                Hackathons & Tech Events
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-mute dark:text-dark-mute">
                Explore campus hackathons powered by <strong className="text-purple-600 dark:text-purple-400">HackCulture</strong> & <strong className="text-emerald-600 dark:text-emerald-400">Bengaluru Tech Week</strong>.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-purple-700 dark:text-purple-400">
              <span>View live feeds</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        </div>

        {/* Primary Dashboard Launch Button */}
        <div className="mt-8 text-center">
          <Link href={homeUrl} className="inline-block w-full sm:w-auto">
            <Button size="lg" variant="emerald" className="w-full gap-2 text-sm sm:w-auto sm:px-8">
              <span>Enter Your Research Dashboard</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Partner Attribution Footer Ribbon */}
      <div className="mt-12 flex flex-wrap items-center justify-center gap-4 rounded-2xl border border-rule/60 bg-white/60 p-4 text-center text-xs text-mute backdrop-blur-md dark:border-dark-border/60 dark:bg-dark-card/60 dark:text-dark-mute">
        <span>Ecosystem feeds and hackathons proudly supported by</span>
        <div className="flex items-center gap-3">
          <span className="font-mono font-semibold text-purple-600 dark:text-purple-400">
            ⚡ Powered by HackCulture
          </span>
          <span>·</span>
          <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
            🌐 Powered by Bengaluru Tech Week
          </span>
        </div>
      </div>
    </main>
  );
}
