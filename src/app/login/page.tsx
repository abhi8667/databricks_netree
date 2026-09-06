import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { homeFor } from "@/lib/routes";
import { referenceData } from "@/lib/store/reference";
import { runtimeMode } from "@/lib/env";
import { SignInPanel } from "./sign-in-panel";
import MagnetLines from "@/components/react-bits/magnet-lines";

/**
 * Sign-in and onboarding both write through the SQL warehouse, and the first
 * statement after an idle period waits on it starting up. The platform default
 * of a few seconds kills that mid-flight, which the browser shows as a button
 * stuck on "Saving" - the server action is capped by this page's budget.
 */
export const maxDuration = 60;

export default async function LoginPage() {
  const user = await currentUser();
  if (user) redirect(homeFor(user));

  const { faculty, topics, publications } = await referenceData();

  // The department's real shape, straight off the gold tables.
  const byTopic = new Map<string, number>();
  for (const t of topics) byTopic.set(t.topic, (byTopic.get(t.topic) ?? 0) + t.n_papers);
  const leaders = [...byTopic.entries()].sort((a, b) => b[1] - a[1]).slice(0, 7);

  return (
    <main className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      {/* The Emerald/Obsidian scholarly side */}
      <section className="relative flex flex-col justify-between overflow-hidden bg-forest-950 px-8 py-10 text-white sm:px-12 lg:px-16">
        {/* Ambient emerald illumination & interactive MagnetLines background */}
        <div className="pointer-events-none absolute -left-20 -top-20 h-96 w-96 rounded-full bg-forest-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-teal-500/15 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-20">
          <MagnetLines
            rows={10}
            columns={10}
            containerSize="90vmin"
            lineColor="#34d399"
            lineWidth="0.6vmin"
            lineHeight="4vmin"
            baseAngle={-15}
          />
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <span className="flex items-center gap-2 text-lg font-semibold tracking-[-0.03em]">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-glow-sm" />
            Netree
          </span>
          <span className="h-3 w-px bg-white/25" />
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-emerald-300/70">
            RVCE · Computer Science
          </span>
        </div>

        <div className="relative z-10 max-w-xl py-10">
          <h1 className="text-balance text-[clamp(2.2rem,4.4vw,3.5rem)] font-semibold leading-[0.98] tracking-[-0.04em]">
            Your thesis idea, matched to the professors already publishing on it.
          </h1>
          <p className="mt-6 max-w-md font-read text-lg leading-relaxed text-emerald-100/70">
            Netree reads the department&rsquo;s published research and finds verified algorithmic overlap
            with what you want to build. Every recommendation is backed by real papers.
          </p>
        </div>

        <div className="relative z-10">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-emerald-300/60">
            Department Research Corpus
          </p>
          <div className="mt-4 grid grid-cols-3 gap-6 border-y border-white/15 py-5">
            <Stat value={faculty.length} label="Faculty" />
            <Stat value={publications.length} label="Publications" />
            <Stat value={topics.length} label="Topic links" />
          </div>
          <ul className="mt-5 space-y-1.5">
            {leaders.map(([topic, count]) => (
              <li key={topic} className="flex items-baseline gap-3 text-[13px]">
                <span className="w-8 shrink-0 font-mono text-[11px] text-emerald-300/60">{count}</span>
                <span className="truncate text-emerald-100/80">{topic}</span>
              </li>
            ))}
          </ul>
          <p className="mt-6 font-mono text-[11px] text-white/40">
            Source:{" "}
            {runtimeMode() === "databricks"
              ? "netree.gold on Unity Catalog"
              : "netree gold tables (Delta storage)"}
            {" · "}
            <Link href="/system" className="underline decoration-white/25 hover:decoration-white">
              diagnostic inspection
            </Link>
          </p>
        </div>
      </section>

      {/* The Sign-in card side */}
      <section className="flex items-center justify-center bg-paper px-6 py-14 transition-colors duration-200 dark:bg-dark-paper sm:px-10 lg:px-16">
        <SignInPanel />
      </section>
    </main>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <p className="font-mono text-2xl font-semibold tabular-nums text-white">{value.toLocaleString()}</p>
      <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-emerald-300/60">{label}</p>
    </div>
  );
}
