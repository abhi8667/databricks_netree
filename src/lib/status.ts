/**
 * Every status the user can see, in one place, written the way it should read
 * on screen. An action and the state it produces share a vocabulary: "Request
 * changes" leaves an invitation reading "Changes requested".
 */
export const STATUS_COPY = {
  project: {
    drafting: "Drafting",
    structured: "Brief ready",
    matched: "Matches found",
    in_review: "With faculty",
    accepted: "Accepted",
    archived: "Archived",
  },
  invitation: {
    pending: "Awaiting reply",
    accepted: "Accepted",
    declined: "Declined",
    redirected: "Redirected",
    changes_requested: "Changes requested",
  },
  interest: {
    pending: "Awaiting reply",
    accepted: "Accepted",
    declined: "Declined",
  },
  meeting: {
    proposed: "Proposed",
    confirmed: "Confirmed",
    declined: "Declined",
  },
  question: {
    open: "Open",
    answered: "Answered",
  },
  opportunity: {
    open: "Open",
    closed: "Closed",
  },
} as const;
