import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { Badge, Empty, Ident } from "@/components/ui/primitives";
import { requireUser } from "@/lib/auth";
import { invitationsFromStudent } from "@/lib/repo";
import { STATUS_COPY } from "@/lib/status";
import { relativeTime } from "@/lib/utils";

export default async function RequestsPage() {
  const user = await requireUser();
  const invitations = await invitationsFromStudent(user.user_id);

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10 sm:px-10">
      <PageHeader
        eyebrow="Requests"
        title="Collaboration requests you have sent"
        description="Each thread holds the message you sent, the reply, and anywhere the conversation went next."
      />

      {invitations.length === 0 ? (
        <div className="mt-8">
          <Empty title="Nothing sent yet.">
            Run the faculty search on one of your ideas, then send a request to whoever fits.
          </Empty>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-rule">
          {invitations.map((invitation) => (
            <li key={invitation.invitation_id}>
              <Link
                href={`/student/requests/${invitation.invitation_id}`}
                className="group grid gap-3 py-5 transition-colors hover:bg-fill sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <Badge tone={invitation.status === "pending" ? "muted" : "outline"}>
                      {STATUS_COPY.invitation[invitation.status]}
                    </Badge>
                    <Ident>{invitation.faculty_id}</Ident>
                  </div>
                  <p className="mt-2 text-[16px] text-ink">{invitation.faculty_name}</p>
                  <p className="mt-1 line-clamp-1 text-[13px] text-mute">
                    {invitation.status === "redirected" && invitation.redirected_to_faculty_name
                      ? `Passed on to ${invitation.redirected_to_faculty_name}`
                      : invitation.feedback || invitation.project_title}
                  </p>
                </div>
                <div className="flex items-center gap-5 sm:justify-end">
                  <span className="font-mono text-[11px] text-faint">
                    {relativeTime(invitation.updated_at)}
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-faint transition-colors group-hover:text-ink" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
