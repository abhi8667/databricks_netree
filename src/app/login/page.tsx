import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { homeFor } from "@/lib/routes";
import { referenceData } from "@/lib/store/reference";
import { runtimeMode } from "@/lib/env";
import { SignInPanel } from "./sign-in-panel";

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

  // The department's real shape, straight off the gold tables. It sets the
  // expectation the matcher has to live up to.
  const byTopic = new Map<string, number>();
  for (const t of topics) byTopic.set(t.topic, (byTopic.get(t.topic) ?? 0) + t.n_papers);
  const leaders = [...byTopic.entries()].sort((a, b) => b[1] - a[1]).slice(0, 7);

  return (
    <main className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      {/* The ink half: what is actually in the index. */}
      <section className="relative flex flex-col justify-between overflow-hidden bg-ink px-8 py-10 text-paper sm:px-12 lg:px-16">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold tracking-[-0.03em]">Netree</span>
          <span className="h-3 w-px bg-white/25" />
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-white/50">
            RVCE · Computer Science
          </span>
        </div>

        <div className="max-w-xl py-10">
          <h1 className="text-balance text-[clamp(2.2rem,4.4vw,3.5rem)] font-semibold leading-[0.98] tracking-[-0.04em]">
            Your idea, matched to the people who already publish on it.
          </h1>
          <p className="mt-6 max-w-md font-read text-lg leading-relaxed text-white/60">
            Netree reads the department&rsquo;s published research and finds the overlap with what
            you want to build. Every match is backed by papers you can open.
          </p>
        </div>

        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-white/40">
            What the index covers today
          </p>
          <div className="mt-4 grid grid-cols-3 gap-6 border-y border-white/15 py-5">
            <Stat value={faculty.length} label="Faculty" />
            <Stat value={publications.length} label="Publications" />
            <Stat value={topics.length} label="Topic links" />
          </div>
          <ul className="mt-5 space-y-1.5">
            {leaders.map(([topic, count]) => (
              <li key={topic} className="flex items-baseline gap-3 text-[13px]">
                <span className="w-8 shrink-0 font-mono text-[11px] text-white/40">{count}</span>
                <span className="truncate text-white/70">{topic}</span>
              </li>
            ))}
          </ul>
          <p className="mt-6 font-mono text-[11px] text-white/30">
            Source:{" "}
            {runtimeMode() === "databricks"
              ? "netree.gold on Unity Catalog"
              : "netree gold tables (local Delta export)"}
            {" · "}
            <Link href="/system" className="underline decoration-white/25 hover:decoration-white">
              what is wired up
            </Link>
          </p>
        </div>
      </section>

      {/* The paper half: who you are. */}
      <section className="flex items-center justify-center px-6 py-14 sm:px-10 lg:px-16">
        <SignInPanel />
      </section>
    </main>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <p className="font-mono text-2xl tabular-nums text-paper">{value.toLocaleString()}</p>
      <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-white/40">{label}</p>
    </div>
  );
}
