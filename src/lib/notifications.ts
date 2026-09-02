export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  time: string;
  href: string;
  read: boolean;
  type: "reply" | "event" | "position" | "declined";
}

export const DEFAULT_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "notif-1",
    title: "Faculty Feedback Received",
    description: "Dr. Ramesh (CSE Systems Lab) reviewed your Cloud NLP thesis pitch.",
    time: "10m ago",
    href: "/student/requests",
    read: false,
    type: "reply",
  },
  {
    id: "notif-2",
    title: "New Matching Hackathon",
    description: "HackCulture Bengaluru '26 registered 100% overlap with your topic tags.",
    time: "1h ago",
    href: "/student/events",
    read: false,
    type: "event",
  },
  {
    id: "notif-3",
    title: "New Research Assistantship",
    description: "High-throughput Distributed Storage opening in Networks Dept.",
    time: "3h ago",
    href: "/student/opportunities",
    read: true,
    type: "position",
  },
];

/** Answers user queries to Foxbow about notifications, faculty, and events */
export function answerFoxbowQuery(query: string, notifs: NotificationItem[] = DEFAULT_NOTIFICATIONS): {
  reply: string;
  actionHref?: string;
  actionLabel?: string;
} {
  const q = query.toLowerCase().trim();

  if (q.includes("sleep") || q.includes("nap") || q.includes("rest")) {
    return {
      reply: "Yaaawn... Goodnight! I'll take a quick power nap by the campfire. Click me anytime to wake me up! 💤",
    };
  }

  // Declined applications or proposals
  if (q.includes("decline") || q.includes("reject") || q.includes("pass")) {
    const declinedNotif = notifs.find((n) => n.type === "declined");
    if (declinedNotif) {
      return {
        reply: `⚠️ Position application update: ${declinedNotif.description}`,
        actionHref: declinedNotif.href,
        actionLabel: "View Details",
      };
    }
    return {
      reply: "No declined applications detected in your active pipeline. All active requests are either pending or approved!",
      actionHref: "/student/opportunities",
      actionLabel: "Open Positions",
    };
  }

  // Alumni answers / Question replies
  if (q.includes("alumni") || q.includes("question") || q.includes("ask") || q.includes("reply") || q.includes("answer")) {
    const replyNotif = notifs.find((n) => n.type === "reply");
    if (replyNotif) {
      return {
        reply: `📬 Scout report: ${replyNotif.title} — ${replyNotif.description}`,
        actionHref: replyNotif.href,
        actionLabel: "View Reply",
      };
    }
    return {
      reply: "No mentor replies waiting at this moment. You can ask alumni questions anytime in 'Ask a Mentor'!",
      actionHref: "/student/ask",
      actionLabel: "Ask Alumni",
    };
  }

  if (q.includes("hackathon") || q.includes("event") || q.includes("bengaluru") || q.includes("hackculture")) {
    const eventNotif = notifs.find((n) => n.type === "event");
    return {
      reply: `🏹 Scout report: ${eventNotif?.description || "HackCulture Bengaluru '26 and Bengaluru Tech Week events are live with open registration!"}`,
      actionHref: "/student/events",
      actionLabel: "View Hackathons",
    };
  }

  if (q.includes("faculty") || q.includes("feedback") || q.includes("pitch")) {
    const replyNotif = notifs.find((n) => n.type === "reply");
    return {
      reply: `📬 You have exciting mentor news! ${replyNotif?.description || "Dr. Ramesh reviewed your proposal."}`,
      actionHref: replyNotif?.href || "/student/requests",
      actionLabel: "Read Feedback",
    };
  }

  if (q.includes("opportunity") || q.includes("job") || q.includes("position") || q.includes("assistant") || q.includes("lab") || q.includes("post")) {
    const posNotif = notifs.find((n) => n.type === "position" || n.type === "declined");
    return {
      reply: `🔬 Position update: ${posNotif?.description || "High-throughput Distributed Storage opening in Networks Dept."}`,
      actionHref: posNotif?.href || "/student/opportunities",
      actionLabel: "Check Positions",
    };
  }

  // Default: overall notifications summary
  const unreadCount = notifs.filter((n) => !n.read).length;
  const topItems = notifs.filter((n) => !n.read).slice(0, 3);
  const summary = topItems.map((n) => `• ${n.title}: ${n.description}`).join("\n");

  return {
    reply: unreadCount > 0
      ? `You have ${unreadCount} campus update${unreadCount === 1 ? "" : "s"}:\n${summary}`
      : "All caught up! No unread notifications right now.",
    actionHref: topItems[0]?.href || "/student/requests",
    actionLabel: "Open Notifications",
  };
}
