import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Badge, Ident } from "@/components/ui/primitives";
import { Thread } from "@/components/thread";
import { MeetingPanel } from "@/components/meeting-panel";
import { requireUser } from "@/lib/auth";
import { getInvitation, meetingsForInvitation, messagesInThread } from "@/lib/repo";
import { facultyById, topicsFor } from "@/lib/store/reference";
import { STATUS_COPY } from "@/lib/status";
import { relativeTime } from "@/lib/utils";

export default async function RequestThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const invitation = await getInvitation(id);
  if (!invitation) notFound();
  if (invitation.student_user_id !== user.user_id) redirect("/student/requests");

  const [messages, meetings, profile, topics] = await Promise.all([
    messagesInThread(id),
    meetingsForInvitation(id),
    facultyById(invitation.faculty_id),
    topicsFor(invitation.faculty_id),
  ]);

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10 sm:px-10">
      <Link
        href="/student/requests"
        className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-mute hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All requests
      </Link>

      <header className="mt-5 border-b border-rule pb-6">
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone={invitation.status === "pending" ? "muted" : "outline"}>
            {STATUS_COPY.invitation[invitation.status]}
          </Badge>
          <Ident>{invitation.faculty_id}</Ident>
          <span className="font-mono text-[11px] text-faint">
            sent {relativeTime(invitation.created_at)}
          </span>
        </div>
        <h1 className="mt-3 font-read text-3xl leading-tight text-ink">
          {invitation.faculty_name}
        </h1>
        <p className="mt-1.5 text-[14px] text-mute">
          {profile ? `${profile.designation} · ${profile.department}` : "Faculty"}
        </p>
        <p className="mt-4 text-[14px] text-mute">
          On{" "}
          <Link
            href={`/student/projects/${invitation.project_id}`}
            className="text-ink underline decoration-rule underline-offset-2 hover:decoration-ink"
          >
            {invitation.project_title}
          </Link>
        </p>
      </header>

      {invitation.status !== "pending" ? (
        <section className="border-b border-rule py-7">
          <p className="eyebrow">Their reply</p>
          <p className="mt-2 font-read text-lg leading-relaxed text-ink">
            {invitation.status === "redirected" && invitation.redirected_to_faculty_name
              ? `Passed on to ${invitation.redirected_to_faculty_name}.`
              : STATUS_COPY.invitation[invitation.status]}
          </p>
          {invitation.feedback ? (
            <p className="mt-3 whitespace-pre-wrap border-l-2 border-ink pl-4 text-[15px] leading-relaxed text-mute">
              {invitation.feedback}
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="border-b border-rule py-7">
        <p className="eyebrow">What you sent</p>
        <p className="mt-3 whitespace-pre-wrap font-read text-[16px] leading-relaxed text-ink">
          {invitation.pitch}
        </p>
      </section>

      <section className="border-b border-rule py-7">
        <h2 className="font-read text-xl text-ink">Meeting</h2>
        <p className="mt-1.5 text-[14px] text-mute">
          Offer a few times. They confirm one, or say none work.
        </p>
        <div className="mt-5">
          <MeetingPanel
            invitationId={id}
            meetings={meetings}
            canPropose={invitation.status !== "declined"}
            canDecide={false}
          />
        </div>
      </section>

      <section className="py-7">
        <h2 className="font-read text-xl text-ink">Clarifications</h2>
        <p className="mt-1.5 text-[14px] text-mute">
          {topics.length
            ? `${invitation.faculty_name.split(" ")[0]} publishes on ${topics[0]!.topic.toLowerCase()} — be specific.`
            : "Answer anything they ask here."}
        </p>
        <div className="mt-5">
          <Thread
            threadId={id}
            messages={messages}
            meId={user.user_id}
            placeholder="Ask or answer a question about the proposal."
          />
        </div>
      </section>
    </div>
  );
}
