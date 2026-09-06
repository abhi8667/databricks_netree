import "server-only";
import {
  questionsFrom,
  questionsFor,
  invitationsFromStudent,
  interestsFromStudent,
  interestsForOwner,
} from "@/lib/repo";
import { inboxFor } from "@/lib/faculty-inbox";
import { relativeTime } from "@/lib/utils";
import type { NetreeUser } from "@/lib/types";
import type { NotificationItem } from "@/lib/notifications";

export async function getNotificationsForUser(user: NetreeUser): Promise<NotificationItem[]> {
  const items: NotificationItem[] = [];

  if (user.role === "student") {
    const [questions, invitations, interests] = await Promise.all([
      questionsFrom(user.user_id),
      invitationsFromStudent(user.user_id),
      interestsFromStudent(user.user_id),
    ]);

    // 1. Position application updates (Declined or Accepted)
    for (const interest of interests) {
      if (interest.status === "declined") {
        items.push({
          id: `interest-${interest.interest_id}`,
          title: "Position Application Declined",
          description: `Your application for "${interest.opportunity_title}" was declined by the faculty.`,
          time: relativeTime(interest.updated_at),
          href: "/student/opportunities",
          read: false,
          type: "declined",
        });
      } else if (interest.status === "accepted") {
        items.push({
          id: `interest-${interest.interest_id}`,
          title: "Position Application Accepted! 🎉",
          description: `Congratulations! You were selected for "${interest.opportunity_title}". Check next steps with faculty.`,
          time: relativeTime(interest.updated_at),
          href: "/student/opportunities",
          read: false,
          type: "position",
        });
      }
    }

    // 2. Answers to questions from Alumni or Faculty
    for (const q of questions) {
      if (q.status === "answered" && q.answer) {
        items.push({
          id: `question-${q.question_id}`,
          title: `Reply from ${q.answered_by || "Alumni Mentor"}`,
          description: `${q.answered_by || "Alumni"} replied to "${q.topic}": ${q.answer.slice(0, 75)}${q.answer.length > 75 ? "..." : ""}`,
          time: relativeTime(q.updated_at),
          href: "/student/ask",
          read: false,
          type: "reply",
        });
      }
    }

    // 3. Faculty responses to student proposals
    for (const inv of invitations) {
      if (inv.status === "accepted") {
        items.push({
          id: `inv-${inv.invitation_id}`,
          title: `Proposal Approved by ${inv.faculty_name}`,
          description: `${inv.faculty_name} approved "${inv.project_title}" and scheduled a lab slot.`,
          time: relativeTime(inv.updated_at),
          href: `/student/requests/${inv.invitation_id}`,
          read: false,
          type: "reply",
        });
      } else if (inv.status === "declined") {
        items.push({
          id: `inv-${inv.invitation_id}`,
          title: `Proposal Declined by ${inv.faculty_name}`,
          description: `${inv.faculty_name} declined "${inv.project_title}". Feedback: ${inv.feedback || "Check proposal for notes."}`,
          time: relativeTime(inv.updated_at),
          href: `/student/requests/${inv.invitation_id}`,
          read: false,
          type: "declined",
        });
      } else if (inv.status === "changes_requested") {
        items.push({
          id: `inv-${inv.invitation_id}`,
          title: `Revisions Requested by ${inv.faculty_name}`,
          description: `${inv.faculty_name} requested changes on "${inv.project_title}". Feedback: ${inv.feedback || "Check revisions needed."}`,
          time: relativeTime(inv.updated_at),
          href: `/student/requests/${inv.invitation_id}`,
          read: false,
          type: "reply",
        });
      }
    }

    // 4. Ecosystem events
    items.push({
      id: "event-ecosystem",
      title: "HackCulture & Bengaluru Tech Week",
      description: "Live verified hackathons and tech meetups registered in your domain.",
      time: "Today",
      href: "/student/events",
      read: false,
      type: "event",
    });
  } else if (user.role === "teacher") {
    const [inbox, interests, questions] = await Promise.all([
      inboxFor(user),
      interestsForOwner(user.user_id),
      questionsFor(user.user_id, "teacher"),
    ]);

    const pendingProposals = inbox.filter((i) => i.status === "pending");
    for (const inv of pendingProposals) {
      items.push({
        id: `proposal-${inv.invitation_id}`,
        title: "New Student Research Proposal",
        description: `${inv.student_name} submitted a research pitch for "${inv.project_title}".`,
        time: relativeTime(inv.created_at),
        href: `/faculty/proposals/${inv.invitation_id}`,
        read: false,
        type: "reply",
      });
    }

    const pendingInterests = interests.filter((i) => i.status === "pending");
    for (const int of pendingInterests) {
      items.push({
        id: `applicant-${int.interest_id}`,
        title: "New Applicant for Position",
        description: `${int.student_name} applied for "${int.opportunity_title}".`,
        time: relativeTime(int.created_at),
        href: "/faculty/positions",
        read: false,
        type: "position",
      });
    }

    const openQuestions = questions.filter((q) => q.status === "open");
    for (const q of openQuestions) {
      items.push({
        id: `question-${q.question_id}`,
        title: "Student Question Waiting",
        description: `${q.asker_name} asked: "${q.topic}".`,
        time: relativeTime(q.created_at),
        href: "/faculty/questions",
        read: false,
        type: "reply",
      });
    }
  } else if (user.role === "alumni") {
    const questions = await questionsFor(user.user_id, "alumni");
    const open = questions.filter((q) => q.status === "open");
    for (const q of open) {
      items.push({
        id: `alumni-q-${q.question_id}`,
        title: "Student Question Waiting",
        description: `${q.asker_name} asked the alumni network: "${q.topic}".`,
        time: relativeTime(q.created_at),
        href: "/alumni",
        read: false,
        type: "reply",
      });
    }
  }

  return items;
}
