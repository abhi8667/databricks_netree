import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { Badge, Empty, Ident } from "@/components/ui/primitives";
import { requireUser } from "@/lib/auth";
import { inboxFor } from "@/lib/faculty-inbox";
import { STATUS_COPY } from "@/lib/status";
import { relativeTime } from "@/lib/utils";

export default async function ProposalsPage() {
  const user = await requireUser();
  const inbox = await inboxFor(user);
  const pending = inbox.filter((i) => i.status === "pending");
  const decided = inbox.filter((i) => i.status !== "pending");

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10 sm:px-10">
      <PageHeader
        eyebrow="Proposals"
        title="Student ideas sent to you"
        description="Every one arrived through overlap with your published work. Open it to see which papers put it in front of you."
      />

      {inbox.length === 0 ? (
        <div className="mt-8">
          <Empty title="Your inbox is empty.">
            Nothing to review. Posting an open position is the other way students find you.
          </Empty>
        </div>
      ) : (
        <>
          {pending.length ? <Group title="Waiting on you" items={pending} /> : null}
          {decided.length ? <Group title="Decided" items={decided} muted /> : null}
        </>
      )}
    </div>
  );
}

function Group({
  title,
  items,
  muted,
}: {
  title: string;
  items: Awaited<ReturnType<typeof inboxFor>>;
  muted?: boolean;
}) {
  return (
    <section className="mt-10">
      <h2 className="border-b border-rule pb-3 font-read text-xl text-ink">{title}</h2>
      <ul className="divide-y divide-rule">
        {items.map((invitation) => (
          <li key={invitation.invitation_id}>
            <Link
              href={`/faculty/proposals/${invitation.invitation_id}`}
              className="group grid gap-3 py-5 transition-colors hover:bg-fill sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <Badge tone={muted ? "muted" : "solid"}>
                    {STATUS_COPY.invitation[invitation.status]}
                  </Badge>
                  <Ident>{invitation.project_id}</Ident>
                </div>
                <p className="mt-2 truncate text-[16px] text-ink">{invitation.project_title}</p>
                <p className="mt-1 text-[13px] text-mute">
                  {invitation.student_name}
                  {invitation.redirected_to_faculty_name
                    ? ` · you passed this to ${invitation.redirected_to_faculty_name}`
                    : ""}
                </p>
              </div>
              <div className="flex items-center gap-5 sm:justify-end">
                <span className="font-mono text-[11px] text-faint">
                  {relativeTime(invitation.created_at)}
                </span>
                <ArrowUpRight className="h-4 w-4 text-faint transition-colors group-hover:text-ink" />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
