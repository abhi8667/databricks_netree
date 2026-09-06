export type Role = "student" | "teacher" | "alumni";

export const ROLE_LABEL: Record<Role, string> = {
  student: "Student",
  teacher: "Faculty",
  alumni: "Alumni",
};

/** A person with an account. Faculty rows may link to a dataset faculty_id. */
export type NetreeUser = {
  user_id: string;
  role: Role;
  full_name: string;
  email: string;
  college_id: string;
  department: string;
  /** Semester for students, designation for faculty, graduation year for alumni. */
  standing: string;
  bio: string;
  interests: string[];
  achievements: string;
  resume_name: string;
  resume_text: string;
  linkedin_url?: string;
  scholar_url: string;
  /** Set when a faculty account is matched to a row in the campus dataset. */
  faculty_id: string | null;
  /** Faculty opt-in. Never inferred from publication activity. */
  open_to_collaboration: boolean;
  created_at: string;
  updated_at: string;
};

/** One clarifying exchange in the idea-shaping conversation. */
export type IdeaTurn = { role: "assistant" | "user"; content: string };

export type ProjectBrief = {
  title: string;
  one_liner: string;
  problem: string;
  approach: string;
  domain_tags: string[];
  deliverables: string[];
  skills_have: string[];
  skills_needed: string[];
  timeline: string;
  resources: string;
  /** What the model still could not pin down — shown honestly, not hidden. */
  open_questions: string[];
};

export type Project = {
  project_id: string;
  owner_user_id: string;
  owner_name: string;
  title: string;
  status: "drafting" | "structured" | "matched" | "in_review" | "accepted" | "archived";
  brief: ProjectBrief | null;
  transcript: IdeaTurn[];
  /** The most recent match run. Kept with the project so it is auditable. */
  match: MatchReport | null;
  created_at: string;
  updated_at: string;
};

/** A ranked faculty candidate for a project. */
export type FacultyMatch = {
  faculty_id: string;
  faculty_name: string;
  designation: string;
  department: string;
  /** 0-1 closeness of the strongest publications. */
  closeness: number;
  /** How many distinct publications clear the relevance floor. */
  depth: number;
  /** Distinct matching topics — the signal SCHEMA.md says to trust. */
  breadth: number;
  score: number;
  n_publications: number;
  latest_year: number | null;
  total_citations: number;
  h_index: number;
  profile_status: string;
  collaboration_status: string;
  overlap_topics: { topic: string; n_papers: number; latest_year: number }[];
  /** How much of the idea's topic weight this person's work actually covers, 0-1. */
  coverage: number;
  evidence: { publication_id: string; title: string; year: number; venue: string; url: string; similarity: number }[];
  /** Plain-language reason, written by Gemini over the evidence above. */
  rationale: string;
};

export type MatchReport = {
  project_id: string;
  generated_at: string;
  /** Where the ranking came from: Genie SQL, embeddings, or both. */
  method: string[];
  /** Genie's own answer to "who on campus works on this", kept verbatim. */
  genie_answer: string | null;
  genie_sql: string | null;
  /** The controlled-vocabulary topics the idea was grounded in, with weights. */
  topics: { topic: string; weight: number; dept_papers: number }[];
  /** How the topics were derived: the conversation model, or the corpus itself. */
  topic_source: "gemini" | "derived";
  /** True when nothing on campus is a genuine fit — we say so rather than bluff. */
  weak_field: boolean;
  note: string;
  matches: FacultyMatch[];
};

export type Invitation = {
  invitation_id: string;
  project_id: string;
  project_title: string;
  student_user_id: string;
  student_name: string;
  faculty_id: string;
  faculty_name: string;
  /** Faculty account id once that person has signed up; null while unclaimed. */
  faculty_user_id: string | null;
  pitch: string;
  status: "pending" | "accepted" | "declined" | "redirected" | "changes_requested";
  feedback: string;
  redirected_to_faculty_id: string | null;
  redirected_to_faculty_name: string | null;
  created_at: string;
  updated_at: string;
};

export type Meeting = {
  meeting_id: string;
  invitation_id: string;
  requested_by: string;
  mode: "online" | "offline";
  slots: string[];
  location: string;
  agenda: string;
  status: "proposed" | "confirmed" | "declined";
  confirmed_slot: string | null;
  created_at: string;
  updated_at: string;
};

/** A faculty-authored open position students can apply to. */
export type Opportunity = {
  opportunity_id: string;
  owner_user_id: string;
  owner_name: string;
  faculty_id: string | null;
  title: string;
  summary: string;
  requirements: string[];
  skills: string[];
  weekly_hours: string;
  mode: "on-campus" | "remote" | "hybrid";
  duration: string;
  seats: number;
  status: "open" | "closed";
  created_at: string;
  updated_at: string;
};

export type Interest = {
  interest_id: string;
  opportunity_id: string;
  opportunity_title: string;
  student_user_id: string;
  student_name: string;
  note: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  updated_at: string;
};

export type Message = {
  message_id: string;
  thread_id: string;
  sender_user_id: string;
  sender_name: string;
  body: string;
  created_at: string;
};

/** A short question to a mentor — the lightweight path that skips proposals. */
export type Question = {
  question_id: string;
  asker_user_id: string;
  asker_name: string;
  audience: "alumni" | "teacher";
  target_user_id: string | null;
  target_name: string | null;
  topic: string;
  body: string;
  answer: string;
  answered_by: string | null;
  status: "open" | "answered";
  created_at: string;
  updated_at: string;
};

/** Reference rows read from the campus dataset (Databricks gold, or local CSV). */
export type FacultyProfile = {
  faculty_id: string;
  faculty_name: string;
  designation: string;
  department: string;
  is_head: boolean;
  areas_of_interest: string;
  top_topics: string;
  n_publications: number;
  n_recent: number;
  first_year: number | null;
  latest_year: number | null;
  total_citations: number;
  h_index: number;
  is_research_active: boolean;
  profile_status: string;
  collaboration_status: string;
  official_email: string;
  google_scholar_id: string;
  vidwan_id: string;
};

export type FacultyTopic = {
  faculty_id: string;
  topic: string;
  n_papers: number;
  first_year: number;
  latest_year: number;
  citations: number;
  field: string;
  domain: string;
  is_active_topic: boolean;
};

export type PublicationLite = {
  publication_id: string;
  title: string;
  publication_year: number;
  venue: string;
  publication_url: string;
  cited_by_count: number;
  topics_all: string;
  attribution_confidence: string;
};

export * from "./event-types";

