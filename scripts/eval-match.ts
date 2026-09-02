/**
 * Ranking smoke test.
 *
 * SCHEMA.md section 11 records what a sane matcher should return for four
 * ideas. This replays them and prints the top three, so a change to the
 * scoring can be judged against the dataset's own expectations rather than
 * against whichever example happened to be open in the browser.
 *
 *   npx tsx scripts/eval-match.ts
 */
import { matchFaculty } from "../src/lib/search/match";
import type { Project, ProjectBrief } from "../src/lib/types";

const CASES: { name: string; expect: string; brief: Partial<ProjectBrief> }[] = [
  {
    name: "phishing extension",
    expect: "Minal Moharir",
    brief: {
      title: "Browser extension that flags phishing pages",
      one_liner:
        "A browser extension that spots phishing pages before a student clicks through, using page features rather than a blocklist.",
      problem:
        "Students lose accounts to fake login pages copying the college portal. Blocklists never carry these campus-specific pages.",
      approach:
        "Score each page from its own features and run a small classifier locally.",
      domain_tags: ["phishing detection", "network security", "machine learning"],
    },
  },
  {
    name: "drone crowd surveillance",
    expect: "Mohana",
    brief: {
      title: "Crowd density from drone video",
      one_liner: "Estimating crowd density from drone footage during campus events.",
      problem: "Event organisers cannot tell when a crowd is becoming dangerous.",
      approach: "Object detection and tracking on aerial video.",
      domain_tags: ["computer vision", "video surveillance", "object detection"],
    },
  },
  {
    name: "privacy-preserving anonymisation",
    expect: "Veena Gadad / Sowmyarani C N",
    brief: {
      title: "Anonymising hospital records for research",
      one_liner: "Releasing hospital records to researchers without exposing patients.",
      problem: "Hospitals cannot share data because re-identification is too easy.",
      approach: "Generalisation and suppression with a privacy guarantee.",
      domain_tags: ["privacy preserving data publishing", "anonymisation", "data privacy"],
    },
  },
  {
    name: "protein folding (deliberately out of scope)",
    expect: "no strong match on campus",
    brief: {
      title: "Predicting protein folding structures",
      one_liner: "Predicting tertiary structure of proteins from amino acid sequences.",
      problem: "Wet-lab structure determination is slow and expensive.",
      approach: "Sequence models over residue contact maps.",
      domain_tags: ["structural biology", "protein folding", "molecular dynamics"],
    },
  },
];

function project(brief: Partial<ProjectBrief>): Project {
  return {
    project_id: "eval",
    owner_user_id: "eval",
    owner_name: "eval",
    title: brief.title ?? "",
    status: "structured",
    transcript: [],
    match: null,
    created_at: "",
    updated_at: "",
    brief: {
      title: "",
      one_liner: "",
      problem: "",
      approach: "",
      domain_tags: [],
      deliverables: [],
      skills_have: [],
      skills_needed: [],
      timeline: "",
      resources: "",
      open_questions: [],
      ...brief,
    },
  };
}

async function main() {
  for (const testCase of CASES) {
    const report = await matchFaculty(project(testCase.brief));
    console.log(`\n${testCase.name}`);
    console.log(`  expected: ${testCase.expect}`);
    console.log(`  weak field: ${report.weak_field}`);
    for (const match of report.matches.slice(0, 3)) {
      console.log(
        `  ${match.faculty_name.padEnd(22)} score ${match.score.toFixed(3)}` +
          `  depth ${String(match.depth).padStart(2)}  breadth ${String(match.breadth).padStart(2)}` +
          `  closeness ${match.closeness.toFixed(2)}`,
      );
      const paper = match.evidence[0];
      if (paper) console.log(`      closest: ${paper.title.slice(0, 78)} (${paper.year})`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
