export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  time: string;
  href: string;
  read: boolean;
  type: "reply" | "event" | "position";
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

  if (q.includes("hackathon") || q.includes("event") || q.includes("bengaluru") || q.includes("hackculture")) {
    const eventNotif = notifs.find((n) => n.type === "event");
    return {
      reply: `🏹 Scout report: ${eventNotif?.description || "HackCulture Bengaluru '26 and Bengaluru Tech Week events are live with open registration!"}`,
      actionHref: "/student/events",
      actionLabel: "View Hackathons",
    };
  }

  if (q.includes("faculty") || q.includes("mentor") || q.includes("prof") || q.includes("feedback") || q.includes("reply") || q.includes("pitch")) {
    const replyNotif = notifs.find((n) => n.type === "reply");
    return {
      reply: `📬 You have exciting mentor news! ${replyNotif?.description || "Dr. Ramesh reviewed your proposal."}`,
      actionHref: "/student/requests",
      actionLabel: "Read Feedback",
    };
  }

  if (q.includes("opportunity") || q.includes("job") || q.includes("position") || q.includes("assistant") || q.includes("lab")) {
    const posNotif = notifs.find((n) => n.type === "position");
    return {
      reply: `🔬 Lab opening spotted: ${posNotif?.description || "Distributed Storage opening in Networks Dept."}`,
      actionHref: "/student/opportunities",
      actionLabel: "Check Opportunities",
    };
  }

  // Default: overall notifications summary
  const unreadCount = notifs.filter((n) => !n.read).length;
  const topTwo = notifs.filter((n) => !n.read).slice(0, 2);
  const summary = topTwo.map((n) => `• ${n.title}: ${n.description}`).join("\n");

  return {
    reply: `You have ${unreadCount} unread campus notifications:\n${summary}`,
    actionHref: "/student/requests",
    actionLabel: "Open Notifications",
  };
}
