import { getRankedEventsForStudent } from "../src/lib/events/service";
import type { NetreeUser } from "../src/lib/types";

async function main() {
  const mockStudent: NetreeUser = {
    user_id: "student_rvce_01",
    role: "student",
    full_name: "Aditya Sharma",
    email: "aditya@rvce.edu.in",
    college_id: "1RV21CS001",
    department: "Computer Science and Engineering",
    standing: "6th Semester",
    bio: "Focused on video analytics, computer vision, and edge neural networks",
    interests: ["Artificial Intelligence", "Computer Vision", "Video Surveillance", "Edge Computing"],
    achievements: "Built aerial object detection prototype",
    resume_name: "aditya_resume.txt",
    resume_text: "",
    scholar_url: "",
    faculty_id: null,
    open_to_collaboration: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  process.stdout.write("Running verification on student event ranking...\n");
  const feed = await getRankedEventsForStudent(mockStudent);

  console.log("\n=== VERIFICATION RESULTS ===");
  console.log(`Freshness Label: ${feed.freshness.label}`);
  console.log(`Is Stale: ${feed.freshness.is_stale}`);
  console.log(`Hackathons count: ${feed.hackathons.length}`);
  console.log(`Events count: ${feed.events.length}`);

  console.log("\n--- Top 2 Ranked Hackathons ---");
  for (const h of feed.hackathons.slice(0, 2)) {
    console.log(`* [${h.score}] ${h.title} (${h.mode})`);
    console.log(`  Match Reason: ${h.match_reason}`);
    console.log(`  Attendees: ${h.attendees.total_going} in network (Faculty speakers: ${h.attendees.faculty_speakers.length}, Sponsor network: ${h.attendees.sponsor_alumni.length})`);
    console.log(`  Registration: ${h.registration_url}`);
  }

  console.log("\n--- Top 2 Ranked Events ---");
  for (const ev of feed.events.slice(0, 2)) {
    console.log(`* [${ev.score}] ${ev.title} (${ev.mode}, ${ev.area})`);
    console.log(`  Match Reason: ${ev.match_reason}`);
    console.log(`  Speakers: ${ev.speakers.length} listed`);
    console.log(`  Attendees: ${ev.attendees.total_going} in network`);
    console.log(`  Registration: ${ev.registration_url}`);
  }
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
