/**
 * Event & Hackathon domain models across upstream ingest, Bronze/Silver/Gold Lakehouse
 * tiers, cold-start attendee resolution, and the student matching engine.
 */

export type EventSource = "btw" | "hackculture";

export type EventKind =
  | "hackathon"
  | "talk"
  | "ceremony"
  | "workshop"
  | "mixer"
  | "meetup"
  | "panel"
  | "roundtable";

export type EventMode = "offline" | "online" | "hybrid";

export type ConformedEvent = {
  event_id: string;
  source: EventSource;
  external_id: string;
  kind: EventKind;
  title: string;
  tagline: string;
  description: string;
  start_at: string;
  end_at: string | null;
  venue: string;
  area: string;
  track: string;
  mode: EventMode;
  registration_open: boolean;
  registration_url: string;
  min_team_size: number | null;
  max_team_size: number | null;
  eligibility_text: string;
  cover_image_url: string | null;
  organizer_name: string;
  tags: string[];
  speakers: EventSpeaker[];
  payload_hash: string;
  source_updated_at: string;
};

export type EventSpeaker = {
  id: string;
  event_external_id: string;
  display_name: string;
  designation: string;
  company: string;
  linkedin_url: string | null;
  square_picture_url: string | null;
  /** Populated when the speaker's name matches an RVCE faculty record. */
  faculty_id: string | null;
  featured: boolean;
};

export type AttendanceStatus = "going" | "interested" | "withdrawn";
export type AttendanceVisibility = "college" | "private";

export type EventAttendance = {
  attendance_id: string;
  event_id: string;
  user_id: string;
  user_name: string;
  user_role: "student" | "teacher" | "alumni";
  user_department: string;
  user_standing?: string;
  status: AttendanceStatus;
  visibility: AttendanceVisibility;
  created_at: string;
  updated_at: string;
};

export type AttendeePersona = {
  user_id: string;
  name: string;
  role: "student" | "faculty_speaker" | "sponsor_alumni" | "faculty";
  label: string;
  avatar_url?: string | null;
  profile_url?: string;
};

export type EventAttendeeSummary = {
  total_going: number;
  faculty_speakers: AttendeePersona[];
  sponsor_alumni: AttendeePersona[];
  student_attendees: AttendeePersona[];
  is_current_user_going: boolean;
  current_user_visibility: AttendanceVisibility;
};

export type EventMatch = ConformedEvent & {
  score: number;
  match_reason: string;
  attendees: EventAttendeeSummary;
};

export type EventsFeedPayload = {
  hackathons: EventMatch[];
  events: EventMatch[];
  freshness: {
    btw_updated_at: string | null;
    hackculture_updated_at: string | null;
    is_stale: boolean;
    label: string;
  };
};
