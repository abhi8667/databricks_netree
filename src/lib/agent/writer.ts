import "server-only";
import { hasServing } from "@/lib/env";
import { chat } from "@/lib/databricks/serving";
import type { FacultyMatch, NetreeUser, ProjectBrief } from "@/lib/types";

/**
 * Drafting help. Everything here produces a starting point the human then
 * edits - nothing written by a model is ever sent on someone's behalf without
 * passing through an editable field first.
 */

export async function draftPitch(
  brief: ProjectBrief,
  match: FacultyMatch,
  student: NetreeUser,
): Promise<string> {
  const fallback = () => {
    const topic = match.overlap_topics[0];
    const paper = match.evidence[0];
    const lines = [
      `Dear ${match.faculty_name},`,
      "",
      `I am ${student.full_name}, ${student.standing || "a student"} in ${student.department || "CSE"} at RVCE.`,
      "",
      // Skip the one-liner when it is just the title again - a short brief
      // often has both, and the letter should not say the same thing twice.
      brief.one_liner && !brief.one_liner.startsWith(brief.title)
        ? `I am working on ${brief.title.replace(/[.\s]+$/, "")}. ${brief.one_liner}`
        : `I am working on ${(brief.one_liner || brief.title).replace(/[.\s]+$/, "")}.`,
      brief.problem ? `The problem: ${brief.problem}` : null,
      brief.approach ? `My approach: ${brief.approach}` : null,
      "",
      paper
        ? `I am writing to you because of your work on ${topic?.topic ?? "this area"} - I read "${paper.title}" (${paper.year}) and it is close to what I am attempting.`
        : `I am writing to you because your published work overlaps this area.`,
      "",
      brief.skills_needed.length
        ? `Where I would value your guidance: ${brief.skills_needed.join(", ")}.`
        : "I would value your guidance on scoping this properly.",
      brief.timeline ? `Time frame: ${brief.timeline}.` : null,
      "",
      "Would you be open to a short conversation about whether this is worth pursuing?",
      "",
      "Thank you for your time,",
      student.full_name,
      student.college_id,
    ];
    return lines
      .filter((line): line is string => line !== null)
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  };

  if (!hasServing()) return fallback();

  try {
    return (
      await chat(
        [
          {
            role: "system",
            content:
              "You draft short collaboration requests from undergraduates to professors in Indian " +
              "engineering colleges. 150-200 words. Respectful, specific, no flattery, no exclamation " +
              "marks. Reference one of the professor's actual papers by title. State the ask plainly. " +
              "Return only the message body, starting with the salutation.",
          },
          {
            role: "user",
            content: JSON.stringify({
              student: {
                name: student.full_name,
                standing: student.standing,
                department: student.department,
                college_id: student.college_id,
              },
              project: brief,
              professor: {
                name: match.faculty_name,
                designation: match.designation,
                overlapping_topics: match.overlap_topics,
                papers: match.evidence.map((e) => ({ title: e.title, year: e.year })),
              },
            }),
          },
        ],
        { temperature: 0.5, maxTokens: 600 },
      )
    ).trim();
  } catch (err) {
    console.warn("[netree] pitch drafting fell back to the template:", err);
    return fallback();
  }
}

/** Summarises a student proposal for the faculty review queue. */
export async function summariseForFaculty(brief: ProjectBrief): Promise<string> {
  const fallback = () =>
    [brief.one_liner, brief.problem].filter(Boolean).join(" ").slice(0, 320);

  if (!hasServing()) return fallback();
  try {
    return (
      await chat(
        [
          {
            role: "system",
            content:
              "Compress a student project brief into two sentences a busy professor can skim. " +
              "State what is being built and what is being asked of them. No preamble.",
          },
          { role: "user", content: JSON.stringify(brief) },
        ],
        { temperature: 0.3, maxTokens: 200 },
      )
    ).trim();
  } catch {
    return fallback();
  }
}
